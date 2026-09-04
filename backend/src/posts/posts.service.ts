import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import {
  assertCanViewByVisibility,
  authorSelect,
  getFollowSets,
  normalizePostVisibility,
  visibleContentWhere,
} from '../common/social-access';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreatePostDto) {
    if (!dto.content && !dto.mediaUrl) {
      throw new BadRequestException('Post needs content or media');
    }

    return this.prisma.post.create({
      data: {
        authorId,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        musicUrl: dto.musicUrl,
        musicType: dto.musicType,
        visibility: normalizePostVisibility(dto.visibility),
      },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  // Feed = posts from people the current user follows, plus their own posts,
  // filtered so FOLLOWERS-only posts require the author to also follow back.
  async getFeed(userId: string, cursor?: string, limit = 20) {
    const { followingIds, mutualIds } = await getFollowSets(this.prisma, userId);

    const posts = await this.prisma.post.findMany({
      where: visibleContentWhere(userId, followingIds, mutualIds),
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      posts,
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    };
  }

  async getUserPosts(username: string, viewerId: string) {
    const { followingIds, mutualIds } = await getFollowSets(this.prisma, viewerId);
    return this.prisma.post.findMany({
      where: {
        author: { username },
        ...visibleContentWhere(viewerId, followingIds, mutualIds),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async delete(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can delete only your own posts');

    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { postId } }),
      this.prisma.like.deleteMany({ where: { postId } }),
      this.prisma.post.delete({ where: { id: postId } }),
    ]);
    return { deleted: true, postId };
  }

  async ensureCanViewPost(viewerId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BadRequestException('Post not found');
    await assertCanViewByVisibility(this.prisma, viewerId, post.authorId, post.visibility);
    return post;
  }
}
