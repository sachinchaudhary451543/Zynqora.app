import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, getAvatarUrl } from '../api/client';
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const sparksRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (sparksRef.current && !sparksRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.zq-sparks-btn')) {
          setShowNotifications(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadNotifications = () => api.getNotifications().then(setNotifications).catch(() => setNotifications([]));
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userAvatar = getAvatarUrl(user);
  const visibleUnreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <>
      {/* 1. TOP MOBILE APP BAR (Visible on screens <= 768px) */}
      <header className="zq-mobile-top-bar">
        <NavLink to="/feed" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <ZynqoraLogo size={28} />
          <ZynqoraWordmark />
        </NavLink>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="zq-sparks-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: '#ffffff',
              border: '1px solid #bfd0dc',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--zq-text-primary)',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <NotificationsIcon size={18} active={showNotifications} />
            <span className="zq-badge-dot" style={{ top: '6px', right: '6px' }} />
          </button>
        </div>
      </header>

      {/* 2. BOTTOM MOBILE NAVIGATION BAR (Visible on screens <= 768px) */}
      <nav className="zq-mobile-bottom-nav">
        <NavLink
          to="/feed"
          className={({ isActive }) => `zq-mobile-nav-btn ${isActive ? 'active' : ''}`}
        >
          <HomeIcon size={22} active={location.pathname === '/feed'} />
          <span>Feed</span>
        </NavLink>

        <NavLink
          to="/explore"
          className={({ isActive }) => `zq-mobile-nav-btn ${isActive ? 'active' : ''}`}
        >
          <ExploreIcon size={22} active={location.pathname === '/explore'} />
          <span>Discover</span>
        </NavLink>

        {/* Center Create Post Floating Button */}
        <button
          type="button"
          className="zq-mobile-create-btn"
          onClick={onOpenCreateModal}
          title="Create Sync Post"
        >
          <CreateIcon size={22} />
        </button>

        <NavLink
          to="/chat"
          className={({ isActive }) => `zq-mobile-nav-btn ${isActive ? 'active' : ''}`}
        >
          <div style={{ position: 'relative' }}>
            <MessagesIcon size={22} active={location.pathname.startsWith('/chat')} />
            {visibleUnreadCount > 0 && <span className="zq-badge-count" style={{ top: '-4px', right: '-8px' }}>{visibleUnreadCount}</span>}
          </div>
          <span>Sync Chat</span>
        </NavLink>

        {user && (
          <NavLink
            to={`/profile/${user.username}`}
            className={({ isActive }) => `zq-mobile-nav-btn ${isActive ? 'active' : ''}`}
          >
            <div className={`zq-avatar-ring ${location.pathname === `/profile/${user.username}` ? 'active-ring' : ''}`} style={{ width: '22px', height: '22px', padding: 1.5 }}>
              <img
                src={userAvatar}
                alt={user.name}
                className="zq-avatar-img"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
            <span>My Aura</span>
          </NavLink>
        )}
      </nav>

      {/* 3. DESKTOP & TABLET SIDEBAR (Screens > 768px) */}
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
              to="/circles"
              className={({ isActive }) => `zq-nav-item ${isActive ? 'active' : ''}`}
              title="Community Circles (Qoras)"
            >
              <div className="zq-nav-icon-container">
                <CirclesIcon size={22} active={location.pathname === '/circles'} />
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
                {visibleUnreadCount > 0 && <span className="zq-badge-count">{visibleUnreadCount}</span>}
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
                {visibleUnreadCount > 0 && <span className="zq-badge-dot" />}
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

          <div style={{ marginTop: 12, padding: 8, borderRadius: 14, background: 'rgba(86,214,255,.08)', border: '1px solid rgba(86,214,255,.22)' }} title="Created by CodeWithSP">
            <img src="/creator.svg" alt="CodeWithSP creator" style={{ width: '100%', display: 'block', borderRadius: 9 }} />
          </div>
          <div className="zq-core-badge">
            <span>✦ ZYNQORA CORE</span>
          </div>
        </div>
      </aside>

      {/* Aura Sparks Notification Flyout (Responsive for Desktop & Mobile) */}
      {showNotifications && (
        <div
          ref={sparksRef}
          style={{
            position: 'fixed',
            top: '60px',
            right: '12px',
            width: 'min(380px, 94vw)',
            maxHeight: '75vh',
            background: 'linear-gradient(180deg, #131728 0%, #0c0e18 100%)',
            border: '1px solid rgba(121, 40, 202, 0.35)',
            borderRadius: '24px',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 40px rgba(121, 40, 202, 0.25)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'zqZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AuraSparkIcon size={20} active={true} style={{ color: '#00dfd8' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0 }}>
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
            {notifications.map((s) => {
              const username = s.actor?.username || s.user;
              const message = s.message || `${s.action}`;
              const time = s.createdAt ? new Date(s.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : s.time;
              return (
              <div
                key={s.id}
                onClick={() => {
                  setShowNotifications(false);
                  navigate(`/profile/${username}`);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
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
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #00dfd8, #7928ca)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    flexShrink: 0,
                    fontSize: '13px',
                  }}
                >
                  {username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', color: '#fff', lineHeight: 1.4 }}>
                    <strong>@{username}</strong> {message}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#00dfd8', marginTop: '2px' }}>
                    {time}
                  </div>
                </div>
              </div>
              );
            })}
            {notifications.length === 0 && (
              <div className="zq-notification-empty">No new activity yet.</div>
            )}
          </div>

          <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '10.5px', color: '#6b7280', letterSpacing: '0.5px' }}>
              ✦ REAL-TIME QUANTUM SYNC CONNECTED
            </span>
          </div>
        </div>
      )}

      {/* Aura Insights Modal (Responsive for Desktop & Mobile) */}
      {showInsights && (
        <div
          onClick={() => setShowInsights(false)}
          className="zq-modal-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="zq-modal-box"
            style={{ maxWidth: '520px' }}
          >
            <div className="zq-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DashboardIcon size={22} active={true} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Aura Resonance Insights
                </h3>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                className="zq-modal-close-btn"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {/* Top Score */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.15) 0%, rgba(121, 40, 202, 0.15) 100%)',
                  border: '1px solid rgba(0, 223, 216, 0.3)',
                  borderRadius: '18px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#00dfd8', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  AURA RESONANCE SCORE
                </div>
                <div style={{ fontSize: '38px', fontWeight: 900, color: '#fff', margin: '4px 0', textShadow: '0 0 20px rgba(0, 223, 216, 0.6)' }}>
                  98.4 <span style={{ fontSize: '16px', color: '#7928ca' }}>/ 100</span>
                </div>
                <div style={{ fontSize: '12px', color: '#9499ab' }}>
                  Top 2% creator momentum in <strong>Tech Innovators Circle</strong>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
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
                      borderRadius: '14px',
                      padding: '12px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{st.val}</div>
                    <div style={{ fontSize: '10.5px', color: '#8892b0', marginTop: '2px' }}>{st.label}</div>
                    <div style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>{st.change}</div>
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
                  padding: '13px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
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
