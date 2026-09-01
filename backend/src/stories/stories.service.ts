import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { authorSelect, getFollowSets, normalizePostVisibility, visibleContentWhere } from '../common/social-access';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private isForeignKeyError(error: unknown) {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2003';
  }

  async createStory(authorId: string, data: { videoUrl: string; thumbnail?: string; caption?: string; visibility?: string }) {
    // A JWT can outlive a deleted account. Reject malformed subjects before
    // they reach SQLite, where the resulting foreign-key error is otherwise
    // reported as an opaque 500 response.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authorId)) {
      throw new UnauthorizedException('Invalid session');
    }
    let author: { id: string } | null = null;
    try {
      author = await this.prisma.user.findUnique({ where: { id: authorId }, select: { id: true } });
    } catch (error) {
      if (this.isForeignKeyError(error)) {
        throw new UnauthorizedException('Session user no longer exists');
      }
      throw error;
    }
    if (!author) throw new UnauthorizedException('Session user no longer exists');
    if (!data.videoUrl?.trim()) throw new BadRequestException('Story video URL is required');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    try {
      return await this.prisma.story.create({
        data: {
          authorId,
          videoUrl: data.videoUrl.trim(),
          thumbnail: data.thumbnail,
          caption: data.caption,
          visibility: normalizePostVisibility(data.visibility),
          expiresAt,
        },
        include: {
          author: { select: authorSelect },
        },
      });
    } catch (error) {
      if (this.isForeignKeyError(error)) {
        throw new UnauthorizedException('Session user no longer exists');
      }
      throw error;
    }
  }

  async getStoriesForUser(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return [];
    const now = new Date();
    return this.prisma.story.findMany({
      where: { authorId: user.id, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: authorSelect },
      },
    });
  }

  async getActiveStories(viewerId: string) {
    const now = new Date();
    const { followingIds, mutualIds } = await getFollowSets(this.prisma, viewerId);
    return this.prisma.story.findMany({
      where: { expiresAt: { gt: now }, ...visibleContentWhere(viewerId, followingIds, mutualIds) },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: authorSelect },
      },
    });
  }

  async getActiveStoriesForUser(username: string, viewerId: string) {
    const now = new Date();
    const { followingIds, mutualIds } = await getFollowSets(this.prisma, viewerId);
    return this.prisma.story.findMany({
      where: {
        author: { username },
        expiresAt: { gt: now },
        ...visibleContentWhere(viewerId, followingIds, mutualIds),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: authorSelect },
      },
    });
  }
}
