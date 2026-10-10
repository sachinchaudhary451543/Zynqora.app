import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getDefaultAvatar } from '../api/client';

interface AvatarActionsModalProps {
  currentAvatarUrl: string;
  currentAvatarName: string;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onEdit: () => void;
  onOpenAiStudio?: () => void;
  onGenerateAi: () => void;
  onRemove: () => void;
}

function PhotoActionIcon({ type }: { type: 'upload' | 'studio' | 'edit' | 'remove' }) {
  const paths = {
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" /></>,
    studio: <><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
    edit: <><path d="m14 5 5 5" /><path d="m4 20 4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" /><path d="M12 20h8" /></>,
    remove: <><path d="M4 7h16" /><path d="m6 7 .8 13h10.4L18 7" /><path d="M9 7V4h6v3" /><path d="M10 11v5M14 11v5" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  );
}

export default function AvatarActionsModal({
  currentAvatarUrl,
  currentAvatarName,
  onClose,
  onPickFile,
  onEdit,
  onOpenAiStudio,
  onGenerateAi,
  onRemove,
}: AvatarActionsModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="zq-avatar-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="zq-avatar-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zq-avatar-dialog-title"
        aria-describedby="zq-avatar-dialog-description"
        tabIndex={-1}
      >
        <header className="zq-avatar-dialog-header">
          <img
            className="zq-avatar-dialog-preview"
            src={currentAvatarUrl}
            alt="Current profile photo"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getDefaultAvatar(currentAvatarName);
            }}
          />
          <div className="zq-avatar-dialog-heading">
            <span className="zq-avatar-dialog-eyebrow">YOUR PROFILE</span>
            <h2 id="zq-avatar-dialog-title">Update profile photo</h2>
            <p id="zq-avatar-dialog-description">Choose a photo, refine it, or create a new look.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="zq-avatar-dialog-close"
            aria-label="Close profile photo options"
            onClick={onClose}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="zq-avatar-dialog-actions">
          <button type="button" className="zq-avatar-action" onClick={() => inputRef.current?.click()}>
            <span className="zq-avatar-action-icon zq-avatar-action-icon-upload"><PhotoActionIcon type="upload" /></span>
            <span className="zq-avatar-action-copy">
              <strong>Upload a photo</strong>
              <span>Choose an image from this device</span>
            </span>
            <span className="zq-avatar-action-arrow" aria-hidden="true">›</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            tabIndex={-1}
            aria-hidden="true"
            className="zq-avatar-file-input"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPickFile(file);
              event.currentTarget.value = '';
            }}
          />

          <button
            type="button"
            className="zq-avatar-action"
            onClick={() => {
              if (onOpenAiStudio) onOpenAiStudio();
              else onGenerateAi();
            }}
          >
            <span className="zq-avatar-action-icon zq-avatar-action-icon-studio"><PhotoActionIcon type="studio" /></span>
            <span className="zq-avatar-action-copy">
              <strong>Create with AI Studio</strong>
              <span>Remaster your portrait with a visual style</span>
            </span>
            <span className="zq-avatar-action-arrow" aria-hidden="true">›</span>
          </button>

          <button type="button" className="zq-avatar-action" onClick={onEdit}>
            <span className="zq-avatar-action-icon zq-avatar-action-icon-edit"><PhotoActionIcon type="edit" /></span>
            <span className="zq-avatar-action-copy">
              <strong>Edit photo</strong>
              <span>Crop and tune your current image</span>
            </span>
            <span className="zq-avatar-action-arrow" aria-hidden="true">›</span>
          </button>
        </div>

        <footer className="zq-avatar-dialog-footer">
          <button
            type="button"
            className="zq-avatar-remove-button"
            onClick={() => {
              if (confirm('Remove your current profile photo?')) onRemove();
            }}
          >
            <PhotoActionIcon type="remove" />
            Remove photo
          </button>
          <span className="zq-avatar-dialog-note">Your photo is used across your Zynqora profile.</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
