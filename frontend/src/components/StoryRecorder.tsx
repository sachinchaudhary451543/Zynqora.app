import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api, getAvatarUrl, getDefaultAvatar } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface StoryRecorderProps {
  onSaved?: () => void;
  onClose?: () => void;
  standalone?: boolean;
}

type Screen = 'picker' | 'camera' | 'preview';

const VIBE_OPTIONS = [
  '⚡ In the Zone', '🚀 Building', '🔥 High Energy', '✨ Deep Flow',
  '🎧 Music Vibes', '☕ Chill', '🌙 Night Owl', '💫 Golden Hour',
  '🎉 Celebrating', '💪 Grinding',
];

const AURA_FILTERS = [
  { id: 'none',    label: 'Original', css: 'none',                                color: '#ffffff' },
  { id: 'cyan',   label: 'Cyber',    css: 'hue-rotate(160deg) saturate(1.4)',    color: '#00dfd8' },
  { id: 'violet', label: 'Aura',     css: 'hue-rotate(240deg) saturate(1.6)',    color: '#7928ca' },
  { id: 'solar',  label: 'Solar',    css: 'hue-rotate(300deg) saturate(1.5)',    color: '#ff0080' },
  { id: 'warm',   label: 'Golden',   css: 'sepia(0.5) saturate(1.8) brightness(1.05)', color: '#f59e0b' },
  { id: 'mono',   label: 'Noir',     css: 'grayscale(1) contrast(1.1)',           color: '#aaaaaa' },
];

