import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const Feed = React.lazy(() => import('./pages/Feed'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Explore = React.lazy(() => import('./pages/Explore'));
const CirclesHub = React.lazy(() => import('./pages/CirclesHub'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const ChatPage = React.lazy(() => import('./pages/Chat'));
const FollowersPage = React.lazy(() => import('./pages/Followers'));
const FollowingPage = React.lazy(() => import('./pages/Following'));
const AuraPage = React.lazy(() => import('./pages/AuraPage'));
const CreatePostModal = React.lazy(() => import('./components/CreatePostModal'));
import Sidebar from './components/Sidebar';
import FloatingMessagesWidget from './components/FloatingMessagesWidget';
import AuthNotice from './components/AuthNotice';
import { createRealtimeSocket } from './realtime';
const LiveCallModal = React.lazy(() => import('./components/LiveCallModal'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, isInitializing } = useAuth();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState(() => localStorage.getItem('pendingRecoveryCode') || '');
  const [incomingCall, setIncomingCall] = useState<{ peer: { id: string; username: string; name: string }; type: 'audio' | 'video'; callId: string } | null>(null);
  const realtimeSocketRef = React.useRef<ReturnType<typeof createRealtimeSocket> | null>(null);

  React.useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem('zynqora-theme') === 'dark' ? 'dark' : 'light';
  }, []);

  React.useEffect(() => {
    const refresh = () => setRecoveryCode(localStorage.getItem('pendingRecoveryCode') || '');
    window.addEventListener('recovery-code-created', refresh);
    return () => window.removeEventListener('recovery-code-created', refresh);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    const socket = createRealtimeSocket();
    realtimeSocketRef.current = socket;
    socket.on('call:incoming', (call: { fromUserId: string; callId: string; callType: 'audio' | 'video' }) => {
      setIncomingCall({
        peer: { id: call.fromUserId, username: 'Zynqora caller', name: 'Zynqora caller' },
        type: call.callType,
        callId: call.callId,
      });
    });
    socket.on('call:ended', ({ callId }: { callId: string }) => {
      setIncomingCall((current) => current?.callId === callId ? null : current);
    });
    return () => {
      socket.disconnect();
      if (realtimeSocketRef.current === socket) realtimeSocketRef.current = null;
    };
  }, [user?.id]);

  if (isInitializing) {
    return (
      <div className="zq-auth-session-loading" role="status" aria-live="polite">
        <span className="zq-auth-power-orbit" aria-hidden="true"><span /></span>
        <span>Restoring your secure session…</span>
      </div>
    );
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="zq-app-layout">
      <a className="zq-skip-link" href="#zq-main-content">Skip to Main Content</a>
      {/* Persistent Left Navigation Sidebar for authenticated users */}
      {user && !isAuthPage && (
        <Sidebar onOpenCreateModal={() => setIsCreateModalOpen(true)} unreadCount={4} />
      )}

      {/* Main Page Content */}
      <main id="zq-main-content" tabIndex={-1} className={user && !isAuthPage ? 'zq-main-content' : ''} style={{ flex: 1 }}>
        <Suspense fallback={<div className="zq-route-loading">Loading your space...</div>}>
          <Routes>
          <Route path="/login" element={user ? <Navigate to="/feed" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/feed" replace /> : <Signup />} />

          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <Explore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/circles"
            element={
              <ProtectedRoute>
                <CirclesHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aura"
            element={
              <ProtectedRoute>
                <AuraPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories"
            element={<Navigate to="/aura" replace />}
          />
          <Route
            path="/profile/:username"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:username/followers"
            element={
              <ProtectedRoute>
                <FollowersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:username/following"
            element={
              <ProtectedRoute>
                <FollowingPage />
              </ProtectedRoute>
            }
          />
          {/* Short aliases kept for links/bookmarks from the earlier UI. */}
          <Route
            path="/followers/:username"
            element={
              <ProtectedRoute>
                <FollowersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/following/:username"
            element={
              <ProtectedRoute>
                <FollowingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts/edit"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:username"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/feed" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Floating Bottom-Right Messages Widget matching Screenshots 1, 2, 3 */}
      {user && !isAuthPage && <FloatingMessagesWidget />}

      {/* Global Create Post Modal */}
      {user && isCreateModalOpen && (
        <Suspense fallback={<div className="zq-route-loading">Opening creator studio…</div>}>
          <CreatePostModal
            isOpen
            onClose={() => setIsCreateModalOpen(false)}
            onPostCreated={() => {
              window.dispatchEvent(new CustomEvent('ig-post-created'));
            }}
          />
        </Suspense>
      )}
      {user && incomingCall && (
        <Suspense fallback={<div className="zq-route-loading">Opening call…</div>}>
          <LiveCallModal
            peer={incomingCall.peer}
            callType={incomingCall.type}
            callId={incomingCall.callId}
            initiator={false}
            currentUserId={user.id}
            onDeclineCall={() => realtimeSocketRef.current?.emit('call:end', { targetUserId: incomingCall.peer.id, callId: incomingCall.callId })}
            onEndCall={() => setIncomingCall(null)}
          />
        </Suspense>
      )}
      {recoveryCode && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, width: 'min(360px, calc(100vw - 40px))' }}>
          <AuthNotice type="warning">
            <div>Save your private recovery code. It will not be shown again.</div>
            <code style={{ display: 'block', marginTop: 8, fontSize: 16, letterSpacing: 2 }}>{recoveryCode}</code>
            <button type="button" onClick={() => { localStorage.removeItem('pendingRecoveryCode'); setRecoveryCode(''); }} style={{ marginTop: 10, background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>I saved it</button>
          </AuthNotice>
        </div>
      )}
    </div>
  );
}
