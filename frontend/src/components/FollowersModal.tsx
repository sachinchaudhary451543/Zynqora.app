import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAvatarUrl } from '../api/client';
import { MessagesIcon } from './Icons';

interface FollowersModalProps {
  title: string;
  users: Array<{
    id?: string;
    username: string;
    name: string;
    avatarUrl?: string | null;
    profileImage?: string | null;
    isFollowing?: boolean;
  }>;
  onClose: () => void;
  onFollowToggled?: () => void;
}

export default function FollowersModal({ title, users, onClose, onFollowToggled }: FollowersModalProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const auraColor = '#8b5cf6';

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleFollow = async (username: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await api.unfollow(username);
        setFollowingMap((prev) => ({ ...prev, [username]: false }));
      } else {
        await api.follow(username);
        setFollowingMap((prev) => ({ ...prev, [username]: true }));
      }
      onFollowToggled?.();
    } catch (err) {
      console.error('Follow toggle error', err);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #13131f 0%, #0d0d18 100%)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 24,
          width: '100%',
          maxWidth: 440,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${auraColor}18`,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)'
        }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: 0.3 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#aaa', width: 32, height: 32, borderRadius: '50%',
              cursor: 'pointer', fontSize: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#666' }}>🔍</span>
            <input
              placeholder="Search connections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px 9px 34px', borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = `${auraColor}66`)}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
          </div>
        </div>

        {/* User List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 24px', color: '#666' }}>
              {users.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 28 }}>⏳</div>
                  <span>Loading...</span>
                </div>
              ) : 'No users found'}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isFollowing = followingMap[u.username] !== undefined
                ? followingMap[u.username]
                : (u.isFollowing ?? true);
              const avatarSrc = getAvatarUrl(u);

              return (
                <div
                  key={u.username}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 20px', transition: 'background 0.15s',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.05)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar + Name */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer', flex: 1 }}
                    onClick={() => { onClose(); navigate(`/profile/${u.username}`); }}
                  >
                    <div style={{
                      padding: 2, borderRadius: '50%',
                      background: `linear-gradient(45deg, ${auraColor}, #00f2fe)`,
                      flexShrink: 0, boxShadow: `0 0 10px ${auraColor}44`,
                    }}>
                      <img
                        src={avatarSrc}
                        alt={u.name}
                        style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0d0d18', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#e8e8f0', letterSpacing: 0.2 }}>{u.username}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{u.name}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {/* Chat Button */}
                    <button
                      onClick={() => { onClose(); navigate(`/chat/${u.username}`); }}
                      style={{
                        background: `linear-gradient(135deg, ${auraColor}33, #00f2fe22)`,
                        border: `1px solid ${auraColor}55`,
                        color: '#c4b5fd',
                        padding: '7px 14px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        letterSpacing: 0.3,
                        transition: 'all 0.2s',
                        boxShadow: `0 2px 8px ${auraColor}22`,
                      }}
                      onMouseOver={e => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.background = `linear-gradient(135deg, ${auraColor}55, #00f2fe44)`;
                        btn.style.boxShadow = `0 4px 16px ${auraColor}44`;
                        btn.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={e => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.background = `linear-gradient(135deg, ${auraColor}33, #00f2fe22)`;
                        btn.style.boxShadow = `0 2px 8px ${auraColor}22`;
                        btn.style.transform = 'translateY(0)';
                      }}
                    >
                      <MessagesIcon size={13} /> Chat
                    </button>

                    {/* Follow/Following Button */}
                    <button
                      onClick={() => handleToggleFollow(u.username, isFollowing)}
                      style={{
                        background: isFollowing
                          ? 'rgba(255,255,255,0.06)'
                          : `linear-gradient(135deg, ${auraColor}, #7c3aed)`,
                        border: isFollowing ? '1px solid rgba(255,255,255,0.12)' : 'none',
                        color: isFollowing ? '#9ca3af' : '#fff',
                        padding: '7px 16px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: 0.3,
                        transition: 'all 0.2s',
                        boxShadow: isFollowing ? 'none' : `0 2px 10px ${auraColor}44`,
                        minWidth: 84,
                      }}
                      onMouseOver={e => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.transform = 'translateY(-1px)';
                        btn.style.boxShadow = isFollowing ? '0 2px 8px rgba(0,0,0,0.3)' : `0 4px 18px ${auraColor}55`;
                      }}
                      onMouseOut={e => {
                        const btn = e.currentTarget as HTMLButtonElement;
                        btn.style.transform = 'translateY(0)';
                        btn.style.boxShadow = isFollowing ? 'none' : `0 2px 10px ${auraColor}44`;
                      }}
                    >
                      {isFollowing ? '✓ Following' : '+ Follow'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
