import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, User, getAvatarUrl, getDefaultAvatar } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MessagesIcon, SearchIcon } from '../components/Icons';
import LiveCallModal from '../components/LiveCallModal';
import { createRealtimeSocket } from '../realtime';

export default function ChatPage() {
  const { username } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeUsername, setActiveUsername] = useState<string | null>(username || null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [conversations, setConversations] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [activeCall, setActiveCall] = useState<{ peer: any; type: 'video' | 'audio'; callId?: string; initiator?: boolean } | null>(null);
  const [callHistory, setCallHistory] = useState<Array<{ type: string; direction: string; status: string; at: string }>>([]);
  const [chatNotice, setChatNotice] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recordCall = (entry: { type: string; direction: string; status: string }) => {
    const key = `call-history:${user?.id || 'user'}:${activeUsername || 'unknown'}`;
    const next = [{ ...entry, at: new Date().toISOString() }, ...callHistory].slice(0, 30);
    setCallHistory(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  useEffect(() => {
    const key = `call-history:${user?.id || 'user'}:${activeUsername || 'unknown'}`;
    try { setCallHistory(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setCallHistory([]); }
  }, [activeUsername, user?.id]);

  useEffect(() => {
    const socket = createRealtimeSocket();
    socket.on('presence:online', ({ userId }: { userId: string }) => setOnlineUsers((current) => new Set(current).add(userId)));
    socket.on('presence:offline', ({ userId }: { userId: string }) => setOnlineUsers((current) => { const next = new Set(current); next.delete(userId); return next; }));
    socket.on('call:incoming', (call: { fromUserId: string; callId: string; callType: 'audio' | 'video' }) => {
      const accepted = window.confirm(`Incoming ${call.callType} call. Accept?`);
      if (accepted) {
        recordCall({ type: call.callType, direction: 'Incoming', status: 'Accepted' });
        setActiveCall({
          peer: { id: call.fromUserId, username: 'Zynqora caller', name: 'Zynqora caller' },
          type: call.callType,
          callId: call.callId,
          initiator: false,
        });
      } else {
        recordCall({ type: call.callType, direction: 'Incoming', status: 'Missed' });
        socket.emit('call:end', { targetUserId: call.fromUserId, callId: call.callId });
      }
    });
    return () => { socket.disconnect(); };
  }, [activeUsername, user?.id]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    api.getSuggestions()
      .then((data) => {
        setConversations(data);
        if (!username && data.length > 0 && !isMobile) {
          setActiveUsername(data[0].username);
        }
      })
      .catch(() => {});
  }, [isMobile]);

  useEffect(() => {
    if (username) {
      setActiveUsername(username);
    }
  }, [username]);

  useEffect(() => {
    if (!activeUsername) return;

    api.getProfile(activeUsername)
      .then((u) => setActiveUser(u))
      .catch(() => {});

    const initConv = async () => {
      setLoading(true);
      setChatNotice('');
      try {
        const c = await api.createConversation(activeUsername);
        setConv(c);
        const ms = await api.getMessages(c.id);
        setMessages(ms || []);
      } catch (err) {
        console.error('Failed to init conversation', err);
        const message = err instanceof Error ? err.message : 'This user has not followed you back yet. Chat is unavailable.';
        setChatNotice(message.includes('mutual') || message.includes('followed you back') ? 'This user has not followed you back yet. You cannot send messages until you both follow each other.' : message);
        setConv(null);
      } finally {
        setLoading(false);
      }
    };

    initConv();
  }, [activeUsername]);

  useEffect(() => {
    if (!conv?.id) return;
    const interval = setInterval(async () => {
      try {
        const ms = await api.getMessages(conv.id);
        setMessages(ms || []);
      } catch (err) {
        // ignore polling error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const content = (customText || text).trim();
    if (!conv?.id || !content) return;

    if (!customText) setText('');
    try {
      await api.postMessage(conv.id, content);
      const ms = await api.getMessages(conv.id);
      setMessages(ms || []);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAvatar = getAvatarUrl(activeUser);

  // Responsive display rules
  const showSidebar = !isMobile || !activeUsername;
  const showChatArea = !isMobile || !!activeUsername;

  return (
    <div
      className="zq-chat-page-wrap zq-chat-shell"
      style={{
        display: 'flex',
        maxWidth: '1150px',
        margin: '20px auto 40px auto',
        height: isMobile ? 'calc(100vh - 122px)' : 'calc(100vh - 80px)',
        border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: isMobile ? '0' : '28px',
        background: 'linear-gradient(180deg, rgba(18, 22, 36, 0.85) 0%, rgba(10, 12, 20, 0.95) 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        overflow: 'hidden',
        width: '100%',
        boxShadow: isMobile ? 'none' : '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(121, 40, 202, 0.15)',
      }}
    >
      {/* 1. Left Conversations Sidebar */}
      {showSidebar && (
        <div
          className="zq-chat-sidebar-panel"
          style={{
            width: isMobile ? '100%' : '340px',
            borderRight: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(5, 7, 14, 0.4)',
          }}
        >
          {/* Header & Search */}
          <div style={{ padding: '16px 18px 12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="zq-pulse-orb" />
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '0.5px' }}>
                  DIRECT SYNCS
                </span>
              </div>
              <span style={{ fontSize: '10.5px', background: 'rgba(0, 223, 216, 0.15)', color: '#00dfd8', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>
                LIVE
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', display: 'flex' }}>
                <SearchIcon size={14} />
              </span>
              <input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* User Conversation List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8892b0', fontSize: '13px' }}>
                No connections found
              </div>
            ) : (
              filteredConversations.map((cUser) => {
                const isSelected = cUser.username === activeUsername;
                const avatar = getAvatarUrl(cUser);

                return (
                  <div
                    key={cUser.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(121, 40, 202, 0.25) 0%, rgba(0, 223, 216, 0.08) 100%)'
                        : 'transparent',
                      border: isSelected ? '1px solid rgba(121, 40, 202, 0.4)' : '1px solid transparent',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => {
                      setActiveUsername(cUser.username);
                      navigate(`/chat/${cUser.username}`);
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        padding: 2,
                        borderRadius: '50%',
                        background: isSelected
                          ? 'linear-gradient(45deg, #00dfd8, #7928ca)'
                          : 'rgba(255, 255, 255, 0.1)',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={avatar}
                        alt={cUser.name}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = getDefaultAvatar(cUser.name || cUser.username);
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#00dfd8',
                          border: '2px solid #0c0e18',
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="zq-chat-user-name" style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cUser.name}
                        </span>
                      </div>
                      <div className="zq-chat-user-handle" style={{ fontSize: '12px', marginTop: '2px' }}>
                        @{cUser.username}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. Right Chat Area */}
      {showChatArea && (
        <div className="zq-chat-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: isMobile ? '100%' : 'auto' }}>
          {activeUsername ? (
            <>
              {/* Top Chat Header with Mobile Back button */}
              <div
                className="zq-chat-header"
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Mobile Back Button */}
                  {isMobile && (
                    <button
                      onClick={() => {
                        setActiveUsername(null);
                        navigate('/chat');
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '6px 10px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      ←
                    </button>
                  )}

                  <div
                    style={{
                      padding: 2,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #00dfd8, #7928ca)',
                    }}
                  >
                    <img
                      src={activeAvatar}
                      alt={activeUser?.name || activeUsername}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = getDefaultAvatar(activeUser?.name || activeUsername || '');
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {activeUser?.name || activeUsername}
                      <span style={{ fontSize: '11px', color: '#00dfd8' }}>⚡</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#00dfd8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeUser?.id && onlineUsers.has(activeUser.id) ? '#00dfd8' : '#6b7280', display: 'inline-block' }} />
                      <span>Synced • @{activeUsername}</span>
                    </div>
                  </div>
                </div>

                {/* Call & Profile Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Audio Call Button */}
                  <button
                    type="button"
                    onClick={() => { recordCall({ type: 'audio', direction: 'Outgoing', status: 'Calling' }); setActiveCall({ peer: activeUser || { username: activeUsername }, type: 'audio' }); }}
                    title="Start Audio Call"
                    style={{
                      padding: '7px 11px',
                      borderRadius: '12px',
                      background: 'rgba(0, 223, 216, 0.12)',
                      border: '1px solid rgba(0, 223, 216, 0.3)',
                      color: '#00dfd8',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 700,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>📞</span>
                    <span style={{ fontSize: '11px' }}>Call</span>
                  </button>

                  {/* Video Call Button */}
                  <button
                    type="button"
                    onClick={() => { recordCall({ type: 'video', direction: 'Outgoing', status: 'Calling' }); setActiveCall({ peer: activeUser || { username: activeUsername }, type: 'video' }); }}
                    title="Start Video Call"
                    style={{
                      padding: '7px 11px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(121, 40, 202, 0.25), rgba(255, 0, 128, 0.25))',
                      border: '1px solid rgba(121, 40, 202, 0.45)',
                      color: '#ff0080',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 700,
                      boxShadow: '0 2px 10px rgba(121, 40, 202, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>📹</span>
                    <span style={{ fontSize: '11px' }}>Video</span>
                  </button>

                  {/* View Profile Action */}
                  <Link to={`/profile/${activeUsername}`}>
                    <button
                      style={{
                        padding: '7px 12px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ccd6f6',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Profile ↗
                    </button>
                  </Link>
                </div>
              </div>

              {chatNotice && <div style={{ margin: '10px 16px 0', padding: '11px 14px', borderRadius: 12, color: '#ffd1dc', background: 'rgba(255,51,102,.12)', border: '1px solid rgba(255,51,102,.3)', fontSize: 12 }}>{chatNotice}</div>}
              {conv?.status === 'PENDING' && conv.requesterId !== user?.id && <div style={{ margin: '10px 16px 0', padding: 12, borderRadius: 12, color: '#e9e7ff', background: 'rgba(121,40,202,.16)', border: '1px solid rgba(121,40,202,.35)', fontSize: 12 }}>Message request received. Review it before continuing.<div style={{ marginTop: 8, display: 'flex', gap: 8 }}><button type="button" className="zq-btn-aura" onClick={async () => setConv(await api.updateChatRequest(conv.id, 'ACCEPTED'))}>Accept</button><button type="button" className="zq-btn-glass" onClick={async () => setConv(await api.updateChatRequest(conv.id, 'REJECTED'))}>Reject</button></div></div>}
              {conv?.status === 'PENDING' && conv.requesterId === user?.id && <div style={{ margin: '10px 16px 0', padding: 11, borderRadius: 12, color: '#cbd2e6', background: 'rgba(255,255,255,.06)', fontSize: 12 }}>Message request sent. This user has not followed you back yet; wait for their review.</div>}
              {/* Messages Scroll Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: isMobile ? '16px' : '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {callHistory.map((call, index) => <div key={`${call.at}-${index}`} style={{ alignSelf: 'center', color: call.status === 'Missed' ? '#ff6688' : '#9ca3af', fontSize: 12, padding: '8px 14px', borderRadius: 12, background: 'rgba(255,255,255,.05)' }}>{call.status === 'Missed' ? '↘ Missed' : call.direction} {call.type} call · {new Date(call.at).toLocaleString()}</div>)}
                {loading ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: '#8892b0' }}>
                    <span className="zq-pulse-orb" style={{ display: 'inline-block', marginRight: '8px' }} />
                    Establishing quantum sync...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: '#8892b0', maxWidth: '320px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.2), rgba(121, 40, 202, 0.2))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        fontSize: '24px',
                      }}
                    >
                      ⚡
                    </div>
                    <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>
                      Sync Stream Connected
                    </h4>
                    <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#9499ab' }}>
                      Say hello to <strong>{activeUser?.name || activeUsername}</strong>. Encrypted messages are transmitted instantly.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '14px' }}>
                      {['👋 Hey there!', '✨ Connect!', '🚀 Building cool stuff!'].map((q) => (
                        <button
                          key={q}
                          onClick={() => send(undefined, q)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '14px',
                            background: 'rgba(121, 40, 202, 0.2)',
                            border: '1px solid rgba(121, 40, 202, 0.4)',
                            color: '#c4b5fd',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender?.username === user?.username || m.senderId === user?.id;

                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                          maxWidth: isMobile ? '82%' : '70%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            padding: '11px 16px',
                            borderRadius: '18px',
                            background: isMine
                              ? 'linear-gradient(135deg, #7928ca 0%, #0070f3 100%)'
                              : 'rgba(255, 255, 255, 0.07)',
                            color: '#fff',
                            border: isMine ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: isMine
                              ? '0 4px 16px rgba(121, 40, 202, 0.3)'
                              : '0 2px 10px rgba(0, 0, 0, 0.2)',
                            borderBottomRightRadius: isMine ? '4px' : '18px',
                            borderBottomLeftRadius: !isMine ? '4px' : '18px',
                            fontSize: '14px',
                            lineHeight: '20px',
                            wordBreak: 'break-word',
                          }}
                        >
                          {m.content}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#6b7280',
                            marginTop: '3px',
                            padding: '0 4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMine && <span style={{ color: '#00dfd8' }}>✓✓</span>}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Message Input Bar */}
              <form
                className="zq-chat-composer"
                onSubmit={(e) => send(e)}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  background: 'rgba(10, 12, 22, 0.85)',
                }}
              >
                {/* Quick Emojis */}
                <div style={{ display: 'flex', gap: 3 }} aria-label="Stickers">
                  {['👋', '✨', '🔥', '❤️', '😂', '🎉', '🚀'].map((sticker) => <button key={sticker} type="button" onClick={() => setText((value) => value + sticker)} style={{ background: 'rgba(255,255,255,.05)', border: 0, borderRadius: 8, padding: 6, cursor: 'pointer' }}>{sticker}</button>)}
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {['⚡', '🔥'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setText((t) => t + em)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Transmitting thoughts..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '22px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />

                <button
                  type="submit"
                  disabled={!text.trim() || !conv?.id}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '22px',
                    border: 'none',
                    background: text.trim()
                      ? 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)'
                      : 'rgba(255, 255, 255, 0.08)',
                    color: text.trim() ? '#fff' : '#6b7280',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: text.trim() ? 'pointer' : 'default',
                    boxShadow: text.trim() ? '0 4px 18px rgba(0, 223, 216, 0.4)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ⚡
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8892b0', padding: '20px', textAlign: 'center' }}>
              <MessagesIcon size={56} />
              <h3 style={{ marginTop: '14px', color: '#fff', fontSize: '18px', fontWeight: 800 }}>
                Direct Sync Messenger
              </h3>
              <p style={{ fontSize: '13px', color: '#9499ab', marginTop: '4px' }}>
                Select a community connection to begin synchronized conversation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Live Video & Audio Call Modal */}
      {activeCall && (
        <LiveCallModal
          peer={activeCall.peer}
          callType={activeCall.type}
          callId={activeCall.callId}
          initiator={activeCall.initiator}
          onEndCall={() => { recordCall({ type: activeCall.type, direction: activeCall.initiator === false ? 'Incoming' : 'Outgoing', status: 'Ended' }); setActiveCall(null); }}
        />
      )}
    </div>
  );
}
