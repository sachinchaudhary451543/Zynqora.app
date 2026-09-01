import React, { useState, useRef } from 'react';
import { api, getAvatarUrl } from '../api/client';
import { AuraSparkIcon } from './Icons';

interface AiStudioModalProps {
  currentAvatarUrl?: string;
  onClose: () => void;
  onApplyAvatar: (publicUrl: string) => void;
}

export default function AiStudioModal({
  currentAvatarUrl,
  onClose,
  onApplyAvatar,
}: AiStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'remaster'>('generate');
  
  // Generate Tab State
  const [prompt, setPrompt] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral' | 'cyborg'>('male');
  const [style, setStyle] = useState('realistic');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Remaster / Modify Tab State
  const [sourceImageUrl, setSourceImageUrl] = useState<string>(currentAvatarUrl || getAvatarUrl(null));
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [modifyGender, setModifyGender] = useState<'male' | 'female' | 'neutral' | 'cyborg'>('male');
  const [modifyStyle, setModifyStyle] = useState('cyberpunk');
  const [remasteredUrl, setRemasteredUrl] = useState<string | null>(null);
  const [isRemastering, setIsRemastering] = useState(false);
  const [remasterError, setRemasterError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const genderOptions = [
    { id: 'male', label: '👨 Male / Guy', desc: 'Handsome male persona' },
    { id: 'female', label: '👩 Female / Woman', desc: 'Beautiful female persona' },
    { id: 'cyborg', label: '🤖 Cyberpunk Cyborg', desc: 'Futuristic sci-fi techie' },
    { id: 'neutral', label: '🧑 Neutral / Unisex', desc: 'Visionary creator persona' },
  ];

  const styleOptions = [
    { id: 'realistic', name: '📸 Photorealistic', icon: '📸', desc: 'Masterpiece 8k studio photography' },
    { id: 'cyberpunk', name: '⚡ Cyberpunk Aura', icon: '⚡', desc: 'Neon obsidian holographic tech' },
    { id: 'anime', name: '🎨 3D Anime / Pixar', icon: '🎨', desc: 'Vibrant Makoto Shinkai 3D digital art' },
    { id: 'cosmic', name: '🪐 Cosmic Ethereal', icon: '🪐', desc: 'Glowing stardust & nebula particles' },
    { id: 'studio', name: '🕶️ Studio Minimalist', icon: '🕶️', desc: 'Dramatic 85mm softbox headshot' },
    { id: 'solar', name: '🔥 Solar Warmth', icon: '🔥', desc: 'Sun-drenched golden hour lens flare' },
  ];

  const promptSuggestions = [
    'Software engineer in high-tech glass obsidian lab with subtle cyan aura lighting',
    'Cinematic 8k portrait of young visionary creator with glowing purple neon reflection',
    'Cyberpunk anime pioneer with sleek neural visor and volumetric ambient light',
    'Minimalist monochromatic black and white editorial magazine cover portrait',
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError('');
    try {
      const res = await api.aiGenerateRealistic({
        prompt: prompt || 'modern software engineer in high-tech obsidian laboratory with subtle neon aura lighting',
        style,
        gender,
      });
      setGeneratedUrl(res.publicUrl);
    } catch (e: any) {
      setGenError(e.message || 'Failed to synthesize AI image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemaster = async () => {
    setIsRemastering(true);
    setRemasterError('');
    try {
      const res = await api.aiModifyImage({
        imageUrl: sourceImageUrl,
        prompt: modifyPrompt || 'Remaster with cinematic volumetric lighting, neon aura, and ultra-sharp 8k details',
        style: modifyStyle,
        gender: modifyGender,
      });
      setRemasteredUrl(res.publicUrl);
    } catch (e: any) {
      setRemasterError(e.message || 'Failed to remaster photo. Please try again.');
    } finally {
      setIsRemastering(false);
    }
  };

  const handlePickCustomPhoto = async (file: File) => {
    try {
      const res = await api.uploadLocal(file);
      setSourceImageUrl(res.publicUrl);
      setRemasteredUrl(null);
    } catch (e: any) {
      setRemasterError('Failed to upload custom photo for remastering.');
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 6, 14, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #13172c 0%, #090b16 100%)',
          border: '1px solid rgba(0, 223, 216, 0.35)',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 84px rgba(0, 0, 0, 0.9), 0 0 60px rgba(0, 223, 216, 0.18)',
          animation: 'zqZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0, 223, 216, 0.4)',
              }}
            >
              <AuraSparkIcon size={22} active={true} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.4px' }}>
                Zynqora AI Creative Studio
              </h3>
              <p style={{ fontSize: '12px', color: '#9499ab', margin: '2px 0 0 0' }}>
                Neural avatar generator & prompt-based photo enhancement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#aaa',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Studio Mode Segmented Switcher */}
        <div style={{ padding: '14px 28px 0 28px' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '4px',
              gap: '6px',
            }}
          >
            <button
              onClick={() => setActiveTab('generate')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '12px',
                border: activeTab === 'generate' ? '1px solid rgba(0, 223, 216, 0.5)' : '1px solid transparent',
                background: activeTab === 'generate' ? 'linear-gradient(135deg, rgba(0, 223, 216, 0.2), rgba(121, 40, 202, 0.25))' : 'transparent',
                color: activeTab === 'generate' ? '#fff' : '#8892b0',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>✨</span> Create from Prompt (Text-to-Avatar)
            </button>
            <button
              onClick={() => setActiveTab('remaster')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '12px',
                border: activeTab === 'remaster' ? '1px solid rgba(121, 40, 202, 0.6)' : '1px solid transparent',
                background: activeTab === 'remaster' ? 'linear-gradient(135deg, rgba(121, 40, 202, 0.25), rgba(255, 0, 128, 0.25))' : 'transparent',
                color: activeTab === 'remaster' ? '#fff' : '#8892b0',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>🪄</span> Remaster & Edit Photo with AI
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* TAB 1: TEXT TO IMAGE GENERATION */}
          {activeTab === 'generate' && (
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {/* Left Form Controls */}
              <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Gender / Subject Persona Selector */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#00dfd8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                    1. Subject Persona & Gender
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {genderOptions.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGender(g.id as any)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: gender === g.id ? '1px solid #00dfd8' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: gender === g.id ? 'rgba(0, 223, 216, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          color: gender === g.id ? '#00dfd8' : '#ccd6f6',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div>{g.label}</div>
                        <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.7 }}>{g.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Textarea */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#7928ca', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    2. Describe Your Desired Look & Tech Vibe
                  </label>
                  <textarea
                    placeholder="e.g. Software engineer in high-tech obsidian lab with subtle cyan aura lighting, glasses, 8k portrait..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '74px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Prompt Inspirations */}
                <div>
                  <span style={{ fontSize: '11px', color: '#8892b0', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    ⚡ Instant Inspirations:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {promptSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrompt(s)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#ccd6f6',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {s.substring(0, 32)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Selector */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#ff0080', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    3. Select Neural Art Style
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {styleOptions.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStyle(st.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: style === st.id ? '1px solid #00dfd8' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: style === st.id ? 'rgba(0, 223, 216, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          color: style === st.id ? '#00dfd8' : '#ccd6f6',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: '15px' }}>{st.icon}</span>
                        <div>
                          <div>{st.name}</div>
                          <div style={{ fontSize: '9.5px', fontWeight: 400, opacity: 0.7 }}>{st.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {genError && (
                  <div style={{ color: '#ff3366', fontSize: '12px', background: 'rgba(255,51,102,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                    {genError}
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerate}
                  style={{
                    padding: '13px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '14px',
                    letterSpacing: '0.4px',
                    cursor: isGenerating ? 'wait' : 'pointer',
                    boxShadow: '0 4px 20px rgba(0, 223, 216, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s',
                  }}
                >
                  {isGenerating ? (
                    <>
                      <span className="zq-pulse-orb" /> Synthesizing Neural Image...
                    </>
                  ) : (
                    <>
                      <span>⚡</span> Generate Realistic Avatar
                    </>
                  )}
                </button>
              </div>

              {/* Right Preview Card */}
              <div
                style={{
                  flex: '1 1 280px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '24px',
                  minHeight: '340px',
                  textAlign: 'center',
                }}
              >
                {isGenerating ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        border: '3px solid transparent',
                        borderTopColor: '#00dfd8',
                        borderRightColor: '#7928ca',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <div style={{ color: '#00dfd8', fontWeight: 700, fontSize: '14px' }}>
                      Quantum Rendering Active...
                    </div>
                    <p style={{ color: '#8892b0', fontSize: '12px', maxWidth: '200px', margin: 0 }}>
                      Rendering high-fidelity textures, raytracing volumetric lighting, and 8k details
                    </p>
                  </div>
                ) : generatedUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div
                      style={{
                        width: '210px',
                        height: '210px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '4px solid #00dfd8',
                        boxShadow: '0 0 32px rgba(0, 223, 216, 0.4)',
                        marginBottom: '16px',
                      }}
                    >
                      <img
                        src={generatedUrl}
                        alt="AI Result"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', color: '#00dfd8', fontWeight: 700, marginBottom: '14px' }}>
                      ✦ NEURAL SYNTHESIS COMPLETE
                    </span>
                    <button
                      onClick={() => onApplyAvatar(generatedUrl)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '14px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #00dfd8 100%)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      Lock In as My Profile Avatar ✓
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#8892b0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎨</div>
                    <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: '0 0 4px 0' }}>
                      Neural Canvas Ready
                    </h4>
                    <p style={{ fontSize: '12px', maxWidth: '220px', margin: 0 }}>
                      Select a gender persona and art style, then click Generate to create a custom realistic avatar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REMASTER & MODIFY EXISTING PHOTO */}
          {activeTab === 'remaster' && (
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {/* Left Column: Image Source & Prompts */}
              <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#7928ca', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                      1. Photo to Remaster
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ccd6f6',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      📁 Upload Different Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePickCustomPhoto(f);
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <img
                      src={sourceImageUrl}
                      alt="Source"
                      style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.2)' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Selected Subject Photo</div>
                      <div style={{ fontSize: '11px', color: '#9499ab' }}>AI will analyze facial geometry & style parameters</div>
                    </div>
                  </div>
                </div>

                {/* Target Gender / Persona for Remaster */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#00dfd8', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    2. Subject Gender / Identity
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {genderOptions.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setModifyGender(g.id as any)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: modifyGender === g.id ? '1px solid #7928ca' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: modifyGender === g.id ? 'rgba(121, 40, 202, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: modifyGender === g.id ? '#c4b5fd' : '#ccd6f6',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#ff0080', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                    3. Natural Language AI Modifications
                  </label>
                  <textarea
                    placeholder="e.g. Add subtle purple & cyan neon ambient lighting, make background a futuristic obsidian glass office, sharp 8k details..."
                    value={modifyPrompt}
                    onChange={(e) => setModifyPrompt(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '74px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Quick Transformation Presets */}
                <div>
                  <span style={{ fontSize: '11px', color: '#8892b0', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    🪄 1-Click AI Presets:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px' }}>
                    {[
                      { name: '✨ Studio Lighting & Retouch', p: 'Studio softbox rim lighting, natural skin texture, 8k details', s: 'studio' },
                      { name: '⚡ Cyberpunk Persona', p: 'Glowing cyan & magenta neon ambient light with obsidian tech lab', s: 'cyberpunk' },
                      { name: '🎨 3D Anime Metamorphosis', p: '3D anime digital art avatar, Makoto Shinkai style, vibrant shading', s: 'anime' },
                      { name: '🪐 Cosmic Stardust Aura', p: 'Glowing celestial nebula stardust particles around the subject', s: 'cosmic' },
                    ].map((pr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setModifyPrompt(pr.p);
                          setModifyStyle(pr.s);
                        }}
                        style={{
                          padding: '7px 9px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#ccd6f6',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {pr.name}
                      </button>
                    ))}
                  </div>
                </div>

                {remasterError && (
                  <div style={{ color: '#ff3366', fontSize: '12px', background: 'rgba(255,51,102,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                    {remasterError}
                  </div>
                )}

                {/* Remaster Action Button */}
                <button
                  type="button"
                  disabled={isRemastering}
                  onClick={handleRemaster}
                  style={{
                    padding: '13px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7928ca 0%, #ff0080 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '14px',
                    letterSpacing: '0.4px',
                    cursor: isRemastering ? 'wait' : 'pointer',
                    boxShadow: '0 4px 20px rgba(121, 40, 202, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  {isRemastering ? (
                    <>
                      <span className="zq-pulse-orb" /> Remastering with AI...
                    </>
                  ) : (
                    <>
                      <span>🪄</span> Remaster Image with AI
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Comparison & Result */}
              <div
                style={{
                  flex: '1 1 280px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '24px',
                  minHeight: '340px',
                  textAlign: 'center',
                }}
              >
                {isRemastering ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        border: '3px solid transparent',
                        borderTopColor: '#7928ca',
                        borderRightColor: '#ff0080',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <div style={{ color: '#ff0080', fontWeight: 700, fontSize: '14px' }}>
                      AI Remastering In Progress...
                    </div>
                    <p style={{ color: '#8892b0', fontSize: '12px', maxWidth: '220px', margin: 0 }}>
                      Synthesizing neural modifications, atmospheric aura, and enhanced textures
                    </p>
                  </div>
                ) : remasteredUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <div
                      style={{
                        width: '210px',
                        height: '210px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '4px solid #ff0080',
                        boxShadow: '0 0 32px rgba(255, 0, 128, 0.4)',
                        marginBottom: '16px',
                      }}
                    >
                      <img
                        src={remasteredUrl}
                        alt="Remastered Result"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <span style={{ fontSize: '12px', color: '#ff0080', fontWeight: 700, marginBottom: '14px' }}>
                      ✦ AI REMASTERED OUTPUT
                    </span>
                    <button
                      onClick={() => onApplyAvatar(remasteredUrl)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '14px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #7928ca 0%, #ff0080 100%)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(255, 0, 128, 0.4)',
                      }}
                    >
                      Lock In as My Profile Avatar ✓
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#8892b0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🪄</div>
                    <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: '0 0 4px 0' }}>
                      Remaster Studio Ready
                    </h4>
                    <p style={{ fontSize: '12px', maxWidth: '220px', margin: 0 }}>
                      Type what you want to add or change (or click a 1-click preset) and click Remaster.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
