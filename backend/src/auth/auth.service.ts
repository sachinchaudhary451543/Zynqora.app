import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;
const prismaClient = new PrismaClient();

function hashPassword(password: string) {
  const salt = createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex');
  const hash = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return `${salt}:${hash}`;
}

function comparePassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async signup(dto: SignupDto) {
    const existing = await prismaClient.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = hashPassword(dto.password);

    const user = await prismaClient.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        name: dto.name,
        passwordHash,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await prismaClient.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = comparePassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: { id: string; email: string; username: string; name: string; avatarUrl: string | null }) {
    const token = this.jwt.sign({ sub: user.id, username: user.username });
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
