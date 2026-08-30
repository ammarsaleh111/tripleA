import { useEffect, useState } from 'react';

import { useAppContext } from '../../context/AppContext.jsx';

/**
 * Application loading screen. Shown during the app's real bootstrap process —
 * session/profile restore (when a token exists) plus the initial cart load —
 * and removed once initialization completes. Behaves identically on a fresh
 * browser load and on refresh because it is driven by bootstrap state, not by
 * session storage. A safety timeout in AppContext guarantees it can never get
 * permanently stuck.
 */
const AppIntroLoader = () => {
  const { isBootstrapping } = useAppContext();
  const [isFading, setIsFading] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    if (isBootstrapping) {
      setIsFading(false);
      return undefined;
    }

    const fadeTimer = setTimeout(() => setIsFading(true), 150);
    const removeTimer = setTimeout(() => setIsRemoved(true), 950);

    return () => {
      clearTimeout(removeTimer);
      clearTimeout(fadeTimer);
    };
  }, [isBootstrapping]);

  if (isRemoved) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center space-y-5 bg-[#050506] transition-opacity duration-700 ${
        isFading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={!isBootstrapping}
    >
      <h1 className="animate-intro-logo font-heading text-6xl font-black tracking-tighter text-[#FFCC00] md:text-7xl">
        TRIPLE A
      </h1>
      <div className="animate-intro-line h-[2px] bg-[#FFCC00]" />
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
        FUEL YOUR PERFORMANCE
      </p>
    </div>
  );
};

export default AppIntroLoader;