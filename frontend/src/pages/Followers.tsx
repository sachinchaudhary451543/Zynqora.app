import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, getAvatarUrl, normalizeConnectionUsers } from '../api/client';

export default function FollowersPage() {
  const { username } = useParams<{ username: string }>();
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!username) return;
      try {
        const res = await api.getFollowers(username);
        setList(normalizeConnectionUsers(res, 'follower'));
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, [username]);

  if (error) return <div className="page error-text">{error}</div>;
  return (
    <div className="page">
      <h2>Followers of @{username}</h2>
      {list.length === 0 && <p className="muted">No followers yet.</p>}
      {list.map((f) => (
        <div key={f.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 8 }}>
          <img src={getAvatarUrl(f.follower)} alt="a" style={{ width: 48, height: 48, borderRadius: 8 }} />
          <div>
            <div style={{ fontWeight: 600 }}>{f.follower.name}</div>
            <div className="muted">@{f.follower.username}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
