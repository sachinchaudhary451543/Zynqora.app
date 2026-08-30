import React, { useRef, useState, useEffect } from 'react';
import { api } from '../api/client';
import { AuraSparkIcon } from './Icons';

interface StoryRecorderProps {
  onSaved?: () => void;
  onClose?: () => void;
}

export default function StoryRecorder({ onSaved, onClose }: StoryRecorderProps) {
  const [mode, setMode] = useState<'record' | 'upload'>('upload');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Recording & Preview State
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Vibe & Caption Customization
  const [caption, setCaption] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('⚡ In the Zone');
  const [selectedAuraFilter, setSelectedAuraFilter] = useState('electric');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const vibeOptions = [
    '⚡ In the Zone',
    '🚀 Building & Launching',
    '🔥 High Energy',
    '✨ Deep Flow',
    '🎧 Audio & Music',
    '☕ Chill & Reflect',
  ];

  const auraFilters = [
    { id: 'electric', name: '⚡ Electric Aura', color: '#7928ca', glow: 'rgba(121, 40, 202, 0.4)' },
    { id: 'cyan', name: '✨ Cyber Cyan', color: '#00dfd8', glow: 'rgba(0, 223, 216, 0.4)' },
    { id: 'solar', name: '🔥 Solar Flame', color: '#ff0080', glow: 'rgba(255, 0, 128, 0.4)' },
    { id: 'emerald', name: '🌿 Matrix Green', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  ];

  // Stop camera when unmounting or switching modes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access denied or unavailable. You can upload photos/videos instead.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start live video recording
  const startRecording = () => {
    if (!streamRef.current) return;
    try {
      const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm; codecs=vp8' });
      mediaRecorderRef.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setMediaType('video');
        const file = new File([blob], `aura-moment-${Date.now()}.webm`, { type: 'video/webm' });
        setSelectedFile(file);
        stopCamera();
      };
      mr.start();
      setRecording(true);
      setRecordedSeconds(0);

      const timer = setInterval(() => {
        setRecordedSeconds((prev) => {
          if (prev >= 14) {
            clearInterval(timer);
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording start failed:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  // Handle local file upload (photo or video)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    stopCamera();
  };

  // Upload and publish Aura Moment / Status
  const handlePublish = async () => {
    if (!selectedFile && !previewUrl) return;
    setUploading(true);
    setUploadError('');

    try {
      let publicUrl = '';
      if (selectedFile) {
        const res = await api.uploadLocal(selectedFile);
        publicUrl = res.publicUrl;
      }

      await api.createStory({
        videoUrl: publicUrl,
      });

      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Failed to publish Aura Moment:', err);
      setUploadError(err.message || 'Failed to publish story. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const activeFilterColor = auraFilters.find((f) => f.id === selectedAuraFilter)?.color || '#7928ca';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        color: '#f3f4f8',
      }}
    >
      {/* Mode Switcher Tabs */}
      {!previewUrl && (
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '14px',
            padding: '4px',
            gap: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('upload');
              stopCamera();
            }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: 'none',
              background: mode === 'upload' ? 'linear-gradient(135deg, rgba(0, 223, 216, 0.2), rgba(121, 40, 202, 0.25))' : 'transparent',
              color: mode === 'upload' ? '#00dfd8' : '#8892b0',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📁</span> Upload Photo / Video
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('record');
              startCamera();
            }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: 'none',
              background: mode === 'record' ? 'linear-gradient(135deg, rgba(121, 40, 202, 0.25), rgba(255, 0, 128, 0.25))' : 'transparent',
              color: mode === 'record' ? '#ff0080' : '#8892b0',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📹</span> Record Live Camera
          </button>
        </div>
      )}

      {/* Main Studio Viewport */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '320px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#0a0c16',
          border: `2px solid ${activeFilterColor}55`,
          boxShadow: `0 8px 32px ${activeFilterColor}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* State A: Preview Active (Photo or Video) */}
        {previewUrl ? (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {mediaType === 'video' ? (
              <video
                src={previewUrl}
                autoPlay
                loop
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Story Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* Vibe & Caption Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: '14px',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(12px)',
                padding: '6px 12px',
                borderRadius: '12px',
                border: `1px solid ${activeFilterColor}`,
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AuraSparkIcon size={14} active={true} style={{ color: activeFilterColor }} />
              <span>{selectedVibe}</span>
            </div>

            {caption && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '14px',
                  right: '14px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(12px)',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {caption}
              </div>
            )}

            {/* Retake / Change Button */}
            <button
              onClick={() => {
                setPreviewUrl(null);
                setSelectedFile(null);
                if (mode === 'record') startCamera();
              }}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '10px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ↺ Change
            </button>
          </div>
        ) : mode === 'record' ? (
          /* State B: Live Camera Recorder */
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Recording Indicator */}
            {recording && (
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  background: 'rgba(255, 51, 102, 0.85)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 12px #ff3366',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
                <span>REC {recordedSeconds}s / 15s</span>
              </div>
            )}

            {cameraError && (
              <div style={{ position: 'absolute', inset: 0, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', textAlign: 'center', color: '#ff3366', fontSize: '13px' }}>
                {cameraError}
              </div>
            )}

            {/* Record Trigger Controls */}
            {!cameraError && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {!recording ? (
                  <button
                    onClick={startRecording}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ff0080, #7928ca)',
                      border: '4px solid #fff',
                      boxShadow: '0 0 20px rgba(255, 0, 128, 0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    ⏺
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '20px',
                      background: '#ff3366',
                      border: '2px solid #fff',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '13px',
                      boxShadow: '0 0 16px #ff3366',
                    }}
                  >
                    ⏹ Finish Clip
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* State C: File Upload Dropzone */
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.15), rgba(121, 40, 202, 0.2))',
                border: '1px solid rgba(0, 223, 216, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '12px',
              }}
            >
              📁
            </div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#fff', fontWeight: 800 }}>
              Select Status Photo or Video
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#8892b0' }}>
              Click to browse your phone or computer media (PNG, JPG, MP4, WEBM)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Vibe Status Selector */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 800, color: '#00dfd8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
          Select Aura Vibe Status
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {vibeOptions.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSelectedVibe(v)}
              style={{
                padding: '6px 12px',
                borderRadius: '12px',
                border: selectedVibe === v ? '1px solid #00dfd8' : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedVibe === v ? 'rgba(0, 223, 216, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedVibe === v ? '#00dfd8' : '#ccd6f6',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Status Caption Input */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 800, color: '#7928ca', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
          Moment Caption (Optional)
        </label>
        <input
          type="text"
          placeholder="Share what's happening right now in your circle..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Aura Glow Color Theme */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 800, color: '#ff0080', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
          Aura Glow Ring Style
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {auraFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedAuraFilter(f.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: '10px',
                border: selectedAuraFilter === f.id ? `2px solid ${f.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedAuraFilter === f.id ? `${f.color}22` : 'rgba(255, 255, 255, 0.02)',
                color: selectedAuraFilter === f.id ? f.color : '#ccd6f6',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {uploadError && (
        <div style={{ color: '#ff3366', fontSize: '12px', background: 'rgba(255,51,102,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
          {uploadError}
        </div>
      )}

      {/* Bottom Action Controls */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ccd6f6',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          disabled={!previewUrl || uploading}
          onClick={handlePublish}
          style={{
            flex: 2,
            padding: '12px',
            borderRadius: '14px',
            border: 'none',
            background: previewUrl ? 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)' : 'rgba(255, 255, 255, 0.08)',
            color: previewUrl ? '#fff' : '#6b7280',
            fontWeight: 800,
            fontSize: '13.5px',
            letterSpacing: '0.4px',
            cursor: previewUrl && !uploading ? 'pointer' : 'default',
            boxShadow: previewUrl ? '0 4px 20px rgba(0, 223, 216, 0.4)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          {uploading ? (
            <>
              <span className="zq-pulse-orb" /> Broadcasting Aura Moment...
            </>
          ) : (
            <>
              <span>⚡</span> Publish to Aura Stream
            </>
          )}
        </button>
      </div>
    </div>
  );
}
