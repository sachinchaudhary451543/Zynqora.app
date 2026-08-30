import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createStory(authorId: string, data: { videoUrl: string; thumbnail?: string; caption?: string; visibility?: string }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return this.prisma.story.create({
      data: {
        authorId,
        videoUrl: data.videoUrl,
        thumbnail: data.thumbnail,
        caption: data.caption,
        visibility: data.visibility ?? 'FOLLOWERS',
        expiresAt,
      },
    });
  }

  async getStoriesForUser(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return [];
    const now = new Date();
    return this.prisma.story.findMany({
      where: { authorId: user.id, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveStories(viewerId?: string) {
    const now = new Date();
    // For now return all non-expired stories; visibility enforcement can be added
    return this.prisma.story.findMany({ where: { expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } });
  }
}
