import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LiveStreamModal from './LiveStreamModal';

export default function NewPostForm({ onPosted }: { onPosted: () => void }) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | ''>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLive, setShowLive] = useState(false);
  const { user } = useAuth();

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
          await fetch(presign.uploadUrl, { method: 'PUT', body: mediaFile, headers: { 'Content-Type': mediaFile.type } });
          finalMediaUrl = presign.publicUrl;
        } else {
          const res = await api.uploadLocal(mediaFile);
          finalMediaUrl = res.publicUrl;
        }
      }

      await api.createPost({ content: content || undefined, mediaUrl: finalMediaUrl || undefined, mediaType: mediaType || undefined, visibility: 'TREE' });
      setContent('');
      if (mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
      setMediaUrl('');
      setMediaType('');
      setMediaFile(null);
      onPosted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="post-card">
      <h3 style={{ margin: '0 0 16px 0', color: '#1a1a1a', fontSize: '18px', fontWeight: '600' }}>
        ✨ What's on your mind?
      </h3>
      <button type="button" className="zq-btn-glass" onClick={() => setShowLive(true)} style={{ marginBottom: 16, borderColor: '#ff3366', color: '#ff6688' }}>
        Start Live Sync
      </button>
      <div className="form-field">
        <textarea
          placeholder="Share a photo, video, or thought with your family and friends..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          style={{ resize: 'vertical', minHeight: '100px' }}
        />
      </div>

      <div className="form-field">
        <label>Add media (optional)</label>
        <input
          placeholder="Paste an image or video URL here"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
        />
        <div style={{ marginTop: 8 }}>
          <label style={{ marginRight: 8 }}>
            Upload/capture:
            <input type="file" accept="image/*,video/*" capture onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMediaFile(file);
              if (mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
              setMediaUrl(URL.createObjectURL(file));
              setMediaType(file.type.startsWith('image') ? 'image' : 'video');
            }} />
          </label>
        </div>
        <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)}>
          <option value="">📎 No media</option>
          <option value="image">🖼️ Image</option>
          <option value="video">🎥 Video</option>
        </select>
      </div>

      {mediaUrl && mediaType === 'image' && (
        <div className="media-preview">
          <img src={mediaUrl} alt="preview" style={{ maxHeight: '300px', objectFit: 'cover' }} />
        </div>
      )}
      {mediaUrl && mediaType === 'video' && (
        <div className="media-preview">
          <video src={mediaUrl} controls style={{ maxHeight: '300px' }} />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      <button type="submit" disabled={loading || (!content.trim() && !mediaUrl.trim() && !mediaFile)}>
        {loading ? '⏳ Posting...' : '📤 Post'}
      </button>
      {showLive && user?.id && <LiveStreamModal room={{ broadcasterId: user.id, title: 'Live Sync', startedAt: new Date().toISOString() }} broadcaster onClose={() => setShowLive(false)} />}
    </form>
  );
}
