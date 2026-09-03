import React, { useEffect, useState } from 'react';
import { api, Post, getAvatarUrl, getDefaultAvatar, resolveMediaUrl } from '../api/client';
import PostCard from '../components/PostCard';
import Suggestions from '../components/Suggestions';
import StoryViewerModal from '../components/StoryViewerModal';
import StoryRecorder from '../components/StoryRecorder';
import { useAuth } from '../context/AuthContext';
import LiveStreamModal from '../components/LiveStreamModal';
import { createRealtimeSocket } from '../realtime';

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
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [liveViewing, setLiveViewing] = useState<any | null>(null);

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

  useEffect(() => {
    const socket = createRealtimeSocket();
    socket.on('live:list', setLiveRooms);
    socket.on('live:ended', ({ broadcasterId }) => setLiveRooms((rooms) => rooms.filter((room) => room.broadcasterId !== broadcasterId)));
    return () => { socket.disconnect(); };
  }, []);


  const storiesToShow = activeStories.length > 0 ? activeStories : sampleStories;
  // Render one ring per author, while keeping every active story in that
  // author's group for the viewer to play in sequence.
  const storyGroups = Array.from(
    (storiesToShow.reduce((groups, story) => {
      const authorKey = story.author?.id || story.author?.username || story.title || story.authorName || story.id;
      const group = groups.get(authorKey) || [];
      group.push(story);
      groups.set(authorKey, group);
      return groups;
    }, new Map<string, any[]>()) as Map<string, any[]>).values(),
  );
  const userAvatar = getAvatarUrl(user);

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

        {liveRooms.length > 0 && <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0 14px' }}>
          {liveRooms.filter((room) => room.broadcasterId !== user?.id).map((room) => <button type="button" key={room.broadcasterId} className="zq-btn-glass" onClick={() => setLiveViewing({ room, broadcaster: false })}>🔴 {room.title}</button>)}
        </div>}

        {/* Aura Stories Tray */}
        <div className="zq-aura-tray">
          {/* User Add Story */}
          <div
            className="zq-story-item"
            onClick={() => setShowStoryRecorder(true)}
            title="Create an Aura Moment"
          >
            <div className="zq-story-card">
              <img
                src={userAvatar}
                alt="My Aura"
                className="zq-story-preview"
                style={{ filter: 'blur(4px) brightness(0.5)', transform: 'scale(1.08)' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = getDefaultAvatar(user?.name || user?.username);
                }}
              />
              <div className="zq-story-overlay" />
              <div className="zq-story-glow-ring" style={{ background: 'rgba(0,223,216,0.25)', border: '2px dashed rgba(0,223,216,0.7)' }}>
                <img
                  src={userAvatar}
                  alt="My Aura"
                  className="zq-story-inner-avatar"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = getDefaultAvatar(user?.name || user?.username);
                  }}
                />
              </div>
              {/* Plus icon */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -28%)',
                fontSize: '22px',
                color: 'rgba(0,223,216,0.9)',
                fontWeight: 900,
                textShadow: '0 0 8px rgba(0,223,216,0.8)',
                zIndex: 3,
                lineHeight: 1,
              }}>+</div>
            </div>
            {/* Username OUTSIDE card so it's never clipped */}
            <span className="zq-story-username" style={{ color: 'var(--zq-accent-cyan)' }}>+ Add Aura</span>
          </div>

          {/* Stories */}
          {storyGroups.map((group, groupIndex) => {
            const story = group[0];
            const storyAvatar = getAvatarUrl({
              name: story.author?.name || story.authorName,
              username: story.author?.username || story.title,
              profileImage: story.author?.profileImage,
              avatarUrl: story.author?.avatarUrl || story.authorAvatar,
            });
            // Real API stories use 'videoUrl' + 'thumbnail'; sample stories use 'mediaUrl'
            const storyPreview = story.thumbnail || story.mediaUrl || story.videoUrl || storyAvatar;
            const storyUsername = story.author?.username || story.title || user?.username || 'Aura';
            // Stories use a legacy `videoUrl` field for both images and videos.
            // Choose the element from the actual media extension so uploaded
            // photos are not rendered inside a <video> tag.
            const mediaUrl = story.videoUrl || story.mediaUrl || story.thumbnail || '';
            const isVideo = /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(mediaUrl);

            return (
              <div
                key={story.id}
                className="zq-story-item"
                onClick={() =>
                  setViewingStory({
                    groups: storyGroups,
                    groupIndex,
                    storyIndex: 0,
                  })
                }
              >
                <div className="zq-story-card">
                  {/* Story preview — use thumbnail/image if available, otherwise video */}
                  {isVideo ? (
                    <video
                      src={resolveMediaUrl(mediaUrl)}
                      className="zq-story-preview"
                      muted
                      playsInline
                      preload="metadata"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={resolveMediaUrl(storyPreview)}
                      alt={storyUsername}
                      className="zq-story-preview"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = getDefaultAvatar(story.author?.name || story.author?.username || story.title);
                      }}
                    />
                  )}
                  <div className="zq-story-overlay" />
                  {/* Author avatar ring */}
                  <div className="zq-story-glow-ring">
                    <img
                      src={storyAvatar}
                      alt={storyUsername}
                      className="zq-story-inner-avatar"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = getDefaultAvatar(story.author?.name || story.title);
                      }}
                    />
                  </div>
                </div>
                {/* Username OUTSIDE card so it's never clipped by overflow:hidden */}
                <span className="zq-story-username">{storyUsername}</span>
              </div>
            );
          })}
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
        {liveViewing && <LiveStreamModal room={liveViewing.room} broadcaster={false} onClose={() => setLiveViewing(null)} />}

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
