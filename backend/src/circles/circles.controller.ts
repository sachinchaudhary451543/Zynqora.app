import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CirclesService } from './circles.service';
import { CreateCircleEventDto } from './dto/create-circle-event.dto';
import { PromptParticipationDto } from './dto/prompt-participation.dto';
import { CreateCircleDto } from './dto/create-circle.dto';
import { SubmitCircleGameDto } from './dto/submit-circle-game.dto';

@UseGuards(JwtAuthGuard)
@Controller('circles')
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.circlesService.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() body: CreateCircleDto) {
    return this.circlesService.create(user.userId, body);
  }

  @Get(':slug')
  details(@CurrentUser() user: { userId: string }, @Param('slug') slug: string) {
    return this.circlesService.getDetails(user.userId, slug);
  }

  @Post(':slug/events')
  createEvent(
    @CurrentUser() user: { userId: string },
    @Param('slug') slug: string,
    @Body() body: CreateCircleEventDto,
  ) {
    return this.circlesService.createEvent(user.userId, slug, body);
  }

  @Post(':slug/events/:eventId/rsvp')
  joinEvent(
    @CurrentUser() user: { userId: string },
    @Param('slug') slug: string,
    @Param('eventId') eventId: string,
  ) {
    return this.circlesService.joinEvent(user.userId, slug, eventId);
  }

  @Delete(':slug/events/:eventId/rsvp')
  leaveEvent(
    @CurrentUser() user: { userId: string },
    @Param('slug') slug: string,
    @Param('eventId') eventId: string,
  ) {
    return this.circlesService.leaveEvent(user.userId, slug, eventId);
  }

  @Get(':slug/events/:eventId/game')
  getEventGame(
    @CurrentUser() user: { userId: string },
    @Param('slug') slug: string,
    @Param('eventId') eventId: string,
  ) {
    return this.circlesService.getEventGame(user.userId, slug, eventId);
  }

  @Post(':slug/events/:eventId/game/submission')
  submitEventGame(
    @CurrentUser() user: { userId: string },
    @Param('slug') slug: string,
    @Param('eventId') eventId: string,
    @Body() body: SubmitCircleGameDto,
  ) {
    return this.circlesService.submitEventGame(user.userId, slug, eventId, body.answers);
  }

  @Post(':slug/posts/:postId/pin')
  pinPost(@CurrentUser() user: { userId: string }, @Param('slug') slug: string, @Param('postId') postId: string) {
    return this.circlesService.pinPost(user.userId, slug, postId);
  }

  @Delete(':slug/posts/:postId/pin')
  unpinPost(@CurrentUser() user: { userId: string }, @Param('slug') slug: string, @Param('postId') postId: string) {
    return this.circlesService.unpinPost(user.userId, slug, postId);
  }

  @Post(':slug/prompts/:promptId/participation')
  setPromptParticipation(
    @CurrentUser() user: { userId: string },
    @Param('slug') slug: string,
    @Param('promptId') promptId: string,
    @Body() body: PromptParticipationDto,
  ) {
    return this.circlesService.setPromptParticipation(user.userId, slug, promptId, body.participating);
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
