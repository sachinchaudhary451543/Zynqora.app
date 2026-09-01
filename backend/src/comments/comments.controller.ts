import { Body, Controller, Delete, Get, Param, Post as PostMethod, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @PostMethod(':postId/comments')
  create(
    @CurrentUser() user: { userId: string },
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto
  ) {
    return this.commentsService.create(user.userId, postId, dto.content);
  }

  @Get(':postId/comments')
  getComments(@CurrentUser() user: { userId: string }, @Param('postId') postId: string) {
    return this.commentsService.getComments(user.userId, postId);
  }

  @Delete('comments/:commentId')
  delete(@CurrentUser() user: { userId: string }, @Param('commentId') commentId: string) {
    return this.commentsService.delete(user.userId, commentId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class StandaloneCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Delete(':commentId')
  delete(@CurrentUser() user: { userId: string }, @Param('commentId') commentId: string) {
    return this.commentsService.delete(user.userId, commentId);
  }
}
