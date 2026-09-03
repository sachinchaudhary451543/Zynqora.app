import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(userAId: string, userBUsername: string) {
    const userB = await this.prisma.user.findUnique({ where: { username: userBUsername }, select: { id: true } });
    if (!userB) throw new NotFoundException('User not found');
    if (userAId === userB.id) throw new ForbiddenException('Cannot create a conversation with yourself');

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
        status: 'PENDING',
        requesterId: userAId,
        participants: { create: [{ userId: userAId }, { userId: userB.id }] },
      },
      include: { participants: true },
    });
  }

  async updateRequest(conversationId: string, userId: string, status: 'ACCEPTED' | 'REJECTED') {
    const conversation = await (this.prisma as any).conversation.findUnique({ where: { id: conversationId }, include: { participants: true } });
    if (!conversation || !conversation.participants.some((participant: any) => participant.userId === userId)) throw new ForbiddenException('Conversation access denied');
    if (conversation.status !== 'PENDING') return conversation;
    if (status === 'REJECTED' && conversation.requesterId === userId) throw new ForbiddenException('The sender cannot reject their own request');
    return (this.prisma as any).conversation.update({ where: { id: conversationId }, data: { status } });
  }

  async postMessage(conversationId: string, senderId: string, content: string) {
    await this.ensureParticipant(conversationId, senderId);
    const conversation = await (this.prisma as any).conversation.findUnique({ where: { id: conversationId }, select: { status: true } });
    if (conversation?.status === 'REJECTED') throw new ForbiddenException('This chat request was rejected. You may request again later.');
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
