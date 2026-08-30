import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function FollowingPage() {
  const { username } = useParams<{ username: string }>();
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!username) return;
      try {
        const res = await api.getFollowing(username);
        setList(res || []);
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, [username]);

  if (error) return <div className="page error-text">{error}</div>;
  return (
    <div className="page">
      <h2>Following by @{username}</h2>
      {list.length === 0 && <p className="muted">Not following anyone yet.</p>}
      {list.map((f) => (
        <div key={f.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 8 }}>
          <img src={f.following.profileImage || f.following.avatarUrl || '/placeholder-avatar.png'} alt="a" style={{ width: 48, height: 48, borderRadius: 8 }} />
          <div>
            <div style={{ fontWeight: 600 }}>{f.following.name}</div>
            <div className="muted">@{f.following.username}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
