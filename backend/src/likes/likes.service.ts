import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
  ) {}

  async like(userId: string, postId: string) {
    await this.postsService.ensureCanViewPost(userId, postId);

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

  async getLikes(viewerId: string, postId: string) {
    await this.postsService.ensureCanViewPost(viewerId, postId);
    const [count, likes] = await Promise.all([
      this.prisma.like.count({ where: { postId } }),
      this.prisma.like.findMany({
        where: { postId },
        take: 100,
        include: { user: { select: { id: true, username: true, name: true } } },
      }),
    ]);
    return { count, likes };
  }
}
