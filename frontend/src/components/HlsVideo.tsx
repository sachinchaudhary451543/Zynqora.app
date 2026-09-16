import React, { useEffect, useRef } from 'react';

export function HlsVideo({ src, onError, className, style, controls = false }: { src: string; onError: () => void; className?: string; style?: React.CSSProperties; controls?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
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
        onError();
        return;
      }

      const instance = new Hls({ enableWorker: true });
      hls = instance;
      instance.loadSource(src);
      instance.attachMedia(videoRef.current);
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onError();
      });
    }).catch(() => onError());

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, onError]);

  return <video ref={videoRef} className={className} style={style} controls={controls} playsInline onError={onError} />;
}
