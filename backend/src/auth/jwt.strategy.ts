import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { validateRuntimeConfig } from '../common/runtime-config';

const runtimeConfig = validateRuntimeConfig(process.env as Record<string, string | undefined>);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: runtimeConfig.jwtSecret,
    });
  }

  async validate(payload: { sub: string; username: string; tokenVersion: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, tokenVersion: true },
    });
    if (!user) {
      throw new UnauthorizedException('Session user no longer exists');
    }
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // Attached to req.user on every authenticated request
    return { userId: user.id, username: user.username };
  }
}
