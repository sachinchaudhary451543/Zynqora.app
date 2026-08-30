import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Post, getAvatarUrl } from '../api/client';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';

import StoryRecorder from '../components/StoryRecorder';
import ImageEditor from '../components/ImageEditor';
import AvatarActionsModal from '../components/AvatarActionsModal';
import FollowersModal from '../components/FollowersModal';
import AiStudioModal from '../components/AiStudioModal';
import { SettingsGearIcon, TaggedIcon as ImageIcon, ReelsIcon as VideoIcon, AuraSparkIcon as CheckCircleIcon, MessagesIcon } from '../components/Icons';

export default function Profile() {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { user, setUserState } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [remotePreviewUrl, setRemotePreviewUrl] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAiStudio, setShowAiStudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts'|'circles'|'aura'>('posts');
  const [auraColor] = useState('#8b5cf6');

  // Followers / Following modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const load = async () => {
    if (!username) return;
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.getProfile(username),
        api.getUserPosts(username),
      ]);
      setProfile(profileRes);
      setPosts(postsRes);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [username]);

  const openFollowers = async () => {
    setShowFollowersModal(true);
    if (followers.length === 0) {
      setLoadingFollowers(true);
      try {
        const data = await api.getFollowers(username!);
        setFollowers(data);
      } catch (e) { console.error(e); }
      finally { setLoadingFollowers(false); }
    }
  };

  const openFollowing = async () => {
    setShowFollowingModal(true);
    if (following.length === 0) {
      setLoadingFollowing(true);
      try {
        const data = await api.getFollowing(username!);
        setFollowing(data);
      } catch (e) { console.error(e); }
      finally { setLoadingFollowing(false); }
    }
  };

  const handleFollow = async () => {
    if (!username) return;
    await api.follow(username);
    load();
  };

  const uploadFileIfAny = async () => {
    setUploading(true);
    try {
      if (selectedFile) {
        const file = selectedFile;
        const presign = await api.presignUpload(file.name, file.type);
        let publicUrl = presign.publicUrl;
        if (presign.method === 'PUT') {
          await fetch(presign.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        } else {
          const res = await api.uploadLocal(file as File);
          publicUrl = res.publicUrl;
        }
        const updated = await api.updateProfile({ profileImage: publicUrl });
        const updatedWithCache = {
          ...updated,
          profileImage: updated.profileImage ? `${updated.profileImage}?v=${Date.now()}` : null,
        } as any;
        setUserState?.(updatedWithCache);
        setSelectedFile(null);
        setPreviewUrl(null);
        await load();
        return;
      }

      if (remotePreviewUrl) {
        if (remotePreviewUrl.startsWith('/uploads') || remotePreviewUrl.startsWith('http://') && remotePreviewUrl.includes('/uploads/')) {
          const updated = await api.updateProfile({ profileImage: remotePreviewUrl });
          const updatedWithCache = {
            ...updated,
            profileImage: updated.profileImage ? `${updated.profileImage}?v=${Date.now()}` : null,
          } as any;
          setUserState?.(updatedWithCache);
          setRemotePreviewUrl(null);
          setPreviewUrl(null);
          await load();
          return;
        }

        const res = await api.fetchRemote(remotePreviewUrl);
        const publicUrl = res.publicUrl;
        const updated = await api.updateProfile({ profileImage: publicUrl });
        const updatedWithCache = {
          ...updated,
          profileImage: updated.profileImage ? `${updated.profileImage}?v=${Date.now()}` : null,
        } as any;
        setUserState?.(updatedWithCache);
        setRemotePreviewUrl(null);
        setPreviewUrl(null);
        await load();
        return;
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const uploadSelectedProfileImage = async () => await uploadFileIfAny();

  const cancelSelectedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemotePreviewUrl(null);
  };

  const handleApplyEdited = async (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemotePreviewUrl(null);
    setShowEditor(false);
    setShowAvatarModal(false);
    await uploadFileIfAny();
  };

  const handlePickFile = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemotePreviewUrl(null);
    setShowAvatarModal(false);
  };

  const handleGenerateAi = async () => {
    setShowAvatarModal(false);
    setShowAiStudio(true);
  };

  const handleApplyAiAvatar = async (publicUrl: string) => {
    try {
      const updated = await api.updateProfile({ profileImage: publicUrl });
      const updatedWithCache = {
        ...updated,
        profileImage: updated.profileImage ? `${updated.profileImage}?v=${Date.now()}` : null,
      } as any;
      setUserState?.(updatedWithCache);
      setPreviewUrl(publicUrl);
      setRemotePreviewUrl(null);
      setSelectedFile(null);
      setShowAiStudio(false);
      setShowAvatarModal(false);
      await load();
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const updated = await api.updateProfile({ profileImage: null });
      const updatedWithCache = { ...updated } as any;
      setUserState?.(updatedWithCache);
      await load();
      setShowAvatarModal(false);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  if (error) return <div className="page" style={{color: 'red', textAlign: 'center', marginTop: '2rem'}}>{error}</div>;
  if (!profile) return <div className="page" style={{textAlign: 'center', marginTop: '2rem', color: '#8892b0'}}>Initializing Zynqora Vibe...</div>;

  const isOwnProfile = user?.username === username;
  const avatarUrlToDisplay = previewUrl || getAvatarUrl(profile);
  const profileVibe = profile.note || '🌟 Zynqora Pioneer';

  return (
    <div className="page zq-profile-page-wrap" style={{ maxWidth: 840, margin: '0 auto', padding: '0 16px' }}>
      
      {/* Header / Vibe Banner */}
      <div
        className="zq-profile-banner"
        style={{
          position: 'relative',
          height: 180,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${auraColor}44, #1a1a2e)`,
          marginBottom: 74,
          border: `1px solid ${auraColor}33`,
          boxShadow: `0 8px 32px ${auraColor}11`,
        }}
      >
        <div
          className="zq-profile-avatar-wrap"
          style={{
            position: 'absolute',
            bottom: -50,
            left: 24,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 18,
          }}
        >
          {/* Avatar with Aura Ring */}
          <div 
            style={{ 
              position: 'relative',
              cursor: isOwnProfile ? 'pointer' : 'default',
              padding: 5,
              borderRadius: '50%',
              background: `linear-gradient(45deg, ${auraColor}, #00f2fe)`,
              boxShadow: `0 0 20px ${auraColor}66`,
              flexShrink: 0,
            }}
            onClick={() => isOwnProfile && setShowAvatarModal(true)}
          >
            <img 
              src={avatarUrlToDisplay} 
              alt="avatar" 
              className="zq-profile-avatar-img"
              style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid #0f0f13', display: 'block' }} 
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.png'; }}
            />
            {isOwnProfile && (
              <div style={{ position: 'absolute', bottom: 6, right: 6, background: '#1a1a2e', padding: 5, borderRadius: '50%', border: '2px solid #0f0f13' }}>
                <ImageIcon size={14} />
              </div>
            )}
          </div>
          
          <div style={{ paddingBottom: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}>
              {profile.name} <CheckCircleIcon size={20} active={true} style={{ color: auraColor }} />
            </h1>
            <div style={{ color: '#8892b0', fontSize: 13, marginTop: 2 }}>@{profile.username}</div>
          </div>
        </div>
        
        {/* Actions */}
        <div
          className="zq-profile-actions-bar"
          style={{ position: 'absolute', bottom: 16, right: 20, display: 'flex', gap: 10 }}
        >
          {!isOwnProfile ? (
            <>
              <button 
                onClick={handleFollow} 
                className="zq-profile-btn"
                style={{ 
                  background: profile.isFollowing ? 'transparent' : `linear-gradient(135deg, ${auraColor}, #7c3aed)`,
                  border: profile.isFollowing ? `1px solid ${auraColor}` : 'none',
                  color: '#fff', padding: '8px 20px', borderRadius: 14, fontWeight: 700, cursor: 'pointer',
                  fontSize: 13, letterSpacing: 0.4,
                  boxShadow: profile.isFollowing ? 'none' : `0 4px 20px ${auraColor}55`,
                  transition: 'all 0.2s'
                }}
              >
                {profile.isFollowing ? '✓ In Circle' : '+ Sync'}
              </button>
              <button
                onClick={() => navigate(`/chat/${profile.username}`)}
                className="zq-profile-btn"
                style={{ 
                  background: 'rgba(255,255,255,0.07)',
                  color: '#e8e8f0',
                  border: '1px solid rgba(255,255,255,0.15)', 
                  padding: '8px 18px', borderRadius: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                  letterSpacing: 0.4, transition: 'all 0.2s',
                }}
              >
                <MessagesIcon size={14} /> Message
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/settings')}
              className="zq-profile-btn"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#e8e8f0', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 18px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s' }}
            >
              <SettingsGearIcon size={16} /> Control Center
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 8px' }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#ccd6f6', marginBottom: 14, maxWidth: 600 }}>
          {profile.bio || "This user is syncing to the Zynqora vibe."}
        </p>

        {/* Dynamic Vibe Status */}
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: 8, 
          padding: '5px 12px', background: `${auraColor}11`, 
          border: `1px solid ${auraColor}33`, borderRadius: 14, 
          color: auraColor, fontSize: 12, fontWeight: 600, marginBottom: 24
        }}>
          ✨ {profileVibe}
        </div>

        {/* Interactive Futuristic Stat Cards */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 32, flexWrap: 'wrap' }}>
          {/* Syncs Stat */}
          <div
            style={{
              flex: '1 1 120px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 18,
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
              {profile._count.posts}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8892b0', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 }}>
              ⚡ SYNCS
            </div>
          </div>
          
          {/* In Aura Button Card */}
          <button
            onClick={openFollowers}
            style={{
              flex: '1 1 140px',
              background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.08) 0%, rgba(121, 40, 202, 0.08) 100%)',
              border: '1px solid rgba(0, 223, 216, 0.35)',
              borderRadius: 18,
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 223, 216, 0.12)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(-2px)';
              btn.style.background = 'linear-gradient(135deg, rgba(0, 223, 216, 0.16) 0%, rgba(121, 40, 202, 0.18) 100%)';
              btn.style.boxShadow = '0 8px 24px rgba(0, 223, 216, 0.25)';
              btn.style.borderColor = 'rgba(0, 223, 216, 0.6)';
            }}
            onMouseOut={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(0)';
              btn.style.background = 'linear-gradient(135deg, rgba(0, 223, 216, 0.08) 0%, rgba(121, 40, 202, 0.08) 100%)';
              btn.style.boxShadow = '0 4px 16px rgba(0, 223, 216, 0.12)';
              btn.style.borderColor = 'rgba(0, 223, 216, 0.35)';
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: '#00dfd8', letterSpacing: '0.5px' }}>
              {profile._count.followedBy}
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#00dfd8', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              👥 IN AURA <span style={{ fontSize: 10 }}>↗</span>
            </div>
          </button>

          {/* Circles Button Card */}
          <button
            onClick={openFollowing}
            style={{
              flex: '1 1 140px',
              background: 'linear-gradient(135deg, rgba(121, 40, 202, 0.1) 0%, rgba(255, 0, 128, 0.08) 100%)',
              border: '1px solid rgba(121, 40, 202, 0.4)',
              borderRadius: 18,
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(121, 40, 202, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(-2px)';
              btn.style.background = 'linear-gradient(135deg, rgba(121, 40, 202, 0.2) 0%, rgba(255, 0, 128, 0.16) 100%)';
              btn.style.boxShadow = '0 8px 24px rgba(121, 40, 202, 0.3)';
              btn.style.borderColor = 'rgba(121, 40, 202, 0.7)';
            }}
            onMouseOut={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(0)';
              btn.style.background = 'linear-gradient(135deg, rgba(121, 40, 202, 0.1) 0%, rgba(255, 0, 128, 0.08) 100%)';
              btn.style.boxShadow = '0 4px 16px rgba(121, 40, 202, 0.15)';
              btn.style.borderColor = 'rgba(121, 40, 202, 0.4)';
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: '#c4b5fd', letterSpacing: '0.5px' }}>
              {profile._count.following}
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              🪐 CIRCLES <span style={{ fontSize: 10 }}>↗</span>
            </div>
          </button>
        </div>

        {/* Unsaved upload actions */}
        {(selectedFile || remotePreviewUrl) && isOwnProfile && (
          <div style={{ padding: 16, background: '#1a1a2e', borderRadius: 12, marginBottom: 24, border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#fff', fontSize: 14 }}>Unsaved Aura Change</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={cancelSelectedImage} disabled={uploading} style={{ padding: '6px 16px', background: 'transparent', color: '#8892b0', border: '1px solid #333', borderRadius: 8, cursor: 'pointer' }}>Discard</button>
              <button onClick={uploadSelectedProfileImage} disabled={uploading} style={{ padding: '6px 16px', background: auraColor, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                {uploading ? 'Syncing...' : 'Lock In'}
              </button>
            </div>
          </div>
        )}

        {/* Futuristic Segmented Capsule Tab Bar */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: '5px',
            gap: 6,
            marginBottom: 28,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* SYNCS TAB */}
          <button 
            onClick={() => setActiveTab('posts')}
            style={{ 
              padding: '9px 20px',
              borderRadius: 15,
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              letterSpacing: '0.4px',
              border: activeTab === 'posts' ? '1px solid rgba(0, 223, 216, 0.4)' : '1px solid transparent',
              background: activeTab === 'posts' ? 'linear-gradient(135deg, rgba(0, 223, 216, 0.2) 0%, rgba(121, 40, 202, 0.3) 100%)' : 'transparent',
              color: activeTab === 'posts' ? '#fff' : '#8892b0',
              boxShadow: activeTab === 'posts' ? '0 4px 16px rgba(0, 223, 216, 0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <ImageIcon size={16} /> SYNCS
          </button>

          {/* MOMENTS TAB */}
          {isOwnProfile && (
            <button 
              onClick={() => setActiveTab('circles')}
              style={{ 
                padding: '9px 20px',
                borderRadius: 15,
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                letterSpacing: '0.4px',
                border: activeTab === 'circles' ? '1px solid rgba(121, 40, 202, 0.5)' : '1px solid transparent',
                background: activeTab === 'circles' ? 'linear-gradient(135deg, rgba(121, 40, 202, 0.25) 0%, rgba(255, 0, 128, 0.25) 100%)' : 'transparent',
                color: activeTab === 'circles' ? '#fff' : '#8892b0',
                boxShadow: activeTab === 'circles' ? '0 4px 16px rgba(121, 40, 202, 0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <VideoIcon size={16} /> MOMENTS
            </button>
          )}

          {/* QORAS TAB */}
          <button 
            onClick={() => setActiveTab('aura')}
            style={{ 
              padding: '9px 20px',
              borderRadius: 15,
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              letterSpacing: '0.4px',
              border: activeTab === 'aura' ? '1px solid rgba(0, 223, 216, 0.4)' : '1px solid transparent',
              background: activeTab === 'aura' ? 'linear-gradient(135deg, rgba(0, 223, 216, 0.2) 0%, rgba(121, 40, 202, 0.3) 100%)' : 'transparent',
              color: activeTab === 'aura' ? '#fff' : '#8892b0',
              boxShadow: activeTab === 'aura' ? '0 4px 16px rgba(0, 223, 216, 0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <UsersIcon size={16} /> QORAS
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
            {posts.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8892b0', background: '#1a1a2e', borderRadius: 16, width: '100%' }}>
                <ImageIcon size={48} active={false} />
                <h3 style={{ marginTop: 16 }}>No syncs yet</h3>
                <p>When {profile.name} shares something, it will appear here.</p>
              </div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )}

        {activeTab === 'circles' && isOwnProfile && (
          <div style={{ maxWidth: '520px', margin: '0 auto', background: 'var(--zq-surface-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--zq-glass-border)', boxShadow: '0 12px 36px rgba(0,0,0,0.3)' }}>
            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>Publish Aura Moment / Status</h3>
                <div style={{ fontSize: '12px', color: 'var(--zq-text-secondary)' }}>Broadcast a 24h photo, video clip, or vibe status to your circle</div>
              </div>
            </div>
            <StoryRecorder onSaved={load} />
          </div>
        )}

        {/* QORAS tab: shows followers list with profile + chat links */}
        {activeTab === 'aura' && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <button
                onClick={openFollowers}
                style={{ padding: '8px 20px', background: `${auraColor}22`, border: `1px solid ${auraColor}55`, color: auraColor, borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                In Aura ({profile._count.followedBy})
              </button>
              <button
                onClick={openFollowing}
                style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid #333', color: '#ccd6f6', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Circles ({profile._count.following})
              </button>
            </div>
            <QoraUserList
              users={followers.length > 0 ? followers : following}
              loading={loadingFollowers || loadingFollowing}
              auraColor={auraColor}
              emptyText={`Click "In Aura" or "Circles" above to explore ${profile.name}'s connections.`}
            />
          </div>
        )}
      </div>

      {showEditor && (
        <ImageEditor 
          src={previewUrl || getAvatarUrl(profile)} 
          onApply={handleApplyEdited} 
          onClose={() => setShowEditor(false)} 
        />
      )}
      
      {showAvatarModal && (
        <AvatarActionsModal
          onClose={() => setShowAvatarModal(false)}
          onPickFile={handlePickFile}
          onEdit={() => { setShowEditor(true); setShowAvatarModal(false); }}
          onOpenAiStudio={() => { setShowAvatarModal(false); setShowAiStudio(true); }}
          onGenerateAi={handleGenerateAi}
          onRemove={handleRemoveAvatar}
        />
      )}

      {showAiStudio && (
        <AiStudioModal
          currentAvatarUrl={previewUrl || getAvatarUrl(profile)}
          onClose={() => setShowAiStudio(false)}
          onApplyAvatar={handleApplyAiAvatar}
        />
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <FollowersModal
          title={`In Aura — ${profile.name}'s Followers`}
          users={loadingFollowers ? [] : followers}
          onClose={() => setShowFollowersModal(false)}
          onFollowToggled={load}
        />
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <FollowersModal
          title={`${profile.name}'s Circles`}
          users={loadingFollowing ? [] : following}
          onClose={() => setShowFollowingModal(false)}
          onFollowToggled={load}
        />
      )}
    </div>
  );
}

/* ── Inline helper component for the QORAS tab list ── */
function QoraUserList({ users, loading, auraColor, emptyText }: {
  users: any[];
  loading: boolean;
  auraColor: string;
  emptyText: string;
}) {
  const navigate = useNavigate();

  if (loading) return (
    <div style={{ textAlign: 'center', color: '#8892b0', padding: 40 }}>Loading connections...</div>
  );
  if (users.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#8892b0', background: '#1a1a2e', borderRadius: 16 }}>
      <UsersIcon size={40} />
      <p style={{ marginTop: 16 }}>{emptyText}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {users.map((u) => {
        const avatarSrc = getAvatarUrl(u);
        return (
          <div key={u.id || u.username} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '12px 16px',
            transition: 'background 0.15s, border-color 0.15s',
          }}
            onMouseOver={e => {
              (e.currentTarget as HTMLDivElement).style.background = `rgba(139,92,246,0.06)`;
              (e.currentTarget as HTMLDivElement).style.borderColor = `${auraColor}33`;
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
            }}
          >
            {/* Clickable avatar + name */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', flex: 1 }}
              onClick={() => navigate(`/profile/${u.username}`)}
            >
              <div style={{
                padding: 2, borderRadius: '50%',
                background: `linear-gradient(45deg, ${auraColor}, #00f2fe)`,
                boxShadow: `0 0 10px ${auraColor}44`,
                flexShrink: 0,
              }}>
                <img
                  src={avatarSrc}
                  alt={u.name}
                  style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0f0f13', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#e8e8f0', fontSize: 14, letterSpacing: 0.2 }}>{u.username}</div>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{u.name}</div>
              </div>
            </div>

            {/* Premium Chat Button */}
            <button
              onClick={() => navigate(`/chat/${u.username}`)}
              style={{
                background: `linear-gradient(135deg, ${auraColor}33, #00f2fe22)`,
                border: `1px solid ${auraColor}55`,
                color: '#c4b5fd',
                padding: '8px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: 0.3,
                transition: 'all 0.2s',
                boxShadow: `0 2px 10px ${auraColor}22`,
              }}
              onMouseOver={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.background = `linear-gradient(135deg, ${auraColor}55, #00f2fe44)`;
                btn.style.boxShadow = `0 4px 18px ${auraColor}44`;
                btn.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={e => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.background = `linear-gradient(135deg, ${auraColor}33, #00f2fe22)`;
                btn.style.boxShadow = `0 2px 10px ${auraColor}22`;
                btn.style.transform = 'translateY(0)';
              }}
            >
              <MessagesIcon size={14} /> Chat
            </button>
          </div>
        );
      })}
    </div>
  );
}

function UsersIcon({ size, active = false, style }: { size: number; active?: boolean; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.4' : '2'} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="9" cy="9" r="6" />
      <circle cx="15" cy="15" r="6" />
      <circle cx="16" cy="8" r="3" opacity="0.6" />
    </svg>
  );
}
