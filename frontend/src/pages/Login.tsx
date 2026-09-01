import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ZynqoraLogo, ZynqoraWordmark } from '../components/Icons';
import AuthNotice from '../components/AuthNotice';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'warning' | 'error'>('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Enter your email/username and password.'); return; }
    if (email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address or username.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setNoticeType('error'); setLoading(true);
    try {
      const result = await api.forgotPassword(email, recoveryCode);
      if (result.resetToken) setResetToken(result.resetToken);
      setError(result.resetToken ? 'Identity verified. Choose a new password below.' : result.message);
      setNoticeType(result.resetToken ? 'success' : 'warning');
    } catch (err: any) { setError(err.message || 'Recovery request failed'); }
    finally { setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setNoticeType('error');
    if (resetPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setLoading(true);
    try { const result = await api.resetPassword(resetToken, resetPassword); setError(result.message); setNoticeType('success'); setRecovery(false); setResetToken(''); setResetPassword(''); setRecoveryCode(''); }
    catch (err: any) { setError(err.message || 'Password reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="zq-auth-container">
      <div className="zq-auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <ZynqoraLogo size={44} />
          <ZynqoraWordmark />
          <p style={{ color: 'var(--zq-text-secondary)', fontSize: '13px', marginTop: '6px', fontWeight: 500 }}>
            Your People. Your Circle. Your Zynqora.
          </p>
        </div>

        {recovery ? <form onSubmit={resetToken ? handleReset : handleRecovery}>
          <input type="text" className="zq-auth-input" placeholder="Account email or @username" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={Boolean(resetToken)} />
          {!resetToken && <input type="text" className="zq-auth-input" placeholder="Private recovery code" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} required />}
          {resetToken && <input type="password" className="zq-auth-input" placeholder="New password (8+ characters)" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required />}
          {error && <AuthNotice type={noticeType}>{error}</AuthNotice>}
          <button type="submit" className="zq-auth-btn" disabled={loading || !email || (!resetToken && !recoveryCode) || (Boolean(resetToken) && !resetPassword)}>{loading ? 'Processing...' : resetToken ? 'Reset Password' : 'Verify Recovery Code'}</button>
          <button type="button" onClick={() => { setRecovery(false); setError(''); setResetToken(''); }} style={{ width: '100%', marginTop: 10, background: 'transparent', border: 0, color: 'var(--zq-text-secondary)', cursor: 'pointer' }}>Back to login</button>
        </form> : <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="zq-auth-input"
            placeholder="Account Email or @username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="zq-auth-input"
            placeholder="Security Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <AuthNotice type={noticeType}>{error}</AuthNotice>}

          <button
            type="submit"
            className="zq-auth-btn"
            disabled={loading || !email || !password}
          >
            {loading ? 'Synchronizing...' : '⚡ Enter Zynqora'}
          </button>
        </form>
        }

        {!recovery && <button type="button" onClick={() => { setRecovery(true); setError(''); }} style={{ marginTop: 12, background: 'transparent', border: 0, color: 'var(--zq-accent-cyan)', cursor: 'pointer', fontSize: 12 }}>Forgot password?</button>}

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--zq-glass-border)', fontSize: '13px', color: 'var(--zq-text-secondary)' }}>
          <span>New to the community? </span>
          <Link to="/signup" style={{ color: 'var(--zq-accent-cyan)', fontWeight: 700 }}>
            Create Your Circle
          </Link>
        </div>
      </div>
    </div>
  );
}
