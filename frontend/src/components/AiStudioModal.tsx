import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, getAvatarUrl } from '../api/client';

type StudioTab = 'generate' | 'remaster';
type Persona = 'male' | 'female' | 'neutral' | 'cyborg';

const styles = [
  { id: 'realistic', label: 'Natural', detail: 'Photographic portrait' },
  { id: 'studio', label: 'Studio', detail: 'Soft light, clean backdrop' },
  { id: 'cyberpunk', label: 'Cyberpunk', detail: 'Neon-lit future' },
  { id: 'anime', label: 'Illustrated', detail: 'Expressive digital art' },
  { id: 'cosmic', label: 'Cosmic', detail: 'Celestial atmosphere' },
  { id: 'solar', label: 'Golden hour', detail: 'Warm sunset light' },
] as const;

const suggestions = [
  'A confident creator in a sunlit modern studio',
  'A cinematic portrait with a deep blue city at night',
  'An editorial portrait with warm golden-hour lighting',
  'A playful illustrated avatar with a vivid color palette',
];

const remasterPresets = [
  { label: 'Studio retouch', prompt: 'Improve soft studio lighting and clarity while keeping my face natural.', style: 'studio' },
  { label: 'Night city', prompt: 'Add tasteful neon city lights in the background and cinematic contrast.', style: 'cyberpunk' },
  { label: 'Warm portrait', prompt: 'Create a warm golden-hour portrait with soft natural light.', style: 'solar' },
  { label: 'Illustrated', prompt: 'Turn this into expressive polished digital illustration while retaining recognizable features.', style: 'anime' },
] as const;

