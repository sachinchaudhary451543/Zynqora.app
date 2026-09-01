import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() body: { videoUrl: string; thumbnail?: string; caption?: string; visibility?: string }) {
    return this.storiesService.createStory(user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  active(@CurrentUser() user: { userId: string }) {
    return this.storiesService.getActiveStories(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username')
  forUser(@CurrentUser() user: { userId: string }, @Param('username') username: string) {
    return this.storiesService.getActiveStoriesForUser(username, user.userId);
  }
}
