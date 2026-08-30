import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

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
        visibility: dto.visibility ?? 'FOLLOWERS',
      },
      include: {
        author: { select: { username: true, name: true, avatarUrl: true, profileImage: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  // Feed = posts from people the current user follows, plus their own posts,
  // filtered so FOLLOWERS-only posts require the author to also follow back.
  async getFeed(userId: string, cursor?: string, limit = 20) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    const authorIds = [...followingIds, userId];

    const posts = await this.prisma.post.findMany({
      where: { authorId: { in: authorIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: { username: true, name: true, avatarUrl: true, profileImage: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      posts,
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    };
  }

  async getUserPosts(username: string) {
    return this.prisma.post.findMany({
      where: { author: { username } },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { username: true, name: true, avatarUrl: true, profileImage: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }
}
