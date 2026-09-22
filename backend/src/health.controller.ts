import { Controller, Get, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Get('live')
  live() {
    return { status: 'ok', service: 'family-app', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected', service: 'family-app', timestamp: new Date().toISOString() };
    } catch (error) {
      this.logger.error('Readiness database check failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException({
        status: 'not_ready',
        database: 'disconnected',
        service: 'family-app',
        timestamp: new Date().toISOString(),
        error: 'Database unavailable',
      });
    }
  }

  @Get('db')
  async database() {
    return this.ready();
  }
}
