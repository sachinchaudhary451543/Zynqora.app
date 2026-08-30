import React, { useEffect, useState } from 'react';
import { api, Comment, getAvatarUrl } from '../api/client';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuraSparkIcon } from './Icons';

interface CommentsSectionProps {
  postId: string;
  initialCount?: number;
  onCommentAdded?: () => void;
}

export default function CommentsSection({ postId, initialCount = 0, onCommentAdded }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (showAll) {
      setLoading(true);
      api.getComments(postId)
        .then((data) => {
          setComments(data.comments || []);
          setTotalCount(data.count ?? data.comments?.length ?? 0);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [postId, showAll]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const comment = await api.createComment(postId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      setTotalCount((c) => c + 1);
      onCommentAdded?.();
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotalCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  const auraColor = '#00f2fe'; // Default sync color

  return (
    <div style={{ marginTop: '8px' }}>
      {/* View comments toggle */}
      {totalCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            background: 'transparent', border: 'none',
            color: '#8892b0', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', padding: 0, marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          View all {totalCount} syncs <span style={{ fontSize: '10px' }}>▼</span>
        </button>
      )}

      {showAll && (
        <div style={{ 
          marginBottom: '16px', 
          background: 'rgba(26, 26, 46, 0.4)', 
          borderRadius: '12px', 
          padding: '12px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <button
            onClick={() => setShowAll(false)}
            style={{
              background: 'transparent', border: 'none',
              color: auraColor, fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', padding: 0, marginBottom: '12px',
              textTransform: 'uppercase', letterSpacing: '1px',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            Hide syncs <span style={{ fontSize: '10px' }}>▲</span>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8892b0', fontSize: '13px' }}>
                <AuraSparkIcon size={14} className="spin-anim" /> Resonating syncs...
              </div>
            ) : (
              comments.map((c) => {
                const isOwnComment = user?.username === c.author.username;
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <Link to={`/profile/${c.author.username}`}>
                      <div className="zq-avatar-ring" style={{ width: '28px', height: '28px', borderRadius: '50%' }}>
                        <img 
                          src={getAvatarUrl(c.author)} 
                          alt={c.author.username} 
                          className="zq-avatar-img"
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </Link>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '0 12px 12px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <Link to={`/profile/${c.author.username}`} style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                          {c.author.username}
                        </Link>
                        {isOwnComment && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            style={{ 
                              background: 'none', border: 'none', color: '#666', fontSize: '10px', 
                              cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' 
                            }}
                            title="Delete comment"
                            onMouseOver={(e) => (e.currentTarget.style.color = '#ff4d4f')}
                            onMouseOut={(e) => (e.currentTarget.style.color = '#666')}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '13.5px', color: '#ccd6f6', lineHeight: 1.4 }}>
                        {c.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Inline glassmorphism comment input */}
      <form 
        onSubmit={handleComment} 
        style={{
          display: 'flex',
          alignItems: 'center',
          background: isFocused ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${isFocused ? auraColor + '66' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: '24px',
          padding: '6px 16px',
          transition: 'all 0.3s ease',
          boxShadow: isFocused ? `0 0 12px ${auraColor}22` : 'none'
        }}
      >
        <input
          type="text"
          placeholder="Sync a thought..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            padding: '4px 0'
          }}
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          style={{
            background: 'transparent',
            border: 'none',
            color: newComment.trim() ? auraColor : '#555',
            fontWeight: 700,
            fontSize: '14px',
            cursor: newComment.trim() ? 'pointer' : 'default',
            padding: '4px 0 4px 12px',
            transition: 'color 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Send
        </button>
      </form>
      
      <style>
        {`
          .spin-anim {
            animation: spin 2s linear infinite;
          }
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
          input::placeholder {
            color: #6b7280;
          }
        `}
      </style>
    </div>
  );
}
