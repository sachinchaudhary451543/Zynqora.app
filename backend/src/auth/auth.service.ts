import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
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
  private readonly googleVerifier = new OAuth2Client();

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
        interests: dto.interests ?? [],
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

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
        profileImage: true,
        bannerImage: true,
        bio: true,
        website: true,
        category: true,
        note: true,
        interests: true,
        notifySocialActivity: true,
        notifyCircleActivity: true,
        weeklyDigestEnabled: true,
        profileVisibility: true,
        followersVisibility: true,
        followingVisibility: true,
      },
    });
    if (!user) throw new UnauthorizedException('Session user no longer exists');
    return user;
  }

  async requestPasswordReset(identifier: string, recoveryCode: string) {
    const normalized = (identifier || '').trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: normalized }, { username: normalized }] } });
    // Do not reveal whether an account exists.
    const response = { message: 'If the account details match, a reset request can continue.' };
    if (!user || !recoveryCode) return response;
    const suppliedHash = createHash('sha256').update(recoveryCode.trim().toUpperCase()).digest('hex');
    const storedHash = (user as any).recoveryCodeHash;
    if (typeof storedHash !== 'string') return response;
    const suppliedHashBuffer = Buffer.from(suppliedHash, 'hex');
    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    if (storedHashBuffer.length !== suppliedHashBuffer.length || !timingSafeEqual(suppliedHashBuffer, storedHashBuffer)) return response;
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
    const rawIdentifier = (dto.email || '').trim().toLowerCase();
    const identifier = rawIdentifier.startsWith('@')
      ? rawIdentifier.slice(1)
      : rawIdentifier;
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

  async createGoogleChallenge() {
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()) {
      throw new ServiceUnavailableException('Google sign-in is not configured yet');
    }
    const nonce = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await (this.prisma as any).googleAuthChallenge.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await (this.prisma as any).googleAuthChallenge.create({
      data: { nonceHash: hashToken(nonce), expiresAt },
    });
    return { nonce };
  }

  async loginWithGoogle(idToken: string) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    if (!clientId) {
      throw new ServiceUnavailableException('Google sign-in is not configured yet');
    }

    let payload;
    try {
      const ticket = await this.googleVerifier.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException('Use a Google account with a verified email address.');
    }
    if (!payload.nonce) throw new UnauthorizedException('Google sign-in security challenge is missing.');

    const challenge = await (this.prisma as any).googleAuthChallenge.deleteMany({
      where: { nonceHash: hashToken(payload.nonce), expiresAt: { gt: new Date() } },
    });
    if (challenge.count !== 1) {
      throw new UnauthorizedException('Google sign-in expired or was already used. Please try again.');
    }

    const googleSubject = payload.sub;
    const email = payload.email.trim().toLowerCase();
    let user = await (this.prisma.user as any).findUnique({ where: { googleSubject } });

    if (user) return this.issueSession(user);

    user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const linkedGoogleSubject = 'googleSubject' in user ? user.googleSubject : null;
      if (linkedGoogleSubject && linkedGoogleSubject !== googleSubject) {
        throw new ConflictException('This email is linked to a different Google account.');
      }
      user = await (this.prisma.user as any).update({
        where: { id: user.id },
        data: { googleSubject },
      });
      return this.issueSession(user);
    }

    const recoveryCode = randomBytes(6).toString('hex').toUpperCase();
    const baseUsername = this.googleUsernameBase(email);
    const passwordHash = await hashPassword(randomBytes(48).toString('hex'));
    const picture = typeof payload.picture === 'string' && payload.picture.startsWith('https://')
      ? payload.picture
      : null;
    const displayName = typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim().slice(0, 80)
      : email.split('@')[0].slice(0, 80);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = randomBytes(4).toString('hex');
      const username = `${baseUsername.slice(0, 21)}_${suffix}`;
      try {
        const createdUser = await (this.prisma.user as any).create({
          data: {
            email,
            username,
            googleSubject,
            passwordHash,
            name: displayName,
            avatarUrl: picture,
            recoveryCodeHash: hashToken(recoveryCode),
          },
        });
        return { ...(await this.issueSession(createdUser)), recoveryCode };
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
          const racedUser = await (this.prisma.user as any).findUnique({ where: { googleSubject } });
          if (racedUser) return this.issueSession(racedUser);
          const emailUser = await this.prisma.user.findUnique({ where: { email } });
          if (emailUser) {
            if (emailUser.googleSubject && emailUser.googleSubject !== googleSubject) {
              throw new ConflictException('This email is linked to a different Google account.');
            }
            const linkedUser = await (this.prisma.user as any).update({
              where: { id: emailUser.id },
              data: { googleSubject },
            });
            return this.issueSession(linkedUser);
          }
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Unable to create a unique username for this Google account. Please try again.');
  }

  private googleUsernameBase(email: string) {
    const localPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '').replace(/^[_.]+|[_.]+$/g, '');
    const base = localPart.length >= 3 ? localPart : `member${localPart}`;
    return base.slice(0, 21);
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

  private buildAuthResponse(user: { id: string; email: string; username: string; name: string; avatarUrl: string | null; tokenVersion: number; interests?: string[] }) {
    const token = this.jwt.sign({ sub: user.id, username: user.username, tokenVersion: user.tokenVersion });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        interests: user.interests ?? [],
      },
    };
  }
}
