import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getAvatarUrl, normalizeConnectionUsers } from '../api/client';

export default function FollowingPage() {
  const { username } = useParams<{ username: string }>();
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!username) return;
      try {
        const res = await api.getFollowing(username);
        setList(normalizeConnectionUsers(res, 'following'));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  if (error) return <div className="zq-connections-page"><div className="zq-connections-error">{error}</div></div>;
  return (
    <div className="zq-connections-page">
      <div className="zq-connections-heading"><span>COMMUNITY CIRCLE</span><h1>Following</h1><p>People @{username} has connected with</p></div>
      {loading ? <p className="zq-connections-muted">Loading connections...</p> : list.length === 0 && <p className="zq-connections-muted">Not following anyone yet.</p>}
      {list.map((f) => (
        <Link className="zq-connection-card" key={f.id} to={`/profile/${f.username}`}>
          <img src={getAvatarUrl(f)} alt={f.name} />
          <div>
            <strong>{f.name}</strong>
            <span>@{f.username}</span>
          </div>
          <span className="zq-connection-arrow">View</span>
        </Link>
      ))}
    </div>
  );
}
