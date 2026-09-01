import React, { useEffect, useState } from 'react';
import { api, User, getAvatarUrl } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, CirclesIcon, AuraSparkIcon } from '../components/Icons';

export default function Explore() {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const data = await api.getSuggestions();
      setSuggestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load explore suggestions');
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

  const categories = [
    { id: 'all', name: '✨ All Auras' },
    { id: 'tech', name: '🚀 AI & Tech Hub' },
    { id: 'creators', name: '🎨 Visual Artists' },
    { id: 'gaming', name: '🎮 Gaming Circles' },
    { id: 'music', name: '🎧 Audio & Sound' },
    { id: 'family', name: '🏡 Family Spaces' },
  ];

  const filtered = suggestions.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '28px auto 80px auto', padding: '0 20px', width: '100%' }}>
      {/* Search Header */}
      <div style={{ maxWidth: '500px', margin: '0 auto 24px auto', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--zq-accent-cyan)', display: 'flex' }}>
          <SearchIcon size={18} />
        </span>
        <input
          className="zq-settings-input"
          style={{ paddingLeft: '44px', borderRadius: '24px', background: 'var(--zq-surface-elevated)' }}
          placeholder="Search creators, circles, hashtags, and auras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Pills Bar */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '28px', scrollbarWidth: 'none' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`zq-circle-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
          Discover Community Circles & Auras
        </h2>
        <p style={{ color: 'var(--zq-text-secondary)', fontSize: '13px' }}>
          Synchronize with vibrant creators and join specialized community hubs
        </p>
      </div>

      {error && <div style={{ color: 'var(--zq-danger)', marginBottom: '16px' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--zq-text-secondary)' }}>
          <span className="zq-pulse-orb" style={{ display: 'inline-block', marginRight: '8px' }} />
          <span>Scanning community auras...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--zq-text-secondary)' }}>
          <p>No members or circles found for "{searchQuery}"</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
          }}
        >
          {filtered.map((u) => {
            const isFollowing = following.has(u.username);
            const avatar = getAvatarUrl(u);

            return (
              <div
                key={u.id}
                style={{
                  border: '1px solid var(--zq-glass-border)',
                  borderRadius: '18px',
                  padding: '18px 12px',
                  textAlign: 'center',
                  background: 'var(--zq-surface-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--zq-glass-border-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--zq-glass-border)')}
              >
                <div className="zq-avatar-ring" style={{ width: '56px', height: '56px', marginBottom: '10px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${u.username}`)}>
                  <img
                    src={avatar}
                    alt={u.name}
                    className="zq-avatar-img"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                <div
                  style={{ fontWeight: 800, fontSize: '14px', color: '#fff', cursor: 'pointer', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  {u.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--zq-accent-cyan)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  @{u.username}
                </div>

                {u.bio && (
                  <p style={{ fontSize: '11px', color: 'var(--zq-text-secondary)', marginBottom: '12px', maxHeight: '32px', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                    {u.bio}
                  </p>
                )}

                <div style={{ marginTop: 'auto', width: '100%' }}>
                  <button
                    className={isFollowing ? 'zq-btn-glass' : 'zq-btn-aura'}
                    style={{ width: '100%', fontSize: '11.5px', padding: '7px 0', borderRadius: '12px' }}
                    onClick={() => handleFollowToggle(u.username)}
                  >
                    {isFollowing ? 'In Sync ✓' : '⚡ Sync'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
