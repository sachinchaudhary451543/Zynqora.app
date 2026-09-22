import React, { useEffect, useState } from 'react';
import { CommunityCircle, COMMUNITY_CIRCLES } from '../data/communityCircles';
import { api } from '../api/client';

export default function CommunityCirclesBar({
  selectedId = 'all',
  onSelect,
  circles = COMMUNITY_CIRCLES,
}: {
  selectedId?: string;
  onSelect?: (circle: CommunityCircle) => void;
  circles?: CommunityCircle[];
}) {
  const [liveCircles, setLiveCircles] = useState<CommunityCircle[]>(circles);

  useEffect(() => {
    let active = true;
    api.getCircles().then((records) => {
      if (!active || !records.length) return;
      setLiveCircles(records.map((circle) => ({
        id: circle.slug,
        name: `${circle.icon || ''}${circle.icon ? ' ' : ''}${circle.name}`,
        // Show post count for named circles; total user count for Global Sync
        count: circle.postCount !== null ? circle.postCount : circle.memberCount,
        description: circle.description || '',
        tone: 'var(--zq-aura-primary)',
      })));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <nav className="zq-circles-bar" aria-label="Community circles">
      <div className="zq-circles-scroll-track">
        {liveCircles.map((circle) => (
          <button
            type="button"
            key={circle.id}
            className={`zq-circle-pill ${selectedId === circle.id ? 'active' : ''}`}
            onClick={() => onSelect?.(circle)}
            aria-pressed={selectedId === circle.id}
          >
            <span>{circle.name}</span>
            {circle.count !== undefined && <span className="zq-circle-count">({circle.count.toLocaleString()})</span>}
          </button>
        ))}
      </div>
      <span className="zq-circles-fade" aria-hidden="true" />
    </nav>
  );
}
