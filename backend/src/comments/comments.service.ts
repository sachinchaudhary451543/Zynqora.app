import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.comment.create({
      data: { authorId, postId, content },
      include: {
        author: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } },
      },
    });
  }

  async getComments(postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } },
      },
    });
    return { count: comments.length, comments };
  }

  async delete(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new UnauthorizedException('Cannot delete this comment');

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }
}
