import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeProfileVisibility } from '../common/social-access';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        profileImage: true,
        bannerImage: true,
        website: true,
        category: true,
        note: true,
        profileVisibility: true,
        followersVisibility: true,
        followingVisibility: true,
        createdAt: true,
        _count: { select: { following: true, followedBy: true, posts: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const relation = viewerId && viewerId !== user.id
      ? await this.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
        })
      : null;
    const profile = { ...user, isFollowing: Boolean(relation) };

    // Owner always sees full profile
    if (viewerId && viewerId === user.id) return profile;

    // PUBLIC profiles are visible
    if (user.profileVisibility === 'PUBLIC') return profile;

    // FOLLOWERS_ONLY: allow only if viewer follows this user
    if (user.profileVisibility === 'FOLLOWERS_ONLY') {
      if (!viewerId) throw new ForbiddenException('Profile is visible to followers only');
      if (relation) return profile;
      throw new ForbiddenException('Profile is visible to followers only');
    }

    // PRIVATE: owner only
    throw new ForbiddenException('Profile is private');
  }

  async updateProfile(userId: string, data: { name?: string; bio?: string; avatarUrl?: string; profileImage?: string | null; bannerImage?: string | null; website?: string; category?: string; note?: string }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;
    if (data.bannerImage !== undefined) updateData.bannerImage = data.bannerImage;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.note !== undefined) updateData.note = data.note;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, username: true, name: true, bio: true, avatarUrl: true, profileImage: true, bannerImage: true, website: true, category: true, note: true },
    });
  }

  async updatePrivacy(userId: string, data: { profileVisibility?: string; followersVisibility?: string; followingVisibility?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        profileVisibility: data.profileVisibility ? normalizeProfileVisibility(data.profileVisibility) : undefined,
        followersVisibility: data.followersVisibility ? normalizeProfileVisibility(data.followersVisibility) : undefined,
        followingVisibility: data.followingVisibility ? normalizeProfileVisibility(data.followingVisibility) : undefined,
      },
      select: { id: true, profileVisibility: true, followersVisibility: true, followingVisibility: true },
    });
  }

  async follow(followerId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === followerId) throw new BadRequestException('Cannot follow yourself');

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId: target.id } },
      create: { followerId, followingId: target.id },
      update: {},
    });

    return { following: true, mutual: await this.isMutual(followerId, target.id) };
  }

  async unfollow(followerId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.follow.deleteMany({
      where: { followerId, followingId: target.id },
    });

    return { following: false };
  }

  async getFollowers(username: string, viewerId?: string) {
    const target = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, followersVisibility: true },
    });
    if (!target) throw new NotFoundException('User not found');

    // Owner can see
    if (viewerId && viewerId === target.id) {
      return this.prisma.follow.findMany({
        where: { followingId: target.id },
        orderBy: { createdAt: 'desc' },
        include: { follower: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
      });
    }

    if (target.followersVisibility === 'PUBLIC') {
      return this.prisma.follow.findMany({
        where: { followingId: target.id },
        orderBy: { createdAt: 'desc' },
        include: { follower: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
      });
    }

    if (target.followersVisibility === 'FOLLOWERS_ONLY') {
      if (!viewerId) throw new ForbiddenException('Followers list is visible to followers only');
      const relation = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: target.id } },
      });
      if (relation) {
        return this.prisma.follow.findMany({
          where: { followingId: target.id },
          orderBy: { createdAt: 'desc' },
          include: { follower: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
        });
      }
      throw new ForbiddenException('Followers list is visible to followers only');
    }

    throw new ForbiddenException('Followers list is private');
  }

  async getFollowing(username: string, viewerId?: string) {
    const target = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, followingVisibility: true },
    });
    if (!target) throw new NotFoundException('User not found');

    // Owner can see
    if (viewerId && viewerId === target.id) {
      return this.prisma.follow.findMany({
        where: { followerId: target.id },
        orderBy: { createdAt: 'desc' },
        include: { following: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
      });
    }

    if (target.followingVisibility === 'PUBLIC') {
      return this.prisma.follow.findMany({
        where: { followerId: target.id },
        orderBy: { createdAt: 'desc' },
        include: { following: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
      });
    }

    if (target.followingVisibility === 'FOLLOWERS_ONLY') {
      if (!viewerId) throw new ForbiddenException('Following list is visible to followers only');
      const relation = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: target.id } },
      });
      if (relation) {
        return this.prisma.follow.findMany({
          where: { followerId: target.id },
          orderBy: { createdAt: 'desc' },
          include: { following: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
        });
      }
      throw new ForbiddenException('Following list is visible to followers only');
    }

    throw new ForbiddenException('Following list is private');
  }

  // Mutual follow is the gate for opening a chat thread between two users.
  async isMutual(userAId: string, userBId: string): Promise<boolean> {
    const [aFollowsB, bFollowsA] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userAId, followingId: userBId } },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userBId, followingId: userAId } },
      }),
    ]);
    return Boolean(aFollowsB && bFollowsA);
  }
}