export default function AiStudioModal({
  currentAvatarUrl,
  onClose,
  onApplyAvatar,
}: {
  currentAvatarUrl?: string;
  onClose: () => void;
  onApplyAvatar: (publicUrl: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<StudioTab>('generate');
  const [prompt, setPrompt] = useState('');
  const [persona, setPersona] = useState<Persona>('neutral');
  const [style, setStyle] = useState('realistic');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState(currentAvatarUrl || getAvatarUrl(null));
  const [sourceHasError, setSourceHasError] = useState(false);
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [modifyStyle, setModifyStyle] = useState('studio');
  const [remasteredUrl, setRemasteredUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemastering, setIsRemastering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const active = isGenerating || isRemastering || isUploading;
  const hasUsableSource = /^https?:\/\//i.test(sourceImageUrl) && !sourceHasError;
  const resultUrl = activeTab === 'generate' ? generatedUrl : remasteredUrl;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !active) onClose();
      if (event.key !== 'Tab') return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), input:not([disabled])');
      if (!items?.length) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [active, onClose]);

  const generate = async () => {
    setError('');
    setNotice('');
    setGeneratedUrl(null);
    setIsGenerating(true);
    try {
      const result = await api.aiGenerateRealistic({
        prompt: prompt.trim(),
        style,
        gender: persona,
      });
      if (!result.publicUrl) throw new Error('The image service returned no image. Please try again.');
      setGeneratedUrl(result.publicUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const remaster = async () => {
    if (!hasUsableSource) {
      setError('Upload a photo first. Your current profile photo is unavailable for remastering.');
      return;
    }
    setError('');
    setNotice('');
    setRemasteredUrl(null);
    setIsRemastering(true);
    try {
      const result = await api.aiModifyImage({
        imageUrl: sourceImageUrl,
        prompt: modifyPrompt.trim() || 'Improve the portrait lighting and detail while keeping my recognizable features.',
        style: modifyStyle,
        gender: persona,
      });
      if (!result.publicUrl) throw new Error('The image service returned no image. Please try again.');
      setRemasteredUrl(result.publicUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Photo remaster failed. Please try again.');
    } finally {
      setIsRemastering(false);
    }
  };

  const uploadSource = async (file: File) => {
    setError('');
    setNotice('');
    setRemasteredUrl(null);
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file such as JPG, PNG, or WebP.');
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await api.uploadMedia(file);
      setSourceImageUrl(uploaded.publicUrl);
      setSourceHasError(false);
      setNotice('Photo uploaded. Describe a change or choose a preset, then select Remaster photo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not upload this photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const applyResult = async () => {
    if (resultUrl) await onApplyAvatar(resultUrl);
  };

  return createPortal(
    <div
      className="zq-ai-studio-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !active) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="zq-ai-studio-modal zq-ai-studio-redesign"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zq-ai-studio-title"
        aria-describedby="zq-ai-studio-description"
      >
        <header className="zq-ai-studio-header">
          <div className="zq-ai-studio-brand">
            <span className="zq-ai-studio-mark" aria-hidden="true">✳</span>
            <div>
              <span className="zq-ai-studio-eyebrow">ZYNQORA CREATIVE</span>
              <h2 id="zq-ai-studio-title">AI Studio</h2>
              <p id="zq-ai-studio-description">Make a new portrait or give a photo a fresh look.</p>
            </div>
          </div>
          <button ref={closeButtonRef} className="zq-ai-studio-close" type="button" aria-label="Close AI Studio" onClick={onClose} disabled={active}>×</button>
        </header>

        <div className="zq-ai-studio-tabs" role="tablist" aria-label="AI Studio mode">
          <button type="button" role="tab" aria-selected={activeTab === 'generate'} className={activeTab === 'generate' ? 'active' : ''} onClick={() => { setActiveTab('generate'); setError(''); }}>
            <span>01</span> Create from a prompt
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'remaster'} className={activeTab === 'remaster' ? 'active' : ''} onClick={() => { setActiveTab('remaster'); setError(''); }}>
            <span>02</span> Edit a photo
          </button>
        </div>

        <div className="zq-ai-studio-workspace">
          <section className="zq-ai-studio-controls" aria-label={activeTab === 'generate' ? 'Image generation controls' : 'Photo editing controls'}>
            {activeTab === 'generate' ? (
              <>
                <label className="zq-ai-label" htmlFor="zq-ai-prompt">Describe the image</label>
                <textarea id="zq-ai-prompt" className="zq-ai-prompt" maxLength={700} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="A cinematic portrait of a creative musician in a sunlit recording studio…" />
                <div className="zq-ai-character-count">{prompt.length}/700</div>

                <div className="zq-ai-suggestions">
                  <span className="zq-ai-section-label">Try an idea</span>
                  <div className="zq-ai-suggestion-list">
                    {suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)}>{suggestion}</button>
                    ))}
                  </div>
                </div>

                <div className="zq-ai-option-row">
                  <label className="zq-ai-label" htmlFor="zq-ai-persona">Portrait presentation</label>
                  <select id="zq-ai-persona" value={persona} onChange={(event) => setPersona(event.target.value as Persona)}>
                    <option value="neutral">Neutral</option>
                    <option value="female">Feminine</option>
                    <option value="male">Masculine</option>
                    <option value="cyborg">Futuristic</option>
                  </select>
                </div>
                <div>
                  <span className="zq-ai-section-label">Visual direction</span>
                  <div className="zq-ai-style-grid">
                    {styles.map((item) => (
                      <button key={item.id} type="button" className={style === item.id ? 'selected' : ''} onClick={() => setStyle(item.id)} aria-pressed={style === item.id}>
                        <strong>{item.label}</strong><span>{item.detail}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className="zq-ai-primary-button" onClick={generate} disabled={active}>
                  {isGenerating ? <><span className="zq-ai-spinner" /> Creating image…</> : 'Create image'}
                </button>
              </>
            ) : (
              <>
                <div className="zq-ai-source-heading">
                  <div><span className="zq-ai-label">Photo to edit</span><p>Upload a clear portrait for best results.</p></div>
                  <button type="button" className="zq-ai-secondary-button" onClick={() => fileInputRef.current?.click()} disabled={active}>Upload photo</button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSource(file); event.currentTarget.value = ''; }} />
                </div>
                <div className="zq-ai-source-preview">
                  {hasUsableSource ? (
                    <img src={sourceImageUrl} alt="Photo selected for editing" onError={() => setSourceHasError(true)} />
                  ) : (
                    <div><span aria-hidden="true">＋</span><strong>{sourceHasError ? 'Photo unavailable' : 'Add a photo to begin'}</strong><small>Upload a JPG, PNG, WebP, or GIF image.</small></div>
                  )}
                </div>
                <label className="zq-ai-label" htmlFor="zq-ai-modify-prompt">What would you like to change?</label>
                <textarea id="zq-ai-modify-prompt" className="zq-ai-prompt" maxLength={500} value={modifyPrompt} onChange={(event) => setModifyPrompt(event.target.value)} placeholder="Improve the lighting, soften the background, keep my face natural…" />
                <div className="zq-ai-character-count">{modifyPrompt.length}/500</div>
                <div className="zq-ai-suggestions">
                  <span className="zq-ai-section-label">Quick edits</span>
                  <div className="zq-ai-suggestion-list">
                    {remasterPresets.map((preset) => (
                      <button key={preset.label} type="button" onClick={() => { setModifyPrompt(preset.prompt); setModifyStyle(preset.style); }}>{preset.label}</button>
                    ))}
                  </div>
                </div>
                <div className="zq-ai-option-row">
                  <label className="zq-ai-label" htmlFor="zq-ai-edit-style">Visual direction</label>
                  <select id="zq-ai-edit-style" value={modifyStyle} onChange={(event) => setModifyStyle(event.target.value)}>{styles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
                </div>
                <button type="button" className="zq-ai-primary-button zq-ai-edit-button" onClick={() => void remaster()} disabled={active || !hasUsableSource}>
                  {isUploading ? <><span className="zq-ai-spinner" /> Uploading photo…</> : isRemastering ? <><span className="zq-ai-spinner" /> Editing photo…</> : 'Remaster photo'}
                </button>
              </>
            )}

            {notice && <p className="zq-ai-notice" role="status">{notice}</p>}
            {error && <p className="zq-ai-error" role="alert">{error}</p>}
          </section>

          <aside className="zq-ai-result-panel" aria-label="Image result preview">
            <div className="zq-ai-result-heading"><span>PREVIEW</span><span>{resultUrl ? 'READY' : active ? 'WORKING' : 'YOUR CANVAS'}</span></div>
            <div className="zq-ai-canvas">
              {active ? (
                <div className="zq-ai-working" role="status"><span className="zq-ai-large-spinner" /><strong>{isUploading ? 'Uploading your photo' : isRemastering ? 'Editing your photo' : 'Creating your image'}</strong><p>This can take up to a minute. Keep this window open.</p></div>
              ) : resultUrl ? (
                <img className="zq-ai-result-image" src={resultUrl} alt="AI image result" onError={() => { setError('The generated image could not be loaded. Please create it again.'); activeTab === 'generate' ? setGeneratedUrl(null) : setRemasteredUrl(null); }} />
              ) : (
                <div className="zq-ai-empty-canvas"><span aria-hidden="true">✳</span><strong>Your image will appear here</strong><p>{activeTab === 'generate' ? 'Describe a look, choose a style, and create.' : 'Upload a portrait, describe your edit, and remaster.'}</p></div>
              )}
            </div>
            {resultUrl ? (
              <div className="zq-ai-result-actions">
                <button type="button" className="zq-ai-primary-button" onClick={() => void applyResult()}>Use as profile photo</button>
                <a className="zq-ai-download-link" href={resultUrl} download target="_blank" rel="noreferrer">Open or download image</a>
              </div>
            ) : (
              <p className="zq-ai-provider-note">Images are generated by the configured AI image provider. Results can vary by prompt and availability.</p>
            )}
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
