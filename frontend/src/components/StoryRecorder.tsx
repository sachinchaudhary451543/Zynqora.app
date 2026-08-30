import React, { useRef, useState } from 'react';
import { api } from '../api/client';

export default function StoryRecorder({ onSaved }: { onSaved?: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });
      mediaRecorderRef.current = mr;
      const localChunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(localChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setChunks([blob]);
        const tracks = (videoRef.current?.srcObject as MediaStream)?.getTracks() || [];
        tracks.forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setTimeout(() => stop(), 12000);
    } catch (err) {
      console.error('Camera access failed', err);
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const upload = async () => {
    if (!chunks.length) return;
    setUploading(true);
    try {
      const blob = chunks[0];
      const file = new File([blob], `story-${Date.now()}.webm`, { type: 'video/webm' });
      const presign = await api.presignUpload(file.name, file.type);
      let publicUrl = presign.publicUrl;
      if (presign.method === 'PUT') {
        await fetch(presign.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      } else {
        const res = await api.uploadLocal(file);
        publicUrl = res.publicUrl;
      }

      const outKey = `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const proc = await api.processMedia({ inputUrl: publicUrl, outputKey: outKey, trimStart: trimStart || 0, trimEnd: trimEnd ?? undefined, type: 'video' });
      const finalUrl = proc?.publicUrl || proc?.processedPath || publicUrl;
      await api.createStory({ videoUrl: finalUrl });
      setPreviewUrl(null);
      setChunks([]);
      setTrimStart(0);
      setTrimEnd(null);
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Story upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '16px', background: 'var(--ig-secondary-background)', borderRadius: '12px' }}>
      <video ref={videoRef} width={300} height={200} autoPlay muted style={{ background: '#000', borderRadius: '8px', display: 'block' }} />
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {!recording && (
          <button className="ig-btn-primary" onClick={start}>
            Record Story (max 12s)
          </button>
        )}
        {recording && (
          <button className="ig-btn-secondary" style={{ color: 'var(--ig-destructive)' }} onClick={stop}>
            Stop Recording
          </button>
        )}
      </div>

      {previewUrl && (
        <div style={{ marginTop: '14px' }}>
          <video src={previewUrl} controls width={300} height={200} style={{ display: 'block', borderRadius: '8px' }} />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button className="ig-btn-primary" onClick={upload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Story'}
            </button>
            <button className="ig-btn-secondary" onClick={() => { setPreviewUrl(null); setChunks([]); }}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
