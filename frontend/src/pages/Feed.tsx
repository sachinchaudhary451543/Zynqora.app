import React, { useEffect, useState } from 'react';
import { api, Post } from '../api/client';
import PostCard from '../components/PostCard';
import Suggestions from '../components/Suggestions';
import StoryViewerModal from '../components/StoryViewerModal';
import StoryRecorder from '../components/StoryRecorder';
import { useAuth } from '../context/AuthContext';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<string>('all');

  // Stories
  const [activeStories, setActiveStories] = useState<any[]>([]);
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const [showStoryRecorder, setShowStoryRecorder] = useState(false);

  // Preset Community Circles (Qoras)
  const circles = [
    { id: 'all', name: '🌍 Global Sync', count: '14.2k' },
    { id: 'tech', name: '🚀 Tech Innovators', count: '5.4k' },
    { id: 'family', name: '🏡 Family Sanctuary', count: '12' },
    { id: 'creative', name: '🎨 Creative Studio', count: '3.8k' },
    { id: 'gaming', name: '🎮 Gaming Hub', count: '8.1k' },
    { id: 'zen', name: '🌿 Zen & Wellness', count: '2.9k' },
  ];

  const sampleStories = [
    {
      id: 's1',
      title: 'sarahsmith',
      authorName: 'Sarah Smith',
      vibe: '⚡ Focused',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&fit=crop',
    },
    {
      id: 's2',
      title: 'johndoe',
      authorName: 'John Doe',
      vibe: '🔥 Building',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&fit=crop',
    },
    {
      id: 's3',
      title: 'emmajones',
      authorName: 'Emma Jones',
      vibe: '🍕 Chef Vibe',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&fit=crop',
    },
    {
      id: 's4',
      title: 'mikewilson',
      authorName: 'Mike Wilson',
      vibe: '🌲 Nature Flow',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&fit=crop',
    },
    {
      id: 's5',
      title: 'lisabrown',
      authorName: 'Lisa Brown',
      vibe: '✨ Inspired',
      authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop',
      mediaUrl: 'https://images.unsplash.com/photo-1579783902614-e3fb5141b0cb?w=800&fit=crop',
    },
  ];

  const loadFeed = async (cursor?: string, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await api.getFeed(cursor);
      if (append) setPosts((p) => [...p, ...res.posts]);
      else setPosts(res.posts);
      setNextCursor(res.nextCursor);
    } catch (err: any) {
      setError(err.message || 'Failed to load sync stream');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadStories = async () => {
    try {
      const st = await api.getActiveStories();
      if (st && st.length > 0) setActiveStories(st);
    } catch (err) {
      // fallback to sample stories
    }
  };

  useEffect(() => {
    loadFeed();
    loadStories();

    const handleCreated = () => loadFeed();
    window.addEventListener('ig-post-created', handleCreated);
    return () => window.removeEventListener('ig-post-created', handleCreated);
  }, []);

  const storiesToShow = activeStories.length > 0 ? activeStories : sampleStories;
  const userAvatar = user?.profileImage || user?.avatarUrl || '/placeholder-avatar.png';

  // Filter posts if circle is selected
  const filteredPosts = posts.filter((p) => {
    if (selectedCircle === 'all') return true;
    if (selectedCircle === 'tech') return p.content?.toLowerCase().includes('app') || p.content?.toLowerCase().includes('code') || true;
    return true;
  });

  return (
    <div className="zq-feed-container">
      {/* Main Stream Column */}
      <div className="zq-feed-stream">
        {/* Community Circles (Qoras) Bar */}
        <div className="zq-circles-bar">
          {circles.map((c) => (
            <button
              key={c.id}
              className={`zq-circle-pill ${selectedCircle === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCircle(c.id)}
            >
              <span>{c.name}</span>
              <span style={{ fontSize: '10px', opacity: 0.75 }}>({c.count})</span>
            </button>
          ))}
        </div>

        {/* Aura Stories Tray */}
        <div className="zq-aura-tray">
          {/* User Add Story */}
          <div
            className="zq-story-item"
            onClick={() => setShowStoryRecorder(true)}
            title="Create an Aura Moment"
          >
            <div className="zq-story-glow-ring" style={{ background: 'var(--zq-glass-border)' }}>
              <img
                src={userAvatar}
                alt="My Aura"
                className="zq-story-inner-avatar"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="zq-story-username" style={{ color: 'var(--zq-accent-cyan)' }}>+ Add Aura</span>
          </div>

          {/* Stories */}
          {storiesToShow.map((story) => (
            <div
              key={story.id}
              className="zq-story-item"
              onClick={() =>
                setViewingStory({
                  id: story.id,
                  title: story.author?.username || story.title || 'Aura Moment',
                  authorName: story.author?.name || story.authorName,
                  authorAvatar: story.author?.profileImage || story.author?.avatarUrl || story.authorAvatar,
                  mediaUrl: story.videoUrl || story.mediaUrl,
                  type: story.videoUrl ? 'video' : 'image',
                })
              }
            >
              <div className="zq-story-glow-ring">
                <img
                  src={story.author?.profileImage || story.author?.avatarUrl || story.authorAvatar || '/placeholder-avatar.png'}
                  alt={story.title}
                  className="zq-story-inner-avatar"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="zq-story-username">
                {story.author?.username || story.title}
              </span>
            </div>
          ))}
        </div>

        {/* Story Recorder Modal */}
        {showStoryRecorder && (
          <div className="zq-modal-overlay" onClick={() => setShowStoryRecorder(false)}>
            <div className="zq-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="zq-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⚡</span>
                  <span style={{ color: '#fff', fontWeight: 800 }}>Publish Aura Moment / Status</span>
                </div>
                <button className="zq-modal-close-btn" onClick={() => setShowStoryRecorder(false)}>✕</button>
              </div>
              <div style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
                <StoryRecorder
                  onSaved={() => {
                    setShowStoryRecorder(false);
                    loadStories();
                  }}
                  onClose={() => setShowStoryRecorder(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Story Viewer Lightbox */}
        {viewingStory && (
          <StoryViewerModal
            story={viewingStory}
            onClose={() => setViewingStory(null)}
          />
        )}

        {/* Feed Posts Stream */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--zq-text-secondary)' }}>
            <span className="zq-pulse-orb" style={{ display: 'inline-block', marginRight: '8px' }} />
            <span>Synchronizing feed stream...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', color: 'var(--zq-danger)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--zq-glass)',
              borderRadius: '24px',
              border: '1px solid var(--zq-glass-border)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Your Circle is Quiet</h3>
            <p style={{ maxWidth: '340px', margin: '0 auto', fontSize: '13px', color: 'var(--zq-text-secondary)' }}>
              Connect with more people or publish your first update to synchronize your circle!
            </p>
          </div>
        )}

        {filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {nextCursor && (
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <button
              className="zq-btn-glass"
              onClick={() => loadFeed(nextCursor, true)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Syncing...' : 'Load more Syncs'}
            </button>
          </div>
        )}
      </div>

      {/* Right Suggested Connections Sidebar */}
      <Suggestions />
    </div>
  );
}
