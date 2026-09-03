import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Post, api, getAvatarUrl, getDefaultAvatar, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
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

  const getYouTubeEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  const ytEmbedUrl = getYouTubeEmbedUrl(post.mediaUrl);
  const isVideo = post.mediaType === 'video' || Boolean(post.mediaUrl && /\.(mp4|webm|mov|m4v|m3u8)(?:[?#].*)?$/i.test(post.mediaUrl));

  // Circle Badge determined by post content or author
  const circleBadge = post.content?.toLowerCase().includes('code') || post.content?.toLowerCase().includes('app')
    ? '🚀 Tech Innovators'
    : '🌍 Global Sync';

  return (
    <article className="zq-post-card">
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

        <button className="zq-btn-glass" style={{ padding: '4px 8px', borderRadius: '8px' }} title="Options">
          <MoreDotsIcon size={18} />
        </button>
      </div>

      {/* Post Media */}
      {post.mediaUrl && !mediaFailed && (
        <div className="zq-post-media-wrap" onDoubleClick={handleDoubleTap}>
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
            <video src={resolveMediaUrl(post.mediaUrl)} controls playsInline onError={() => setMediaFailed(true)} />
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
        </div>
      )}
      {post.mediaUrl && mediaFailed && (
        <div className="zq-post-media-fallback" role="status">
          Media unavailable
        </div>
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
