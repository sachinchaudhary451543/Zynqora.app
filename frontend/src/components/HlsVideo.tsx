import React, { useEffect, useRef, useState } from 'react';

export function HlsVideo({ src, onError, className, style, controls = false }: { src: string; onError: () => void; className?: string; style?: React.CSSProperties; controls?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onErrorRef = useRef(onError);
  const [isNearViewport, setIsNearViewport] = useState(false);

  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!('IntersectionObserver' in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNearViewport) return;
    let hls: { destroy: () => void } | undefined;
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    let cancelled = false;
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      if (!Hls.isSupported()) {
        onErrorRef.current();
        return;
      }

      const instance = new Hls({ enableWorker: true });
      hls = instance;
      instance.loadSource(src);
      instance.attachMedia(videoRef.current);
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onErrorRef.current();
      });
    }).catch(() => onErrorRef.current());

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, isNearViewport]);

  return <video ref={videoRef} className={className} style={style} controls={controls} playsInline preload="none" onError={() => onErrorRef.current()} />;
}
