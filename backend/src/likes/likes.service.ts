import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async like(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    await this.prisma.like.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });

    return { liked: true };
  }

  async unlike(userId: string, postId: string) {
    await this.prisma.like.delete({
      where: { postId_userId: { postId, userId } },
    }).catch(() => null);

    return { liked: false };
  }

  async getLikes(postId: string) {
    const likes = await this.prisma.like.findMany({
      where: { postId },
      include: { user: { select: { id: true, username: true, name: true } } },
    });
    return { count: likes.length, likes };
  }
}
