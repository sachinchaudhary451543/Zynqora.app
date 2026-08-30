import React, { useRef } from 'react';
import { AuraSparkIcon } from './Icons';

interface AvatarActionsModalProps {
  onClose: () => void;
  onPickFile: (file: File) => void;
  onEdit: () => void;
  onOpenAiStudio?: () => void;
  onGenerateAi: () => void;
  onRemove: () => void;
}

export default function AvatarActionsModal({
  onClose,
  onPickFile,
  onEdit,
  onOpenAiStudio,
  onGenerateAi,
  onRemove,
}: AvatarActionsModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const auraColor = '#7928ca';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 6, 12, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #131728 0%, #0c0e18 100%)',
          border: '1px solid rgba(121, 40, 202, 0.35)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '380px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(121, 40, 202, 0.2)',
          textAlign: 'center',
          animation: 'zqZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 20px 16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.2), rgba(121, 40, 202, 0.2))',
              border: '1px solid rgba(0, 223, 216, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              color: '#00dfd8',
            }}
          >
            <AuraSparkIcon size={24} active={true} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '0.4px', margin: 0 }}>
            Aura Identity & Avatar
          </h3>
          <p style={{ fontSize: '12px', color: '#9499ab', marginTop: '4px' }}>
            Customize your unique presence across the Zynqora circles
          </p>
        </div>

        {/* Action Buttons List */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: '8px' }}>
          {/* Upload File */}
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(0, 223, 216, 0.25)',
              background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.12), rgba(121, 40, 202, 0.12))',
              color: '#00dfd8',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 223, 216, 0.22), rgba(121, 40, 202, 0.22))';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 223, 216, 0.12), rgba(121, 40, 202, 0.12))';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>📁</span> Upload Photo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />

          {/* AI Creative Studio */}
          <button
            onClick={() => {
              if (onOpenAiStudio) onOpenAiStudio();
              else onGenerateAi();
            }}
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 0, 128, 0.35)',
              background: 'linear-gradient(135deg, rgba(121, 40, 202, 0.2), rgba(255, 0, 128, 0.2))',
              color: '#ff0080',
              fontWeight: 800,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255, 0, 128, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(121, 40, 202, 0.3), rgba(255, 0, 128, 0.3))';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(121, 40, 202, 0.2), rgba(255, 0, 128, 0.2))';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>✨</span> Open Zynqora AI Creative Studio
          </button>

          {/* Filter / Contrast Editor */}
          <button
            onClick={onEdit}
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#f3f4f8',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>🎨</span> Edit Filters & Contrast
          </button>

          {/* Remove */}
          <button
            onClick={() => {
              if (confirm('Remove current profile photo?')) onRemove();
            }}
            style={{
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 51, 102, 0.2)',
              background: 'rgba(255, 51, 102, 0.08)',
              color: '#ff3366',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 51, 102, 0.16)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 51, 102, 0.08)';
            }}
          >
            <span>🗑️</span> Remove Current Photo
          </button>

          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              padding: '12px 18px',
              borderRadius: '14px',
              border: 'none',
              background: 'transparent',
              color: '#9499ab',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'color 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#9499ab')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
