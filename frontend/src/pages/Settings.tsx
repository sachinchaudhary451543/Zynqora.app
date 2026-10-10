import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, getAvatarUrl } from '../api/client';
import AvatarActionsModal from '../components/AvatarActionsModal';
import ImageEditor from '../components/ImageEditor';
import { COMMUNITY_CIRCLES_CHANGED, CommunityCircle } from '../data/communityCircles';
import {
  SearchIcon,
  ShieldLockIcon,
  CirclesIcon,
  AuraSparkIcon,
  MessagesIcon,
  NotificationsIcon,
} from '../components/Icons';

type TabKey =
  | 'aura-profile'
  | 'circles-management'
  | 'privacy-spaces'
  | 'sparks-notifications'
  | 'security-keys';

export default function SettingsPage() {
  const { user, logout, setUserState } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('aura-profile');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '✨ अनित्यं सर्वम् • 12 Sep\n☁️ Cloud & AI Engineer\n🤖 Building AI Agents & Automation\n💻 Full Stack | Python | Azure... more');
  const [website, setWebsite] = useState(user?.website || 'codewithsp20079.netlify.app');
  const [category, setCategory] = useState(user?.category || 'Education • AI Creator');
  const [vibeNote, setVibeNote] = useState(user?.note || '⚡ In the Zone');
  const [showAuraBadge, setShowAuraBadge] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('zynqora-theme') === 'dark');

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('zynqora-theme', next ? 'dark' : 'light');
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
  };

  const [privacy, setPrivacy] = useState({
    profileVisibility: user?.profileVisibility || 'PUBLIC',
    followersVisibility: user?.followersVisibility || 'PUBLIC',
    followingVisibility: user?.followingVisibility || 'PUBLIC',
  });

  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [circles, setCircles] = useState<CommunityCircle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [busyCircle, setBusyCircle] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({ interests: [] as string[], notifySocialActivity: true, notifyCircleActivity: true, weeklyDigestEnabled: false });
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [digest, setDigest] = useState<{ from: string; to: string; socialActivity: number; circleActivity: number } | null>(null);

  // Avatar edit / upload state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (user?.username) {
      api.getProfile(user.username)
        .then((p) => {
          if (p.name) setName(p.name);
          if (p.bio) setBio(p.bio);
          if (p.website) setWebsite(p.website);
          if (p.category) setCategory(p.category);
          if (p.note) setVibeNote(p.note);
          if (p.profileVisibility) {
            setPrivacy({
              profileVisibility: p.profileVisibility || 'PUBLIC',
              followersVisibility: p.followersVisibility || 'PUBLIC',
              followingVisibility: p.followingVisibility || 'PUBLIC',
            });
          }
        })
        .catch(() => {});
    }
  }, [user?.username]);

  useEffect(() => {
    if (activeTab !== 'circles-management') return;
    setCirclesLoading(true);
    api.getCircles()
      .then(setCircles)
      .catch((err: unknown) => setErrorMsg(err instanceof Error ? err.message : 'Could not load circles.'))
      .finally(() => setCirclesLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'sparks-notifications') return;
    setPreferencesLoading(true);
    api.getPreferences()
      .then(setPreferences)
      .catch((err: unknown) => setErrorMsg(err instanceof Error ? err.message : 'Could not load notification preferences.'))
      .finally(() => setPreferencesLoading(false));
  }, [activeTab]);

  const savePreferences = async (update: Partial<typeof preferences>) => {
    setPreferencesLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const saved = await api.updatePreferences({ ...preferences, ...update });
      setPreferences(saved);
      setDigest(null);
      if (user) setUserState({ ...user, ...saved });
      setSuccessMsg('Your preferences have been saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save your preferences.');
    } finally {
      setPreferencesLoading(false);
    }
  };

  const loadDigest = async () => {
    setErrorMsg('');
    try {
      setDigest(await api.getWeeklyDigest());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load your weekly recap.');
    }
  };

  const toggleCircleMembership = async (circle: CommunityCircle) => {
    setBusyCircle(circle.slug);
    setErrorMsg('');
    try {
      if (circle.isMember) await api.leaveCircle(circle.slug);
      else await api.joinCircle(circle.slug);
      setCircles(await api.getCircles());
      window.dispatchEvent(new Event(COMMUNITY_CIRCLES_CHANGED));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update circle membership.');
    } finally {
      setBusyCircle(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const updatedUser = await api.updateProfile({
        name,
        bio,
        website,
        category,
        note: vibeNote,
      });
      await api.updatePrivacy(privacy);

      if (setUserState && user) {
        setUserState({
          ...user,
          ...updatedUser,
          profileVisibility: privacy.profileVisibility,
          followersVisibility: privacy.followersVisibility,
          followingVisibility: privacy.followingVisibility,
        });
      }

      setSuccessMsg('Zynqora Profile & Aura parameters updated.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatarFile = async (file: File) => {
    setShowAvatarModal(false);
    try {
      setSaving(true);
      const res = await api.uploadMedia(file);
      await api.updateProfile({ profileImage: res.publicUrl });
      if (setUserState && user) {
        setUserState({ ...user, profileImage: `${res.publicUrl}?v=${Date.now()}` });
      }
      setSuccessMsg('Aura Avatar updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all of its posts, stories, comments, and likes? This cannot be undone.')) return;
    setDeletingAccount(true);
    setErrorMsg('');
    try {
      await api.deleteAccount();
      logout();
      window.location.href = '/login';
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete account');
      setDeletingAccount(false);
    }
  };

  const currentAvatar = getAvatarUrl(user);

  return (
    <div className="zq-settings-page">
      {/* Left Navigation */}
      <div className="zq-settings-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px 8px 8px' }}>
          <span className="zq-pulse-orb" />
          <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px', color: '#fff', margin: 0 }}>
            CONTROL CENTER
          </h1>
        </div>

        <div className="zq-settings-search" style={{ position: 'relative', marginBottom: '8px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--zq-text-muted)', display: 'flex' }}>
            <SearchIcon size={16} />
          </span>
          <input
            className="zq-settings-input"
            style={{ paddingLeft: '36px', fontSize: '13px' }}
            aria-label="Search preferences"
            placeholder="Search preferences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="zq-settings-tabs" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            className={`zq-nav-item ${activeTab === 'aura-profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('aura-profile')}
          >
            <AuraSparkIcon size={18} active={activeTab === 'aura-profile'} />
            <span>Aura & Profile</span>
          </button>

          <button
            className={`zq-nav-item ${activeTab === 'circles-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('circles-management')}
          >
            <CirclesIcon size={18} active={activeTab === 'circles-management'} />
            <span>Community Circles</span>
          </button>

          <button
            className={`zq-nav-item ${activeTab === 'privacy-spaces' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy-spaces')}
          >
            <ShieldLockIcon size={18} />
            <span>Sync Privacy & Vault</span>
          </button>

          <button
            className={`zq-nav-item ${activeTab === 'sparks-notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('sparks-notifications')}
          >
            <NotificationsIcon size={18} />
            <span>Aura Spark Alerts</span>
          </button>
        </div>

        <div className="zq-settings-security-note" style={{ marginTop: 'auto', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--zq-glass-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zq-accent-cyan)', marginBottom: '4px' }}>
            ZYNQORA SECURITY CORE
          </div>
          <p style={{ fontSize: '11px', color: 'var(--zq-text-secondary)', lineHeight: '15px' }}>
            All circles, sync messages, and media streams are governed by decentralized encryption parameters.
          </p>
        </div>
      </div>

      {/* Right Content Form Area */}
      <div className="zq-settings-content" style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px', color: '#fff' }}>
          {activeTab === 'aura-profile' ? 'Aura & Identity Settings' : activeTab === 'sparks-notifications' ? 'Notification & recap controls' : activeTab === 'circles-management' ? 'Your community circles' : 'Circle & Privacy Parameters'}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', marginBottom: 20, borderRadius: 16, background: 'var(--zq-glass)', border: '1px solid var(--zq-glass-border)', boxShadow: 'inset 1px 1px rgba(255,255,255,.18), 0 10px 24px rgba(0,80,120,.12)' }}>
          <div><strong style={{ color: 'var(--zq-text-primary)' }}>Appearance</strong><div style={{ color: 'var(--zq-text-secondary)', fontSize: 12 }}>Light glass is the default. Dark mode is only for your device.</div></div>
          <button type="button" onClick={toggleTheme} aria-pressed={darkMode} className="zq-btn-glass">{darkMode ? '☀ Light mode' : '🌙 Dark mode'}</button>
        </div>

        {successMsg && (
          <div style={{ padding: '12px 18px', background: 'rgba(0, 223, 216, 0.15)', border: '1px solid rgba(0, 223, 216, 0.4)', color: 'var(--zq-accent-cyan)', borderRadius: '12px', marginBottom: '24px', fontWeight: 600 }}>
            ✓ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '12px 18px', background: 'rgba(255, 51, 102, 0.15)', border: '1px solid rgba(255, 51, 102, 0.4)', color: 'var(--zq-danger)', borderRadius: '12px', marginBottom: '24px', fontWeight: 600 }}>
            ✕ {errorMsg}
          </div>
        )}

        {activeTab === 'aura-profile' && (
          <form onSubmit={handleSaveProfile}>
            {/* Header Avatar Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                background: 'var(--zq-surface-card)',
                border: '1px solid var(--zq-glass-border)',
                borderRadius: '20px',
                marginBottom: '28px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div className="zq-avatar-ring" style={{ width: '60px', height: '60px' }}>
                  <img src={currentAvatar} alt="avatar" className="zq-avatar-img" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>@{user?.username}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--zq-accent-cyan)' }}>{vibeNote || '⚡ In the Zone'}</p>
                </div>
              </div>

              <button
                type="button"
                className="zq-btn-aura"
                onClick={() => setShowAvatarModal(true)}
              >
                Change Avatar Aura
              </button>
            </div>

            {/* Display Name */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Full Display Name
              </label>
              <input
                type="text"
                className="zq-settings-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category / Professional Identity */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Circle Title & Category
              </label>
              <input
                type="text"
                className="zq-settings-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. AI Creator & Community Architect"
              />
            </div>

            {/* Active Aura Vibe */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Active Aura Vibe (Status)
              </label>
              <select
                className="zq-settings-select"
                value={vibeNote}
                onChange={(e) => setVibeNote(e.target.value)}
              >
                <option value="⚡ In the Zone">⚡ In the Zone (Focus Cyan)</option>
                <option value="🔥 Building the Future">🔥 Building the Future (Solar Flare)</option>
                <option value="🎧 Vibing to Lo-Fi">🎧 Vibing to Lo-Fi (Purple Nebula)</option>
                <option value="🌌 Dreaming Big">🌌 Dreaming Big (Cosmic Violet)</option>
                <option value="🌿 Zen & Grounded">🌿 Zen & Grounded (Emerald Flow)</option>
                <option value="✨ Inspiring Others">✨ Inspiring Others (Pink Aura)</option>
              </select>
            </div>

            {/* Website Link */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Portfolio / Community Link
              </label>
              <input
                type="text"
                className="zq-settings-input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {/* Bio with Character Counter */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Aura Bio (About You)
              </label>
              <textarea
                className="zq-settings-textarea"
                rows={4}
                maxLength={160}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--zq-text-muted)', marginTop: '4px' }}>
                {bio.length} / 160
              </div>
            </div>

            <button type="submit" className="zq-btn-aura" disabled={saving} style={{ padding: '12px 32px' }}>
              {saving ? 'Synchronizing...' : 'Save Aura Settings'}
            </button>

            <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255, 51, 102, 0.3)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--zq-danger)', marginBottom: '6px' }}>Delete account</h3>
              <p style={{ color: 'var(--zq-text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                Permanently remove your account and its content from Zynqora.
              </p>
              <button type="button" className="zq-btn-glass" onClick={handleDeleteAccount} disabled={deletingAccount} style={{ color: 'var(--zq-danger)', borderColor: 'rgba(255, 51, 102, 0.45)' }}>
                {deletingAccount ? 'Deleting account...' : 'Delete my account'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'privacy-spaces' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Sync Visibility Scopes</h3>
              <p style={{ color: 'var(--zq-text-secondary)', fontSize: '13px' }}>
                Control how your profile and syncs are distributed across community circles.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Profile Visibility
              </label>
              <select
                className="zq-settings-select"
                value={privacy.profileVisibility}
                onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
              >
                <option value="PUBLIC">🌍 Public to All Community Circles</option>
                <option value="FOLLOWERS_ONLY">👥 Synchronized Members Only</option>
                <option value="PRIVATE">🔒 Encrypted Private Circle</option>
              </select>
            </div>

            <button className="zq-btn-aura" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Updating...' : 'Apply Privacy Scopes'}
            </button>
          </div>
        )}

        {activeTab === 'circles-management' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Your Community Circles</h3>
            <p style={{ color: 'var(--zq-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Manage memberships and permissions across your community circles.
            </p>
            {circlesLoading && <p role="status">Loading circles…</p>}
            {!circlesLoading && circles.length === 0 && !errorMsg && <p>No circles are available yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {circles.filter((circle) => circle.slug !== 'all').map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--zq-surface-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--zq-glass-border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--zq-text-secondary)' }}>
                      {c.memberCount.toLocaleString()} {c.memberCount === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={c.isMember ? 'zq-btn-glass' : 'zq-btn-aura'}
                    style={{ fontSize: '12px' }}
                    disabled={busyCircle === c.slug}
                    onClick={() => void toggleCircleMembership(c)}
                  >
                    {busyCircle === c.slug ? 'Saving…' : c.isMember ? 'Leave' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sparks-notifications' && (
          <div className="zq-notification-preferences">
            <p>Choose what reaches your activity inbox. These controls do not affect your ability to use circles or see their content.</p>
            {preferencesLoading && <p role="status">Loading or saving preferences…</p>}
            <label>
              <span><strong>Social activity</strong><small>Follows, likes, comments, and other social notifications.</small></span>
              <input type="checkbox" checked={preferences.notifySocialActivity} disabled={preferencesLoading} onChange={(event) => void savePreferences({ notifySocialActivity: event.target.checked })} />
            </label>
            <label>
              <span><strong>Circle activity</strong><small>Updates about circle events and community activity.</small></span>
              <input type="checkbox" checked={preferences.notifyCircleActivity} disabled={preferencesLoading} onChange={(event) => void savePreferences({ notifyCircleActivity: event.target.checked })} />
            </label>
            <label>
              <span><strong>Weekly recap</strong><small>Opt in to an on-demand summary of your last seven days in Zynqora.</small></span>
              <input type="checkbox" checked={preferences.weeklyDigestEnabled} disabled={preferencesLoading} onChange={(event) => void savePreferences({ weeklyDigestEnabled: event.target.checked })} />
            </label>
            <section className="zq-settings-interests">
              <h3>Interests for circle suggestions</h3>
              <p>These are private to you and only used to sort circle recommendations.</p>
              <div className="zq-settings-interest-list">
                {[
                  { value: 'tech', label: 'Technology' },
                  { value: 'creative', label: 'Creative work' },
                  { value: 'gaming', label: 'Gaming' },
                  { value: 'wellness', label: 'Wellness' },
                  { value: 'family', label: 'Family & friends' },
                ].map(({ value, label }) => (
                  <label key={value} className="zq-interest-option">
                    <input
                      type="checkbox"
                      checked={preferences.interests.includes(value)}
                      disabled={preferencesLoading || (!preferences.interests.includes(value) && preferences.interests.length >= 5)}
                      onChange={(event) => {
                        const interests = event.target.checked
                          ? [...preferences.interests, value]
                          : preferences.interests.filter((interest) => interest !== value);
                        void savePreferences({ interests });
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
            {preferences.weeklyDigestEnabled && (
              <section className="zq-weekly-recap">
                <button type="button" className="zq-btn-glass" disabled={preferencesLoading} onClick={() => void loadDigest()}>Show my last 7 days</button>
                {digest && <p role="status">Last 7 days: {digest.socialActivity} social updates and {digest.circleActivity} circle event updates.</p>}
              </section>
            )}
          </div>
        )}
      </div>

      {showAvatarModal && (
        <AvatarActionsModal
          currentAvatarUrl={currentAvatar}
          currentAvatarName={user?.name || user?.username || 'You'}
          onClose={() => setShowAvatarModal(false)}
          onPickFile={handlePickAvatarFile}
          onEdit={() => {
            setShowAvatarModal(false);
            setShowEditor(true);
          }}
          onGenerateAi={async () => {
            setShowAvatarModal(false);
            const res = await api.aiGenerate(user?.username || 'user');
            await api.updateProfile({ profileImage: res.publicUrl });
            if (setUserState && user) {
              setUserState({ ...user, profileImage: res.publicUrl });
            }
          }}
          onRemove={async () => {
            setShowAvatarModal(false);
            await api.updateProfile({ profileImage: null });
            if (setUserState && user) {
              setUserState({ ...user, profileImage: null });
            }
          }}
        />
      )}

      {showEditor && (
        <ImageEditor
          src={currentAvatar}
          onApply={async (file) => {
            setShowEditor(false);
            await handlePickAvatarFile(file);
          }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
