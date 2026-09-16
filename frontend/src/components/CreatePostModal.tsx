import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LiveStreamModal from './LiveStreamModal';
import ImageEditor from './ImageEditor';
import AudioLibraryPanel from './AudioLibraryPanel';
import StoryRecorder from './StoryRecorder';

async function trimAudioFile(source: string, start: number, end: number, name: string) {
  const response = await fetch(source);
  const buffer = await response.arrayBuffer();
  const audioContext = new AudioContext();
  const decoded = await audioContext.decodeAudioData(buffer);
  const safeStart = Math.max(0, Math.min(start, decoded.duration));
  const safeEnd = Math.max(safeStart + 0.1, Math.min(end, decoded.duration));
  const frameCount = Math.ceil((safeEnd - safeStart) * decoded.sampleRate);
  const offline = new OfflineAudioContext(decoded.numberOfChannels, frameCount, decoded.sampleRate);
  const sourceNode = offline.createBufferSource();
  sourceNode.buffer = decoded;
  sourceNode.connect(offline.destination);
  sourceNode.start(0, safeStart, safeEnd - safeStart);
  const rendered = await offline.startRendering();
  const wav = new ArrayBuffer(44 + rendered.length * rendered.numberOfChannels * 2);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + rendered.length * rendered.numberOfChannels * 2, true);
  write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, rendered.numberOfChannels, true); view.setUint32(24, rendered.sampleRate, true);
  view.setUint32(28, rendered.sampleRate * rendered.numberOfChannels * 2, true); view.setUint16(32, rendered.numberOfChannels * 2, true);
  view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, rendered.length * rendered.numberOfChannels * 2, true);
  let offset = 44;
  for (let frame = 0; frame < rendered.length; frame += 1) {
    for (let channel = 0; channel < rendered.numberOfChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, rendered.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  await audioContext.close();
  return new File([wav], `${name.replace(/\.[^.]+$/, '')}-trimmed.wav`, { type: 'audio/wav' });
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const [activeTab, setActiveTab] = useState<'post' | 'reel' | 'story' | 'live'>('post');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | ''>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPreviewUrl, setMusicPreviewUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'TREE' | 'FOLLOWERS' | 'CIRCLE'>('TREE');
  const [circleId, setCircleId] = useState<string>('');
  const [circles, setCircles] = useState<Array<{ id: string; slug: string; name: string; icon?: string | null }>>([]);
  const [liveStreamTitle, setLiveStreamTitle] = useState('Live Sync Broadcast');

  // Live Stream Studio Camera & Mic Test States
  const [liveStreamReady, setLiveStreamReady] = useState(false);
  const [liveMicEnabled, setLiveMicEnabled] = useState(true);
  const [liveCamEnabled, setLiveCamEnabled] = useState(true);
  const liveVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamMediaRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    api.getCircles().then((data) => setCircles(data.filter((c) => c.slug !== 'all' && c.id !== 'global'))).catch(() => {});
  }, []);

  // Manage camera preview for Live stream tab
  useEffect(() => {
    if (activeTab === 'live' && isOpen) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          liveStreamMediaRef.current = stream;
          setLiveStreamReady(true);
          if (liveVideoPreviewRef.current) {
            liveVideoPreviewRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          setLiveStreamReady(false);
        });
    } else {
      if (liveStreamMediaRef.current) {
        liveStreamMediaRef.current.getTracks().forEach((t) => t.stop());
        liveStreamMediaRef.current = null;
      }
      setLiveStreamReady(false);
    }
    return () => {
      if (liveStreamMediaRef.current) {
        liveStreamMediaRef.current.getTracks().forEach((t) => t.stop());
        liveStreamMediaRef.current = null;
      }
    };
  }, [activeTab, isOpen]);

  const toggleLiveMic = () => {
    if (liveStreamMediaRef.current) {
      liveStreamMediaRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !liveMicEnabled;
      });
      setLiveMicEnabled(!liveMicEnabled);
    }
  };

  const toggleLiveCam = () => {
    if (liveStreamMediaRef.current) {
      liveStreamMediaRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !liveCamEnabled;
      });
      setLiveCamEnabled(!liveCamEnabled);
    }
  };

  const aiCaptions = [
    '⚡ In deep flow with new creative possibilities. Let me know your thoughts! #zynqora',
    '🚀 Shipping another breakthrough for the community. Stay synced!',
    '✨ Radiating high vibes today. Dropping fresh aura moments!',
    '🔥 Turning creative sparks into reality. Who else is building today?',
    '🎧 Locked in with great sound and pure focus. #frequency',
  ];

  const handleAiSpark = () => {
    const randomCaption = aiCaptions[Math.floor(Math.random() * aiCaptions.length)];
    setContent((prev) => (prev ? `${prev}\n\n${randomCaption}` : randomCaption));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLive, setShowLive] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showAudioLibrary, setShowAudioLibrary] = useState(false);
  const [selectedMusicLabel, setSelectedMusicLabel] = useState('');
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicTrimStart, setMusicTrimStart] = useState(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState(0);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasMediaSelection = Boolean(previewUrl || mediaFile || mediaUrl);
  const hasMusicSelection = Boolean(musicPreviewUrl || musicFile || musicUrl);
  const selectedMediaLabel = mediaFile?.name || (mediaUrl ? 'Remote media selected' : 'Selected media');

  if (!isOpen) return null;

  if (showLive && user?.id) {
    return (
      <LiveStreamModal
        room={{ broadcasterId: user.id, title: liveStreamTitle || 'Live Sync Broadcast', startedAt: new Date().toISOString() }}
        broadcaster
        onClose={() => setShowLive(false)}
      />
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const isVideo = file.type.startsWith('video');
    setMediaType(isVideo ? 'video' : 'image');
    if (!isVideo && activeTab === 'post') {
      setShowImageEditor(true);
    }
  };

  const handleEditedImage = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMediaType('image');
    setShowImageEditor(false);
  };

  const handleReset = () => {
    setContent('');
    setMediaUrl('');
    setMediaType('');
    setMusicUrl('');
    setMusicFile(null);
    setSelectedMusicLabel('');
    setMusicDuration(0);
    setMusicTrimStart(0);
    setMusicTrimEnd(0);
    if (musicPreviewUrl) URL.revokeObjectURL(musicPreviewUrl);
    setMusicPreviewUrl(null);
    setMediaFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCircleId('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() && !mediaUrl.trim() && !mediaFile) return;

    setLoading(true);
    setError('');

    try {
      let finalMediaUrl = mediaUrl || undefined;
      let finalMusicUrl = musicUrl || undefined;
      let publishMusicFile = musicFile;

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

      if ((musicFile || musicUrl) && musicTrimEnd > musicTrimStart && musicDuration > musicTrimEnd) {
        try {
          publishMusicFile = await trimAudioFile(musicPreviewUrl || musicUrl, musicTrimStart, musicTrimEnd, selectedMusicLabel || 'sound');
        } catch {
          publishMusicFile = musicFile;
        }
      }

      if (publishMusicFile) {
        const uploadedMusic = await api.uploadLocal(publishMusicFile);
        finalMusicUrl = uploadedMusic.publicUrl;
      }

      await api.createPost({
        content: content.trim() || undefined,
        mediaUrl: finalMediaUrl,
        mediaType: mediaType || undefined,
        visibility,
        circleId: circleId || undefined,
        musicUrl: finalMusicUrl,
        musicType: finalMusicUrl ? 'audio' : undefined,
      });

      handleReset();
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
      <div className="zq-sync-modal" onClick={(e) => e.stopPropagation()}>
        {/* Studio Top Header */}
        <div className="zq-sync-studio-header">
          <div className="zq-sync-brand-wrap">
            <div className="zq-sync-studio-icon">✨</div>
            <div>
              <div className="zq-sync-studio-kicker">Creation Studio</div>
              <div className="zq-sync-studio-title">New Community Sync</div>
            </div>
          </div>

          {/* Mode Tabs (Post | Reel | Aura Story | Live Stream) */}
          <div className="zq-sync-modes-bar">
            <button
              type="button"
              className={`zq-sync-mode-tab ${activeTab === 'post' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('post');
                if (mediaType === 'video' && !mediaFile) setMediaType('image');
              }}
            >
              <span>📸</span> Feed Post
            </button>
            <button
              type="button"
              className={`zq-sync-mode-tab ${activeTab === 'reel' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('reel');
                setMediaType('video');
              }}
            >
              <span>🎬</span> Reel
            </button>
            <button
              type="button"
              className={`zq-sync-mode-tab ${activeTab === 'story' ? 'active' : ''}`}
              style={activeTab === 'story' ? { background: 'rgba(0, 223, 216, 0.18)', borderColor: '#00dfd8', color: '#00dfd8' } : {}}
              onClick={() => setActiveTab('story')}
            >
              <span>⚡</span> Aura Story
            </button>
            <button
              type="button"
              className={`zq-sync-mode-tab ${activeTab === 'live' ? 'active live-active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              <span className="zq-live-dot" /> Live Stream
            </button>
          </div>

          <button className="ig-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Studio Body */}
        {activeTab === 'story' ? (
          /* Aura Story Creation Studio View */
          <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'center', background: 'radial-gradient(circle, rgba(0,223,216,0.06) 0%, #060810 80%)' }}>
            <StoryRecorder
              standalone={true}
              onSaved={() => {
                onPostCreated();
                onClose();
              }}
              onClose={onClose}
            />
          </div>
        ) : activeTab === 'live' ? (
          /* Live Stream Launchpad View with Live Camera & Audio Monitor */
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="zq-studio-live-launchpad" style={{ maxWidth: '580px', width: '100%' }}>
              
              {/* Broadcast Camera Preview Monitor */}
              <div style={{
                width: '100%',
                height: '240px',
                borderRadius: '20px',
                background: '#04060c',
                border: '1.5px solid rgba(255, 51, 102, 0.4)',
                boxShadow: '0 8px 32px rgba(255, 51, 102, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                {liveCamEnabled && liveStreamReady ? (
                  <video
                    ref={liveVideoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#8892b0' }}>
                    <span style={{ fontSize: '32px' }}>📹</span>
                    <span style={{ fontSize: '13px' }}>Camera is muted or preview unavailable</span>
                  </div>
                )}

                {/* Top status badges */}
                <div style={{ position: 'absolute', top: 12, left: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    background: 'rgba(255, 51, 102, 0.85)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
                    STUDIO PREVIEW
                  </span>
                  <span style={{
                    background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#00dfd8',
                    border: '1px solid rgba(0, 223, 216, 0.3)'
                  }}>
                    WebRTC Ultra-HD
                  </span>
                </div>

                {/* Bottom Monitor Controls (Mute Mic, Cam Toggle) */}
                <div style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 14,
                  right: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={toggleLiveMic}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        background: liveMicEnabled ? 'rgba(0, 223, 216, 0.25)' : 'rgba(255, 51, 102, 0.25)',
                        border: `1px solid ${liveMicEnabled ? '#00dfd8' : '#ff3366'}`,
                        color: '#fff',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {liveMicEnabled ? '🎙️ Mic Active' : '🔇 Mic Muted'}
                    </button>
                    <button
                      type="button"
                      onClick={toggleLiveCam}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        background: liveCamEnabled ? 'rgba(121, 40, 202, 0.25)' : 'rgba(255, 51, 102, 0.25)',
                        border: `1px solid ${liveCamEnabled ? '#7928ca' : '#ff3366'}`,
                        color: '#fff',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {liveCamEnabled ? '📹 Cam Active' : '🚫 Cam Off'}
                    </button>
                  </div>
                  <div style={{ color: '#00dfd8', fontSize: '11px', fontWeight: 700, textShadow: '0 0 8px rgba(0,223,216,0.5)' }}>
                    🟢 Ready to Air
                  </div>
                </div>
              </div>

              <div className="zq-studio-live-title" style={{ fontSize: '20px', marginBottom: '6px' }}>
                Broadcast Live to Your Community
              </div>
              <p className="zq-studio-live-desc" style={{ marginBottom: '16px' }}>
                Engage in real-time with ultra-low latency WebRTC, live chat, dynamic sparks, and circle broadcasting.
              </p>

              {/* Broadcast Stream Title */}
              <div style={{ width: '100%', maxWidth: '460px', marginBottom: '14px', textAlign: 'left' }}>
                <label className="zq-studio-label" style={{ marginBottom: '6px' }}>Broadcast Title</label>
                <input
                  type="text"
                  className="zq-studio-caption-input"
                  style={{ minHeight: 'auto', padding: '12px 14px' }}
                  value={liveStreamTitle}
                  onChange={(e) => setLiveStreamTitle(e.target.value)}
                  placeholder="What are you discussing live?"
                />
              </div>

              {/* Target Circle Selector */}
              <div style={{ width: '100%', maxWidth: '460px', marginBottom: '20px', textAlign: 'left' }}>
                <label className="zq-studio-label" style={{ marginBottom: '6px' }}>Target Audience & Circle</label>
                <div className="zq-studio-pills-row">
                  <button
                    type="button"
                    className={`zq-studio-pill-btn ${!circleId ? 'active' : ''}`}
                    onClick={() => setCircleId('')}
                  >
                    🌍 Global Broadcast
                  </button>
                  {circles.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`zq-studio-pill-btn ${circleId === c.slug ? 'active' : ''}`}
                      onClick={() => setCircleId(c.slug)}
                    >
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="zq-studio-live-trigger-btn"
                style={{ width: '100%', maxWidth: '460px', padding: '14px', fontSize: '15px' }}
                onClick={() => {
                  if (liveStreamMediaRef.current) {
                    liveStreamMediaRef.current.getTracks().forEach((t) => t.stop());
                    liveStreamMediaRef.current = null;
                  }
                  setShowLive(true);
                }}
              >
                <span>🔴</span> Go Live Broadcast Now
              </button>
            </div>
          </div>
        ) : (
          /* 2-Column Studio Composer for Post & Reel */
          <form onSubmit={handleSubmit} className="zq-studio-body">
            {/* Left Column: Media Stage & Preview */}
            <div className="zq-studio-left">
              <div className="zq-studio-label">
                <span>{activeTab === 'reel' ? 'Reel Video Canvas (9:16)' : 'Media Canvas'}</span>
                {hasMediaSelection && (
                  <span style={{ fontSize: '11px', color: '#00dfd8' }}>Ready</span>
                )}
              </div>

              <div
                className={`zq-studio-viewport-card ${activeTab === 'reel' ? 'reel-viewport' : ''} ${hasMediaSelection ? 'has-media' : ''}`}
                onClick={() => !hasMediaSelection && fileInputRef.current?.click()}
              >
                {!hasMediaSelection ? (
                  <div className="zq-studio-empty-drop">
                    <div className="zq-studio-drop-icon">
                      {activeTab === 'reel' ? '🎬' : '✦'}
                    </div>
                    <div className="zq-studio-drop-title">
                      {activeTab === 'reel' ? 'Upload Short Reel Clip' : 'Upload Photo or Video'}
                    </div>
                    <div className="zq-studio-drop-sub">
                      {activeTab === 'reel'
                        ? 'Select a 9:16 vertical video clip up to 60s for high engagement'
                        : 'Ultra-HD photos, high-res graphics, or feed clips'}
                    </div>
                    <button
                      type="button"
                      className="zq-btn-aura"
                      style={{ marginTop: '16px', padding: '8px 18px', fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="zq-studio-media-actions-bar">
                      {mediaType === 'image' && previewUrl && (
                        <button
                          type="button"
                          className="zq-studio-action-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImageEditor(true);
                          }}
                        >
                          ✦ Filters
                        </button>
                      )}
                      <button
                        type="button"
                        className="zq-studio-action-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        ↺ Replace
                      </button>
                      <button
                        type="button"
                        className="zq-studio-action-pill"
                        style={{ background: 'rgba(255, 51, 102, 0.6)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMediaFile(null);
                          setMediaUrl('');
                          setMediaType('');
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {mediaType === 'video' ? (
                      <video
                        src={previewUrl || mediaUrl}
                        controls
                        className="zq-studio-preview-media"
                        style={activeTab === 'reel' ? { height: '100%', objectFit: 'cover' } : {}}
                      />
                    ) : (
                      <img
                        src={previewUrl || mediaUrl}
                        alt="Preview"
                        className="zq-studio-preview-media"
                      />
                    )}
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={activeTab === 'reel' ? 'video/*' : 'image/*,video/*'}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Direct Media URL input (optional fallback) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#8892b0' }}>Or paste direct media link:</span>
                <input
                  className="zq-settings-input"
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                  placeholder="https://images.unsplash.com/..."
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    if (e.target.value && !mediaType) {
                      setMediaType(activeTab === 'reel' ? 'video' : 'image');
                    }
                  }}
                />
              </div>
            </div>

            {/* Right Column: Composer Details */}
            <div className="zq-studio-right">
              {/* Audience Selector */}
              <div className="zq-studio-section">
                <div className="zq-studio-label">Audience Visibility</div>
                <div className="zq-studio-pills-row">
                  {[
                    { id: 'TREE', name: '🌍 Public Stream' },
                    { id: 'FOLLOWERS', name: '👥 Followers Only' },
                    { id: 'CIRCLE', name: '🛡️ Close Circle' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`zq-studio-pill-btn ${visibility === c.id ? 'active' : ''}`}
                      onClick={() => setVisibility(c.id as 'TREE' | 'FOLLOWERS' | 'CIRCLE')}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Community Circle Selector */}
              <div className="zq-studio-section">
                <div className="zq-studio-label">
                  <span>Community Circle</span>
                  <span style={{ opacity: 0.55, fontWeight: 400, fontSize: '11px' }}>optional</span>
                </div>
                <div className="zq-studio-pills-row">
                  <button
                    type="button"
                    className={`zq-studio-pill-btn ${!circleId ? 'active' : ''}`}
                    onClick={() => setCircleId('')}
                  >
                    🌍 Global
                  </button>
                  {circles.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`zq-studio-pill-btn ${circleId === c.slug ? 'active' : ''}`}
                      onClick={() => setCircleId(c.slug)}
                    >
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Layer integration */}
              <div className="zq-studio-section">
                <div className="zq-studio-label">Sound Layer (Audio Track)</div>
                {!hasMusicSelection ? (
                  <div className="zq-studio-sound-card">
                    <button
                      type="button"
                      className="zq-studio-sound-btn"
                      onClick={() => setShowAudioLibrary(true)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🎵</span>
                        <span>Open Trending Sound Library</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--zq-accent-cyan)' }}>Browse →</span>
                    </button>
                    <input
                      className="zq-settings-input"
                      style={{ fontSize: '11.5px', padding: '8px 12px' }}
                      placeholder="Or paste audio stream URL (MP3/WAV)"
                      value={musicUrl}
                      onChange={(e) => {
                        setMusicUrl(e.target.value);
                        setSelectedMusicLabel(e.target.value ? 'Audio link' : '');
                      }}
                    />
                  </div>
                ) : (
                  <div className="zq-selected-media-card" style={{ borderRadius: '16px' }}>
                    <div className="zq-selected-header">
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#00dfd8' }}>
                        🎵 {selectedMusicLabel || 'Sound Attached'}
                      </span>
                      <button
                        type="button"
                        className="zq-btn-glass zq-small-btn"
                        onClick={() => {
                          setMusicFile(null);
                          setMusicUrl('');
                          setSelectedMusicLabel('');
                          setMusicDuration(0);
                          setMusicTrimStart(0);
                          setMusicTrimEnd(0);
                          if (musicPreviewUrl) URL.revokeObjectURL(musicPreviewUrl);
                          setMusicPreviewUrl(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <audio
                      controls
                      src={musicPreviewUrl || musicUrl}
                      style={{ width: '100%', marginTop: '6px', height: '36px' }}
                      onLoadedMetadata={(event) => {
                        const duration = event.currentTarget.duration;
                        setMusicDuration(duration);
                        setMusicTrimEnd(duration);
                      }}
                      onTimeUpdate={(event) => {
                        if (musicTrimEnd > musicTrimStart && event.currentTarget.currentTime >= musicTrimEnd) {
                          event.currentTarget.currentTime = musicTrimStart;
                        }
                      }}
                    />
                    {musicDuration > 0 && (
                      <div className="zq-audio-trim-box" style={{ marginTop: '8px' }}>
                        <div className="zq-trim-heading">
                          <span>Trim Audio Slice</span>
                          <strong>{musicTrimStart.toFixed(1)}s - {musicTrimEnd.toFixed(1)}s</strong>
                        </div>
                        <label>
                          Start{' '}
                          <input
                            type="range"
                            min="0"
                            max={Math.max(0, musicTrimEnd - 0.1)}
                            step="0.1"
                            value={musicTrimStart}
                            onChange={(event) =>
                              setMusicTrimStart(Math.min(Number(event.target.value), musicTrimEnd - 0.1))
                            }
                          />
                        </label>
                        <label>
                          End{' '}
                          <input
                            type="range"
                            min={Math.min(musicDuration, musicTrimStart + 0.1)}
                            max={musicDuration}
                            step="0.1"
                            value={musicTrimEnd}
                            onChange={(event) =>
                              setMusicTrimEnd(Math.max(Number(event.target.value), musicTrimStart + 0.1))
                            }
                          />
                        </label>
                      </div>
                    )}
                    <button
                      type="button"
                      className="zq-link-button"
                      style={{ marginTop: '6px', fontSize: '11px' }}
                      onClick={() => setShowAudioLibrary(true)}
                    >
                      Choose a different sound
                    </button>
                  </div>
                )}

                {showAudioLibrary && (
                  <AudioLibraryPanel
                    selectedUrl={musicUrl}
                    onClose={() => setShowAudioLibrary(false)}
                    onSelect={(url, label, file) => {
                      if (musicPreviewUrl) URL.revokeObjectURL(musicPreviewUrl);
                      setMusicFile(file || null);
                      setMusicUrl(url);
                      setSelectedMusicLabel(label);
                      setMusicPreviewUrl(file ? URL.createObjectURL(file) : null);
                      setMusicDuration(0);
                      setMusicTrimStart(0);
                      setMusicTrimEnd(0);
                    }}
                  />
                )}
              </div>

              {/* Caption Textarea */}
              <div className="zq-studio-section" style={{ flex: 1 }}>
                <div className="zq-studio-label">
                  <span>{activeTab === 'reel' ? 'Reel Caption & Tags' : 'Post Caption'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleAiSpark}
                      style={{
                        background: 'rgba(0, 223, 216, 0.15)',
                        border: '1px solid rgba(0, 223, 216, 0.4)',
                        borderRadius: '10px',
                        padding: '2px 8px',
                        color: '#00dfd8',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Generate a high-vibe caption with tags"
                    >
                      <span>✨ AI Spark</span>
                    </button>
                    <span style={{ fontSize: '11px', color: '#8892b0' }}>{content.length}/500</span>
                  </div>
                </div>
                <textarea
                  className="zq-studio-caption-input"
                  rows={3}
                  maxLength={500}
                  placeholder={
                    activeTab === 'reel'
                      ? 'Add a catchy title, vibe, and #tags for your reel...'
                      : 'Share a story, insight, or moment with your circle...'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              {error && <div className="zq-sync-error">{error}</div>}
            </div>
          </form>
        )}

        {/* Studio Bottom Footer (Only for Post and Reel) */}
        {activeTab !== 'live' && activeTab !== 'story' && (
          <div className="zq-studio-footer">
            <button
              type="button"
              className="zq-btn-glass"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="zq-studio-publish-btn"
                disabled={loading || (!content.trim() && !mediaUrl.trim() && !mediaFile)}
                onClick={handleSubmit}
              >
                {loading ? (
                  <>
                    <span className="zq-pulse-orb" /> Publishing {activeTab === 'reel' ? 'Reel' : 'Post'}...
                  </>
                ) : (
                  <>
                    <span>🚀</span> Publish {activeTab === 'reel' ? 'Reel' : 'Post'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showImageEditor && previewUrl && mediaType === 'image' && (
        <ImageEditor
          src={previewUrl}
          onApply={handleEditedImage}
          onClose={() => setShowImageEditor(false)}
        />
      )}
    </div>
  );
}
