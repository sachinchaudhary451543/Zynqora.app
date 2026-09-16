import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  if (candidate.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase().trim() }, { username: dto.username.toLowerCase().trim() }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await hashPassword(dto.password);
    const recoveryCode = randomBytes(6).toString('hex').toUpperCase();

    const user = await (this.prisma.user as any).create({
      data: {
        email: dto.email.toLowerCase().trim(),
        username: dto.username.toLowerCase().trim(),
        name: dto.name.trim(),
        passwordHash,
        recoveryCodeHash: createHash('sha256').update(recoveryCode).digest('hex'),
      },
    });

    const session = await this.issueSession(user);
    return { ...session, recoveryCode };
  }

  async checkUsername(username: string) {
    const normalized = (username || '').trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(normalized)) {
      return { available: false, valid: false, message: 'Use 3–30 letters, numbers, underscores or dots.' };
    }
    const user = await this.prisma.user.findUnique({ where: { username: normalized }, select: { id: true } });
    return { available: !user, valid: true, message: user ? 'Username is already taken.' : 'Username is available.' };
  }

  async requestPasswordReset(identifier: string, recoveryCode: string) {
    const normalized = (identifier || '').trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: normalized }, { username: normalized }] } });
    // Do not reveal whether an account exists.
    const response = { message: 'If the account details match, a reset request can continue.' };
    if (!user || !recoveryCode) return response;
    const suppliedHash = createHash('sha256').update(recoveryCode.trim().toUpperCase()).digest('hex');
    if (!(user as any).recoveryCodeHash || suppliedHash !== (user as any).recoveryCodeHash) return response;
    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({ where: { id: user.id }, data: { resetToken: createHash('sha256').update(token).digest('hex'), resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    return { ...response, resetToken: token };
  }

  async resetPassword(token: string, password: string) {
    if (!token || password.length < 8) throw new UnauthorizedException('Invalid or expired recovery request');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({ where: { resetToken: tokenHash, resetTokenExpiresAt: { gt: new Date() } } });
    if (!user) throw new UnauthorizedException('Invalid or expired recovery request');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        resetToken: null,
        resetTokenExpiresAt: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        tokenVersion: { increment: 1 },
      },
    });
    return { message: 'Password reset successfully. You can now log in.' };
  }

  async logout(userId: string) {
    if (!userId) throw new UnauthorizedException('Invalid session');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        tokenVersion: { increment: 1 },
      },
    });
    return { message: 'Logged out successfully.' };
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        refreshTokenHash: hashToken(refreshToken),
        refreshTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Session expired');
    }

    const nextRefreshToken = randomBytes(32).toString('hex');
    const refreshedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: hashToken(nextRefreshToken),
        refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { ...this.buildAuthResponse(refreshedUser), refreshToken: nextRefreshToken };
  }

  async login(dto: LoginDto) {
    const identifier = (dto.email || '').toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email/username or password');
    }
    if (!user.passwordHash.startsWith('$2')) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(dto.password) },
      });
    }

    return this.issueSession(user);
  }

  private async issueSession(user: { id: string; email: string; username: string; name: string; avatarUrl: string | null; tokenVersion: number }) {
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const refreshedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      ...this.buildAuthResponse(refreshedUser),
      refreshToken,
    };
  }

  private buildAuthResponse(user: { id: string; email: string; username: string; name: string; avatarUrl: string | null; tokenVersion: number }) {
    const token = this.jwt.sign({ sub: user.id, username: user.username, tokenVersion: user.tokenVersion });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
