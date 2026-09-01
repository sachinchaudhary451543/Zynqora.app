import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
  ) {}

  async create(authorId: string, postId: string, content: string) {
    await this.postsService.ensureCanViewPost(authorId, postId);
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('Comment cannot be empty');

    return this.prisma.comment.create({
      data: { authorId, postId, content: text },
      include: {
        author: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } },
      },
    });
  }

  async getComments(viewerId: string, postId: string) {
    await this.postsService.ensureCanViewPost(viewerId, postId);
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
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { authorId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId && comment.post.authorId !== userId) {
      throw new UnauthorizedException('Cannot delete this comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }
}
