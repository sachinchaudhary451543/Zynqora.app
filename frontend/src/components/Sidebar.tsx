import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../api/client';
import {
  ZynqoraLogo,
  ZynqoraWordmark,
  HomeIcon,
  CirclesIcon,
  ExploreIcon,
  MessagesIcon,
  NotificationsIcon,
  CreateIcon,
  DashboardIcon,
  SettingsGearIcon,
  HamburgerIcon,
  BookmarkIcon,
  AuraSparkIcon,
} from './Icons';

interface SidebarProps {
  onOpenCreateModal: () => void;
  unreadCount?: number;
}

export default function Sidebar({ onOpenCreateModal, unreadCount = 4 }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const sparksRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (sparksRef.current && !sparksRef.current.contains(event.target as Node)) {
        // don't close if clicked on the sparks button
        const target = event.target as HTMLElement;
        if (!target.closest('.zq-sparks-btn')) {
          setShowNotifications(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userAvatar = getAvatarUrl(user);

  const mockSparks = [
    { id: 1, type: 'spark', user: 'sarahsmith2026', name: 'Sarah Smith', action: 'sent you a ⚡ High-Resonance Spark', time: '2m ago' },
    { id: 2, type: 'circle', user: 'emma_watson', name: 'Emma', action: 'invited you to 🚀 AI Pioneers Circle', time: '18m ago' },
    { id: 3, type: 'comment', user: 'john_doe', name: 'John', action: 'synced on your recent update: "Brilliant tech!"', time: '1h ago' },
    { id: 4, type: 'follow', user: 'alex_rivera', name: 'Alex Rivera', action: 'synchronized into your Aura Circle', time: '3h ago' },
    { id: 5, type: 'reaction', user: 'tech_guru', name: 'Elena', action: 'reacted with 🔥 to your Code Sync', time: '5h ago' },
  ];

  return (
    <>
      <aside className="zq-sidebar">
        <div className="zq-sidebar-top">
          {/* ZYNQORA Brand Logo & Wordmark */}
          <NavLink to="/feed" className="zq-sidebar-logo" title="Zynqora — Your People. Your Circle. Your Zynqora.">
            <ZynqoraLogo size={32} />
            <ZynqoraWordmark />
          </NavLink>

          <nav className="zq-sidebar-nav">
            <NavLink
              to="/feed"
              className={({ isActive }) => `zq-nav-item ${isActive ? 'active' : ''}`}
              title="Sync Stream (Home Feed)"
            >
              <div className="zq-nav-icon-container">
                <HomeIcon size={22} active={location.pathname === '/feed'} />
              </div>
              <span className="zq-nav-label">Sync Stream</span>
            </NavLink>

            <NavLink
              to="/explore"
              className={({ isActive }) => `zq-nav-item ${isActive ? 'active' : ''}`}
              title="Community Circles (Qoras)"
            >
              <div className="zq-nav-icon-container">
                <CirclesIcon size={22} active={location.pathname === '/explore'} />
              </div>
              <span className="zq-nav-label">Circles Hub</span>
            </NavLink>

            <NavLink
              to="/explore"
              className={({ isActive }) => `zq-nav-item ${isActive ? 'active' : ''}`}
              title="Explore Auras & Creators"
            >
              <div className="zq-nav-icon-container">
                <ExploreIcon size={22} />
              </div>
              <span className="zq-nav-label">Discover</span>
            </NavLink>

            <NavLink
              to="/chat"
              className={({ isActive }) => `zq-nav-item ${isActive ? 'active' : ''}`}
              title="Direct Sync Messages"
            >
              <div className="zq-nav-icon-container">
                <MessagesIcon size={22} active={location.pathname.startsWith('/chat')} />
                {unreadCount > 0 && <span className="zq-badge-count">{unreadCount}</span>}
              </div>
              <span className="zq-nav-label">Direct Sync</span>
            </NavLink>

            {/* Aura Sparks Button */}
            <button
              type="button"
              className={`zq-nav-item zq-sparks-btn ${showNotifications ? 'active' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title="Aura Sparks & Alerts"
            >
              <div className="zq-nav-icon-container">
                <NotificationsIcon size={22} active={showNotifications} />
                <span className="zq-badge-dot" />
              </div>
              <span className="zq-nav-label">Aura Sparks</span>
            </button>

            {/* Create Post */}
            <button
              type="button"
              className="zq-nav-item"
              onClick={onOpenCreateModal}
              title="Create Sync Post"
            >
              <div className="zq-nav-icon-container">
                <CreateIcon size={22} />
              </div>
              <span className="zq-nav-label">New Sync</span>
            </button>

            {/* Insights Button */}
            <button
              type="button"
              className={`zq-nav-item ${showInsights ? 'active' : ''}`}
              onClick={() => setShowInsights(true)}
              title="Aura Insights & Analytics"
            >
              <div className="zq-nav-icon-container">
                <DashboardIcon size={22} active={showInsights} />
              </div>
              <span className="zq-nav-label">Insights</span>
            </button>

            {user && (
              <NavLink
                to={`/profile/${user.username}`}
                className={({ isActive }) => `zq-nav-item ${isActive ? 'active' : ''}`}
                title="My Aura & Profile"
              >
                <div className="zq-nav-icon-container">
                  <div className={`zq-avatar-ring ${location.pathname === `/profile/${user.username}` ? 'active-ring' : ''}`}>
                    <img
                      src={userAvatar}
                      alt={user.name}
                      className="zq-avatar-img"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
                <span className="zq-nav-label">My Aura</span>
              </NavLink>
            )}
          </nav>
        </div>

        <div className="zq-sidebar-bottom" ref={moreMenuRef}>
          {showMoreMenu && (
            <div className="zq-more-menu">
              <button
                className="zq-more-menu-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  navigate('/accounts/edit');
                }}
              >
                <SettingsGearIcon size={18} />
                <span>Control Center</span>
              </button>
              <button
                className="zq-more-menu-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  navigate('/feed');
                }}
              >
                <BookmarkIcon size={18} />
                <span>Saved Vault</span>
              </button>
              <div style={{ height: '1px', background: 'var(--zq-glass-border)', margin: '4px 0' }} />
              <button
                className="zq-more-menu-item"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleLogout();
                }}
                style={{ color: 'var(--zq-danger)' }}
              >
                <span>Disconnect / Logout</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={`zq-nav-item ${showMoreMenu ? 'active' : ''}`}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More Options"
          >
            <div className="zq-nav-icon-container">
              <HamburgerIcon size={22} />
            </div>
            <span className="zq-nav-label">More</span>
          </button>

          <div className="zq-core-badge">
            <span>✦ ZYNQORA CORE</span>
          </div>
        </div>
      </aside>

      {/* Aura Sparks Notification Flyout */}
      {showNotifications && (
        <div
          ref={sparksRef}
          style={{
            position: 'fixed',
            top: '20px',
            left: 'calc(var(--sidebar-width) + 12px)',
            width: '380px',
            maxHeight: '80vh',
            background: 'linear-gradient(180deg, #131728 0%, #0c0e18 100%)',
            border: '1px solid rgba(121, 40, 202, 0.35)',
            borderRadius: '24px',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(121, 40, 202, 0.25)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'zqZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AuraSparkIcon size={20} active={true} style={{ color: '#00dfd8' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Aura Sparks & Activity
              </h3>
            </div>
            <button
              onClick={() => setShowNotifications(false)}
              style={{ background: 'none', border: 'none', color: '#9499ab', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mockSparks.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setShowNotifications(false);
                  navigate(`/profile/${s.user}`);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(121, 40, 202, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(0, 223, 216, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #00dfd8, #7928ca)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {s.user.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: '#fff', lineHeight: 1.4 }}>
                    <strong>@{s.user}</strong> {s.action}
                  </div>
                  <div style={{ fontSize: '11px', color: '#00dfd8', marginTop: '3px' }}>
                    {s.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.5px' }}>
              ✦ REAL-TIME QUANTUM SYNC CONNECTED
            </span>
          </div>
        </div>
      )}

      {/* Aura Insights Modal */}
      {showInsights && (
        <div
          onClick={() => setShowInsights(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 7, 12, 0.82)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #131728 0%, #0a0c16 100%)',
              border: '1px solid rgba(0, 223, 216, 0.35)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '520px',
              overflow: 'hidden',
              boxShadow: '0 28px 72px rgba(0, 0, 0, 0.85), 0 0 50px rgba(0, 223, 216, 0.15)',
              animation: 'zqZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DashboardIcon size={22} active={true} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Aura Resonance Insights
                </h3>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top Score */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.15) 0%, rgba(121, 40, 202, 0.15) 100%)',
                  border: '1px solid rgba(0, 223, 216, 0.3)',
                  borderRadius: '20px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: '#00dfd8', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  AURA RESONANCE SCORE
                </div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#fff', margin: '6px 0', textShadow: '0 0 20px rgba(0, 223, 216, 0.6)' }}>
                  98.4 <span style={{ fontSize: '18px', color: '#7928ca' }}>/ 100</span>
                </div>
                <div style={{ fontSize: '13px', color: '#9499ab' }}>
                  Top 2% creator momentum in <strong>Tech Innovators Circle</strong>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Weekly Reach', val: '4.8k', change: '+24%' },
                  { label: 'Sync Sparks', val: '642', change: '+38%' },
                  { label: 'Circle Growth', val: '128', change: '+15%' },
                ].map((st) => (
                  <div
                    key={st.label}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '16px',
                      padding: '14px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>{st.val}</div>
                    <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{st.label}</div>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>{st.change}</div>
                  </div>
                ))}
              </div>

              {/* Action */}
              <button
                onClick={() => {
                  setShowInsights(false);
                  navigate('/explore');
                }}
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0, 223, 216, 0.35)',
                }}
              >
                Expand Your Circle Reach 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
