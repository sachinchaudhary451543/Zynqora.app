import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CirclesIcon, AuraSparkIcon } from '../components/Icons';
import { COMMUNITY_CIRCLES } from '../data/communityCircles';
import CommunityCirclesBar from '../components/CommunityCirclesBar';

export default function CirclesHub() {
  const navigate = useNavigate();
  const circles = COMMUNITY_CIRCLES.filter((circle) => circle.id !== 'all');

  return (
    <div style={{ maxWidth: '1000px', margin: '28px auto 80px', padding: '0 20px', width: '100%' }}>
      <CommunityCirclesBar selectedId="" onSelect={(circle) => navigate(`/explore?circle=${circle.id}`)} />
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
          <article key={circle.id} className="zq-profile-card-widget" style={{ borderRadius: '16px', minHeight: '190px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: circle.tone, display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '16px' }}>
              <AuraSparkIcon size={21} active />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--zq-text-primary)', marginBottom: '6px' }}>{circle.name}</h2>
            <p style={{ color: 'var(--zq-text-secondary)', fontSize: '12px', lineHeight: '18px', marginBottom: '16px' }}>{circle.description}</p>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--zq-text-muted)', fontSize: '11px' }}>{circle.count !== undefined ? `${circle.count.toLocaleString()} members` : 'Community circle'}</span>
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