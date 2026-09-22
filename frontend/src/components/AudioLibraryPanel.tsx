import React, { useEffect, useMemo, useRef, useState } from 'react';

interface AudioTrack {
  id: string;
  title: string;
  creator: string;
  category: 'Trending' | 'Dialogue' | 'Speech' | 'Original';
  url: string;
  color: string;
}

const featuredTracks: AudioTrack[] = [
  { id: 'pulse-01', title: 'Midnight Pulse', creator: 'Zynqora Sounds', category: 'Trending', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', color: '#67e8f9' },
  { id: 'golden-hour', title: 'Golden Hour', creator: 'Zynqora Sounds', category: 'Trending', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', color: '#fbbf24' },
  { id: 'spoken-word', title: 'Spoken Word', creator: 'Community audio', category: 'Speech', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', color: '#fb7185' },
  { id: 'dialogue-01', title: 'The Opening Line', creator: 'Dialogue cuts', category: 'Dialogue', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', color: '#f97316' },
  { id: 'dialogue-02', title: 'Late Night Talk', creator: 'Dialogue cuts', category: 'Dialogue', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', color: '#f472b6' },
  { id: 'speech-01', title: 'Rise & Create', creator: 'Speech library', category: 'Speech', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', color: '#4ade80' },
  { id: 'speech-02', title: 'Keep Going', creator: 'Speech library', category: 'Speech', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', color: '#22d3ee' },
  { id: 'original-01', title: 'Soft Focus', creator: 'Zynqora Originals', category: 'Original', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', color: '#c084fc' },
  { id: 'original-02', title: 'Afterglow', creator: 'Zynqora Originals', category: 'Original', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', color: '#818cf8' },
  { id: 'trend-03', title: 'City Lights', creator: 'Featured creators', category: 'Trending', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', color: '#facc15' },
  { id: 'trend-04', title: 'Weekend Motion', creator: 'Featured creators', category: 'Trending', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', color: '#fb7185' },
  { id: 'voice-note', title: 'Your voice / song', creator: 'Upload your own', category: 'Original', url: '', color: '#a78bfa' },
];

export default function AudioLibraryPanel({
  selectedUrl,
  onSelect,
  onClose,
}: {
  selectedUrl: string;
  onSelect: (url: string, label: string, file?: File) => void;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<AudioTrack['category'] | 'All'>('All');
  const [search, setSearch] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const visibleTracks = useMemo(() => featuredTracks.filter((track) => {
    const matchesCategory = activeCategory === 'All' || track.category === activeCategory;
    const query = search.trim().toLowerCase();
    return matchesCategory && (!query || `${track.title} ${track.creator}`.toLowerCase().includes(query));
  }), [activeCategory, search]);

  useEffect(() => () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
  }, [localPreviewUrl]);

  return (
    <div className="zq-audio-library" role="dialog" aria-label="Audio library">
      <div className="zq-audio-library-head">
        <div>
          <div className="zq-section-label">Sound library</div>
          <h3>Give this moment a voice</h3>
          <p>Choose a featured sound or add your own song, dialogue, speech, or voice note.</p>
        </div>
        <button type="button" className="zq-library-close" onClick={onClose} aria-label="Close audio library">×</button>
      </div>

      <div className="zq-audio-library-tools">
        <input className="zq-settings-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sounds" />
        <button type="button" className="zq-btn-aura zq-library-upload" onClick={() => fileRef.current?.click()}>Add your audio</button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
            setLocalFile(file);
            setLocalPreviewUrl(URL.createObjectURL(file));
          }}
        />
      </div>

      {localFile && localPreviewUrl && (
        <div className="zq-local-audio-preview">
          <div><strong>{localFile.name}</strong><span>Preview your audio before adding it</span></div>
          <audio controls autoPlay src={localPreviewUrl} />
          <button type="button" className="zq-audio-use-btn" onClick={() => { onSelect('', localFile.name, localFile); onClose(); }}>Use this audio</button>
        </div>
      )}

      <div className="zq-audio-category-row">
        {(['All', 'Trending', 'Dialogue', 'Speech', 'Original'] as const).map((category) => (
          <button key={category} type="button" className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>
        ))}
      </div>

      <div className="zq-audio-track-list">
        {visibleTracks.map((track) => (
          <div className={`zq-audio-track ${selectedUrl === track.url && track.url ? 'selected' : ''}`} key={track.id}>
            <span className="zq-audio-track-art" style={{ background: `linear-gradient(135deg, ${track.color}, #111827)` }}>♪</span>
            <div className="zq-audio-track-copy">
              <strong>{track.title}</strong>
              <span>{track.creator} · {track.category}</span>
            </div>
              {track.url && (
                <audio
                  ref={(element) => { audioRefs.current[track.id] = element; }}
                  className="zq-audio-track-player"
                  controls
                  preload="none"
                  src={track.url}
                  onPlay={() => {
                    Object.entries(audioRefs.current).forEach(([id, audio]) => {
                      if (id !== track.id && audio) audio.pause();
                    });
                    setPreviewingId(track.id);
                  }}
                  onPause={() => setPreviewingId((current) => current === track.id ? null : current)}
                />
              )}
            <button
              type="button"
              className="zq-audio-use-btn"
              disabled={!track.url}
              onClick={() => { onSelect(track.url, track.title); onClose(); }}
            >
              {track.url ? (selectedUrl === track.url ? 'Added' : previewingId === track.id ? 'Use now' : 'Use') : 'Preview above'}
            </button>
          </div>
        ))}
      </div>

      <div className="zq-audio-library-note">Featured audio uses demo-safe tracks. Your uploaded audio stays available for this post and can be replaced anytime.</div>
    </div>
  );
}
