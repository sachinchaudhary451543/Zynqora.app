import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversation/:username')
  createConversation(@CurrentUser() user: { userId: string }, @Param('username') username: string) {
    return this.chatService.getOrCreateConversation(user.userId, username);
  }

  @Post('conversation/:id/messages')
  postMessage(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() body: { content: string }) {
    return this.chatService.postMessage(id, user.userId, body.content);
  }

  @Get('conversation/:id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }
}
