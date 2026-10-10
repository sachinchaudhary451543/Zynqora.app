import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, getAvatarUrl, getDefaultAvatar } from '../api/client';
import { createRealtimeSocket } from '../realtime';

interface LiveCallModalProps {
  peer: User | { username: string; name?: string; avatarUrl?: string | null; profileImage?: string | null };
  callType: 'video' | 'audio';
  onEndCall: () => void;
  callId?: string;
  initiator?: boolean;
}

/* ─── Web Audio ringtone (no external file needed) ──────────── */
function createRingtone(ctx: AudioContext): () => void {
  let stopped = false;
  const play = () => {
    if (stopped) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    // Two-tone Indian-style ring: 480 Hz + 620 Hz alternating
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.setValueAtTime(620, now + 0.4);
    osc.frequency.setValueAtTime(480, now + 0.8);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.start(now);
    osc.stop(now + 0.9);
    osc.onended = () => {
      if (!stopped) setTimeout(play, 1200);
    };
  };
  play();
  return () => { stopped = true; };
}

export default function LiveCallModal({
  peer,
  callType,
  onEndCall,
  callId,
  initiator = true,
}: LiveCallModalProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    initiator ? 'ringing' : 'ringing',
  );
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const callSessionIdRef = useRef(callId || crypto.randomUUID());
  const callSessionId = callSessionIdRef.current;
  const targetUserId = (peer as User).id;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  const peerAvatar = getAvatarUrl(peer as User);

  /* ─── Ringtone: play on both caller + receiver while ringing ─ */
  useEffect(() => {
    if (callStatus !== 'ringing') return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    stopRingtoneRef.current = createRingtone(ctx);
    return () => {
      stopRingtoneRef.current?.();
      ctx.close();
    };
  }, [callStatus]);

  /* ─── Media & WebRTC (only after receiver answers) ──────────── */
  const initWebRTC = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:
          callType === 'video'
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }
            : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (localVideoRef.current && callType === 'video') localVideoRef.current.srcObject = stream;

      if (!targetUserId) throw new Error('No peer ID');
      const socket = createRealtimeSocket();
      socketRef.current = socket;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        const [rs] = e.streams;
        if (remoteVideoRef.current && rs) remoteVideoRef.current.srcObject = rs;
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('call:signal', { targetUserId, callId: callSessionId, signal: { candidate: e.candidate } });
      };
      socket.on('call:signal', async ({ signal, fromUserId }: any) => {
        if (fromUserId !== targetUserId) return;
        if (signal?.candidate) await pc.addIceCandidate(signal.candidate);
        if (signal?.description) {
          await pc.setRemoteDescription(signal.description);
          if (signal.description.type === 'offer') {
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            socket.emit('call:signal', { targetUserId, callId: callSessionId, signal: { description: ans } });
            setCallStatus('connected');
          }
        }
      });
      socket.on('call:ended', onEndCall);
      socket.on('connect', async () => {
        if (initiator) {
          socket.emit('call:invite', { targetUserId, callId: callSessionId, callType });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:signal', { targetUserId, callId: callSessionId, signal: { description: offer } });
        } else {
          socket.emit('call:join', { callId: callSessionId, targetUserId });
        }
      });
    } catch (err) {
      console.warn('Media error:', err);
    }
  }, [callType, callSessionId, targetUserId, initiator, onEndCall]);

  /* ─── Duration timer ───────────────────────────────────────── */
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const id = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [callStatus]);

  /* ─── Cleanup on unmount ────────────────────────────────────── */
  useEffect(() => {
    return () => {
      stopRingtoneRef.current?.();
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionRef.current?.close();
      socketRef.current?.emit('call:end', { targetUserId, callId: callSessionId });
      socketRef.current?.disconnect();
    };
  }, [targetUserId, callSessionId]);

  /* ─── Caller: simulate ringing → connecting ─────────────────── */
  useEffect(() => {
    if (!initiator) return;
    // Caller gets connected after a delay (or when socket says peer answered)
    const t = setTimeout(() => setCallStatus('connecting'), 30000); // 30s timeout
    return () => clearTimeout(t);
  }, [initiator]);

  /* ─── Helpers ────────────────────────────────────────────────── */
  const handleAnswer = async () => {
    stopRingtoneRef.current?.();
    setCallStatus('connecting');
    await initWebRTC();
    setTimeout(() => setCallStatus('connected'), 1500);
  };

  const handleDecline = () => {
    stopRingtoneRef.current?.();
    socketRef.current?.emit('call:end', { targetUserId, callId: callSessionId });
    onEndCall();
  };

  const handleEndCall = () => {
    stopRingtoneRef.current?.();
    socketRef.current?.emit('call:end', { targetUserId, callId: callSessionId });
    onEndCall();
  };

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted((m) => !m);
  };

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
    setIsVideoOff((v) => !v);
  };

  const triggerReaction = (emoji: string) => {
    setFloatingReaction(emoji);
    setTimeout(() => setFloatingReaction(null), 1500);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  /* ═══════════════════════════════════════════════════════
     INCOMING CALL SCREEN (receiver, ringing state)
     ═══════════════════════════════════════════════════════ */
  if (!initiator && callStatus === 'ringing') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'linear-gradient(180deg, #0a0f24 0%, #06080f 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 24px 56px 24px',
          animation: 'zqFadeIn 0.3s ease-out forwards',
        }}
      >
        {/* Status pill */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '6px 20px',
              borderRadius: '20px',
              background: 'rgba(0, 223, 216, 0.12)',
              border: '1px solid rgba(0, 223, 216, 0.4)',
              color: '#00dfd8',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Audio Call'}
          </div>
        </div>

        {/* Center avatar with pulsing rings */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Animated ring waves */}
          <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid rgba(0, 223, 216, 0.4)',
                  animation: `callRingWave ${1.4 + i * 0.4}s ease-out ${i * 0.3}s infinite`,
                }}
              />
            ))}
            {/* Avatar */}
            <div
              style={{
                width: '128px',
                height: '128px',
                borderRadius: '50%',
                border: '4px solid #00dfd8',
                overflow: 'hidden',
                boxShadow: '0 0 40px rgba(0, 223, 216, 0.4)',
                animation: 'callRingPulse 1.5s ease-in-out infinite',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <img
                src={peerAvatar}
                alt={peer.name || peer.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.onerror = null;
                  t.src = getDefaultAvatar(peer.name || peer.username);
                }}
              />
            </div>
          </div>

          {/* Caller name */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0' }}>
              {peer.name || peer.username}
            </h2>
            <div style={{ fontSize: '14px', color: '#9499ab', fontWeight: 600 }}>@{peer.username}</div>
            <div
              style={{
                marginTop: '12px',
                fontSize: '13px',
                color: '#00dfd8',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00dfd8',
                  animation: 'pulse 1s infinite',
                  display: 'inline-block',
                }}
              />
              Ringing...
            </div>
          </div>
        </div>

        {/* Answer / Decline buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '48px' }}>
          {/* Decline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDecline}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff3366, #cc0033)',
                border: 'none',
                color: '#fff',
                fontSize: '26px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(255, 51, 102, 0.5)',
                transition: 'transform 0.15s ease',
              }}
              title="Decline"
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              📵
            </button>
            <span style={{ fontSize: '12px', color: '#ff3366', fontWeight: 700 }}>Decline</span>
          </div>

          {/* Answer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleAnswer}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#fff',
                fontSize: '26px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 24px rgba(16, 185, 129, 0.5)',
                transition: 'transform 0.15s ease',
                animation: 'callRingPulse 1.4s ease-in-out infinite',
              }}
              title="Answer"
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              📞
            </button>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>Answer</span>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     CALLER DIALING SCREEN (initiator, ringing/connecting)
     ═══════════════════════════════════════════════════════ */
  if (initiator && (callStatus === 'ringing' || callStatus === 'connecting')) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'linear-gradient(180deg, #0a0f24 0%, #06080f 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '70px 24px 60px 24px',
          animation: 'zqFadeIn 0.3s ease-out forwards',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              padding: '6px 20px',
              borderRadius: '20px',
              background: 'rgba(0, 223, 216, 0.1)',
              border: '1px solid rgba(0, 223, 216, 0.35)',
              color: '#00dfd8',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1px',
              display: 'inline-block',
            }}
          >
            {callType === 'video' ? '📹 VIDEO CALL' : '🎧 AUDIO CALL'}
          </div>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(0, 223, 216, 0.3)',
                  animation: `callRingWave ${1.6 + i * 0.5}s ease-out ${i * 0.4}s infinite`,
                }}
              />
            ))}
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                border: '3px solid rgba(0, 223, 216, 0.6)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <img
                src={peerAvatar}
                alt={peer.name || peer.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.onerror = null;
                  t.src = getDefaultAvatar(peer.name || peer.username);
                }}
              />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0' }}>
              {peer.name || peer.username}
            </h2>
            <div style={{ fontSize: '13px', color: '#9499ab', fontWeight: 600, marginBottom: '12px' }}>
              @{peer.username}
            </div>
            {/* Animated dots */}
            <div style={{ fontSize: '14px', color: '#00dfd8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              {callStatus === 'ringing' ? 'Ringing' : 'Connecting'}
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: '#00dfd8',
                    animation: `pulse 1.2s ${i * 0.3}s infinite`,
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Sound wave visualizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}>
            {[10, 18, 12, 24, 16, 22, 10, 18, 14].map((h, i) => (
              <span
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  borderRadius: '3px',
                  background: 'linear-gradient(180deg, #00dfd8, #7928ca)',
                  animation: `pulse ${0.8 + i * 0.1}s ${i * 0.08}s infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>

        {/* End call (cancel) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleEndCall}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff3366, #cc0033)',
              border: 'none',
              color: '#fff',
              fontSize: '26px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 24px rgba(255, 51, 102, 0.5)',
            }}
            title="Cancel"
          >
            📵
          </button>
          <span style={{ fontSize: '12px', color: '#ff3366', fontWeight: 700 }}>Cancel</span>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     IN-CALL HUD (both sides, connected)
     ═══════════════════════════════════════════════════════ */
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(3, 5, 12, 0.95)',
        backdropFilter: 'blur(28px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'zqFadeIn 0.25s ease-out forwards',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '540px',
          height: 'min(680px, 92vh)',
          background: 'linear-gradient(180deg, #101426 0%, #080912 100%)',
          borderRadius: '32px',
          border: '1px solid rgba(0, 223, 216, 0.35)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 50px rgba(121,40,202,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="zq-pulse-orb" />
            <div>
              <div style={{ fontSize: '11px', color: '#00dfd8', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                {callType === 'video' ? '⚡ VIDEO SYNC' : '🎧 AUDIO SYNC'}
              </div>
              <div style={{ fontSize: '13px', color: '#9499ab', marginTop: '2px', fontWeight: 600 }}>
                {callStatus === 'connecting' ? 'Connecting...' : `Connected • ${formatTime(duration)}`}
              </div>
            </div>
          </div>
          <div style={{ padding: '5px 12px', borderRadius: '12px', background: 'rgba(0,223,216,0.12)', border: '1px solid rgba(0,223,216,0.3)', color: '#00dfd8', fontSize: '11px', fontWeight: 800 }}>
            E2E Encrypted
          </div>
        </div>

        {/* Main body */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Peer avatar / video */}
          {callType === 'video' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#080912' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 5 }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #00dfd8', boxShadow: '0 0 30px rgba(0,223,216,0.4)' }}>
                <img src={peerAvatar} alt={peer.name || peer.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { const t = e.target as HTMLImageElement; t.onerror = null; t.src = getDefaultAvatar(peer.name || peer.username); }} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0 }}>{peer.name || peer.username}</h2>
              <div style={{ fontSize: '13px', color: '#00dfd8', fontWeight: 600 }}>@{peer.username}</div>
              {/* Audio wave */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px', marginTop: '8px' }}>
                {[14, 22, 10, 26, 18, 12, 24, 16, 20].map((h, i) => (
                  <span key={i} style={{ width: '3.5px', height: `${callStatus === 'connected' ? h : 4}px`, borderRadius: '3px', background: 'linear-gradient(180deg, #00dfd8, #7928ca)', transition: 'height 0.3s ease' }} />
                ))}
              </div>
            </div>
          )}

          {/* Self PiP for video */}
          {callType === 'video' && (
            <div style={{ position: 'absolute', bottom: '16px', right: '16px', width: '100px', height: '140px', borderRadius: '16px', overflow: 'hidden', background: '#161a2e', border: '2px solid rgba(0,223,216,0.5)', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', zIndex: 20 }}>
              {!isVideoOff ? (
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '10px', textAlign: 'center' }}>Camera Off</div>
              )}
              <div style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '9px', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '1px 5px', borderRadius: '6px' }}>You</div>
            </div>
          )}

          {/* Reaction float */}
          {floatingReaction && (
            <div style={{ position: 'absolute', top: '28%', fontSize: '58px', animation: 'zqZoomIn 0.3s ease-out forwards', zIndex: 30 }}>
              {floatingReaction}
            </div>
          )}
        </div>

        {/* Reaction bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '6px 16px', zIndex: 10 }}>
          {['⚡', '🔥', '👏', '❤️', '🚀'].map((em) => (
            <button key={em} type="button" onClick={() => triggerReaction(em)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '6px 10px', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.15s ease' }} onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.2)')} onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}>
              {em}
            </button>
          ))}
        </div>

        {/* Bottom controls */}
        <div style={{ padding: '16px 24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)', zIndex: 10 }}>
          {/* Mute */}
          <button type="button" onClick={toggleMute} style={{ width: '50px', height: '50px', borderRadius: '50%', background: isMuted ? 'rgba(255,51,102,0.25)' : 'rgba(255,255,255,0.1)', border: isMuted ? '1px solid #ff3366' : '1px solid rgba(255,255,255,0.2)', color: isMuted ? '#ff3366' : '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? '🔇' : '🎤'}
          </button>

          {/* Camera toggle */}
          {callType === 'video' && (
            <button type="button" onClick={toggleVideo} style={{ width: '50px', height: '50px', borderRadius: '50%', background: isVideoOff ? 'rgba(255,51,102,0.25)' : 'rgba(255,255,255,0.1)', border: isVideoOff ? '1px solid #ff3366' : '1px solid rgba(255,255,255,0.2)', color: isVideoOff ? '#ff3366' : '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }} title={isVideoOff ? 'Camera On' : 'Camera Off'}>
              {isVideoOff ? '🚫' : '📹'}
            </button>
          )}

          {/* Speaker toggle */}
          <button type="button" onClick={() => setIsSpeakerOn((s) => !s)} style={{ width: '50px', height: '50px', borderRadius: '50%', background: isSpeakerOn ? 'rgba(0,223,216,0.2)' : 'rgba(255,255,255,0.1)', border: isSpeakerOn ? '1px solid #00dfd8' : '1px solid rgba(255,255,255,0.2)', color: isSpeakerOn ? '#00dfd8' : '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }} title="Speaker">
            {isSpeakerOn ? '🔊' : '🔈'}
          </button>

          {/* End call */}
          <button type="button" onClick={handleEndCall} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff3366, #cc0033)', border: '2px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(255,51,102,0.6)', transition: 'transform 0.2s ease' }} title="End Call" onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')} onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}>
            📵
          </button>
        </div>
      </div>
    </div>
  );
}
