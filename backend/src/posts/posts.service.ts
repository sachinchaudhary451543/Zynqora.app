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
import { buildCursorPageArgs } from '../common/pagination';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreatePostDto) {
    if (!dto.content && !dto.mediaUrl) {
      throw new BadRequestException('Post needs content or media');
    }

    let resolvedCircleId: string | null = null;
    if (dto.circleId && dto.circleId !== 'all' && dto.circleId !== 'global') {
      const circle = await this.prisma.circle.findFirst({
        where: {
          OR: [
            { id: dto.circleId },
            { slug: dto.circleId },
          ],
        },
        select: { id: true },
      });
      if (circle) {
        resolvedCircleId = circle.id;
      }
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
        circleId: resolvedCircleId,
      },
      include: {
        author: { select: authorSelect },
        circle: { select: { id: true, slug: true, name: true, icon: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  // Feed = posts from people the current user follows, plus their own posts,
  // filtered so FOLLOWERS-only posts require the author to also follow back.
  async getFeed(userId: string, cursor?: string, limit = 20, circle?: string) {
    const { followingIds, mutualIds } = await getFollowSets(this.prisma, userId);
    const page = buildCursorPageArgs({ cursor, limit, maxLimit: 50 });

    const baseWhere = visibleContentWhere(userId, followingIds, mutualIds);
    let where: any = baseWhere;

    if (circle && circle !== 'all') {
      where = {
        AND: [
          baseWhere,
          {
            OR: [
              { circleId: circle },
              { circle: { slug: circle } },
            ],
          },
        ],
      };
    }

    const posts = await this.prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...page,
      include: {
        author: { select: authorSelect },
        circle: { select: { id: true, slug: true, name: true, icon: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      posts,
      nextCursor: posts.length === page.take ? posts[posts.length - 1].id : null,
    };
  }

  async getUserPosts(username: string, viewerId: string, cursor?: string, limit = 20) {
    const { followingIds, mutualIds } = await getFollowSets(this.prisma, viewerId);
    const page = buildCursorPageArgs({ cursor, limit, maxLimit: 50 });

    const posts = await this.prisma.post.findMany({
      where: {
        author: { username },
        ...visibleContentWhere(viewerId, followingIds, mutualIds),
      },
      orderBy: { createdAt: 'desc' },
      ...page,
      include: {
        author: { select: authorSelect },
        circle: { select: { id: true, slug: true, name: true, icon: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return {
      posts,
      nextCursor: posts.length === page.take ? posts[posts.length - 1].id : null,
    };
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
