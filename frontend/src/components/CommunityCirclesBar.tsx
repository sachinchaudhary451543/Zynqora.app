import React, { useEffect, useState } from 'react';
import { COMMUNITY_CIRCLES_CHANGED, CommunityCircle } from '../data/communityCircles';
import { api } from '../api/client';

export default function CommunityCirclesBar({
  selectedId = 'all',
  onSelect,
}: {
  selectedId?: string;
  onSelect?: (circle: CommunityCircle) => void;
}) {
  const [liveCircles, setLiveCircles] = useState<CommunityCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => {
      api.getCircles()
        .then((records) => {
          if (!active) return;
          setLiveCircles(records);
          setError('');
        })
        .catch((err: unknown) => {
          if (active) setError(err instanceof Error ? err.message : 'Could not load community circles.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    load();
    window.addEventListener(COMMUNITY_CIRCLES_CHANGED, load);
    return () => {
      active = false;
      window.removeEventListener(COMMUNITY_CIRCLES_CHANGED, load);
    };
  }, []);

  return (
    <nav className="zq-circles-bar" aria-label="Community circles">
      <div className="zq-circles-scroll-track">
        {loading && <span className="zq-circle-status" role="status">Loading circles…</span>}
        {!loading && error && <span className="zq-circle-status" role="alert">{error}</span>}
        {!loading && !error && liveCircles.length === 0 && <span className="zq-circle-status">No circles are available yet.</span>}
        {liveCircles.map((circle) => (
          <button
            type="button"
            key={circle.slug}
            className={`zq-circle-pill ${selectedId === circle.slug ? 'active' : ''}`}
            onClick={() => onSelect?.(circle)}
            aria-pressed={selectedId === circle.slug}
          >
            <span>{circle.icon ? `${circle.icon} ` : ''}{circle.name}</span>
            <span className="zq-circle-count">
              {circle.memberCount.toLocaleString()} {circle.memberCount === 1 ? 'member' : 'members'}
            </span>
          </button>
        ))}
      </div>
      <span className="zq-circles-fade" aria-hidden="true" />
    </nav>
  );
}
