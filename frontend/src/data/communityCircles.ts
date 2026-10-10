export interface CommunityCircle {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category?: string;
  icon: string | null;
  memberCount: number;
  postCount: number | null;
  isMember: boolean;
  recommended?: boolean;
}

export const COMMUNITY_CIRCLES_CHANGED = 'community-circles-changed';
