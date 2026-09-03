import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LiveStreamModal from './LiveStreamModal';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | ''>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'TREE' | 'FOLLOWERS' | 'CIRCLE'>('TREE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLive, setShowLive] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  if (showLive && user?.id) {
    return <LiveStreamModal room={{ broadcasterId: user.id, title: 'Live Sync', startedAt: new Date().toISOString() }} broadcaster onClose={() => setShowLive(false)} />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMediaType(file.type.startsWith('video') ? 'video' : 'image');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl.trim() && !mediaFile) return;

    setLoading(true);
    setError('');

    try {
      let finalMediaUrl = mediaUrl || undefined;

      if (mediaFile) {
        const presign = await api.presignUpload(mediaFile.name, mediaFile.type);
        if (presign.method === 'PUT') {
          await fetch(presign.uploadUrl, {
            method: 'PUT',
            body: mediaFile,
            headers: { 'Content-Type': mediaFile.type },
          });
          finalMediaUrl = presign.publicUrl;
        } else {
          const res = await api.uploadLocal(mediaFile);
          finalMediaUrl = res.publicUrl;
        }
      }

      await api.createPost({
        content: content.trim() || undefined,
        mediaUrl: finalMediaUrl,
        mediaType: mediaType || undefined,
        visibility,
      });

      setContent('');
      setMediaUrl('');
      setMediaType('');
      setMediaFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish sync');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ig-modal-overlay" onClick={onClose}>
      <div
        className="ig-modal-box"
        style={{
          maxWidth: '620px',
          background: 'var(--zq-surface-elevated)',
          border: '1px solid var(--zq-glass-border-hover)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(121, 40, 202, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ig-modal-header" style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="zq-pulse-orb" />
            <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>NEW COMMUNITY SYNC</span>
          </div>
          <button className="ig-modal-close-btn" style={{ position: 'static', color: '#fff' }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Target Circle Selector */}
          <button type="button" className="zq-btn-glass" onClick={() => setShowLive(true)} style={{ marginBottom: '18px', borderColor: '#ff3366', color: '#ff6688' }}>
            🔴 Start Live Sync
          </button>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Publish Target Circle (Qora)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'TREE', name: 'Tree' },
                { id: 'FOLLOWERS', name: 'Followers' },
                { id: 'CIRCLE', name: 'Circle' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`zq-circle-pill ${visibility === c.id ? 'active' : ''}`}
                  onClick={() => setVisibility(c.id as 'TREE' | 'FOLLOWERS' | 'CIRCLE')}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Media Preview or Dropzone */}
          {previewUrl ? (
            <div style={{ marginBottom: '18px', position: 'relative', borderRadius: '16px', overflow: 'hidden', maxHeight: '320px', backgroundColor: '#000', border: '1px solid var(--zq-glass-border)' }}>
              {mediaType === 'video' ? (
                <video src={previewUrl} controls style={{ width: '100%', maxHeight: '320px', display: 'block' }} />
              ) : (
                <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }} />
              )}
              <button
                type="button"
                onClick={() => {
                  setMediaFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.75)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              style={{
                border: '2px dashed var(--zq-glass-border-hover)',
                borderRadius: '16px',
                padding: '32px 20px',
                textAlign: 'center',
                marginBottom: '18px',
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>✨</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>Upload Media to Your Circle</div>
              <div style={{ fontSize: '12px', color: 'var(--zq-text-secondary)', marginBottom: '16px' }}>Supports Ultra-HD Photos, Video clips, WebM</div>
              <button type="button" className="zq-btn-aura" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Media URL (Optional)
            </label>
            <input
              className="zq-settings-input"
              placeholder="https://images.unsplash.com/..."
              value={mediaUrl}
              onChange={(e) => {
                setMediaUrl(e.target.value);
                if (e.target.value && !mediaType) setMediaType('image');
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--zq-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Share Your Thoughts / Aura
            </label>
            <textarea
              className="zq-settings-textarea"
              rows={3}
              placeholder="What's happening in your circle? #Innovation #Design"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {error && <div style={{ color: 'var(--zq-danger)', fontSize: '13px', marginBottom: '14px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="zq-btn-glass" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="zq-btn-aura" disabled={loading || (!content.trim() && !mediaUrl.trim() && !mediaFile)}>
              {loading ? 'Publishing...' : '⚡ Publish to Circle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
