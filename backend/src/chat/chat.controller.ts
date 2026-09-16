import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversation/:username')
  createConversation(@CurrentUser() user: { userId: string }, @Param('username') username: string) {
    return this.chatService.getOrCreateConversation(user.userId, username);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: { userId: string }, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.chatService.getConversations(user.userId, cursor, Number(limit) || 20);
  }

  @Post('conversation/:id/messages')
  postMessage(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() body: CreateMessageDto) {
    return this.chatService.postMessage(id, user.userId, body.content);
  }

  @Get('conversation/:id/messages')
  getMessages(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.chatService.getMessages(id, user.userId);
  }

  @Post('conversation/:id/request/:status')
  updateRequest(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Param('status') status: 'ACCEPTED' | 'REJECTED') {
    if (!['ACCEPTED', 'REJECTED'].includes(status)) throw new Error('Invalid request status');
    return this.chatService.updateRequest(id, user.userId, status);
  }
}
