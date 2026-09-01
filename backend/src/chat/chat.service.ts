import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isMutualFollow } from '../common/social-access';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(userAId: string, userBUsername: string) {
    const userB = await this.prisma.user.findUnique({ where: { username: userBUsername }, select: { id: true } });
    if (!userB) throw new NotFoundException('User not found');
    if (userAId === userB.id) throw new ForbiddenException('Cannot create a conversation with yourself');
    if (!(await isMutualFollow(this.prisma, userAId, userB.id))) {
      throw new ForbiddenException('Chat is available only between mutual followers');
    }

    const existing = await (this.prisma as any).conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: userAId } } },
          { participants: { some: { userId: userB.id } } },
        ],
      },
      include: { participants: true },
    });
    if (existing) return existing;

    return (this.prisma as any).conversation.create({
      data: {
        participants: { create: [{ userId: userAId }, { userId: userB.id }] },
      },
      include: { participants: true },
    });
  }

  async postMessage(conversationId: string, senderId: string, content: string) {
    await this.ensureParticipant(conversationId, senderId);
    const text = (content || '').trim();
    if (!text) throw new ForbiddenException('Message cannot be empty');
    return (this.prisma as any).message.create({ data: { conversationId, senderId, content: text } });
  }

  async getMessages(conversationId: string, viewerId: string) {
    await this.ensureParticipant(conversationId, viewerId);
    return (this.prisma as any).message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true },
    });
  }

  private async ensureParticipant(conversationId: string, userId: string) {
    const participant = await (this.prisma as any).conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this conversation');
  }
}
