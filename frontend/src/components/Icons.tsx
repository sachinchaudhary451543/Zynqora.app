import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  active?: boolean;
}

// Zynqora Infinity-Core Emblem Logo (Sync + Core + Aura)
export const ZynqoraLogo: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="zynqoraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00DFD8" />
        <stop offset="50%" stopColor="#7928CA" />
        <stop offset="100%" stopColor="#FF0080" />
      </linearGradient>
      <linearGradient id="zynqoraCore" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FF0080" />
        <stop offset="100%" stopColor="#7928CA" />
      </linearGradient>
      <filter id="auraGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Outer Aura Ring */}
    <circle cx="16" cy="16" r="14" stroke="url(#zynqoraGrad)" strokeWidth="1.8" strokeDasharray="6 3" filter="url(#auraGlow)" opacity="0.85" />
    {/* Sync Dynamic Orbital Curves */}
    <path
      d="M8 16C8 11.5817 11.5817 8 16 8C20.4183 8 24 11.5817 24 16C24 20.4183 20.4183 24 16 24"
      stroke="url(#zynqoraGrad)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M24 16C24 20.4183 20.4183 24 16 24C11.5817 24 8 20.4183 8 16"
      stroke="url(#zynqoraCore)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeDasharray="4 2"
    />
    {/* Core Community Nucleus */}
    <circle cx="16" cy="16" r="4.5" fill="url(#zynqoraGrad)" />
    <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
  </svg>
);

// Zynqora Typographic Wordmark with Gradient Aura
export const ZynqoraWordmark: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className} style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
    <span
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        fontSize: '20px',
        fontWeight: 800,
        letterSpacing: '1.5px',
        background: 'linear-gradient(135deg, #00DFD8 0%, #7928CA 50%, #FF0080 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textTransform: 'uppercase',
      }}
    >
      ZYNQORA
    </span>
    <span
      style={{
        fontSize: '8px',
        fontWeight: 600,
        letterSpacing: '1px',
        color: 'var(--zq-text-muted)',
        marginTop: '3px',
        textTransform: 'uppercase',
      }}
    >
      SYNC • CORE • AURA
    </span>
  </div>
);

// Community Circles / Qoras Icon
export const CirclesIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.4' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="9" r="6" stroke="currentColor" />
    <circle cx="15" cy="15" r="6" stroke={active ? 'url(#zynqoraGrad)' : 'currentColor'} />
    <circle cx="16" cy="8" r="3" stroke="currentColor" opacity="0.6" />
  </svg>
);

// Aura Spark / Energy Reaction Icon
export const AuraSparkIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} />
  </svg>
);

// Sync Stream (Home) Icon
export const HomeIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 10.5 12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M9 22V12h6v10" fill={active ? 'var(--zq-surface)' : 'none'} />
  </svg>
);

// Explore & Discover Icon
export const ExploreIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.4' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={active ? 'currentColor' : 'none'} />
  </svg>
);

// Search Icon
export const SearchIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.8' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// Direct Sync Messages Icon
export const MessagesIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// Aura Notifications
export const NotificationsIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>
);

// Create Sync Post Icon
export const CreateIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.6' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="6" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

// Dashboard / Aura Analytics Icon
export const DashboardIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.4' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

// Zynqora Control Center (Settings) Icon
export const SettingsGearIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// Hamburger Icon
export const HamburgerIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);

// Grid Icon
export const GridIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
  </svg>
);

// Bookmark / Vault Icon
export const BookmarkIcon: React.FC<IconProps> = ({ size = 18, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

// Tagged / Aura Network Icon
export const TaggedIcon: React.FC<IconProps> = ({ size = 18, active: _active, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
  </svg>
);

// Reels / Aura Clip Icon
export const ReelsIcon: React.FC<IconProps> = ({ size = 24, active = false, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="6" />
    <path d="m10 15 5-3-5-3v6z" fill="currentColor" />
  </svg>
);

// Share / Broadcast Icon
export const ShareIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// Comment Icon
export const CommentIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// More Dots Icon
export const MoreDotsIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="19" cy="12" r="1.75" />
    <circle cx="5" cy="12" r="1.75" />
  </svg>
);

// Shield / Encrypted Space Icon
export const ShieldLockIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// Link Icon
export const LinkIcon: React.FC<IconProps> = ({ size = 14, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
