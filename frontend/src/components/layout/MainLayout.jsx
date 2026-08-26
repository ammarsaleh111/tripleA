import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';
import ThemeControls from '../common/ThemeControls.jsx';
import CartSidebar from '../shop/CartSidebar.jsx';
import { getProducts as getProductsApi } from '../../services/api/products.js';

const links = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About Us' },
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
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
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
  const [isScrolled, setIsScrolled] = useState(false);

  // Search Overlay States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // Fetch product catalog once for local fuzzy lookup
  useEffect(() => {
    const loadProductsForSearch = async () => {
      try {
        const response = await getProductsApi({ limit: 40 });
        if (response?.data) {
          setAllProducts(response.data);
        }
      } catch {
        // Safe static fallback items matching database seed
        setAllProducts([
          { id: 1, name: 'Iso-Surge Elite Whey', slug: 'triplea-whey-isolate', category_name: 'Protein', base_price: 59.99, primary_image: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80' },
          { id: 3, name: 'Ignition Protocol V2', slug: 'nitric-surge-preworkout', category_name: 'Pre-Workout', base_price: 44.99, primary_image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80' },
          { id: 4, name: 'Hydra-Surge BCAA', slug: 'bcaa-recovery-matrix', category_name: 'Amino Acids', base_price: 34.99, primary_image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=400&q=80' },
          { id: 2, name: 'Pure Creatine Monohydrate', slug: 'pure-creatine-monohydrate', category_name: 'Creatine', base_price: 24.99, primary_image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=400&q=80' },
        ]);
      }
    };
    loadProductsForSearch();
  }, []);

  // Filter query matches dynamically
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = allProducts.filter((item) =>
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.category_name || '').toLowerCase().includes(q)
    );
    setSearchResults(matches.slice(0, 5));
  }, [searchQuery, allProducts]);

  // Monitor Window Scroll height
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Trigger page searches
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchOpen(false);
    navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSuggestionClick = (slug) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/products/${slug}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] overflow-x-hidden text-[#FFF8E7] flex flex-col font-sans">
      {/* Header (Transitioning padding and background opacity on scroll) */}
      <header className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        isScrolled
          ? 'py-3.5 bg-[#0A0A0B]/95 border-[#1A1A1E] backdrop-blur-md shadow-lg'
          : 'py-5 bg-transparent border-transparent'
      }`}>
        <div className="mx-auto max-w-[1500px] px-6 md:px-12 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-heading font-black text-2xl tracking-tighter text-[#FFCC00] group-hover:text-yellow-300 transition-colors">
              TRIPLE A
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-10">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `font-heading font-bold text-xs uppercase tracking-widest transition-colors relative py-1 ${
                    isActive
                      ? 'text-[#FFCC00]'
                      : 'text-zinc-400 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FFCC00] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons & Join Now Button */}
          <div className="flex items-center gap-4">
            {/* Search trigger overlay */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-zinc-300 hover:text-[#FFCC00] transition-colors"
              aria-label="Search items"
            >
              <SearchIcon />
            </button>

            {/* Cart Trigger */}
            <button
              type="button"
              className="relative p-2 text-zinc-300 hover:text-[#FFCC00] transition-colors flex items-center gap-1.5"
              aria-label="Open cart"
              onClick={() => setIsCartOpen(true)}
            >
              <CartIcon />
              {cartItemCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-[#FFCC00] text-black font-mono font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 bg-zinc-800 text-zinc-400 font-mono font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  0
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
                  <div className="absolute right-0 mt-2 w-48 bg-[#141416] border border-[#222225] p-3 shadow-2xl z-50 rounded-sm">
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
                <div className="absolute right-0 top-full mt-0 w-48 bg-[#141416] border border-[#222225] p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50 rounded-sm">
                  <Link
                    to={dashboardRoute}
                    className="block px-3 py-2 text-xs font-mono text-zinc-300 hover:text-[#FFCC00] hover:bg-[#1E1E22]"
                  >
                    DASHBOARD
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/auth', { replace: true });
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-red-400 hover:bg-[#1E1E22]"
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
          <div className="w-4/5 max-w-xs bg-[#141416] border-l border-[#222225] p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#222225]">
                <span className="font-heading font-black text-xl text-[#FFCC00]">
                  TRIPLE A
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <CloseIcon />
                </button>
              </div>

              <nav className="mt-6 flex flex-col gap-5">
                {links.map((link) => (
                  <NavLink
                    key={`mob-${link.to}`}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `font-heading font-extrabold text-lg tracking-wider uppercase ${
                        isActive ? 'text-[#FFCC00]' : 'text-zinc-300'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="border-t border-[#222225] pt-6 space-y-3">
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

      {/* Footer */}
      <footer className="bg-[#141416] border-t border-[#222225] pt-16 pb-8 px-6 md:px-12 mt-16">
        <div className="mx-auto max-w-[1500px] grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#222225]">
          <div className="space-y-4">
            <h3 className="font-heading font-black text-2xl tracking-tight text-[#FFCC00]">
              TRIPLE A
            </h3>
            <p className="font-mono text-xs text-zinc-400 tracking-wider">
              ELITE STATUS GUARANTEED.
            </p>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Uncompromising power, precision, and elite status definition. Engineered for performance, power, and real strength.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">Shop</h4>
            <ul className="space-y-2 text-xs text-zinc-400 font-mono">
              <li><Link to="/shop" className="hover:text-[#FFCC00]">Shop All</Link></li>
              <li><Link to="/shop?sort_by=newest" className="hover:text-[#FFCC00]">New Arrivals</Link></li>
              <li><Link to="/shop?sort_by=featured" className="hover:text-[#FFCC00]">Best Sellers</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">Support</h4>
            <ul className="space-y-2 text-xs text-zinc-400 font-mono">
              <li><Link to="/help" className="hover:text-[#FFCC00]">Returns</Link></li>
              <li><Link to="/help" className="hover:text-[#FFCC00]">Shipping Policy</Link></li>
              <li><Link to="/contact" className="hover:text-[#FFCC00]">Contact Us</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">Legal</h4>
            <ul className="space-y-2 text-xs text-zinc-400 font-mono">
              <li><Link to="/privacy" className="hover:text-[#FFCC00]">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#FFCC00]">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <p>© 2026 TRIPLE A SUPPLEMENTS. ELITE STATUS GUARANTEED.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-zinc-300">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-zinc-300">TERMS OF SERVICE</Link>
          </div>
        </div>
      </footer>
      {/* Fullscreen Search Overlay Dialog */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-[#050506]/95 backdrop-blur-lg flex items-start justify-center search-modal-enter">
          <div className="w-full max-w-2xl px-6 pt-24 space-y-8 search-content-enter">
            
            {/* Header / Dismiss */}
            <div className="flex items-center justify-between border-b border-[#222225] pb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold">Search TRIPLE A</span>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="text-zinc-400 hover:text-white transition-colors p-1"
                aria-label="Close search"
              >
                ✕ Close
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="WHAT ARE YOU LOOKING FOR?"
                className="w-full bg-transparent text-white font-heading font-black text-3xl md:text-4xl placeholder-zinc-700 outline-none uppercase"
              />
            </form>

            {/* Suggestion list */}
            <div className="space-y-6 pt-4">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Matching Suggestions</span>
                  <div className="divide-y divide-[#1D1D20]">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSuggestionClick(item.slug)}
                        className="flex items-center gap-4 py-3 cursor-pointer group transition-colors"
                      >
                        <div className="w-12 h-12 bg-[#141416] border border-[#222225] p-1 flex items-center justify-center overflow-hidden shrink-0 rounded-sm">
                          <img
                            src={item.primary_image || item.imageUrl || 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=100&q=80'}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold uppercase text-zinc-200 group-hover:text-[#FFCC00] transition-colors truncate">
                            {item.name}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{item.category_name || item.colorName}</span>
                        </div>
                        <span className="font-mono text-xs text-[#FFCC00] font-bold shrink-0">${Number(item.base_price || item.price || 49.99).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchQuery.trim() ? (
                <p className="text-zinc-500 font-mono text-xs uppercase">No matching supplement formulations found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Popular Categories */}
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Popular Categories</span>
                    <div className="flex flex-wrap gap-2">
                      {['Protein', 'Creatine', 'Pre-Workout', 'Amino Acids'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            navigate(`/shop?category=${cat.toLowerCase()}`);
                          }}
                          className="px-3.5 py-1.5 bg-[#141416] border border-[#222225] hover:border-zinc-700 text-xs font-mono rounded-sm text-zinc-300 transition-colors uppercase tracking-wider"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hot Drops */}
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Hot Drops</span>
                    <ul className="space-y-2.5 font-mono text-xs text-zinc-400">
                      <li>
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick('triplea-whey-isolate')}
                          className="hover:text-[#FFCC00] transition-colors uppercase tracking-wider text-left"
                        >
                          🔥 Iso-Surge Elite Whey Protein
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick('pure-creatine-monohydrate')}
                          className="hover:text-[#FFCC00] transition-colors uppercase tracking-wider text-left"
                        >
                          ⚡ Pure Creatine Monohydrate
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;

