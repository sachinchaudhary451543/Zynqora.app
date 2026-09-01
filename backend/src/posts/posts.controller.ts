import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.userId, dto);
  }

  @Get('feed')
  getFeed(@CurrentUser() user: { userId: string }, @Query('cursor') cursor?: string) {
    return this.postsService.getFeed(user.userId, cursor);
  }

  @Get('user/:username')
  getUserPosts(@CurrentUser() user: { userId: string }, @Param('username') username: string) {
    return this.postsService.getUserPosts(username, user.userId);
  }
}
