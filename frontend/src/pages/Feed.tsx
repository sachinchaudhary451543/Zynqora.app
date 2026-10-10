import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Post, getAvatarUrl, getDefaultAvatar, resolveMediaUrl } from '../api/client';
import PostCard from '../components/PostCard';
import Suggestions from '../components/Suggestions';
import CommunityCirclesBar from '../components/CommunityCirclesBar';
import { useAuth } from '../context/AuthContext';

const StoryRecorder = React.lazy(() => import('../components/StoryRecorder'));
const StoryViewerModal = React.lazy(() => import('../components/StoryViewerModal'));
import LiveStreamModal from '../components/LiveStreamModal';
import { createRealtimeSocket } from '../realtime';

export default function Feed() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<string>(() => searchParams.get('circle') || 'all');

  // Stories
  const [activeStories, setActiveStories] = useState<any[]>([]);
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const [showStoryRecorder, setShowStoryRecorder] = useState(false);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [liveViewing, setLiveViewing] = useState<any | null>(null);

  const loadFeed = async (cursor?: string, append = false, circleId = selectedCircle) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await api.getFeed(cursor, circleId);
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
      setActiveStories(st || []);
    } catch (err) {
      console.error('Failed to load stories', err);
      setActiveStories([]);
    }
  };

  useEffect(() => {
    loadFeed(undefined, false, selectedCircle);
  }, [selectedCircle]);

  useEffect(() => {
    setSelectedCircle(searchParams.get('circle') || 'all');
  }, [searchParams]);

  const selectCircle = (circle: { slug: string }) => {
    const next = new URLSearchParams(searchParams);
    if (circle.slug === 'all') next.delete('circle');
    else next.set('circle', circle.slug);
    setSearchParams(next);
  };

  const clearCircleFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('circle');
    setSearchParams(next);
  };

  useEffect(() => {
    loadStories();

    const handleCreated = () => loadFeed(undefined, false, selectedCircle);
    const handleDeleted = () => loadFeed(undefined, false, selectedCircle);
    window.addEventListener('ig-post-created', handleCreated);
    window.addEventListener('ig-post-deleted', handleDeleted);
    return () => {
      window.removeEventListener('ig-post-created', handleCreated);
      window.removeEventListener('ig-post-deleted', handleDeleted);
    };
  }, [selectedCircle]);

  useEffect(() => {
    const socket = createRealtimeSocket();
    socket.on('live:list', setLiveRooms);
    socket.on('live:ended', ({ broadcasterId }) => setLiveRooms((rooms) => rooms.filter((room) => room.broadcasterId !== broadcasterId)));
    return () => { socket.disconnect(); };
  }, []);


  // Render one ring per author, while keeping every active story in that
  // author's group for the viewer to play in sequence.
  const storyGroups = Array.from(
    (activeStories.reduce((groups, story) => {
      const authorKey = story.author?.id || story.author?.username || story.title || story.authorName || story.id;
      const group = groups.get(authorKey) || [];
      group.push(story);
      groups.set(authorKey, group);
      return groups;
    }, new Map<string, any[]>()) as Map<string, any[]>).values(),
  );
  const userAvatar = getAvatarUrl(user);

  return (
    <div className="zq-feed-container">
      {/* Main Stream Column */}
      <div className="zq-feed-stream">
        {/* Community Circles (Qoras) Bar */}
        <CommunityCirclesBar selectedId={selectedCircle} onSelect={selectCircle} />

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
            const storyPreview = story.thumbnail || story.mediaUrl || story.videoUrl || storyAvatar;
            const storyUsername = story.author?.username || story.title || user?.username || 'Aura';
            // Stories use a legacy `videoUrl` field for both images and videos.
            // Choose the element from the actual media extension so uploaded
            // photos are not rendered inside a <video> tag.
            const mediaUrl = story.videoUrl || story.mediaUrl || story.thumbnail || '';
            const isVideo = /\.(mp4|webm|mov|m4v|m3u8)(?:[?#].*)?$/i.test(mediaUrl);

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
                      preload="none"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={resolveMediaUrl(storyPreview)}
                      alt={storyUsername}
                      className="zq-story-preview"
                      loading="lazy"
                      decoding="async"
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
                      loading="lazy"
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
        {/* Story Recorder Modal */}
        {showStoryRecorder && (
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '500px', color: '#00dfd8', fontSize: '14px', flexDirection: 'column', gap: '12px' }}>
              <span className="zq-pulse-orb" style={{ display: 'inline-block' }} />
              <span>Loading Aura Studio...</span>
            </div>
          }>
            <StoryRecorder
              onSaved={() => {
                setShowStoryRecorder(false);
                loadStories();
              }}
              onClose={() => setShowStoryRecorder(false)}
            />
          </Suspense>
        )}

        {/* Story Viewer Lightbox */}
        {viewingStory && (
          <Suspense fallback={null}>
            <StoryViewerModal
              story={viewingStory}
              onClose={() => setViewingStory(null)}
            />
          </Suspense>
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

        {!loading && posts.length === 0 && (
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
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
              {selectedCircle === 'all' ? 'Your Circle is Quiet' : `${selectedCircle.replace(/[-_]/g, ' ')} has no posts yet`}
            </h3>
            <p style={{ maxWidth: '340px', margin: '0 auto', fontSize: '13px', color: 'var(--zq-text-secondary)' }}>
              {selectedCircle === 'all'
                ? 'Connect with more people or publish your first update to synchronize your circle!'
                : 'You are viewing this circle’s feed. Try another circle or return to Global Sync.'}
            </p>
            {selectedCircle !== 'all' && (
              <button type="button" className="zq-btn-glass" style={{ marginTop: '16px' }} onClick={clearCircleFilter}>
                Back to Global Sync
              </button>
            )}
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {nextCursor && (
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <button
              className="zq-btn-glass"
              onClick={() => loadFeed(nextCursor, true, selectedCircle)}
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
