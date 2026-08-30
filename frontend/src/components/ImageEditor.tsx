import React, { useEffect, useRef, useState } from 'react';

export default function ImageEditor({
  src,
  onApply,
  onClose,
}: {
  src: string;
  onApply: (file: File) => void;
  onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [hueRotate, setHueRotate] = useState(0);
  const [activePreset, setActivePreset] = useState<string>('normal');

  const presets = [
    { id: 'normal', name: 'Normal', b: 1, c: 1, g: 0, s: 0, h: 0 },
    { id: 'cyberpunk', name: '⚡ Cyberpunk', b: 1.1, c: 1.3, g: 0, s: 0.1, h: 280 },
    { id: 'neon', name: '✨ Neon Aura', b: 1.15, c: 1.25, g: 0, s: 0, h: 180 },
    { id: 'solar', name: '🔥 Solar Glow', b: 1.1, c: 1.2, g: 0, s: 0.4, h: 30 },
    { id: 'noir', name: '🌑 Noir Obsidian', b: 1.05, c: 1.4, g: 1, s: 0, h: 0 },
    { id: 'vintage', name: '🎞️ Vintage Film', b: 0.95, c: 1.1, g: 0.2, s: 0.5, h: 0 },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setActivePreset(p.id);
    setBrightness(p.b);
    setContrast(p.c);
    setGrayscale(p.g);
    setSepia(p.s);
    setHueRotate(p.h);
  };

  const draw = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.naturalWidth || img.width || 400;
    canvas.height = img.naturalHeight || img.height || 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.filter = `brightness(${brightness}) contrast(${contrast}) grayscale(${grayscale}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`;
    ctx.drawImage(img, 0, 0);
  };

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      draw();
    } else {
      img.onload = () => draw();
    }
  }, [src, brightness, contrast, grayscale, sepia, hueRotate]);

  const apply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Export failed'));
        const ext = blob.type.split('/')[1] || 'png';
        const file = new File([blob], `edited-avatar.${ext}`, { type: blob.type });
        onApply(file);
        resolve();
      }, 'image/png');
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #131728 0%, #0a0c16 100%)',
          border: '1px solid rgba(0, 223, 216, 0.3)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '680px',
          overflow: 'hidden',
          boxShadow: '0 28px 72px rgba(0, 0, 0, 0.85), 0 0 50px rgba(0, 223, 216, 0.15)',
          color: '#f3f4f8',
          animation: 'zqZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🎨</span>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
              Aura Visual Studio
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#aaa',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Layout */}
        <div style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Left Preview Box */}
          <div
            style={{
              flex: '1 1 280px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              minHeight: '280px',
            }}
          >
            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '4px solid rgba(0, 223, 216, 0.5)',
                boxShadow: '0 0 30px rgba(0, 223, 216, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
              }}
            >
              <img
                ref={imgRef}
                src={src}
                alt="editor preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: `brightness(${brightness}) contrast(${contrast}) grayscale(${grayscale}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`,
                }}
                crossOrigin="anonymous"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#9499ab', marginTop: '12px', letterSpacing: '0.5px' }}>
              ✦ LIVE AURA PREVIEW
            </span>
          </div>

          {/* Right Adjustments & Presets */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Presets Grid */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#9499ab', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>
                Vibe Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: activePreset === p.id ? '1px solid #00dfd8' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: activePreset === p.id ? 'rgba(0, 223, 216, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: activePreset === p.id ? '#00dfd8' : '#ccd6f6',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#ccd6f6' }}>Brightness</span>
                  <span style={{ color: '#00dfd8', fontWeight: 700 }}>{Math.round(brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.02"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#00dfd8' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#ccd6f6' }}>Contrast</span>
                  <span style={{ color: '#7928ca', fontWeight: 700 }}>{Math.round(contrast * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.02"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#7928ca' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#ccd6f6' }}>Aura Hue Shift</span>
                  <span style={{ color: '#ff0080', fontWeight: 700 }}>{hueRotate}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={hueRotate}
                  onChange={(e) => setHueRotate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ff0080' }}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ccd6f6',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => apply().then(onClose)}
                style={{
                  flex: 1.5,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(0, 223, 216, 0.35)',
                }}
              >
                Apply Changes ⚡
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
