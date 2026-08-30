import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ZynqoraLogo, ZynqoraWordmark } from '../components/Icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="zq-auth-input"
            placeholder="Account Email"
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

          {error && (
            <div style={{ color: 'var(--zq-danger)', fontSize: '12px', margin: '8px 0', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="zq-auth-btn"
            disabled={loading || !email || !password}
          >
            {loading ? 'Synchronizing...' : '⚡ Enter Zynqora'}
          </button>
        </form>

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