const GRADIENT_PRESETS = [
  { id: 'cyber', name: 'Cyber Neon', bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { id: 'aura',  name: 'Ultra Violet', bg: 'linear-gradient(135deg, #7928ca, #ff0080)' },
  { id: 'matrix', name: 'Matrix Pulse', bg: 'linear-gradient(135deg, #000428, #004e92)' },
  { id: 'sunset', name: 'Solar Flare', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
  { id: 'cosmic', name: 'Cosmic Dream', bg: 'linear-gradient(135deg, #111827, #312e81, #4c1d95)' },
  { id: 'mint',   name: 'Deep Emerald', bg: 'linear-gradient(135deg, #064e3b, #047857, #10b981)' },
];

const TEMPLATE_GALLERY = [
  { label: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&fit=crop' },
  { label: 'Night City', url: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=600&fit=crop' },
  { label: 'Abstract Art', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&fit=crop' },
  { label: 'Deep Waves', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&fit=crop' },
  { label: 'Urban Glow', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&fit=crop' },
  { label: 'Neon Soul', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&fit=crop' },
];

export default function StoryRecorder({ onSaved, onClose, standalone = false }: StoryRecorderProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Screen flow: 'picker' (default) -> 'camera' OR 'preview'
  const [screen, setScreen] = useState<Screen>('picker');
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGradientStory, setIsGradientStory] = useState(false);
  const [activeGradient, setActiveGradient] = useState(GRADIENT_PRESETS[0].bg);

  // Customization
  const [caption, setCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState('⚡ In the Zone');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const activeFilter = AURA_FILTERS.find((f) => f.id === selectedFilter) || AURA_FILTERS[0];

  /* ─── Camera ──────────────────────────────────────────────── */
  const startCamera = useCallback(async (facing: 'user' | 'environment' = cameraFacing) => {
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera access not available or permission denied.');
      setCameraActive(false);
    }
  }, [cameraFacing]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (screen === 'camera') {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [screen, startCamera, stopCamera, cameraFacing]);

  /* ─── Snapshot & Recording ────────────────────────────────── */
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `aura-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setMediaType('image');
      setIsGradientStory(false);
      setPreviewUrl(URL.createObjectURL(blob));
      setScreen('preview');
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm; codecs=vp8' });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], `aura-${Date.now()}.webm`, { type: 'video/webm' });
      setSelectedFile(file);
      setMediaType('video');
      setIsGradientStory(false);
      setPreviewUrl(URL.createObjectURL(blob));
      setScreen('preview');
      stopCamera();
    };
    mr.start();
    setRecording(true);
    setRecordedSeconds(0);
    const timer = setInterval(() => {
      setRecordedSeconds((prev) => {
        if (prev >= 14) {
          clearInterval(timer);
          mr.stop();
          setRecording(false);
          return 15;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  /* ─── File selection ──────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    setSelectedFile(file);
    setMediaType(isVid ? 'video' : 'image');
    setIsGradientStory(false);
    setPreviewUrl(URL.createObjectURL(file));
    setScreen('preview');
  };

  /* ─── Pick aesthetic template ─────────────────────────────── */
  const pickTemplate = async (url: string) => {
    try {
      setPreviewUrl(url);
      setMediaType('image');
      setIsGradientStory(false);
      setScreen('preview');
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `aura-template-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
    } catch {
      setPreviewUrl(url);
      setMediaType('image');
      setIsGradientStory(false);
      setScreen('preview');
    }
  };

  /* ─── Create text / gradient story ────────────────────────── */
  const startGradientStory = (bg: string) => {
    setActiveGradient(bg);
    setIsGradientStory(true);
    setMediaType('image');
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowCaptionInput(true);
    setScreen('preview');
  };

  /* ─── Convert gradient story to canvas file for upload ─────── */
  const renderGradientToFile = async (): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // Parse simple gradient colors
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, '#0f2027');
    grad.addColorStop(0.5, '#7928ca');
    grad.addColorStop(1, '#00dfd8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Render Vibe
    ctx.fillStyle = '#00dfd8';
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(selectedVibe, 540, 480);

    // Render text / caption
    if (caption.trim()) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const words = caption.trim().split(' ');
      let line = '';
      let y = 960;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 900 && n > 0) {
          ctx.fillText(line, 540, y);
          line = words[n] + ' ';
          y += 84;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 540, y);
    }

    return new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Failed to create story blob'));
        resolve(new File([blob], `aura-gradient-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.95);
    });
  };

  /* ─── Publish Story ───────────────────────────────────────── */
  const handlePublish = async () => {
    setUploading(true);
    setUploadError('');
    try {
      let fileToUpload = selectedFile;
      if (isGradientStory && !fileToUpload) {
        fileToUpload = await renderGradientToFile();
      }

      let publicUrl = '';
      if (fileToUpload) {
        const res = await api.uploadLocal(fileToUpload);
        publicUrl = res.publicUrl;
      } else if (previewUrl) {
        publicUrl = previewUrl;
      }

      const fullCaption = [selectedVibe, caption.trim()].filter(Boolean).join(' • ');
      await api.createStory({
        videoUrl: publicUrl,
        caption: fullCaption || undefined,
        visibility: 'PUBLIC',
      });
      onSaved?.();
      onClose?.();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to share Aura story.');
    } finally {
      setUploading(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER CONTENT
     ───────────────────────────────────────────────────────────── */
  const renderContent = () => {
    /* ─── SCREEN 1: PICKER / STUDIO HUB (Default) ───────────── */
    if (screen === 'picker') {
      return (
        <div style={canvasInner}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 8px #00dfd8)' }}>⚡</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', letterSpacing: '0.4px' }}>
                  Create Aura Story
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  Visible to circle for 24 hours
                </div>
              </div>
            </div>
            {onClose && (
              <button type="button" onClick={onClose} style={circleBtn} title="Close">
                ✕
              </button>
            )}
          </div>

          <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Primary Action Row: Gallery + Camera */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Device Gallery / Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={primaryActionCard('#00dfd8', '#7928ca')}
              >
                <div style={primaryIconWrap('rgba(0,223,216,0.18)', '#00dfd8')}>📁</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                  Device Gallery
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '2px', lineHeight: 1.3 }}>
                  Select photo or video
                </div>
                <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: 700, color: '#00dfd8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Browse files →
                </div>
              </button>

              {/* Live Camera */}
              <button
                type="button"
                onClick={() => setScreen('camera')}
                style={primaryActionCard('#ff0080', '#7928ca')}
              >
                <div style={primaryIconWrap('rgba(255,0,128,0.18)', '#ff0080')}>📷</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                  Live Camera
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: '2px', lineHeight: 1.3 }}>
                  Snap photo or 15s clip
                </div>
                <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: 700, color: '#ff0080', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Open lens →
                </div>
              </button>
            </div>

            {/* Quick Text / Gradient Story Presets */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎨</span>
                <span>Instant Gradient & Text Story</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {GRADIENT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => startGradientStory(p.bg)}
                    style={{
                      height: '52px',
                      borderRadius: '14px',
                      background: p.bg,
                      border: '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Aesthetic Wallpapers & Templates */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✨</span>
                  <span>Aura Templates</span>
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontWeight: 500 }}>
                  Tap to customize
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {TEMPLATE_GALLERY.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => pickTemplate(t.url)}
                    style={{
                      aspectRatio: '9/14',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1.5px solid rgba(255,255,255,0.12)',
                      cursor: 'pointer',
                      padding: 0,
                      background: '#111',
                    }}
                  >
                    <img
                      src={t.url}
                      alt={t.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.8) 100%)', display: 'flex', alignItems: 'flex-end', padding: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {t.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      );
    }

    /* ─── SCREEN 2: CAMERA VIEWFINDER ───────────────────────── */
    if (screen === 'camera') {
      return (
        <div style={canvasInner}>
          <div style={{ position: 'relative', flex: 1, background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Live Video or Friendly Error Fallback */}
            {!cameraError ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '24px', background: 'radial-gradient(circle, rgba(0,223,216,0.08) 0%, #060810 85%)', textAlign: 'center' }}>
                <div style={{ fontSize: '50px' }}>📷</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>Camera Unavailable</div>
                <div style={{ fontSize: '12.5px', color: '#8892b0', maxWidth: '280px', lineHeight: 1.5 }}>
                  {cameraError} You can still select photos or videos directly from your device.
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '10px 24px', borderRadius: '20px', background: 'linear-gradient(135deg, #00dfd8, #7928ca)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,223,216,0.3)' }}
                >
                  📁 Select from Device
                </button>
              </div>
            )}

            {/* Top Bar: Back & Tools */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
              <button type="button" onClick={() => setScreen('picker')} style={floatPill}>
                ← Studio
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {cameraActive && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = cameraFacing === 'user' ? 'environment' : 'user';
                      setCameraFacing(next);
                      startCamera(next);
                    }}
                    style={floatPill}
                    title="Flip camera"
                  >
                    🔄 Flip
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={floatPill}
                  title="Gallery"
                >
                  📁
                </button>
              </div>
            </div>

            {/* Recording Timer */}
            {recording && (
              <div style={{ position: 'absolute', top: '64px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(255,51,102,0.95)', padding: '5px 16px', borderRadius: '20px', color: '#fff', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(255,51,102,0.6)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
                {recordedSeconds}s / 15s
              </div>
            )}

            {/* Mode Switcher: PHOTO / VIDEO */}
            <div style={{ position: 'absolute', bottom: '110px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '20px', zIndex: 20 }}>
              {(['photo', 'video'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCaptureMode(m)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: captureMode === m ? '#fff' : 'rgba(255,255,255,0.45)',
                    fontWeight: captureMode === m ? 800 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    paddingBottom: '4px',
                    borderBottom: captureMode === m ? '2px solid #00dfd8' : 'none',
                    textShadow: captureMode === m ? '0 0 10px #00dfd8' : 'none',
                  }}
                >
                  {m === 'photo' ? 'Photo' : 'Video (15s)'}
                </button>
              ))}
            </div>

            {/* Shutter Row */}
            <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', zIndex: 20 }}>
              {/* Gallery button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Pick from gallery"
              >
                📁
              </button>

              {/* Shutter Trigger */}
              <button
                type="button"
                disabled={!cameraActive}
                onClick={() => {
                  if (captureMode === 'photo') {
                    takePhoto();
                  } else {
                    if (recording) stopRecording();
                    else startRecording();
                  }
                }}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  border: recording ? '4px solid #ff3366' : '4px solid #fff',
                  background: 'transparent',
                  cursor: cameraActive ? 'pointer' : 'not-allowed',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: cameraActive ? 1 : 0.4,
                  boxShadow: recording ? '0 0 20px #ff3366' : '0 0 20px rgba(0,223,216,0.3)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: recording ? '10px' : '50%',
                    background: recording ? '#ff3366' : 'linear-gradient(135deg, #00dfd8, #7928ca)',
                    transition: 'all 0.2s ease',
                  }}
                />
              </button>

              {/* Flip camera */}
              <button
                type="button"
                onClick={() => {
                  const next = cameraFacing === 'user' ? 'environment' : 'user';
                  setCameraFacing(next);
                  startCamera(next);
                }}
                style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Flip camera"
              >
                🔄
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      );
    }

    /* ─── SCREEN 3: PREVIEW & PUBLISH ────────────────────────── */
    return (
      <div style={canvasInner}>
        {/* Visual Preview */}
        <div style={{ position: 'relative', flex: 1, background: isGradientStory ? activeGradient : '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isGradientStory ? (
            <div style={{ padding: '30px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#00dfd8', letterSpacing: '1px' }}>
                {selectedVibe}
              </div>
              <div style={{ fontSize: caption ? '22px' : '18px', fontWeight: 800, color: '#fff', lineHeight: 1.4, wordBreak: 'break-word', maxWidth: '300px' }}>
                {caption || 'Tap "Aa" to add your story thoughts or quote...'}
              </div>
            </div>
          ) : mediaType === 'video' ? (
            <video
              src={previewUrl!}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: activeFilter.css }}
            />
          ) : (
            <img
              src={previewUrl!}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: activeFilter.css }}
            />
          )}

          {/* Gradients for readability */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '90px', background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

          {/* Top Controls */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <button type="button" onClick={() => setScreen('picker')} style={floatPill}>
              ← Change
            </button>
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,223,216,0.5)', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 800, color: '#00dfd8', letterSpacing: '0.8px' }}>
              ⚡ AURA PREVIEW
            </div>
            <button
              type="button"
              onClick={() => setShowCaptionInput((c) => !c)}
              style={{ ...floatPill, color: showCaptionInput ? '#00dfd8' : '#fff', borderColor: showCaptionInput ? 'rgba(0,223,216,0.8)' : 'rgba(255,255,255,0.25)' }}
            >
              Aa Text
            </button>
          </div>

          {/* Vibe badge on preview */}
          {!isGradientStory && (
            <div style={{ position: 'absolute', top: '64px', left: '16px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(0,0,0,0.6)', border: `1px solid ${activeFilter.color}88`, backdropFilter: 'blur(8px)', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
              {selectedVibe}
            </div>
          )}

          {/* Caption banner on preview */}
          {!isGradientStory && caption && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', zIndex: 10, padding: '8px 14px', borderRadius: '12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', fontSize: '13.5px', fontWeight: 600, color: '#fff', textAlign: 'center', wordBreak: 'break-word', border: '1px solid rgba(255,255,255,0.15)' }}>
              {caption}
            </div>
          )}

          {/* Popover text input */}
          {showCaptionInput && (
            <div style={{ position: 'absolute', top: '105px', left: '14px', right: '14px', zIndex: 30, background: 'rgba(10,13,24,0.95)', backdropFilter: 'blur(20px)', border: `1px solid ${activeFilter.color}88`, borderRadius: '18px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.8)' }}>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Type story text or thoughts..."
                maxLength={100}
                autoFocus
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowCaptionInput(false)}
                style={{ padding: '5px 12px', borderRadius: '12px', background: '#00dfd8', border: 'none', color: '#060810', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Bottom Customization Tray */}
        <div style={{ background: '#090c16', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Filters Row (if not gradient) */}
          {!isGradientStory && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {AURA_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFilter(f.id)}
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    borderRadius: '14px',
                    background: selectedFilter === f.id ? 'rgba(0,223,216,0.18)' : 'rgba(255,255,255,0.06)',
                    border: selectedFilter === f.id ? '1px solid #00dfd8' : '1px solid rgba(255,255,255,0.1)',
                    color: selectedFilter === f.id ? '#00dfd8' : 'rgba(255,255,255,0.65)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Vibe Presets Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {VIBE_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedVibe(v)}
                style={{
                  flexShrink: 0,
                  padding: '4px 11px',
                  borderRadius: '14px',
                  background: selectedVibe === v ? 'rgba(121,40,202,0.25)' : 'rgba(255,255,255,0.05)',
                  border: selectedVibe === v ? '1px solid #7928ca' : '1px solid rgba(255,255,255,0.08)',
                  color: selectedVibe === v ? '#c4b5fd' : 'rgba(255,255,255,0.65)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {uploadError && (
            <div style={{ color: '#ff4466', fontSize: '11px', textAlign: 'center', background: 'rgba(255,51,102,0.12)', padding: '6px 10px', borderRadius: '10px' }}>
              {uploadError}
            </div>
          )}

          {/* Publish Action Button */}
          <button
            type="button"
            disabled={uploading}
            onClick={handlePublish}
            style={{
              height: '46px',
              borderRadius: '23px',
              background: uploading ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '14.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              boxShadow: uploading ? 'none' : '0 4px 18px rgba(0,223,216,0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            {uploading ? (
              <>
                <span className="zq-pulse-orb" />
                <span>Sharing to Your Aura...</span>
              </>
            ) : (
              <>
                <img
                  src={getAvatarUrl(user)}
                  alt=""
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.onerror = null;
                    t.src = getDefaultAvatar(user?.name || user?.username);
                  }}
                />
                <span>Share to Your Aura ✨</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  /* ─── STANDALONE MODE (Inside CreatePostModal) ─────────────── */
  if (standalone) {
    return (
      <div style={{ width: '100%', maxWidth: '440px', height: '620px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,223,216,0.3)', background: '#060810', display: 'flex', flexDirection: 'column' }}>
        {renderContent()}
      </div>
    );
  }

  /* ─── MODAL MODE (Feed, Profile, Aura page) ─────────────────── */
  return createPortal(
    <div style={backdropOverlayStyle} onClick={onClose}>
      <div style={modalCanvasStyle} onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────────────
   STYLES
   ───────────────────────────────────────────────────────────── */
const backdropOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 99999,
  background: 'rgba(4, 6, 14, 0.88)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'zqFadeIn 0.2s ease-out forwards',
  padding: '16px',
};

const modalCanvasStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: '420px',
  height: 'min(730px, 94vh)',
  background: '#060810',
  borderRadius: '26px',
  border: '1.5px solid rgba(0, 223, 216, 0.35)',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 223, 216, 0.12)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const canvasInner: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 18px 14px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: '#070a14',
};

const circleBtn: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const floatPill: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '20px',
  background: 'rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
};

function primaryActionCard(c1: string, c2: string): React.CSSProperties {
  return {
    padding: '20px 14px',
    borderRadius: '18px',
    background: `linear-gradient(145deg, ${c1}18, ${c2}14)`,
    border: `1.5px solid ${c1}55`,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    boxShadow: `0 8px 24px ${c1}15`,
  };
}

function primaryIconWrap(bg: string, color: string): React.CSSProperties {
  return {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    background: bg,
    border: `1px solid ${color}44`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    color: color,
  };
}
