import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CirclesIcon, AuraSparkIcon } from '../components/Icons';

const circles = [
  { name: 'AI & Tech Hub', description: 'Build, share, and learn with curious technologists.', members: '5.4k', tone: 'var(--zq-aura-cyber)' },
  { name: 'Family Sanctuary', description: 'A quieter space for the people closest to you.', members: '12', tone: 'var(--zq-aura-emerald)' },
  { name: 'Creative Studio', description: 'Ideas, visual experiments, and making things together.', members: '3.8k', tone: 'var(--zq-aura-electric)' },
  { name: 'Gaming Hub', description: 'Find teammates, share wins, and stay in the loop.', members: '8.1k', tone: 'var(--zq-aura-solar)' },
  { name: 'Zen & Wellness', description: 'Small rituals and gentle accountability for your day.', members: '2.9k', tone: 'var(--zq-aura-primary)' },
];

export default function CirclesHub() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1000px', margin: '28px auto 80px', padding: '0 20px', width: '100%' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--zq-accent-cyan)', marginBottom: '8px' }}>
          <CirclesIcon size={22} active />
          <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px' }}>COMMUNITY NETWORK</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--zq-text-primary)', marginBottom: '6px' }}>Circles Hub</h1>
        <p style={{ color: 'var(--zq-text-secondary)', fontSize: '14px' }}>Choose a shared space and synchronize with people who care about the same things.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {circles.map((circle) => (
          <article key={circle.name} className="zq-profile-card-widget" style={{ borderRadius: '16px', minHeight: '190px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: circle.tone, display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '16px' }}>
              <AuraSparkIcon size={21} active />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--zq-text-primary)', marginBottom: '6px' }}>{circle.name}</h2>
            <p style={{ color: 'var(--zq-text-secondary)', fontSize: '12px', lineHeight: '18px', marginBottom: '16px' }}>{circle.description}</p>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--zq-text-muted)', fontSize: '11px' }}>{circle.members} members</span>
              <button type="button" className="zq-btn-aura" style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '9px' }} onClick={() => navigate('/explore')}>
                Explore
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}