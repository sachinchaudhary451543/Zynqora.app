import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, User, getAvatarUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MessagesIcon, AuraSparkIcon, SearchIcon } from '../components/Icons';

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const auraColor = '#7928ca';

  useEffect(() => {
    api.getSuggestions()
      .then((data) => {
        setConversations(data);
        if (!username && data.length > 0) {
          setActiveUsername(data[0].username);
        }
      })
      .catch(() => {});
  }, []);

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
      try {
        const c = await api.createConversation(activeUsername);
        setConv(c);
        const ms = await api.getMessages(c.id);
        setMessages(ms || []);
      } catch (err) {
        console.error('Failed to init conversation', err);
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

  return (
    <div
      style={{
        display: 'flex',
        maxWidth: '1150px',
        margin: '20px auto 40px auto',
        height: 'calc(100vh - 80px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '28px',
        background: 'linear-gradient(180deg, rgba(18, 22, 36, 0.85) 0%, rgba(10, 12, 20, 0.95) 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        overflow: 'hidden',
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(121, 40, 202, 0.15)',
      }}
    >
      {/* Left Conversations Sidebar */}
      <div
        style={{
          width: '340px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(5, 7, 14, 0.4)',
        }}
      >
        {/* Header & Search */}
        <div style={{ padding: '20px 20px 14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="zq-pulse-orb" />
              <span style={{ fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '0.5px' }}>
                DIRECT SYNCS
              </span>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(0, 223, 216, 0.15)', color: '#00dfd8', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>
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
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.png'; }}
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
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cUser.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: isSelected ? '#00dfd8' : '#8892b0', marginTop: '2px' }}>
                      @{cUser.username}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(8, 10, 18, 0.6)' }}>
        {activeUsername ? (
          <>
            {/* Top Chat Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(15, 18, 30, 0.7)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.png'; }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {activeUser?.name || activeUsername}
                    <span style={{ fontSize: '12px', color: '#00dfd8' }}>⚡</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#00dfd8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00dfd8', display: 'inline-block' }} />
                    <span>Synchronized Neural Channel • @{activeUsername}</span>
                  </div>
                </div>
              </div>

              {/* View Profile Action */}
              <Link to={`/profile/${activeUsername}`}>
                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ccd6f6',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                >
                  View Profile ↗
                </button>
              </Link>
            </div>

            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#8892b0' }}>
                  <span className="zq-pulse-orb" style={{ display: 'inline-block', marginRight: '8px' }} />
                  Establishing quantum sync...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#8892b0', maxWidth: '340px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0, 223, 216, 0.2), rgba(121, 40, 202, 0.2))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                      fontSize: '28px',
                    }}
                  >
                    ⚡
                  </div>
                  <h4 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                    Sync Stream Connected
                  </h4>
                  <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#9499ab' }}>
                    Say hello to <strong>{activeUser?.name || activeUsername}</strong>. Encrypted messages are transmitted instantly across your shared circle.
                  </p>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '18px' }}>
                    {['👋 Hey there!', '✨ Excited to connect!', '🚀 Building cool stuff!'].map((q) => (
                      <button
                        key={q}
                        onClick={() => send(undefined, q)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
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
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '13px 18px',
                          borderRadius: '20px',
                          background: isMine
                            ? 'linear-gradient(135deg, #7928ca 0%, #0070f3 100%)'
                            : 'rgba(255, 255, 255, 0.07)',
                          color: '#fff',
                          border: isMine ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: isMine
                            ? '0 6px 20px rgba(121, 40, 202, 0.35)'
                            : '0 4px 16px rgba(0, 0, 0, 0.2)',
                          borderBottomRightRadius: isMine ? '4px' : '20px',
                          borderBottomLeftRadius: !isMine ? '4px' : '20px',
                          fontSize: '14.5px',
                          lineHeight: '21px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.content}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#6b7280',
                          marginTop: '4px',
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
              onSubmit={(e) => send(e)}
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                background: 'rgba(10, 12, 22, 0.8)',
              }}
            >
              {/* Quick Emojis */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {['⚡', '🔥', '❤️'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setText((t) => t + em)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Transmitting thoughts to circle..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '24px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />

              <button
                type="submit"
                disabled={!text.trim()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '24px',
                  border: 'none',
                  background: text.trim()
                    ? 'linear-gradient(135deg, #00dfd8 0%, #7928ca 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: text.trim() ? '#fff' : '#6b7280',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: text.trim() ? 'pointer' : 'default',
                  boxShadow: text.trim() ? '0 4px 18px rgba(0, 223, 216, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.4px',
                }}
              >
                Send ⚡
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8892b0' }}>
            <MessagesIcon size={64} />
            <h3 style={{ marginTop: '16px', color: '#fff', fontSize: '20px', fontWeight: 800 }}>
              Direct Sync Messenger
            </h3>
            <p style={{ fontSize: '14px', color: '#9499ab', marginTop: '6px' }}>
              Select a community connection to begin synchronized conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
