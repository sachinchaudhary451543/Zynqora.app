import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() body: CreateStoryDto) {
    return this.storiesService.createStory(user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  active(@CurrentUser() user: { userId: string }, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.storiesService.getActiveStories(user.userId, cursor, Number(limit) || 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username')
  forUser(@CurrentUser() user: { userId: string }, @Param('username') username: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.storiesService.getActiveStoriesForUser(username, user.userId, cursor, Number(limit) || 20);
  }
}
