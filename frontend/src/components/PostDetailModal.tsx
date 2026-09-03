import React, { useState, useEffect } from 'react';
import { Post, Comment, api, getAvatarUrl, resolveMediaUrl } from '../api/client';
import { NotificationsIcon, CommentIcon, ShareIcon, BookmarkIcon } from './Icons';
import { HlsVideo } from './PostCard';

interface PostDetailModalProps {
  post: Post | null;
  onClose: () => void;
  onPostUpdated?: () => void;
}

export default function PostDetailModal({ post, onClose, onPostUpdated }: PostDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!post) return;
    setLikeCount(post._count?.likes || 0);
    api.getComments(post.id)
      .then((res) => setComments(res.comments || []))
      .catch(() => {});
  }, [post]);

  if (!post) return null;

  const handleLike = async () => {
    if (liked) {
      setLiked(false);
      setLikeCount(Math.max(0, likeCount - 1));
      await api.unlike(post.id).catch(() => {});
    } else {
      setLiked(true);
      setLikeCount(likeCount + 1);
      await api.like(post.id).catch(() => {});
    }
    onPostUpdated?.();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || loading) return;
    setLoading(true);
    try {
      const c = await api.createComment(post.id, newComment.trim());
      setComments((prev) => [...prev, c]);
      setNewComment('');
      onPostUpdated?.();
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setLoading(false);
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
  const authorAvatar = getAvatarUrl(post.author);

  return (
    <div className="ig-modal-overlay" onClick={onClose}>
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '28px',
          cursor: 'pointer',
          zIndex: 260,
        }}
      >
        ✕
      </button>

      <div className="ig-post-lightbox" onClick={(e) => e.stopPropagation()}>
        {/* Media Column */}
        <div className="ig-lightbox-media-col">
          {ytEmbedUrl ? (
            <iframe
              src={ytEmbedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#000',
              }}
            />
          ) : post.mediaType === 'video' || (post.mediaUrl && /\.(mp4|webm|mov|m4v|m3u8)(?:[?#].*)?$/i.test(post.mediaUrl)) ? (
            /\.m3u8(?:[?#].*)?$/i.test(post.mediaUrl || '') ? (
              <HlsVideo src={resolveMediaUrl(post.mediaUrl) || ''} onError={() => {}} />
            ) : (
              <video src={resolveMediaUrl(post.mediaUrl) || ''} controls autoPlay style={{ width: '100%', height: '100%' }} />
            )
          ) : (
            <img src={resolveMediaUrl(post.mediaUrl) || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&fit=crop'} alt="Post media" />
          )}
        </div>

        {/* Info & Comments Column */}
        <div className="ig-lightbox-info-col">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--ig-separator)' }}>
            <img src={authorAvatar} alt={post.author.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{post.author.username}</div>
              <div style={{ fontSize: '12px', color: 'var(--ig-secondary-text)' }}>{post.author.name}</div>
            </div>
          </div>

          {/* Comments and Caption list */}
          <div className="ig-lightbox-comments-list">
            {post.content && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <img src={authorAvatar} alt={post.author.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ fontSize: '14px', lineHeight: '18px' }}>
                  <strong>{post.author.username}</strong> <span style={{ whiteSpace: 'pre-line' }}>{post.content}</span>
                  <div style={{ fontSize: '12px', color: 'var(--ig-secondary-text)', marginTop: '4px' }}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {comments.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <img
                  src={getAvatarUrl(c.author)}
                  alt={c.author.name}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ fontSize: '14px', lineHeight: '18px', flex: 1 }}>
                  <strong>{c.author.username}</strong> <span>{c.content}</span>
                  <div style={{ fontSize: '12px', color: 'var(--ig-secondary-text)', marginTop: '4px' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--ig-separator)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  type="button"
                  onClick={handleLike}
                  className={`ig-action-btn ${liked ? 'liked' : ''}`}
                >
                  <NotificationsIcon size={24} active={liked} />
                </button>
                <button type="button" className="ig-action-btn">
                  <CommentIcon size={24} />
                </button>
                <button type="button" className="ig-action-btn">
                  <ShareIcon size={24} />
                </button>
              </div>
              <button type="button" className="ig-action-btn">
                <BookmarkIcon size={24} />
              </button>
            </div>

            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ig-secondary-text)', textTransform: 'uppercase' }}>
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Inline Comment Input */}
          <form
            onSubmit={handleAddComment}
            style={{
              display: 'flex',
              padding: '12px 16px',
              borderTop: '1px solid var(--ig-separator)',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                background: 'transparent',
              }}
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="ig-post-comment-submit"
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
