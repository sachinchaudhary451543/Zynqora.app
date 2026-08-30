import { Body, Controller, Delete, Get, Param, Post as PostMethod, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CommentsService } from './comments.service';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @PostMethod(':postId/comments')
  create(
    @CurrentUser() user: { userId: string },
    @Param('postId') postId: string,
    @Body() dto: { content: string }
  ) {
    return this.commentsService.create(user.userId, postId, dto.content);
  }

  @Get(':postId/comments')
  getComments(@Param('postId') postId: string) {
    return this.commentsService.getComments(postId);
  }

  @Delete('comments/:commentId')
  delete(@CurrentUser() user: { userId: string }, @Param('commentId') commentId: string) {
    return this.commentsService.delete(user.userId, commentId);
  }
}
