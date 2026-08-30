import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(userAId: string, userBUsername: string) {
    const userB = await this.prisma.user.findUnique({ where: { username: userBUsername }, select: { id: true } });
    if (!userB) throw new NotFoundException('User not found');

    // find conversation that has both participants
    const conv = await (this.prisma as any).conversation.findFirst({
      where: {
        participants: { some: { userId: userAId } },
      },
      include: { participants: true },
    });

    // simple approach: always create a new conversation for pair (could be optimized)
    const created = await (this.prisma as any).conversation.create({
      data: {
        participants: { create: [{ userId: userAId }, { userId: userB.id }] },
      },
      include: { participants: true },
    });
    return created;
  }

  async postMessage(conversationId: string, senderId: string, content: string) {
    return (this.prisma as any).message.create({ data: { conversationId, senderId, content } });
  }

  async getMessages(conversationId: string) {
    return (this.prisma as any).message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, include: { sender: true } });
  }
}
