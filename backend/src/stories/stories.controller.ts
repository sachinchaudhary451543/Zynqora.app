import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
  active() {
    return this.storiesService.getActiveStories();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username')
  forUser(@Body() body: any) {
    // note: route param will be handled client side; return empty - client should call GET /stories/active or /stories/:username
    return [];
  }
}
