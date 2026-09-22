import React, { useState, useEffect } from 'react';
import { api, getAvatarUrl, getDefaultAvatar, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StoryRecorder from '../components/StoryRecorder';
import StoryViewerModal from '../components/StoryViewerModal';
import { AuraSparkIcon } from '../components/Icons';

interface StoryItem {
  id: string;
  title: string;
  mediaUrl: string;
  type?: string;
  authorName?: string;
  authorAvatar?: string;
  vibe?: string;
  caption?: string;
  createdAt?: string;
  videoUrl?: string;
  thumbnail?: string;
  author?: {
    id?: string;
    name?: string;
    username?: string;
    profileImage?: string;
    avatarUrl?: string;
  };
}

export default function AuraPage() {
  const { user } = useAuth();
  const [activeStories, setActiveStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedVibeFilter, setSelectedVibeFilter] = useState('ALL');
  const [viewingStory, setViewingStory] = useState<{
    groups: StoryItem[][];
    groupIndex: number;
    storyIndex: number;
  } | null>(null);

  // High-fidelity fallback sample stories if no live user stories exist yet
  const sampleStories: StoryItem[] = [
    {
      id: 'aura-s1',
      title: 'alexrivera',
      authorName: 'Alex Rivera',
      vibe: '⚡ In the Zone',
      caption: 'Building the next evolution of social networks 🚀',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&fit=crop',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'aura-s2',
      title: 'sarahchen',
      authorName: 'Sarah Chen',
      vibe: '✨ Deep Flow',
      caption: 'Studio lighting setup is finally tuned! Late night editing session.',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&fit=crop',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: 'aura-s3',
      title: 'elena_sound',
      authorName: 'Elena Rostova',
      vibe: '🎧 Audio & Music',
      caption: 'Testing analog synths for tomorrow’s live stream broadcast 🎹',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&fit=crop',
      createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
    {
      id: 'aura-s4',
      title: 'david_k',
      authorName: 'David Kim',
      vibe: '🔥 High Energy',
      caption: 'Sprint finish with the community! 4.2k lines of code shipped.',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&fit=crop',
      createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
    {
      id: 'aura-s5',
      title: 'maya_design',
      authorName: 'Maya Patel',
      vibe: '🌙 Night Owl',
      caption: 'Neon aesthetics and dark glassmorphism. Loving this vibe.',
      authorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&fit=crop',
      createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    },
  ];

  const loadStories = async () => {
    try {
      setLoading(true);
      const res = await api.getActiveStories();
      setActiveStories(res && res.length > 0 ? res : []);
    } catch {
      setActiveStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const displayedStories = activeStories.length > 0 ? activeStories : sampleStories;

  // Filter by vibe if selected
  const filteredStories = selectedVibeFilter === 'ALL'
    ? displayedStories
    : displayedStories.filter((s) => s.vibe?.toLowerCase().includes(selectedVibeFilter.toLowerCase()) || s.caption?.toLowerCase().includes(selectedVibeFilter.toLowerCase()));

  // Group stories by author
  const storyGroups = Array.from(
    (filteredStories.reduce((groups, story) => {
      const authorKey = story.author?.id || story.author?.username || story.title || story.authorName || story.id;
      const group = groups.get(authorKey) || [];
      group.push(story);
      groups.set(authorKey, group);
      return groups;
    }, new Map<string, any[]>()) as Map<string, any[]>).values(),
  );

  const userAvatar = getAvatarUrl(user);

  // Check if current user has an active story
  const myStories = activeStories.filter(
    (s) => s.author?.id === user?.id || s.author?.username === user?.username
  );

  const vibes = [
    { id: 'ALL', label: 'All Auras', icon: '✨' },
    { id: 'zone', label: 'In the Zone', icon: '⚡' },
    { id: 'flow', label: 'Deep Flow', icon: '🌊' },
    { id: 'energy', label: 'High Energy', icon: '🔥' },
    { id: 'music', label: 'Sound & Music', icon: '🎧' },
    { id: 'night', label: 'Night Owl', icon: '🌙' },
  ];

  return (
    <div className="zq-aura-page-wrapper">
      {/* Top App Header */}
      <div className="zq-aura-page-header">
        <div className="zq-aura-page-branding">
          <div className="zq-aura-pulse-gem">
            <AuraSparkIcon size={24} active={true} style={{ color: '#00dfd8' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="zq-aura-page-title">Aura Moments</h1>
              <span className="zq-aura-live-badge">24H EPHEMERAL</span>
            </div>
            <p className="zq-aura-page-subtitle">
              Broadcast live vibe snaps, short video moments, and statuses to your circles
            </p>
          </div>
        </div>

        {/* Action Button: Post to Aura */}
        <button
          type="button"
          className="zq-aura-post-trigger-btn"
          onClick={() => setShowRecorder(true)}
        >
          <span style={{ fontSize: '18px' }}>⚡</span>
          <span>Post Your Aura</span>
        </button>
      </div>

      {/* Vibe Category Filter Pills */}
      <div className="zq-aura-filters-bar">
        {vibes.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`zq-aura-filter-pill ${selectedVibeFilter === v.id ? 'active' : ''}`}
            onClick={() => setSelectedVibeFilter(v.id)}
          >
            <span>{v.icon}</span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* Main Social Media App Feed / Grid */}
      <div className="zq-aura-feed-grid">
        {/* Card 1: Your Own Aura Status & Creation Card */}
        <div
          className="zq-aura-card zq-aura-user-card"
          onClick={() => setShowRecorder(true)}
        >
          <div className="zq-aura-card-inner">
            <div className="zq-aura-avatar-ring-large">
              <img
                src={userAvatar}
                alt={user?.name || 'Your Aura'}
                className="zq-aura-avatar-img"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = getDefaultAvatar(user?.name || user?.username);
                }}
              />
              <div className="zq-aura-plus-badge">+</div>
            </div>

            <div className="zq-aura-user-info">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                {myStories.length > 0 ? 'Your Aura is Live' : 'Share Your Aura'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8892b0' }}>
                {myStories.length > 0
                  ? `${myStories.length} active moment${myStories.length > 1 ? 's' : ''} • Tap to add another`
                  : 'Tap to capture photo or record a 15s vibe clip'}
              </p>
            </div>

            <button
              type="button"
              className="zq-aura-quick-create-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowRecorder(true);
              }}
            >
              <span>📸</span> Open Camera
            </button>
          </div>
        </div>

        {/* Stories from Friends & Community */}
        {storyGroups.map((group, groupIndex) => {
          const story = group[0];
          const storyAvatar = getAvatarUrl({
            name: story.author?.name || story.authorName,
            username: story.author?.username || story.title,
            profileImage: story.author?.profileImage,
            avatarUrl: story.author?.avatarUrl || story.authorAvatar,
          });
          const mediaUrl = story.videoUrl || story.mediaUrl || story.thumbnail || '';
          const isVideo = /\.(mp4|webm|mov|m4v|m3u8)(?:[?#].*)?$/i.test(mediaUrl);
          const authorName = story.author?.name || story.authorName || story.author?.username || story.title || 'Creator';
          const username = story.author?.username || story.title || 'aura';
          const vibe = story.vibe || '⚡ In the Zone';

          return (
            <div
              key={story.id || groupIndex}
              className="zq-aura-card zq-aura-story-card"
              onClick={() => {
                setViewingStory({
                  groups: storyGroups,
                  groupIndex,
                  storyIndex: 0,
                });
              }}
            >
              <div className="zq-aura-card-media-wrap">
                {isVideo ? (
                  <video
                    src={resolveMediaUrl(mediaUrl)}
                    muted
                    playsInline
                    preload="metadata"
                    className="zq-aura-card-media"
                  />
                ) : (
                  <img
                    src={resolveMediaUrl(mediaUrl || storyAvatar)}
                    alt={authorName}
                    className="zq-aura-card-media"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = getDefaultAvatar(authorName);
                    }}
                  />
                )}

                {/* Gradient Dark Overlay */}
                <div className="zq-aura-card-overlay" />

                {/* Top Author Tag & Avatar */}
                <div className="zq-aura-card-top">
                  <div className="zq-aura-author-tag">
                    <div className="zq-aura-mini-avatar-ring">
                      <img
                        src={storyAvatar}
                        alt={authorName}
                        className="zq-aura-mini-avatar"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = getDefaultAvatar(authorName);
                        }}
                      />
                    </div>
                    <div className="zq-aura-author-text">
                      <span className="zq-aura-author-name">{authorName}</span>
                      <span className="zq-aura-author-handle">@{username}</span>
                    </div>
                  </div>

                  {group.length > 1 && (
                    <span className="zq-aura-multi-count">
                      {group.length} clips
                    </span>
                  )}
                </div>

                {/* Floating Vibe Badge */}
                <div className="zq-aura-card-vibe-pill">
                  {vibe}
                </div>

                {/* Bottom Story Caption & Watch CTA */}
                <div className="zq-aura-card-bottom">
                  {story.caption && (
                    <p className="zq-aura-card-caption">
                      {story.caption}
                    </p>
                  )}
                  <div className="zq-aura-watch-bar">
                    <span style={{ fontSize: '11px', color: '#00dfd8' }}>Tap to view story</span>
                    <span className="zq-aura-play-triangle">▶</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Story Recorder Modal */}
      {showRecorder && (
        <StoryRecorder
          onSaved={() => {
            setShowRecorder(false);
            loadStories();
          }}
          onClose={() => setShowRecorder(false)}
        />
      )}

      {/* Immersive Story Viewer Modal */}
      {viewingStory && (
        <StoryViewerModal
          story={viewingStory}
          onClose={() => setViewingStory(null)}
        />
      )}
    </div>
  );
}
