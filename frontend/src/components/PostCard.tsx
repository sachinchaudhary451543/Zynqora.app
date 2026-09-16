import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Post, api, getAvatarUrl, getDefaultAvatar, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { HlsVideo } from './HlsVideo';
import CommentsSection from './CommentsSection';
import {
  NotificationsIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  MoreDotsIcon,
  AuraSparkIcon,
} from './Icons';

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [reactionType, setReactionType] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showSparkAnim, setShowSparkAnim] = useState(false);
  const [commentCount, setCommentCount] = useState(post._count?.comments || 0);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const playbackHintTimer = useRef<number | undefined>(undefined);
  const [showPlaybackHint, setShowPlaybackHint] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(false);

  const authorAvatar =
    post.author.username === user?.username
      ? getAvatarUrl(user)
      : getAvatarUrl(post.author);

  const formatTimeAgo = (dateString: string) => {
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const handleLikeToggle = async () => {
    if (liked) {
      setLiked(false);
      setReactionType(null);
      setLikeCount(Math.max(0, likeCount - 1));
      await api.unlike(post.id).catch(() => {});
    } else {
      setLiked(true);
      setReactionType('⚡');
      setLikeCount(likeCount + 1);
      setShowSparkAnim(true);
      setTimeout(() => setShowSparkAnim(false), 900);
      await api.like(post.id).catch(() => {});
    }
  };

  const handleSelectReaction = async (emoji: string) => {
    setReactionType(emoji);
    if (!liked) {
      setLiked(true);
      setLikeCount(likeCount + 1);
      setShowSparkAnim(true);
      setTimeout(() => setShowSparkAnim(false), 900);
      await api.like(post.id).catch(() => {});
    }
  };

  const handleDoubleTap = () => {
    handleLikeToggle();
  };

  const isManuallyPausedRef = useRef<boolean>(false);
  const isMusicPausedByUserRef = useRef<boolean>(false);

  const toggleMediaPlayback = () => {
    const media = soundRef.current;
    const card = cardRef.current;
    const video = card ? (card.querySelector('video') as HTMLVideoElement | null) : null;
    
    const isPlaying = (video && !video.paused) || (media && !media.paused) || soundPlaying;

    if (isPlaying) {
      // User explicitly paused playback
      isManuallyPausedRef.current = true;
      isMusicPausedByUserRef.current = true;
      if (video && !video.paused) video.pause();
      if (media && !media.paused) {
        media.pause();
        setSoundPlaying(false);
      }
    } else {
      // User explicitly resumed playback
      isManuallyPausedRef.current = false;
      isMusicPausedByUserRef.current = false;
      if (video && video.paused) video.play().catch(() => {});
      if (media && media.paused) {
        media.play().then(() => {
          setSoundPlaying(true);
          window.dispatchEvent(new CustomEvent('zq-sound-started', { detail: { postId: post.id } }));
        }).catch(() => {});
      }
    }

    setShowPlaybackHint(true);
    window.clearTimeout(playbackHintTimer.current);
    playbackHintTimer.current = window.setTimeout(() => setShowPlaybackHint(false), 2000);
  };

  const toggleSoundOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    const media = soundRef.current;
    const card = cardRef.current;
    const video = card ? (card.querySelector('video') as HTMLVideoElement | null) : null;

    if (soundPlaying || (media && !media.paused)) {
      // User explicitly paused/muted sound
      isMusicPausedByUserRef.current = true;
      if (media) media.pause();
      if (video) video.muted = true;
      setSoundPlaying(false);
    } else {
      // User explicitly unmuted/played sound
      isMusicPausedByUserRef.current = false;
      isManuallyPausedRef.current = false;
      if (video) video.muted = false;
      if (media) {
        media.play().then(() => {
          setSoundPlaying(true);
          window.dispatchEvent(new CustomEvent('zq-sound-started', { detail: { postId: post.id } }));
        }).catch(() => {});
      } else {
        setSoundPlaying(true);
      }
    }

    setShowPlaybackHint(true);
    window.clearTimeout(playbackHintTimer.current);
    playbackHintTimer.current = window.setTimeout(() => setShowPlaybackHint(false), 2000);
  };

  const getYouTubeEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  const ytEmbedUrl = getYouTubeEmbedUrl(post.mediaUrl);
  const isVideo = post.mediaType === 'video' || Boolean(post.mediaUrl && /\.(mp4|webm|mov|m4v|m3u8)(?:[?#].*)?$/i.test(post.mediaUrl));

  // ─── Scroll-based play / pause via IntersectionObserver ──────────────────
  // Play audio + video only when ≥60% of the card is visible in the viewport.
  // RESPECTS user's manual pause choice: if user paused it, scrolling back into view WILL NOT auto-play.
  useEffect(() => {
    if (!post.musicUrl && !isVideo) return; // nothing to auto-control
    const card = cardRef.current;
    if (!card) return;

    // Listen for other posts starting sound so multiple tracks never clash
    const handleOtherSoundStarted = (e: Event) => {
      const otherPostId = (e as CustomEvent).detail?.postId;
      if (otherPostId && otherPostId !== post.id) {
        const audio = soundRef.current;
        if (audio && !audio.paused) {
          audio.pause();
          setSoundPlaying(false);
        }
      }
    };
    window.addEventListener('zq-sound-started', handleOtherSoundStarted);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const audio = soundRef.current;
        const video = card.querySelector('video') as HTMLVideoElement | null;

        if (entry.isIntersecting) {
          // In view: ONLY auto-play if user did NOT explicitly pause it!
          if (!isManuallyPausedRef.current) {
            if (video && video.paused) video.play().catch(() => {});
          }
          if (!isMusicPausedByUserRef.current && !isManuallyPausedRef.current) {
            if (audio && audio.paused) {
              audio.play().then(() => {
                setSoundPlaying(true);
                window.dispatchEvent(new CustomEvent('zq-sound-started', { detail: { postId: post.id } }));
              }).catch(() => {});
            }
          }
        } else {
          // Out of view: pause to prevent background audio and save resources.
          // IMPORTANT: Do NOT alter isManuallyPausedRef or isMusicPausedByUserRef here,
          // as this is an automated scroll-pause, not a user pause action.
          if (video && !video.paused) video.pause();
          if (audio && !audio.paused) {
            audio.pause();
            setSoundPlaying(false);
          }
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(card);
    return () => {
      observer.disconnect();
      window.removeEventListener('zq-sound-started', handleOtherSoundStarted);
      window.clearTimeout(playbackHintTimer.current);
    };
  }, [post.musicUrl, isVideo, post.id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Zynqora Sync by @${post.author.username}`,
        text: post.content || '',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Sync link copied to clipboard!');
    }
  };

  const handleDelete = async () => {
    if (!user || user.username !== post.author.username || deleting) return;
    if (!window.confirm('Delete this post permanently?')) return;
    setDeleting(true);
    try {
      await api.deletePost(post.id);
      window.dispatchEvent(new CustomEvent('ig-post-deleted', { detail: { postId: post.id } }));
    } catch (err) {
      console.error('Failed to delete post', err);
      setDeleting(false);
    }
  };

  // Circle Badge determined by database circle relation or default to Global Sync
  const circleBadge = post.circle
    ? `${post.circle.icon ? post.circle.icon + ' ' : ''}${post.circle.name}`
    : '🌍 Global Sync';

  return (
    <article className="zq-post-card" ref={cardRef}>
      {/* Header with Circle Tag */}
      <div className="zq-post-header">
        <div className="zq-post-author-row">
          <Link to={`/profile/${post.author.username}`}>
            <div className="zq-avatar-ring" style={{ width: '38px', height: '38px' }}>
              <img
                src={authorAvatar}
                alt={post.author.name}
                className="zq-avatar-img"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = getDefaultAvatar(post.author.name || post.author.username);
                }}
              />
            </div>
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link to={`/profile/${post.author.username}`} className="zq-post-author-name">
                {post.author.username}
              </Link>
              <span className="zq-post-circle-badge">{circleBadge}</span>
            </div>
            <div className="zq-post-meta-sub">
              <span>{post.author.name}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {user?.username === post.author.username && (
          <button type="button" className="zq-btn-glass" style={{ padding: '4px 8px', borderRadius: '8px' }} title="Delete post" onClick={handleDelete} disabled={deleting}>
            {deleting ? '...' : <MoreDotsIcon size={18} />}
          </button>
        )}
      </div>

      {/* Post Media */}
      {post.mediaUrl && !mediaFailed && (
        <div className="zq-post-media-wrap" data-post-media={post.id} onClick={toggleMediaPlayback} onDoubleClick={handleDoubleTap} role="button" tabIndex={0} aria-label="Play or pause post media">
          {ytEmbedUrl ? (
            <iframe
              src={ytEmbedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: '100%',
                aspectRatio: '16/9',
                border: 'none',
                display: 'block',
              }}
              onError={() => setMediaFailed(true)}
            />
          ) : isVideo ? (
            /\.m3u8(?:[?#].*)?$/i.test(post.mediaUrl) ? (
              <HlsVideo src={resolveMediaUrl(post.mediaUrl)} onError={() => setMediaFailed(true)} />
            ) : (
              <video src={resolveMediaUrl(post.mediaUrl)} playsInline muted={Boolean(post.musicUrl)} onError={() => setMediaFailed(true)} />
            )
          ) : (
            <img src={resolveMediaUrl(post.mediaUrl)} alt="Sync media" onError={() => setMediaFailed(true)} />
          )}

          {/* Holographic Spark Explosion */}
          {showSparkAnim && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '80px',
                filter: 'drop-shadow(0 0 20px rgba(0, 223, 216, 0.8))',
                animation: 'sparkPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                pointerEvents: 'none',
              }}
            >
              {reactionType || '⚡'}
            </div>
          )}
          {/* Floating Sound Toggle Pill */}
          {(post.musicUrl || isVideo) && (
            <button
              type="button"
              onClick={toggleSoundOnly}
              className="zq-media-sound-btn"
              title={soundPlaying ? 'Pause / Mute audio' : 'Play / Unmute audio'}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                zIndex: 6,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '16px',
                background: 'rgba(5, 8, 18, 0.78)',
                border: soundPlaying ? '1px solid rgba(0, 223, 216, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: soundPlaying ? '#00dfd8' : 'rgba(255, 255, 255, 0.75)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: soundPlaying ? '0 0 14px rgba(0, 223, 216, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '12px' }}>{soundPlaying ? '🔊' : '🔇'}</span>
              <span>{post.musicUrl ? (soundPlaying ? 'Music Playing' : 'Music Paused') : (soundPlaying ? 'Audio On' : 'Muted')}</span>
            </button>
          )}

          {post.musicUrl && showPlaybackHint && (
            <div className="zq-media-playback-hint" aria-hidden="true">{soundPlaying ? '❚❚' : '▶'}</div>
          )}
        </div>
      )}
      {post.mediaUrl && mediaFailed && (
        <div className="zq-post-media-fallback" role="status">
          Media unavailable
        </div>
      )}
      {post.musicUrl && (
        <audio ref={soundRef} className="zq-post-sound" preload="auto" src={resolveMediaUrl(post.musicUrl)} aria-label="Post sound" />
      )}

      {/* Actions & Aura Reaction Bar */}
      <div className="zq-post-actions-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="zq-reactions-row">
            <button
              type="button"
              className={`zq-reaction-btn ${liked ? 'reacted' : ''}`}
              onClick={handleLikeToggle}
            >
              <span>{reactionType || '⚡'}</span>
              <span>{likeCount} Syncs</span>
            </button>
            <button type="button" className="zq-reaction-btn" onClick={() => handleSelectReaction('❤️')}>
              <span>❤️</span>
            </button>
            <button type="button" className="zq-reaction-btn" onClick={() => handleSelectReaction('🔥')}>
              <span>🔥</span>
            </button>
            <button type="button" className="zq-reaction-btn" onClick={() => handleSelectReaction('💡')}>
              <span>💡</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="zq-btn-glass" onClick={handleShare} style={{ padding: '6px 10px', borderRadius: '10px' }} title="Broadcast / Share">
              <ShareIcon size={16} />
            </button>
            <button
              type="button"
              className="zq-btn-glass"
              onClick={() => setSaved(!saved)}
              style={{ padding: '6px 10px', borderRadius: '10px', color: saved ? 'var(--zq-accent-cyan)' : 'inherit' }}
              title={saved ? 'In Vault' : 'Save to Vault'}
            >
              <BookmarkIcon size={16} active={saved} />
            </button>
          </div>
        </div>
      </div>

      {/* Caption Box */}
      {post.content && (
        <div className="zq-post-caption-box">
          <Link to={`/profile/${post.author.username}`} style={{ fontWeight: 700, marginRight: '8px', color: '#fff' }}>
            @{post.author.username}
          </Link>
          <span>{post.content}</span>
        </div>
      )}

      {/* Comments / Community Responses */}
      <div style={{ padding: '0 18px 14px 18px' }}>
        <CommentsSection
          postId={post.id}
          initialCount={commentCount}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
        />
      </div>
    </article>
  );
}
