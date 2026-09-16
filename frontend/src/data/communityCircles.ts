export interface CommunityCircle {
  id: string;
  name: string;
  count?: number;
  description: string;
  role?: string;
  tone: string;
}

export const COMMUNITY_CIRCLES: CommunityCircle[] = [
  { id: 'all', name: '🌍 Global Sync', description: 'A live stream of the wider Zynqora community.', tone: 'var(--zq-aura-primary)' },
  { id: 'tech', name: '🚀 Tech Innovators', description: 'Build, share, and learn with curious technologists.', role: 'Owner / Creator', tone: 'var(--zq-aura-cyber)' },
  { id: 'family', name: '🏡 Family Sanctuary', description: 'A quieter space for the people closest to you.', role: 'Admin', tone: 'var(--zq-aura-emerald)' },
  { id: 'creative', name: '🎨 Creative Studio', description: 'Ideas, visual experiments, and making things together.', role: 'Active Member', tone: 'var(--zq-aura-electric)' },
  { id: 'gaming', name: '🎮 Gaming Hub', description: 'Find teammates, share wins, and stay in the loop.', tone: 'var(--zq-aura-solar)' },
  { id: 'zen', name: '🌿 Zen & Wellness', description: 'Small rituals and gentle accountability for your day.', tone: 'var(--zq-aura-primary)' },
];
