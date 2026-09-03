import React, { useState, useEffect, useRef } from 'react';
import { User, getAvatarUrl, getDefaultAvatar } from '../api/client';
import { AuraSparkIcon } from './Icons';
import { createRealtimeSocket } from '../realtime';

interface LiveCallModalProps {
  peer: User | { username: string; name?: string; avatarUrl?: string | null; profileImage?: string | null };
  callType: 'video' | 'audio';
  onEndCall: () => void;
  callId?: string;
  initiator?: boolean;
}

export default function LiveCallModal({ peer, callType, onEndCall, callId, initiator = true }: LiveCallModalProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callSessionIdRef = useRef(callId || crypto.randomUUID());
  const callSessionId = callSessionIdRef.current;
  const targetUserId = (peer as User).id;

  // Initialize camera / mic stream
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video' ? { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 24, max: 30 } } : false,
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        if (!targetUserId) throw new Error('The selected user cannot receive calls');
        const socket = createRealtimeSocket();
        socketRef.current = socket;
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnectionRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) socket.emit('call:signal', { targetUserId, callId: callSessionId, signal: { candidate: event.candidate } });
        };
        socket.on('call:signal', async ({ signal, fromUserId }) => {
          if (fromUserId !== targetUserId) return;
          if (signal?.candidate) await pc.addIceCandidate(signal.candidate);
          if (signal?.description) {
            await pc.setRemoteDescription(signal.description);
            if (signal.description.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('call:signal', { targetUserId, callId: callSessionId, signal: { description: answer } });
              setCallStatus('connected');
            }
          }
        });
        socket.on('call:ended', onEndCall);
        socket.on('connect', async () => {
          if (!initiator) socket.emit('call:join', { callId: callSessionId, targetUserId });
          if (initiator) socket.emit('call:invite', { targetUserId, callId: callSessionId, callType });
          if (initiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('call:signal', { targetUserId, callId: callSessionId, signal: { description: offer } });
          }
        });
      } catch (err) {
        console.warn('Could not access media devices:', err);
        setCallStatus('ended');
      }
    }

    initMedia();

    // Simulate connecting transition to connected
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 2000);

    return () => {
      active = false;
      clearTimeout(connectTimer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnectionRef.current?.close();
      socketRef.current?.emit('call:end', { targetUserId, callId: callSessionId });
      socketRef.current?.disconnect();
    };
  }, [callType, callId, initiator, targetUserId, onEndCall]);

  // Duration timer
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // Toggle Mic
  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  // Send Live Reaction Spark
  const triggerReaction = (emoji: string) => {
    setFloatingReaction(emoji);
    setTimeout(() => setFloatingReaction(null), 1500);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const peerAvatar = getAvatarUrl(peer as User);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(3, 5, 12, 0.94)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
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
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(121, 40, 202, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top Call Info Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="zq-pulse-orb" />
            <div>
              <div style={{ fontSize: '11px', color: '#00dfd8', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                {callType === 'video' ? '⚡ QUANTUM VIDEO SYNC' : '🎧 ENCRYPTED AUDIO SYNC'}
              </div>
              <div style={{ fontSize: '13px', color: '#9499ab', marginTop: '2px', fontWeight: 600 }}>
                {callStatus === 'connecting' ? 'Connecting Direct Link...' : `Direct Encrypted • ${formatTime(duration)}`}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '12px',
              background: 'rgba(0, 223, 216, 0.12)',
              border: '1px solid rgba(0, 223, 216, 0.3)',
              color: '#00dfd8',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            HD 1080P
          </div>
        </div>

        {/* Center Main Screen (Peer View or Audio Visualizer) */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Peer Card & Audio Visualizer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
            }}
          >
            {/* Animated Pulsing Halo */}
            <div
              style={{
                position: 'relative',
                width: '130px',
                height: '130px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #00dfd8, #7928ca, #ff0080)',
                  opacity: callStatus === 'connected' ? 0.85 : 0.4,
                  boxShadow: '0 0 35px rgba(0, 223, 216, 0.6)',
                  animation: 'spin 8s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: '118px',
                  height: '118px',
                  borderRadius: '50%',
                  background: '#080912',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={peerAvatar}
                  alt={peer.name || peer.username}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = getDefaultAvatar(peer.name || peer.username);
                  }}
                />
              </div>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 0 4px 0', letterSpacing: '0.4px' }}>
              {peer.name || peer.username}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--zq-accent-cyan)', fontWeight: 600 }}>
              @{peer.username}
            </div>

            {/* Audio Wave Visualizer Simulation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '24px', marginTop: '16px' }}>
              {[14, 22, 10, 26, 18, 12, 24, 16, 20].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: '3.5px',
                    height: `${callStatus === 'connected' ? h : 4}px`,
                    borderRadius: '3px',
                    background: 'linear-gradient(180deg, #00dfd8, #7928ca)',
                    boxShadow: '0 0 6px #00dfd8',
                    transition: 'height 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Floating Self Camera PiP (Picture-in-Picture) for Video Mode */}
          {callType === 'video' && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                width: '110px',
                height: '150px',
                borderRadius: '18px',
                overflow: 'hidden',
                background: '#161a2e',
                border: '2px solid rgba(0, 223, 216, 0.5)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                zIndex: 20,
              }}
            >
              {!isVideoOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // mirror self view
                  }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '11px', textAlign: 'center', padding: '6px' }}>
                  Camera Off
                </div>
              )}
              <video ref={remoteVideoRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#080912' }} />
              <div style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '9px', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '1px 5px', borderRadius: '6px' }}>
                You
              </div>
            </div>
          )}

          {/* Floating Reaction Spark Animation */}
          {floatingReaction && (
            <div
              style={{
                position: 'absolute',
                top: '30%',
                fontSize: '60px',
                animation: 'zqZoomIn 0.3s ease-out forwards',
                zIndex: 30,
              }}
            >
              {floatingReaction}
            </div>
          )}
        </div>

        {/* Live Reaction Spark Emojis Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px 16px', zIndex: 10 }}>
          {['⚡', '🔥', '👏', '❤️', '🚀'].map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => triggerReaction(em)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '6px 10px',
                fontSize: '16px',
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

        {/* Bottom Call HUD Action Controls */}
        <div
          style={{
            padding: '20px 24px 28px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.85) 0%, transparent 100%)',
            zIndex: 10,
          }}
        >
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={toggleMute}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: isMuted ? 'rgba(255, 51, 102, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              border: isMuted ? '1px solid #ff3366' : '1px solid rgba(255, 255, 255, 0.2)',
              color: isMuted ? '#ff3366' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          {/* Toggle Camera Button (For Video Mode) */}
          {callType === 'video' && (
            <button
              type="button"
              onClick={toggleVideo}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: isVideoOff ? 'rgba(255, 51, 102, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: isVideoOff ? '1px solid #ff3366' : '1px solid rgba(255, 255, 255, 0.2)',
                color: isVideoOff ? '#ff3366' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? '🚫' : '📹'}
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={onEndCall}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff3366 0%, #cc0033 100%)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(255, 51, 102, 0.6)',
              transition: 'transform 0.2s ease',
            }}
            title="End Call"
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
}
