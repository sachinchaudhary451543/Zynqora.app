import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessagesIcon } from './Icons';
import { api, User, getAvatarUrl, getDefaultAvatar } from '../api/client';

export default function FloatingMessagesWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.getSuggestions()
      .then((data) => {
        if (!cancelled) setSuggestions(data.slice(0, 5));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  return (
    <div className="zq-floating-sync-bar">
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '28px',
            width: '360px',
            height: '480px',
            background: 'var(--zq-surface-elevated)',
            backdropFilter: 'blur(28px)',
            borderRadius: '24px',
            border: '1px solid var(--zq-glass-border-hover)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(121, 40, 202, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 95,
            animation: 'menuFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--zq-glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '0.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="zq-pulse-orb" />
              <span>DIRECT SYNC</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--zq-text-secondary)', fontSize: '16px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
            <div style={{ padding: '8px 20px', fontSize: '11px', color: 'var(--zq-text-muted)', fontWeight: 700, letterSpacing: '1px' }}>
              ACTIVE CONNECTIONS
            </div>
            {suggestions.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/chat/${u.username}`);
                }}
              >
                <div className="zq-avatar-ring" style={{ width: '40px', height: '40px' }}>
                  <img
                    src={getAvatarUrl(u)}
                    alt={u.name}
                    className="zq-avatar-img"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--zq-text-primary)' }}>{u.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--zq-text-secondary)' }}>@{u.username}</div>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--zq-accent-cyan)', fontWeight: 700 }}>SYNC</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <div className="zq-floating-pill" onClick={() => setIsOpen(!isOpen)}>
        <span className="zq-pulse-orb" />
        <MessagesIcon size={18} active />
        <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px' }}>Quick Sync</span>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
          {suggestions.slice(0, 3).map((u, i) => (
            <img
              key={u.id || i}
              src={getAvatarUrl(u)}
              alt=""
              loading="lazy"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--zq-bg)',
                marginLeft: i > 0 ? '-6px' : 0,
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = getDefaultAvatar(u.name || u.username);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
