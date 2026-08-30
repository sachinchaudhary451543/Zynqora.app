import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ZynqoraLogo, ZynqoraWordmark } from '../components/Icons';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zq-auth-container">
      <div className="zq-auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <ZynqoraLogo size={44} />
          <ZynqoraWordmark />
          <p style={{ color: 'var(--zq-text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Sync, connect, and build your own communities.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="zq-auth-input"
            placeholder="Account Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="text"
            className="zq-auth-input"
            placeholder="Full Name / Identity"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            className="zq-auth-input"
            placeholder="Unique Aura Handle (@username)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            type="password"
            className="zq-auth-input"
            placeholder="Quantum Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {error && (
            <div style={{ color: 'var(--zq-danger)', fontSize: '12px', margin: '8px 0', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: '11px', color: 'var(--zq-text-muted)', margin: '12px 0', lineHeight: '15px' }}>
            By initializing your Zynqora presence, you agree to our Community Circle Protocols and Data Privacy Shields.
          </p>

          <button
            type="submit"
            className="zq-auth-btn"
            disabled={loading || !form.email || !form.password || !form.username || !form.name}
          >
            {loading ? 'Initializing Circle...' : '⚡ Join Zynqora'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--zq-glass-border)', fontSize: '13px', color: 'var(--zq-text-secondary)' }}>
          <span>Already synchronized? </span>
          <Link to="/login" style={{ color: 'var(--zq-accent-cyan)', fontWeight: 700 }}>
            Enter Your Circle
          </Link>
        </div>
      </div>
    </div>
  );
}
