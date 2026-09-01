import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import SettingsPage from './pages/Settings';
import ChatPage from './pages/Chat';
import FollowersPage from './pages/Followers';
import FollowingPage from './pages/Following';
import Sidebar from './components/Sidebar';
import FloatingMessagesWidget from './components/FloatingMessagesWidget';
import CreatePostModal from './components/CreatePostModal';
import AuthNotice from './components/AuthNotice';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState(() => localStorage.getItem('pendingRecoveryCode') || '');

  React.useEffect(() => {
    const refresh = () => setRecoveryCode(localStorage.getItem('pendingRecoveryCode') || '');
    window.addEventListener('recovery-code-created', refresh);
    return () => window.removeEventListener('recovery-code-created', refresh);
  }, []);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="zq-app-layout">
      {/* Persistent Left Navigation Sidebar for authenticated users */}
      {user && !isAuthPage && (
        <Sidebar onOpenCreateModal={() => setIsCreateModalOpen(true)} unreadCount={4} />
      )}

      {/* Main Page Content */}
      <main className={user && !isAuthPage ? 'zq-main-content' : ''} style={{ flex: 1 }}>
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
      </main>

      {/* Floating Bottom-Right Messages Widget matching Screenshots 1, 2, 3 */}
      {user && !isAuthPage && <FloatingMessagesWidget />}

      {/* Global Create Post Modal */}
      {user && (
        <CreatePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onPostCreated={() => {
            // reload feed if on feed
            window.dispatchEvent(new CustomEvent('ig-post-created'));
          }}
        />
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
