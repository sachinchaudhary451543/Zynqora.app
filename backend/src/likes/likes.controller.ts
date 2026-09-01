import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { LikesService } from './likes.service';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':postId/like')
  like(@CurrentUser() user: { userId: string }, @Param('postId') postId: string) {
    return this.likesService.like(user.userId, postId);
  }

  @Delete(':postId/like')
  unlike(@CurrentUser() user: { userId: string }, @Param('postId') postId: string) {
    return this.likesService.unlike(user.userId, postId);
  }

  @Get(':postId/likes')
  getLikes(@CurrentUser() user: { userId: string }, @Param('postId') postId: string) {
    return this.likesService.getLikes(user.userId, postId);
  }
}
