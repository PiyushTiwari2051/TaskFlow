import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useBoardStore } from './store/useBoardStore.js';
import { apiRequest } from './utils/api.js';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import BoardListPage from './pages/BoardListPage.jsx';
import BoardViewPage from './pages/BoardViewPage.jsx';

// Custom Toast Component for Undo and Alerts
export const ToastContext = React.createContext(null);

function App() {
  const { user, setUser, setAccessToken, logoutUser, isReconnecting } = useBoardStore();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState(null);

  // Check auth session on load
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await apiRequest('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUser(data.user);
            if (data.accessToken) {
              setAccessToken(data.accessToken);
            }
            
            // Sync theme preference
            const theme = data.user.preferences?.theme || 'system';
            applyTheme(theme);
          }
        }
      } catch (err) {
        console.error('Session verification failed', err);
      } finally {
        setCheckingAuth(false);
      }
    };
    fetchMe();
  }, []);

  // Listen to forced logout events (from API client)
  useEffect(() => {
    const handleForceLogout = () => {
      const previouslyLoggedIn = !!useBoardStore.getState().user;
      logoutUser();
      if (previouslyLoggedIn) {
        showToast({
          message: 'Your session has expired. Please log in again.',
          type: 'error'
        });
      }
    };

    window.addEventListener('force-logout', handleForceLogout);
    return () => window.removeEventListener('force-logout', handleForceLogout);
  }, []);

  const applyTheme = (theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  const showToast = ({ message, type = 'info', action = null, duration = 5000 }) => {
    setToast({ message, type, action, duration });
  };

  const hideToast = () => setToast(null);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      <Router>
        <div class="h-full flex flex-col transition-colors duration-200">
          {/* Reconnecting Overlay Banner */}
          {isReconnecting && (
            <div class="bg-accent text-white text-xs font-semibold py-1 px-4 text-center animate-pulse flex items-center justify-center gap-2 z-50">
              <span class="inline-block h-2 w-2 rounded-full bg-white animate-ping"></span>
              Connection lost. Reconnecting to TaskFlow server...
            </div>
          )}

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthRoute checkingAuth={checkingAuth} user={user}><LoginPage /></AuthRoute>} />
            <Route path="/register" element={<AuthRoute checkingAuth={checkingAuth} user={user}><RegisterPage /></AuthRoute>} />
            
            <Route path="/app" element={<PrivateRoute checkingAuth={checkingAuth} user={user}><BoardListPage /></PrivateRoute>} />
            <Route path="/app/boards" element={<PrivateRoute checkingAuth={checkingAuth} user={user}><BoardListPage /></PrivateRoute>} />
            <Route path="/app/boards/:id" element={<PrivateRoute checkingAuth={checkingAuth} user={user}><BoardViewPage /></PrivateRoute>} />
            
            {/* Invite Join automatic redirects */}
            <Route path="/invite/:inviteCode" element={<InviteJoinRedirect />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast Notification with Progress Bar */}
          {toast && <ToastContainer toast={toast} onClose={hideToast} />}
        </div>
      </Router>
    </ToastContext.Provider>
  );
}

// Private Route Guard
function PrivateRoute({ children, checkingAuth, user }) {
  if (checkingAuth) {
    return (
      <div class="h-full w-full flex flex-col items-center justify-center bg-ink-light dark:bg-ink-dark">
        <div class="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 font-heading text-navy-500 text-sm">Verifying Session...</p>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

// Auth Redirect Guard (redirects already logged in users to /app)
function AuthRoute({ children, checkingAuth, user }) {
  if (checkingAuth) return null;
  return user ? <Navigate to="/app" replace /> : children;
}

// Invite Redirector
function InviteJoinRedirect() {
  const { user } = useBoardStore();
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState(null);
  const { inviteCode } = window.location.pathname.match(/\/invite\/(?<inviteCode>[^/]+)/)?.groups || {};

  useEffect(() => {
    if (!user) {
      sessionStorage.setItem('redirectTo', window.location.pathname);
      window.location.href = '/login';
      return;
    }

    const join = async () => {
      try {
        const res = await apiRequest(`/api/boards/join/${inviteCode}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          window.location.href = `/app/boards/${data.boardId}`;
        } else {
          setError(data.error?.message || 'Failed to join the board using this invite link.');
          setJoining(false);
        }
      } catch (err) {
        setError('Network error. Please try again.');
        setJoining(false);
      }
    };
    if (inviteCode) join();
  }, [inviteCode, user]);

  return (
    <div class="h-full w-full flex flex-col items-center justify-center bg-ink-light dark:bg-ink-dark px-4">
      {joining ? (
        <>
          <div class="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 font-heading text-navy-700 dark:text-navy-300 text-base">Accepting Board Invite...</p>
        </>
      ) : (
        <div class="text-center max-w-md">
          <h2 class="text-2xl font-heading font-bold text-red-500 mb-2">Invite Unsuccessful</h2>
          <p class="text-navy-600 dark:text-navy-400 mb-4">{error}</p>
          <Link to="/app" class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold transition-all shadow-md">
            Go to My Boards
          </Link>
        </div>
      )}
    </div>
  );
}

// Toast Notification Container Component
function ToastContainer({ toast, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onClose();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [toast, onClose]);

  const bgType = {
    info: 'bg-navy-900 text-white dark:bg-white dark:text-navy-900',
    error: 'bg-red-500 text-white',
    success: 'bg-primary text-white'
  }[toast.type] || 'bg-navy-900 text-white';

  return (
    <div class="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div class={`${bgType} px-5 py-4 rounded-xl shadow-2xl flex flex-col min-w-[320px] max-w-md border border-navy-800/10`}>
        <div class="flex items-center justify-between gap-4">
          <p class="text-sm font-semibold leading-relaxed">{toast.message}</p>
          {toast.action && (
            <button 
              onClick={() => { toast.action.onClick(); onClose(); }}
              class="text-xs font-bold underline hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        {/* Countdown Progress Bar */}
        <div class="mt-3 w-full bg-black/10 dark:bg-white/10 h-[3px] rounded-full overflow-hidden">
          <div 
            class="h-full bg-white/40 dark:bg-black/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default App;
