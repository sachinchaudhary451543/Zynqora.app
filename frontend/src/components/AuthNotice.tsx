import React from 'react';

export default function AuthNotice({ type, children }: { type: 'success' | 'warning' | 'error'; children: React.ReactNode }) {
  const styles = {
    success: { color: '#00dfd8', border: 'rgba(0,223,216,.35)', background: 'rgba(0,223,216,.08)', icon: '✓' },
    warning: { color: '#f9cb28', border: 'rgba(249,203,40,.35)', background: 'rgba(249,203,40,.08)', icon: '!' },
    error: { color: 'var(--zq-danger)', border: 'rgba(255,75,75,.35)', background: 'rgba(255,75,75,.08)', icon: '×' },
  }[type];
  return <div role="alert" style={{ color: styles.color, border: `1px solid ${styles.border}`, background: styles.background, borderRadius: 10, padding: '10px 12px', margin: '10px 0', fontSize: 12, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start' }}><span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>{styles.icon}</span><span>{children}</span></div>;
}
