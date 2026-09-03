import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const POST_VISIBILITIES = ['CIRCLE', 'TREE', 'FOLLOWERS'] as const;
export type PostVisibility = (typeof POST_VISIBILITIES)[number];

export const PROFILE_VISIBILITIES = ['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  profileImage: true,
};

export function normalizePostVisibility(visibility?: string | null): PostVisibility {
  return POST_VISIBILITIES.includes(visibility as PostVisibility) ? (visibility as PostVisibility) : 'TREE';
}

export function normalizeProfileVisibility(visibility?: string | null): ProfileVisibility {
  return PROFILE_VISIBILITIES.includes(visibility as ProfileVisibility) ? (visibility as ProfileVisibility) : 'PUBLIC';
}

export async function getFollowSets(prisma: PrismaService, viewerId: string) {
  const [following, followers] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
    prisma.follow.findMany({ where: { followingId: viewerId }, select: { followerId: true } }),
  ]);

  const followingIds = following.map((follow) => follow.followingId);
  const followerIds = new Set(followers.map((follow) => follow.followerId));
  const mutualIds = followingIds.filter((id) => followerIds.has(id));

  return { followingIds, mutualIds };
}

export async function isMutualFollow(prisma: PrismaService, userAId: string, userBId: string) {
  const [aFollowsB, bFollowsA] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userAId, followingId: userBId } },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userBId, followingId: userAId } },
    }),
  ]);
  return Boolean(aFollowsB && bFollowsA);
}

export async function canViewByVisibility(
  prisma: PrismaService,
  viewerId: string,
  authorId: string,
  visibility?: string | null,
) {
  if (viewerId === authorId) return true;

  const normalized = normalizePostVisibility(visibility);
  if (normalized === 'TREE') return true;

  const viewerFollowsAuthor = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: authorId } },
  });
  if (!viewerFollowsAuthor) return false;

  if (normalized === 'FOLLOWERS') return true;
  return isMutualFollow(prisma, viewerId, authorId);
}

export async function assertCanViewByVisibility(
  prisma: PrismaService,
  viewerId: string,
  authorId: string,
  visibility?: string | null,
) {
  if (!(await canViewByVisibility(prisma, viewerId, authorId, visibility))) {
    throw new ForbiddenException('You cannot access this content');
  }
}

export function visibleContentWhere(viewerId: string, followingIds: string[], mutualIds: string[]) {
  return {
    OR: [
      { authorId: viewerId },
      { visibility: 'TREE' },
      { visibility: 'FOLLOWERS', authorId: { in: followingIds } },
      { visibility: 'CIRCLE', authorId: { in: mutualIds } },
    ],
  };
}
