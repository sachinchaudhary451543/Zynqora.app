import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ZynqoraLogo, ZynqoraWordmark } from '../components/Icons';
import AuthNotice from '../components/AuthNotice';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; valid: boolean; message: string } | null>(null);

  React.useEffect(() => {
    const username = form.username.trim();
    if (!username) { setUsernameStatus(null); return; }
    const timer = window.setTimeout(async () => {
      try { setUsernameStatus(await api.checkUsername(username)); }
      catch { setUsernameStatus({ available: false, valid: false, message: 'Could not check username availability.' }); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username.trim())) { setError('Username must be 3–30 characters using only letters, numbers, underscores or dots.'); return; }
    if (usernameStatus && (!usernameStatus.valid || !usernameStatus.available)) { setError(usernameStatus.message); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const code = await signup(form);
      if (code) { setRecoveryCode(code); setError('Save this private recovery code. It is required to recover your account.'); }
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
          {usernameStatus && (
            <div style={{ color: usernameStatus.available ? 'var(--zq-accent-cyan)' : 'var(--zq-danger)', fontSize: '11px', margin: '-4px 0 8px', fontWeight: 600 }}>
              {usernameStatus.message}
            </div>
          )}
          <input
            type="password"
            className="zq-auth-input"
            placeholder="Quantum Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

        {error && <AuthNotice type={recoveryCode ? 'warning' : 'error'}>{error}</AuthNotice>}
        {recoveryCode && <div style={{ padding: '10px', margin: '8px 0', border: '1px solid var(--zq-accent-cyan)', borderRadius: 8, color: 'var(--zq-accent-cyan)', fontFamily: 'monospace', textAlign: 'center' }}>{recoveryCode}</div>}

          <p style={{ fontSize: '11px', color: 'var(--zq-text-muted)', margin: '12px 0', lineHeight: '15px' }}>
            By initializing your Zynqora presence, you agree to our Community Circle Protocols and Data Privacy Shields.
          </p>

          <button
            type="submit"
            className="zq-auth-btn"
            disabled={loading || !form.email || !form.password || !form.username || !form.name || !usernameStatus?.available}
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
