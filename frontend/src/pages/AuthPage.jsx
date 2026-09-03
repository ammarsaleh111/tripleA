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

              

             

                
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
