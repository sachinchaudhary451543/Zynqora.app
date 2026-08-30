import React, { useEffect, useState } from 'react';

interface StoryItem {
  id: string;
  title: string;
  mediaUrl: string;
  type?: string;
  authorName?: string;
  authorAvatar?: string;
}

interface StoryViewerModalProps {
  story: StoryItem | null;
  onClose: () => void;
}

export default function StoryViewerModal({ story, onClose }: StoryViewerModalProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 1.6;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [story]);

  if (!story) return null;

  return (
    <div className="ig-story-viewer-modal" onClick={onClose}>
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '28px',
          cursor: 'pointer',
          zIndex: 300,
        }}
      >
        ✕
      </button>

      <div className="ig-story-viewer-frame" onClick={(e) => e.stopPropagation()}>
        {/* Progress bar */}
        <div className="ig-story-progress-bar">
          <div className="ig-story-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className="ig-story-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={story.authorAvatar || '/placeholder-avatar.png'}
              alt={story.title}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #fff' }}
            />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{story.authorName || story.title}</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Media content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          {story.type === 'video' || story.mediaUrl.endsWith('.webm') || story.mediaUrl.endsWith('.mp4') ? (
            <video src={story.mediaUrl} autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <img src={story.mediaUrl} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      </div>
    </div>
  );
}
