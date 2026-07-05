import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore.js';
import { apiRequest } from '../utils/api.js';
import { ToastContext } from '../App.jsx';
import { KanbanSquare, User, Mail, Lock, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useBoardStore((state) => state.setUser);
  const setAccessToken = useBoardStore((state) => state.setAccessToken);
  const { showToast } = useContext(ToastContext);

  // Signup State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  // OTP Verification State
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Handle redirected unverified user logins
  useEffect(() => {
    if (location.state && location.state.showOtp && location.state.email) {
      setVerificationEmail(location.state.email);
      setShowOtpScreen(true);
    }
  }, [location]);

  // Cooldown Countdown Timer
  useEffect(() => {
    let interval = null;
    if (showOtpScreen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpScreen, resendTimer]);

  // Autofocus the first OTP box when screen switches on
  useEffect(() => {
    if (showOtpScreen) {
      const firstInput = document.getElementById('otp-0');
      if (firstInput) firstInput.focus();
    }
  }, [showOtpScreen]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side quick validation checks
    const newErrors = {};
    if (!name || name.length < 2) newErrors.name = 'Name must be at least 2 characters';
    if (!email) newErrors.email = 'Email address is required';
    if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setVerificationEmail(email.toLowerCase().trim());
        setShowOtpScreen(true);
        if (data.otp) {
          setDevOtp(data.otp);
        }
        showToast({
          message: data.message || 'OTP verification code has been sent to your email.',
          type: 'success'
        });
      } else {
        const message = data.error?.message || 'Failed to register account.';
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

  const handleOtpChange = (index, value) => {
    // Only allow single numeric digit input
    if (value !== '' && !/^[0-9]$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);

    // Auto-focus next input box
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Auto-focus previous input box on backspace
    if (e.key === 'Backspace' && otpValues[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newValues = [...otpValues];
        newValues[index - 1] = '';
        setOtpValues(newValues);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasteData)) return;

    const newValues = pasteData.split('');
    setOtpValues(newValues);
    
    // Focus last box after pasting
    const lastInput = document.getElementById('otp-5');
    if (lastInput) lastInput.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length !== 6) {
      showToast({ message: 'Please enter the complete 6-digit code.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: verificationEmail, code })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setAccessToken(data.accessToken);
        showToast({
          message: `Welcome to TaskFlow, ${data.user.name}! Your email has been verified.`,
          type: 'success'
        });
        const redirectTo = sessionStorage.getItem('redirectTo') || '/app';
        sessionStorage.removeItem('redirectTo');
        navigate(redirectTo);
      } else {
        showToast({ message: data.error?.message || 'Verification failed.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    try {
      const res = await apiRequest('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: verificationEmail })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({ message: 'A new code has been sent to your email.', type: 'success' });
        setResendTimer(60);
        setOtpValues(['', '', '', '', '', '']);
        if (data.otp) {
          setDevOtp(data.otp);
        }
        const firstInput = document.getElementById('otp-0');
        if (firstInput) firstInput.focus();
      } else {
        showToast({ message: data.error?.message || 'Failed to resend code.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div class="h-full w-full flex items-center justify-center bg-ink-light dark:bg-navy-955 px-6 relative overflow-hidden">
      
      {/* Background blobs for premium layout */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div class="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl"></div>
        <div class="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl"></div>
      </div>

      <div class="w-full max-w-md bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border border-navy-100 dark:border-navy-800/80 rounded-2xl shadow-xl p-8 z-10 transition-all duration-300">
        
        {!showOtpScreen ? (
          /* Signup Form */
          <>
            {/* Logo and header */}
            <div class="flex flex-col items-center mb-8">
              <div class="p-3 bg-primary rounded-2xl text-white shadow-premium mb-4">
                <KanbanSquare class="h-8 w-8" />
              </div>
              <h2 class="font-heading font-bold text-3xl tracking-tight text-navy-900 dark:text-white">Create Account</h2>
              <p class="mt-2 text-xs text-navy-400">Start organizing with real-time multiplayer boards</p>
            </div>

            <form onSubmit={handleRegister} class="flex flex-col gap-4">
              {/* Full Name */}
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-wider text-navy-400 dark:text-navy-500">Full Name</label>
                <div class="relative">
                  <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    class={`w-full pl-10 pr-4 py-3 rounded-xl border bg-navy-50/50 dark:bg-navy-800/30 text-navy-855 dark:text-white text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-navy-800 transition-all ${
                      errors.name ? 'border-red-400 focus:border-red-400' : 'border-navy-100 dark:border-navy-800'
                    }`}
                  />
                </div>
                {errors.name && <span class="text-xs text-red-500 font-semibold">{errors.name}</span>}
              </div>

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
                    class={`w-full pl-10 pr-4 py-3 rounded-xl border bg-navy-50/50 dark:bg-navy-800/30 text-navy-855 dark:text-white text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-navy-800 transition-all ${
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
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    class={`w-full pl-10 pr-4 py-3 rounded-xl border bg-navy-50/50 dark:bg-navy-800/30 text-navy-855 dark:text-white text-sm focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-navy-800 transition-all ${
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
                class="w-full mt-2 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-premium active:scale-98 duration-100 flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
              >
                {loading ? (
                  <span class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : 'Create Account'}
              </button>
            </form>

            <p class="mt-6 text-center text-xs text-navy-400">
              Already have an account?{' '}
              <Link to="/login" class="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          /* OTP Screen */
          <>
            {/* Back Button */}
            <button 
              onClick={() => setShowOtpScreen(false)}
              class="flex items-center gap-1 text-xs text-navy-450 hover:text-primary mb-6 transition-colors font-semibold"
            >
              <ArrowLeft class="h-3.5 w-3.5" /> Back to sign up
            </button>

            <div class="flex flex-col items-center mb-6 text-center">
              <div class="p-3 bg-primary/10 rounded-2xl text-primary mb-4 animate-pulse">
                <ShieldCheck class="h-8 w-8" />
              </div>
              <h2 class="font-heading font-bold text-2xl text-navy-900 dark:text-white">Verify Your Email</h2>
              <p class="mt-2 text-xs text-navy-450 dark:text-navy-400 max-w-xs leading-relaxed">
                We sent a 6-digit OTP code to <br />
                <strong class="text-navy-800 dark:text-white font-bold">{verificationEmail}</strong>.
              </p>
            </div>

            {devOtp && (
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(devOtp);
                  showToast({ message: 'OTP copied to clipboard!', type: 'success' });
                }}
                class="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary dark:text-primary-light flex flex-col gap-1 items-center cursor-pointer transition-colors animate-fade-in group relative"
                title="Click to Copy"
              >
                <span class="text-[10px] font-bold uppercase tracking-wider opacity-70">Local Dev Testing OTP Code</span>
                <span class="text-2xl font-black tracking-widest font-heading group-hover:scale-105 transition-transform">{devOtp}</span>
                <span class="text-[9px] opacity-75 group-hover:underline">Click to copy code</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} class="flex flex-col gap-6">
              {/* 6 Digit Autofocus Code inputs */}
              <div class="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    class="w-12 h-14 text-center text-xl font-bold bg-navy-50/50 dark:bg-navy-800/30 border border-navy-100 dark:border-navy-800 rounded-xl focus:outline-none focus:border-primary focus:bg-white dark:focus:bg-navy-800 text-navy-900 dark:text-white transition-all shadow-sm"
                  />
                ))}
              </div>

              {/* Submit */}
              <button 
                type="submit" 
                disabled={loading}
                class="w-full py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-premium active:scale-98 duration-100 flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
              >
                {loading ? (
                  <span class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : 'Verify Code'}
              </button>
            </form>

            {/* Resender Timer display */}
            <div class="mt-6 text-center text-xs">
              {resendTimer > 0 ? (
                <p class="text-navy-450 dark:text-navy-400 flex items-center justify-center gap-1.5">
                  Resend code in <strong class="text-primary font-bold">{resendTimer}s</strong>
                </p>
              ) : (
                <button
                  onClick={handleResendOtp}
                  disabled={isResending}
                  class="text-primary hover:underline font-semibold flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 btn-press"
                >
                  {isResending ? (
                    <RefreshCw class="h-3 w-3 animate-spin" />
                  ) : null}
                  Resend code
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
