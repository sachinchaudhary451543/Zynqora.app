import { useEffect, useRef, useState } from 'react';
import { createRealtimeSocket } from '../realtime';
import { api } from '../api/client';

type LiveRoom = { broadcasterId: string; title: string; startedAt: string };
const filters: Record<string, string> = { Original: 'none', Vivid: 'saturate(1.7) contrast(1.12)', Cool: 'hue-rotate(28deg) saturate(1.25)', Warm: 'sepia(.28) saturate(1.45)', Mono: 'grayscale(1) contrast(1.2)', Dream: 'brightness(1.1) saturate(1.4) blur(.3px)' };

export default function LiveStreamModal({ room, broadcaster, onClose }: { room: LiveRoom; broadcaster: boolean; onClose: () => void }) {
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const localStream = useRef<MediaStream | null>(null);
  const recording = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Original');
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const socket = createRealtimeSocket(); socketRef.current = socket;
    const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const send = (targetUserId: string, signal: unknown) => socket.emit('live:signal', { targetUserId, signal });
    const start = async () => {
      try {
        if (broadcaster) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 24, max: 30 } }, audio: { echoCancellation: true, noiseSuppression: true } });
          localStream.current = stream; if (videoRef.current) videoRef.current.srcObject = stream;
          if ('MediaRecorder' in window) { const recorder = new MediaRecorder(stream); recording.current = recorder; recorder.ondataavailable = (event) => event.data.size && chunks.current.push(event.data); recorder.start(1000); }
          socket.emit('live:start', { title: room.title });
        } else socket.emit('live:join', { broadcasterId: room.broadcasterId });
      } catch { setError('Camera or microphone permission is required.'); }
    };
    socket.on('live:viewer-joined', async ({ viewerId }: { viewerId: string }) => {
      if (!broadcaster || !localStream.current) return;
      const pc = new RTCPeerConnection(rtcConfig); peers.current.set(viewerId, pc); localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current!));
      pc.onicecandidate = (event) => event.candidate && send(viewerId, { candidate: event.candidate });
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer); send(viewerId, { description: offer });
    });
    socket.on('live:signal', async ({ fromUserId, signal }: { fromUserId: string; signal: any }) => {
      let pc = peers.current.get(fromUserId);
      if (!pc) { pc = new RTCPeerConnection(rtcConfig); peers.current.set(fromUserId, pc); pc.ontrack = (event) => { if (videoRef.current) videoRef.current.srcObject = event.streams[0]; }; pc.onicecandidate = (event) => event.candidate && send(fromUserId, { candidate: event.candidate }); }
      if (signal.candidate) await pc.addIceCandidate(signal.candidate);
      if (signal.description) { await pc.setRemoteDescription(signal.description); if (signal.description.type === 'offer') { const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); send(fromUserId, { description: answer }); } }
    });
    start();
    return () => { socket.emit('live:stop'); if (recording.current?.state === 'recording') recording.current.stop(); localStream.current?.getTracks().forEach((track) => track.stop()); peers.current.forEach((pc) => pc.close()); socket.disconnect(); };
  }, [broadcaster, room.broadcasterId, room.title]);

  const endStream = () => { if (!broadcaster) return onClose(); if (recording.current?.state === 'recording') recording.current.stop(); localStream.current?.getTracks().forEach((track) => track.stop()); socketRef.current?.emit('live:stop'); setEnded(true); };
  const publish = async () => { setSaving(true); try { const blob = new Blob(chunks.current, { type: 'video/webm' }); const file = new File([blob], `live-sync-${Date.now()}.webm`, { type: 'video/webm' }); const upload = await api.uploadLocal(file); await api.createPost({ content: room.title, mediaUrl: upload.publicUrl, mediaType: 'video', visibility: 'FOLLOWERS' }); onClose(); } catch (err: any) { setError(err.message || 'Could not publish recording'); } finally { setSaving(false); } };

  return <div className="zq-modal-overlay" style={{ background: 'rgba(2,4,12,.94)', backdropFilter: 'blur(18px)', padding: 12 }}><div className="zq-modal-box" style={{ width: 'min(760px, 100%)', padding: 0, overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(0,223,216,.35)', boxShadow: '0 25px 90px rgba(0,0,0,.65)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'linear-gradient(90deg, rgba(121,40,202,.28), rgba(0,223,216,.12))' }}><div><div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{ended ? 'Stream finished' : room.title}</div><div style={{ color: ended ? '#aeb5c8' : '#ff6688', fontSize: 11, fontWeight: 700, marginTop: 3 }}>{ended ? 'Your live session is saved locally' : broadcaster ? '● LIVE NOW · Only you can see these controls' : '● LIVE NOW · Watching live'}</div></div><button type="button" className="zq-modal-close-btn" onClick={onClose}>×</button></div>{!ended && broadcaster && <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 18px', background: '#0c1020' }}>{Object.keys(filters).map((name) => <button type="button" key={name} onClick={() => setFilter(name)} style={{ border: `1px solid ${filter === name ? '#00dfd8' : 'rgba(255,255,255,.14)'}`, background: filter === name ? 'rgba(0,223,216,.16)' : 'rgba(255,255,255,.05)', color: filter === name ? '#00dfd8' : '#cbd2e6', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</button>)}</div>}<div style={{ position: 'relative', background: '#020308', minHeight: 'min(65vh, 540px)', display: 'grid', placeItems: 'center' }}><video ref={videoRef} autoPlay playsInline muted={broadcaster} controls={!broadcaster} style={{ width: '100%', height: '100%', maxHeight: 540, objectFit: 'contain', filter: filters[filter] }} />{error && <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: 'rgba(80,12,35,.9)', color: '#ff9ab2', padding: 12, borderRadius: 12, textAlign: 'center', fontSize: 13 }}>{error}</div>}</div>{ended && broadcaster ? <div style={{ padding: 24, textAlign: 'center', background: '#0c1020' }}><div style={{ fontSize: 30, marginBottom: 8 }}>✨</div><h3 style={{ color: '#fff', margin: 0 }}>What would you like to do?</h3><p style={{ color: '#9da6bd', fontSize: 13, margin: '8px 0 20px' }}>Keep a replay in your permanent collection or remove it forever.</p><div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}><button type="button" className="zq-btn-aura" disabled={saving} onClick={publish}>{saving ? 'Publishing…' : 'Post to collection'}</button><button type="button" className="zq-btn-glass" disabled={saving} onClick={onClose} style={{ color: '#ff8da6', borderColor: 'rgba(255,51,102,.45)' }}>Delete permanently</button></div></div> : <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#0c1020' }}><span style={{ color: '#8d97b0', fontSize: 12 }}>{broadcaster ? 'Your camera and microphone are live' : 'Live stream connection active'}</span><button type="button" className="zq-btn-glass" onClick={endStream} style={{ color: '#ff8da6', borderColor: 'rgba(255,51,102,.45)' }}>{broadcaster ? 'End stream' : 'Leave stream'}</button></div>}</div></div>;
}
