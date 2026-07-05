import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore.js';
import { apiRequest } from '../utils/api.js';
import { ToastContext } from '../App.jsx';
import { KanbanSquare, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useBoardStore((state) => state.setUser);
  const setAccessToken = useBoardStore((state) => state.setAccessToken);
  const { showToast } = useContext(ToastContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side quick checks
    const newErrors = {};
    if (!email) newErrors.email = 'Email address is required';
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        setAccessToken(data.accessToken);
        showToast({
          message: `Welcome back, ${data.user.name}!`,
          type: 'success'
        });
        const redirectTo = sessionStorage.getItem('redirectTo') || '/app';
        sessionStorage.removeItem('redirectTo');
        navigate(redirectTo);
      } else {
        if (data.error?.code === 'EMAIL_UNVERIFIED') {
          showToast({
            message: 'Your email address is unverified. Redirecting to verification screen...',
            type: 'warning'
          });
          navigate('/register', { state: { email: email.toLowerCase().trim(), showOtp: true } });
          return;
        }

        const message = data.error?.message || 'Invalid credentials. Please verify your email and password.';
        showToast({
          message,
          type: 'error'
        });
        if (data.error?.code === 'VALIDATION_ERROR' && data.error.fields) {
          setErrors(data.error.fields);
        }
      }
    } catch (err) {
      showToast({
        message: 'A network error occurred. Please check your connection and try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="h-full w-full flex items-center justify-center bg-ink-light dark:bg-navy-950 px-6">
      
      {/* Background blobs for premium layout */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl"></div>
        <div class="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl"></div>
      </div>

      <div class="w-full max-w-md bg-white dark:bg-navy-900 border border-navy-100 dark:border-navy-800/80 rounded-2xl shadow-xl p-8 z-10">
        
        {/* Logo and header */}
        <div class="flex flex-col items-center mb-8">
          <div class="p-3 bg-primary rounded-2xl text-white shadow-premium mb-4">
            <KanbanSquare class="h-8 w-8" />
          </div>
          <h2 class="font-heading font-bold text-3xl tracking-tight text-navy-900 dark:text-white">Sign In to TaskFlow</h2>
          <p class="mt-2 text-xs text-navy-400">Collaborate in real time with your team</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} class="flex flex-col gap-5">
          {/* Email */}
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider text-navy-400 dark:text-navy-500">Email Address</label>
            <div class="relative">
              <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              <input 
                type="email" 
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                class={`w-full pl-10 pr-4 py-3 rounded-xl border bg-navy-50/50 dark:bg-navy-800/30 text-navy-850 dark:text-white text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-navy-800 transition-all ${
                  errors.email ? 'border-red-400 focus:border-red-400' : 'border-navy-100 dark:border-navy-800'
                }`}
              />
            </div>
            {errors.email && <span class="text-xs text-red-500 font-semibold">{errors.email}</span>}
          </div>

          {/* Password */}
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold uppercase tracking-wider text-navy-400 dark:text-navy-500">Password</label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                class={`w-full pl-10 pr-4 py-3 rounded-xl border bg-navy-50/50 dark:bg-navy-800/30 text-navy-850 dark:text-white text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-navy-800 transition-all ${
                  errors.password ? 'border-red-400 focus:border-red-400' : 'border-navy-100 dark:border-navy-800'
                }`}
              />
            </div>
            {errors.password && <span class="text-xs text-red-500 font-semibold">{errors.password}</span>}
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading}
            class="w-full mt-2 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-premium active:scale-98 duration-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Register link */}
        <p class="mt-6 text-center text-xs text-navy-400">
          Don't have an account?{' '}
          <Link to="/register" class="text-primary hover:underline font-semibold">
            Create account
          </Link>
        </p>

      </div>
    </div>
  );
}
