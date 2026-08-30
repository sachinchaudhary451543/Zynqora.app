import React, { useEffect, useState } from 'react';
import { api, User } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const data = await api.getSuggestions();
      setSuggestions(data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load suggestions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (username: string) => {
    try {
      if (following.has(username)) {
        await api.unfollow(username);
        setFollowing((prev) => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      } else {
        await api.follow(username);
        setFollowing((prev) => new Set([...prev, username]));
      }
    } catch (err) {
      console.error('Failed to toggle follow', err);
    }
  };

  const currentUserAvatar = user?.profileImage || user?.avatarUrl || '/placeholder-avatar.png';

  return (
    <aside className="zq-feed-sidebar">
      {/* Current User Widget */}
      {user && (
        <div className="zq-profile-card-widget">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to={`/profile/${user.username}`}>
                <div className="zq-avatar-ring" style={{ width: '46px', height: '46px' }}>
                  <img
                    src={currentUserAvatar}
                    alt={user.name}
                    className="zq-avatar-img"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </Link>
              <div>
                <Link to={`/profile/${user.username}`}>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{user.username}</h4>
                </Link>
                <p style={{ fontSize: '12px', color: 'var(--zq-accent-cyan)' }}>{user.note || '⚡ In the Zone'}</p>
              </div>
            </div>

            <button
              className="zq-btn-glass"
              style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px' }}
              onClick={() => navigate('/accounts/edit')}
            >
              Control
            </button>
          </div>
        </div>
      )}

      {/* Suggested Circles & Members */}
      <div className="zq-profile-card-widget">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
            RECOMMENDED AURAS
          </span>
          <Link to="/explore" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zq-accent-cyan)' }}>
            SEE ALL
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <p style={{ color: 'var(--zq-text-secondary)', fontSize: '12px' }}>Scanning network...</p>
          ) : suggestions.length === 0 ? (
            <p style={{ color: 'var(--zq-text-secondary)', fontSize: '12px' }}>No new recommendations</p>
          ) : (
            suggestions.map((s) => {
              const isFollowing = following.has(s.username);
              const avatar = s.profileImage || s.avatarUrl || '/placeholder-avatar.png';

              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link to={`/profile/${s.username}`}>
                      <div className="zq-avatar-ring" style={{ width: '38px', height: '38px' }}>
                        <img
                          src={avatar}
                          alt={s.name}
                          className="zq-avatar-img"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </Link>
                    <div>
                      <Link to={`/profile/${s.username}`}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{s.username}</div>
                      </Link>
                      <div style={{ fontSize: '11px', color: 'var(--zq-text-muted)' }}>
                        Aligned with your circles
                      </div>
                    </div>
                  </div>

                  <button
                    className={isFollowing ? 'zq-btn-glass' : 'zq-btn-aura'}
                    style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '10px' }}
                    onClick={() => handleFollowToggle(s.username)}
                  >
                    {isFollowing ? 'In Sync' : '⚡ Sync'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Tagline */}
      <div style={{ fontSize: '11px', color: 'var(--zq-text-muted)', lineHeight: '16px', padding: '0 8px' }}>
        <p>ZYNQORA ECOSYSTEM • PRIVACY SHIELD • CIRCLES PROTOCOL</p>
        <p style={{ marginTop: '8px', color: 'var(--zq-text-secondary)' }}>© 2026 ZYNQORA — YOUR PEOPLE. YOUR CIRCLE.</p>
      </div>
    </aside>
  );
}
