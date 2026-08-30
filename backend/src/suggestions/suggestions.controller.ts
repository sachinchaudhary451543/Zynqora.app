import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SuggestionsService } from './suggestions.service';

@UseGuards(JwtAuthGuard)
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get()
  getSuggestions(@CurrentUser() user: { userId: string }) {
    return this.suggestionsService.getSuggestions(user.userId);
  }
}
