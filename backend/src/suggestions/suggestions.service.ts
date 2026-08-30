import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(userId: string, limit = 5) {
    // Get users that the current user doesn't follow and who aren't themselves
    const suggestions = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        followedBy: {
          none: { followerId: userId },
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        profileImage: true,
        bio: true,
        avatarUrl: true,
        _count: {
          select: { posts: true, followedBy: true },
        },
      },
      take: limit,
      orderBy: { followedBy: { _count: 'desc' } }, // Most popular first
    });

    return suggestions;
  }
}
