import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CirclesService } from './circles.service';

@UseGuards(JwtAuthGuard)
@Controller('circles')
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.circlesService.list(user.userId);
  }

  @Post(':slug/join')
  join(@CurrentUser() user: { userId: string }, @Param('slug') slug: string) {
    return this.circlesService.join(user.userId, slug);
  }

  @Delete(':slug/leave')
  leave(@CurrentUser() user: { userId: string }, @Param('slug') slug: string) {
    return this.circlesService.leave(user.userId, slug);
  }
}
