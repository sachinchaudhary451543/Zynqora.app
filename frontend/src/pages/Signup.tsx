import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ZynqoraLogo, ZynqoraWordmark } from '../components/Icons';
import AuthNotice from '../components/AuthNotice';
import AuthPoweredBy from '../components/AuthPoweredBy';
import GoogleSignInButton from '../components/GoogleSignInButton';

const interestChoices = [
  { value: 'tech', label: 'Technology' },
  { value: 'creative', label: 'Creative work' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'family', label: 'Family & friends' },
];

export default function Signup() {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<{ email: string; username: string; password: string; name: string; interests: string[] }>({ email: '', username: '', password: '', name: '', interests: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; valid: boolean; message: string; username: string } | null>(null);

  React.useEffect(() => {
    const username = form.username.trim().replace(/^@/, '').toLowerCase();
    if (!username) { setUsernameStatus(null); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const status = await api.checkUsername(username);
        if (!cancelled) setUsernameStatus({ ...status, username });
      } catch {
        if (!cancelled) setUsernameStatus({ available: false, valid: false, message: 'Could not check username availability.', username });
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedUsername = form.username.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(normalizedUsername)) { setError('Username must be 3–30 characters using only letters, numbers, underscores or dots.'); return; }
    if (usernameStatus?.username === normalizedUsername && (!usernameStatus.valid || !usernameStatus.available)) { setError(usernameStatus.message); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const code = await signup({
        ...form,
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        username: normalizedUsername,
      });
      if (code) { setRecoveryCode(code); setError('Save this private recovery code. It is required to recover your account.'); }
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (idToken: string) => {
    await loginWithGoogle(idToken);
    navigate('/feed');
  };

  const toggleInterest = (interest: string) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : current.interests.length < 5 ? [...current.interests, interest] : current.interests,
    }));
  };

  return (
    <div className="zq-auth-container">
      <div className="zq-auth-card zq-auth-card-animated zq-signup-card">
        <h1 className="zq-sr-only">Create your Zynqora account</h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <ZynqoraLogo size={44} />
          <ZynqoraWordmark />
          <p style={{ color: 'var(--zq-text-secondary)', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Sync, connect, and build your own communities.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            autoComplete="email"
            name="email"
            type="email"
            maxLength={254}
            aria-label="Account email"
            className="zq-auth-input"
            placeholder="Account Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            autoComplete="name"
            name="name"
            type="text"
            maxLength={80}
            aria-label="Full name"
            className="zq-auth-input"
            placeholder="Full Name / Identity"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            autoComplete="username"
            name="username"
            type="text"
            maxLength={31}
            aria-label="Username"
            className="zq-auth-input"
            placeholder="Unique Aura Handle (@username)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          {usernameStatus?.username === form.username.trim().replace(/^@/, '').toLowerCase() && (
            <div style={{ color: usernameStatus.available ? 'var(--zq-accent-cyan)' : 'var(--zq-danger)', fontSize: '11px', margin: '-4px 0 8px', fontWeight: 600 }}>
              {usernameStatus.message}
            </div>
          )}
          <input
            autoComplete="new-password"
            name="new-password"
            type="password"
            maxLength={128}
            aria-label="Password, at least 8 characters"
            className="zq-auth-input"
            placeholder="Quantum Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <fieldset style={{ border: 0, padding: 0, margin: '8px 0 14px' }}>
            <legend style={{ color: 'var(--zq-text-primary)', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              What are you into? <span style={{ color: 'var(--zq-text-muted)', fontWeight: 400 }}>Optional · choose up to 5</span>
            </legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {interestChoices.map(({ value, label }) => {
                const selected = form.interests.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(value)}
                    style={{
                      border: `1px solid ${selected ? 'var(--zq-accent-cyan)' : 'var(--zq-glass-border)'}`,
                      borderRadius: '999px',
                      padding: '7px 11px',
                      color: selected ? 'var(--zq-accent-cyan)' : 'var(--zq-text-secondary)',
                      background: selected ? 'rgba(0, 223, 216, 0.08)' : 'var(--zq-surface-card)',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

        {error && <AuthNotice type={recoveryCode ? 'warning' : 'error'}>{error}</AuthNotice>}
        {recoveryCode && <div style={{ padding: '10px', margin: '8px 0', border: '1px solid var(--zq-accent-cyan)', borderRadius: 8, color: 'var(--zq-accent-cyan)', fontFamily: 'monospace', textAlign: 'center' }}>{recoveryCode}</div>}

          <p style={{ fontSize: '11px', color: 'var(--zq-text-muted)', margin: '12px 0', lineHeight: '15px' }}>
            By initializing your Zynqora presence, you agree to our Community Circle Protocols and Data Privacy Shields.
          </p>

          <div className="zq-auth-divider"><span>or</span></div>
          <GoogleSignInButton onSignIn={handleGoogleSignIn} onError={setError} />

          <button
            type="submit"
            className="zq-auth-btn"
            disabled={loading || !form.email || !form.password || !form.username || !form.name || usernameStatus?.username !== form.username.trim().replace(/^@/, '').toLowerCase() || !usernameStatus?.available}
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
        <AuthPoweredBy />
      </div>
    </div>
  );
}
