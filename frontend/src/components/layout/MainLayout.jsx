import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';
import ThemeControls from '../common/ThemeControls.jsx';
import CartSidebar from '../shop/CartSidebar.jsx';

const links = [
  { to: '/', label: 'HOME' },
  { to: '/shop', label: 'SHOP' },
  { to: '/about', label: 'ABOUT US' },
];

const MenuIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const CloseIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const UserIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path
      d="M12 13.5A4.25 4.25 0 1012 5a4.25 4.25 0 000 8.5zM5 20a7 7 0 0114 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const SearchIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const CartIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path
      d="M3.5 5H5l1.7 8.1a1 1 0 001 .8h7.9a1 1 0 001-.76L18.2 7H7.1"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle cx="9" cy="18.5" r="1.2" fill="currentColor" />
    <circle cx="16.5" cy="18.5" r="1.2" fill="currentColor" />
  </svg>
);

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, logout, cart } = useAppContext();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showGuestAuthPrompt, setShowGuestAuthPrompt] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartItemCount = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cart?.items]);

  const profileDisplayName = useMemo(
    () => String(authUser?.firstName || '').trim(),
    [authUser?.firstName],
  );

  const dashboardRoute =
    String(authUser?.role || '').trim().toLowerCase() === 'admin' ? '/admin' : '/dashboard';

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowGuestAuthPrompt(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden text-[#FFF8E7] flex flex-col font-sans">
      {/* TRIPLE A GYM Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#282828] py-3 px-4 md:px-8 transition-all">
        <div className="mx-auto max-w-[1500px] flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-heading font-black italic text-xl md:text-2xl tracking-tighter text-[#FFCC00] group-hover:text-yellow-300 transition-colors">
              TRIPLE A GYM
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `font-heading font-extrabold italic text-sm tracking-wider uppercase transition-colors relative py-1 ${
                    isActive
                      ? 'text-[#FFCC00] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#FFCC00]'
                      : 'text-zinc-300 hover:text-[#FFCC00]'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons & Join Now Button */}
          <div className="flex items-center gap-3">
            {/* Search link */}
            <Link
              to="/shop"
              className="p-2 text-zinc-400 hover:text-[#FFCC00] transition-colors hidden sm:block"
              aria-label="Search items"
            >
              <SearchIcon />
            </Link>

            {/* Cart Trigger */}
            <button
              type="button"
              className="relative p-2 text-zinc-300 hover:text-[#FFCC00] transition-colors flex items-center gap-1.5"
              aria-label="Open cart"
              onClick={() => setIsCartOpen(true)}
            >
              <CartIcon />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FFCC00] text-black font-mono font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Account / Auth */}
            {!authUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGuestAuthPrompt((prev) => !prev)}
                  className="hidden sm:flex items-center gap-2 p-2 text-zinc-300 hover:text-[#FFCC00] transition-colors text-xs font-mono uppercase"
                >
                  <UserIcon />
                </button>
                {showGuestAuthPrompt && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-[#282828] p-3 shadow-2xl z-50 chamfer-box">
                    <Link
                      to="/auth?tab=login"
                      onClick={() => setShowGuestAuthPrompt(false)}
                      className="block text-center mb-2 btn-secondary text-xs py-2"
                    >
                      LOGIN
                    </Link>
                    <Link
                      to="/auth?tab=register"
                      onClick={() => setShowGuestAuthPrompt(false)}
                      className="block text-center btn-primary text-xs py-2"
                    >
                      REGISTER
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="group relative hidden sm:block">
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs font-mono uppercase text-zinc-300 hover:text-[#FFCC00]"
                >
                  <UserIcon />
                  <span className="truncate max-w-[100px]">{profileDisplayName || 'ACCOUNT'}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#141414] border border-[#282828] p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 chamfer-box">
                  <Link
                    to={dashboardRoute}
                    className="block px-3 py-2 text-xs font-mono text-zinc-300 hover:text-[#FFCC00] hover:bg-[#1E1E1E]"
                  >
                    DASHBOARD
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/auth', { replace: true });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-red-400 hover:bg-[#1E1E1E]"
                  >
                    LOGOUT
                  </button>
                </div>
              </div>
            )}

            {/* JOIN NOW Button */}
            <Link
              to="/auth?tab=register"
              className="btn-primary text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 inline-block"
            >
              JOIN NOW
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="p-2 text-zinc-300 hover:text-[#FFCC00] md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-4/5 max-w-xs bg-[#141414] border-l border-[#282828] p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#282828]">
                <span className="font-heading font-black italic text-lg text-[#FFCC00]">
                  TRIPLE A GYM
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <CloseIcon />
                </button>
              </div>

              <nav className="mt-6 flex flex-col gap-4">
                {links.map((link) => (
                  <NavLink
                    key={`mob-${link.to}`}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `font-heading font-extrabold italic text-lg tracking-wider uppercase ${
                        isActive ? 'text-[#FFCC00]' : 'text-zinc-300'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="border-t border-[#282828] pt-6 space-y-3">
              {!authUser ? (
                <>
                  <Link
                    to="/auth?tab=login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-center btn-secondary text-sm py-3"
                  >
                    LOGIN
                  </Link>
                  <Link
                    to="/auth?tab=register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-center btn-primary text-sm py-3"
                  >
                    JOIN NOW
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={dashboardRoute}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-center btn-secondary text-sm py-3"
                  >
                    DASHBOARD
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                      navigate('/auth');
                    }}
                    className="w-full text-center text-xs font-mono text-red-400 py-2"
                  >
                    LOGOUT
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Page Viewport */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Cart Drawer */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* TRIPLE A GYM Footer */}
      <footer className="bg-[#141414] border-t border-[#282828] pt-12 pb-8 px-6 md:px-12 mt-16">
        <div className="mx-auto max-w-[1500px] grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#282828]">
          <div className="space-y-3">
            <h3 className="font-heading font-black italic text-2xl tracking-tight text-[#FFCC00]">
              TRIPLE A GYM
            </h3>
            <p className="font-mono text-xs text-zinc-400 tracking-wider">
              INDUSTRIAL STRENGTH FITNESS.
            </p>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Built for performance, power, and real strength. Equipment, supplements, and iron community.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-3">Location</h4>
            <p className="text-xs text-zinc-300">123 Industrial Compound Drive</p>
            <p className="text-xs text-zinc-300">Iron City, NY 10001</p>
            <p className="text-xs text-zinc-400 font-mono mt-2">+1 (800) 555-IRON</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-3">Hours</h4>
            <p className="text-xs text-zinc-300">Mon - Fri: 5:00 AM - 11:00 PM</p>
            <p className="text-xs text-zinc-300">Sat - Sun: 7:00 AM - 9:00 PM</p>
            <p className="text-xs text-[#FFCC00] font-mono mt-2">24/7 PRO MEMBER ACCESS</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-3">Navigation</h4>
            <ul className="space-y-1.5 text-xs text-zinc-400 font-mono">
              <li><Link to="/shop" className="hover:text-[#FFCC00]">SHOP SUPPLEMENTS</Link></li>
              <li><Link to="/about" className="hover:text-[#FFCC00]">ABOUT OUR PROTOCOL</Link></li>
              <li><Link to="/contact" className="hover:text-[#FFCC00]">CONTACT / STEP UP</Link></li>
              <li><Link to="/help" className="hover:text-[#FFCC00]">SUPPORT & FAQs</Link></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <p>© 2024 TRIPLE A GYM. INDUSTRIAL STRENGTH FITNESS. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-zinc-300">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-zinc-300">TERMS OF SERVICE</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

