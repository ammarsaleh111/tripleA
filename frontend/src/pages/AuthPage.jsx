import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';

const getPostAuthRoute = (role) =>
  String(role || '').trim().toLowerCase() === 'admin' ? '/admin' : '/dashboard';

const AUTH_VISUAL_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop';

const AuthPage = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authUser, authLoading, login, register } = useAppContext();
  const isResetMode = initialMode === 'reset';
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayAuthenticated, setStayAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    if (authUser) {
      navigate(getPostAuthRoute(authUser.role), { replace: true });
    }
  }, [authUser, navigate]);

  useEffect(() => {
    if (isResetMode) {
      return;
    }

    const tabFromQuery = searchParams.get('tab');
    if (tabFromQuery === 'login' || tabFromQuery === 'register') {
      setActiveTab(tabFromQuery);
    }
  }, [isResetMode, searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (activeTab === 'register') {
      const registration = await register({ firstName, lastName, email, password });
      if (!registration.success) {
        setErrorMessage(registration.message);
        return;
      }
      navigate(getPostAuthRoute(registration?.data?.user?.role), { replace: true });
      return;
    }

    const loginResult = await login({ email, password, stayAuthenticated });
    if (!loginResult.success) {
      setErrorMessage(loginResult.message);
      return;
    }
    navigate(getPostAuthRoute(loginResult?.data?.user?.role), { replace: true });
  };

  const handleResetSubmit = (event) => {
    event.preventDefault();
    setResetMessage('If an account exists, a password reset link has been queued.');
  };

  const inputClass =
    'w-full bg-[#050506] border border-[#1C1C26] text-white px-4 py-3.5 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-xl placeholder:text-zinc-600';

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#050506] font-sans text-white selection:bg-[#FFCC00] selection:text-black md:flex-row">
      {/* Brand Visual Panel */}
      <div className="auth-visual relative flex min-h-[42vh] w-full flex-col justify-between overflow-hidden bg-black p-6 sm:min-h-[50vh] sm:p-8 md:min-h-screen md:w-1/2 md:p-12 lg:p-16">
        <div
          className="absolute inset-0 z-0 opacity-30 bg-cover bg-center filter grayscale contrast-125"
          style={{ backgroundImage: `url("${AUTH_VISUAL_IMAGE}")` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050506] via-black/70 to-black/85" />

        <div className="relative z-10">
          <Link
            to="/"
            className="font-heading font-black text-3xl tracking-tighter text-[#FFCC00] transition-colors hover:text-yellow-300"
          >
            TRIPLE A
          </Link>
        </div>

        <div className="relative z-10 mt-auto space-y-4">
          <div className="inline-flex items-center gap-2.5 border border-[#FFCC00]/40 bg-black/80 px-5 py-2 rounded-full backdrop-blur-md">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#FFCC00]" />
            <span className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#FFCC00]">
              ELITE NUTRITION STACK
            </span>
          </div>

          <h2 className="font-heading font-black text-5xl uppercase leading-[0.9] tracking-tight sm:text-6xl md:text-7xl">
            <span className="block text-white">FUEL YOUR</span>
            <span className="block text-[#FFCC00]">PERFORMANCE.</span>
          </h2>
          <p className="mb-6 max-w-md font-mono text-xs uppercase leading-relaxed tracking-wider text-zinc-400">
            Sign in to track your orders, manage your supplement stack, and unlock member-only offers.
          </p>
          <div className="font-mono text-xs uppercase tracking-widest text-zinc-600">
            PERFORMANCE / RECOVERY / RESULTS
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0B0B0E] p-5 sm:p-8 md:w-1/2 md:p-12">
        <Link
          to="/"
          className="absolute right-5 top-5 z-20 font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-[#FFCC00] sm:right-8 sm:top-8"
        >
          ← RETURN HOME
        </Link>

        <div className="relative z-10 w-full max-w-md">
          {isResetMode ? (
            <div>
              <div className="mb-12 border-b border-[#1C1C26] pb-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFCC00]">
                  Password Recovery
                </p>
                <h2 className="mt-3 font-heading text-3xl font-black uppercase tracking-tight text-white">
                  Reset Access
                </h2>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@triplea-supplements.com"
                    className={inputClass}
                    required
                  />
                </div>

                {resetMessage && (
                  <p className="font-mono text-[11px] uppercase tracking-widest text-[#FFCC00]">{resetMessage}</p>
                )}

                <button
                  type="submit"
                  className="mt-6 w-full rounded-xl bg-[#FFCC00] py-4 font-heading text-sm font-bold uppercase tracking-widest text-black shadow-lg transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(255,204,0,0.4)]"
                >
                  Send Reset Link
                </button>

                <Link
                  to="/auth"
                  className="block text-center font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white"
                >
                  Back to Login
                </Link>
              </form>
            </div>
          ) : (
            <>
              <div className="mb-10 flex flex-wrap gap-x-8 gap-y-3 border-b border-[#1C1C26] sm:mb-12">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`pb-4 font-heading text-lg font-black uppercase tracking-wider transition-colors ${
                    activeTab === 'login'
                      ? 'border-b-2 border-[#FFCC00] text-[#FFCC00]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  LOGIN
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`pb-4 font-heading text-lg font-black uppercase tracking-wider transition-colors ${
                    activeTab === 'register'
                      ? 'border-b-2 border-[#FFCC00] text-[#FFCC00]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  JOIN TRIPLE A
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'register' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="ENTER FIRST NAME"
                        className={inputClass}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="ENTER LAST NAME"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="athlete@triplea-supplements.com"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
                      Password
                    </label>
                    {activeTab === 'login' && (
                      <Link
                        to="/auth/reset-password"
                        className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-[#FFCC00]"
                      >
                        FORGOT PASSWORD?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-12`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500 transition-colors hover:text-white"
                    >
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                {activeTab === 'login' && (
                  <label className="group flex cursor-pointer items-center gap-3">
                    <div className="relative flex h-4 w-4 items-center justify-center rounded-sm border border-zinc-700 transition-colors group-hover:border-[#FFCC00]">
                      <input
                        type="checkbox"
                        checked={stayAuthenticated}
                        onChange={(event) => setStayAuthenticated(event.target.checked)}
                        className="sr-only"
                      />
                      {stayAuthenticated && <div className="h-2 w-2 rounded-sm bg-[#FFCC00]" />}
                    </div>
                    <span className="font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors group-hover:text-zinc-300">
                      KEEP ME SIGNED IN
                    </span>
                  </label>
                )}

                {errorMessage && (
                  <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-400">{errorMessage}</p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="mt-6 w-full rounded-xl bg-[#FFCC00] py-4 text-center font-heading text-sm font-bold uppercase tracking-widest text-black shadow-lg transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(255,204,0,0.4)] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                >
                  {authLoading ? 'PROCESSING...' : activeTab === 'register' ? 'CREATE ACCOUNT' : 'LOGIN'}
                </button>
              </form>

              <div className="my-10 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#1C1C26]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Other Options
                </span>
                <div className="h-px flex-1 bg-[#1C1C26]" />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/help?topic=oauth"
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[#1C1C26] bg-[#14141E] py-4 font-mono text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-[#FFCC00]/60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Link>
                <Link
                  to="/help?topic=oauth"
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[#1C1C26] bg-[#14141E] py-4 font-mono text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-[#FFCC00]/60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.82 3.59-.83 1.58.07 2.87.68 3.65 1.76-3.21 1.87-2.8 5.86.3 7.03-.78 1.83-1.63 3.29-2.62 4.21z" />
                    <path d="M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Apple
                </Link>
              </div>

              <p className="mx-auto mt-12 max-w-xs text-center font-mono text-[9px] uppercase leading-relaxed tracking-widest text-zinc-500">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="border-b border-zinc-600 transition-colors hover:border-white hover:text-white">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="border-b border-zinc-600 transition-colors hover:border-white hover:text-white">
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
