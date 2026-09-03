import React, { useEffect, useState } from 'react';
import { AuraSparkIcon } from './Icons';
import { getDefaultAvatar, getAvatarUrl, resolveMediaUrl } from '../api/client';

interface StoryItem {
  id: string;
  title: string;
  mediaUrl: string;
  type?: string;
  authorName?: string;
  authorAvatar?: string;
  vibe?: string;
  caption?: string;
  createdAt?: string;
  videoUrl?: string;
  thumbnail?: string;
  author?: { name?: string; username?: string; profileImage?: string; avatarUrl?: string };
}

interface StoryViewerModalProps {
  story: { groups: StoryItem[][]; groupIndex: number; storyIndex: number } | null;
  onClose: () => void;
}

export default function StoryViewerModal({ story, onClose }: StoryViewerModalProps) {
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [sparkEffect, setSparkEffect] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);

  const currentGroup = story?.groups[groupIndex] || [];
  const currentStory = currentGroup[storyIndex] || null;

  useEffect(() => {
    if (!story) return;
    setGroupIndex(story.groupIndex);
    setStoryIndex(story.storyIndex);
    setProgress(0);
    setLiked(false);
  }, [story]);

  const goNext = () => {
    if (!story) return;
    if (storyIndex < currentGroup.length - 1) {
      setStoryIndex((index) => index + 1);
    } else if (groupIndex < story.groups.length - 1) {
      setGroupIndex((index) => index + 1);
      setStoryIndex(0);
    } else {
      onClose();
      return;
    }
    setProgress(0);
  };

  const goPrevious = () => {
    if (!story) return;
    if (storyIndex > 0) {
      setStoryIndex((index) => index - 1);
    } else if (groupIndex > 0) {
      const previousGroup = story.groups[groupIndex - 1];
      setGroupIndex((index) => index - 1);
      setStoryIndex(Math.max(previousGroup.length - 1, 0));
    }
    setProgress(0);
  };

  useEffect(() => {
    if (!story || !currentStory) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          goNext();
          return 100;
        }
        return prev + 1.2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [story, groupIndex, storyIndex, currentStory]);

  if (!story || !currentStory) return null;

  const storyMediaUrl = currentStory.mediaUrl || currentStory.videoUrl || currentStory.thumbnail || '';
  const storyTitle = currentStory.title || currentStory.author?.username || 'Aura';
  const storyAuthorName = currentStory.authorName || currentStory.author?.name || storyTitle;
  const storyAvatar = currentStory.authorAvatar || currentStory.author?.profileImage || currentStory.author?.avatarUrl;

  const handleSpark = (emoji: string) => {
    setLiked(true);
    setSparkEffect(true);
    setTimeout(() => setSparkEffect(false), 1200);
  };

  const isVideo =
    currentStory.type === 'video' ||
    /\.(webm|mp4|mov|m4v)(?:[?#].*)?$/i.test(storyMediaUrl);

  const avatarSrc = getAvatarUrl({
    name: storyAuthorName,
    username: storyTitle,
    avatarUrl: storyAvatar,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 6, 14, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'zqFadeIn 0.2s ease-out forwards',
      }}
    >
      {/* Main Story Card Frame */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          height: 'min(740px, 90vh)',
          background: '#090b14',
          borderRadius: '28px',
          border: '1px solid rgba(121, 40, 202, 0.4)',
          boxShadow: '0 24px 72px rgba(0, 0, 0, 0.9), 0 0 40px rgba(121, 40, 202, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'zqZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Story Progress Bar */}
        <div style={{ position: 'absolute', top: 12, left: 14, right: 14, zIndex: 30, display: 'flex', gap: 4 }}>
          {currentGroup.map((_, index) => <div key={index} style={{ flex: 1, height: 3.5, background: 'rgba(255, 255, 255, 0.3)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${index < storyIndex ? 100 : index === storyIndex ? progress : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00dfd8, #7928ca)',
                boxShadow: '0 0 8px #00dfd8',
                transition: 'width 0.1s linear',
              }}
            />
          </div>)}
        </div>

        {/* Top Header */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 14,
            right: 14,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
            padding: '4px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                padding: 2,
                background: 'linear-gradient(45deg, #00dfd8, #7928ca)',
                boxShadow: '0 0 12px rgba(0, 223, 216, 0.5)',
              }}
            >
              <img
                src={avatarSrc}
                alt={storyTitle}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = getDefaultAvatar(storyAuthorName || storyTitle);
                }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {storyAuthorName}
              </div>
              <div style={{ fontSize: '11px', color: '#00dfd8', fontWeight: 600 }}>
                {currentStory.createdAt ? `Posted ${new Date(currentStory.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : (currentStory.vibe || '⚡ Active Aura Moment')}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
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

        {/* Story Media Viewer */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          <button aria-label="Previous story" onClick={goPrevious} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', zIndex: 20, border: 0, background: 'transparent', cursor: 'pointer' }} />
          <button aria-label="Next story" onClick={goNext} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '65%', zIndex: 20, border: 0, background: 'transparent', cursor: 'pointer' }} />
          {isVideo ? (
            <video
              src={resolveMediaUrl(storyMediaUrl)}
              autoPlay
              loop
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <img
              src={resolveMediaUrl(storyMediaUrl)}
              alt={storyTitle}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {currentStory.caption && <div style={{ position: 'absolute', left: 20, right: 20, bottom: 80, zIndex: 25, color: '#fff', textAlign: 'center', textShadow: '0 1px 4px #000' }}>{currentStory.caption}</div>}

          {/* Spark Particle Animation Effect */}
          {sparkEffect && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '64px',
                animation: 'zqZoomIn 0.3s ease-out forwards',
                pointerEvents: 'none',
              }}
            >
              ⚡
            </div>
          )}
        </div>

        {/* Bottom Reaction & Spark Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            {['⚡', '🔥', '❤️', '💡', '🚀'].map((em) => (
              <button
                key={em}
                onClick={() => handleSpark(em)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '6px 10px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {em}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSpark('⚡')}
            style={{
              padding: '8px 16px',
              borderRadius: '16px',
              border: 'none',
              background: liked ? 'linear-gradient(135deg, #00dfd8, #7928ca)' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: liked ? '0 0 16px #00dfd8' : 'none',
            }}
          >
            <AuraSparkIcon size={16} active={liked} />
            <span>{liked ? 'Sparks Sent' : 'Send Spark'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
