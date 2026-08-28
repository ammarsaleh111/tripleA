import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts as getProductsApi } from '../services/api/products.js';
import ProductCard from '../components/shop/ProductCard.jsx';
import ChamferCard from '../components/common/ChamferCard.jsx';
import { useAppContext } from '../context/AppContext.jsx';

const HERO_BG_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=85';
const COMMERCIAL_SHOT_IMAGE =
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=1000&q=85';

const marqueeItems = [
  '⚡ 100% AUTHENTIC FORMULATIONS',
  '🚚 FREE EXPRESS SHIPPING ON ORDERS $100+',
  '🧪 3RD PARTY INDEPENDENT LAB TESTED',
  '🛡 ZERO BANNED SUBSTANCES GUARANTEED',
  '🔬 MAXIMUM BIOAVAILABILITY & ABSORPTION',
  '🏆 100% MONEY-BACK SATISFACTION GUARANTEE',
  '🔥 PRO ATHLETE CERTIFIED QUALITY',
  '💪 ENGINEERED FOR RAW POWER & RECOVERY',
];

const categories = [
  { name: 'Protein', slug: 'protein', count: '24 Products', image: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80' },
  { name: 'Creatine', slug: 'creatine', count: '8 Products', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=400&q=80' },
  { name: 'Pre-Workout', slug: 'pre-workout', count: '15 Products', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80' },
  { name: 'Amino Acids', slug: 'amino-acids', count: '10 Products', image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=400&q=80' },
];

const testimonials = [
  { quote: "TRIPLE A supplements completely changed my recovery cycle. The Whey Isolate mix is ultra-pure.", author: "Marcus D.", product: "Titanium Whey Isolate" },
  { quote: "Nitric Surge Pre-workout gives me clean focus without any crash. Hands down the best formulation.", author: "Elena R.", product: "Ignition Pre-Workout" },
  { quote: "Pure Creatine has significantly increased my raw strength lifts. Unflavored makes stacking easy.", author: "David K.", product: "Pure Creatine Monohydrate" },
];

const mapProduct = (item) => ({
  id: item.id,
  slug: item.slug,
  defaultVariantId: Number(item.default_variant_id || item.id) || null,
  defaultVariantStock: Number(item.default_variant_stock || item.total_stock || 10),
  totalStock: Number(item.total_stock || 10),
  name: String(item.name || '').toUpperCase(),
  price: Number(item.base_price || item.price || 49.99),
  colorName: item.category_name || 'Supplements',
  imageUrl:
    item.primary_image ||
    item.imageUrl ||
    'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=800&q=80',
  isNew: Boolean(item.is_featured),
  rating: Number(item.avg_rating || 5.0),
  reviewCount: Number(item.review_count || 120),
  badgeText: item.is_featured ? 'BEST SELLER' : '',
  description: item.description || 'Premium athletic formulation.'
});

const HomePage = () => {
  const navigate = useNavigate();
  const { addCartItem } = useAppContext();
  const [products, setProducts] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [subscribedMsg, setSubscribedMsg] = useState('');
  const [countdown, setCountdown] = useState({ hours: 48, minutes: 24, seconds: 59 });
  const [cartFeedback, setCartFeedback] = useState('');
  
  // Non-blocking Intro Screen Overlay State
  const [showIntroOverlay, setShowIntroOverlay] = useState(false);
  const [isIntroFading, setIsIntroFading] = useState(false);
  const [activeReview, setActiveReview] = useState(0);

  // Play intro sequence smoothly once per session without trapping the render
  useEffect(() => {
    const hasSeen = sessionStorage.getItem('triplea_intro_seen');
    if (!hasSeen) {
      setShowIntroOverlay(true);
      sessionStorage.setItem('triplea_intro_seen', 'true');
      
      const timer1 = setTimeout(() => {
        setIsIntroFading(true);
      }, 1800);

      const timer2 = setTimeout(() => {
        setShowIntroOverlay(false);
      }, 2500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, []);

  // Countdown timer decrement
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 48, minutes: 24, seconds: 59 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Staggered Scroll Reveal Triggers
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll, .reveal-scale, .reveal-left, .reveal-right');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [products]);

  // Load products list from API
  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const response = await getProductsApi({ sort_by: 'featured', limit: 8, page: 1 });
        const mapped = Array.isArray(response?.data) ? response.data.map(mapProduct) : [];
        if (isMounted) {
          setProducts(mapped);
        }
      } catch {
        if (isMounted) setProducts([]);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Claim Offer CTA handlers
  const handleClaimOffer = async (slug, variantId, name, price, category, imageUrl) => {
    if (!variantId) return;
    const result = await addCartItem({
      variantId,
      quantity: 1,
      optimisticItem: {
        id: `temp-${variantId}`,
        cartItemId: `temp-${variantId}`,
        variantId,
        productId: variantId,
        slug,
        name,
        variant: category || 'Standard',
        unitPrice: Number(price),
        quantity: 1,
        imageUrl,
      },
    });

    if (result.success) {
      setCartFeedback(`Added ${name} to cart!`);
      setTimeout(() => setCartFeedback(''), 2500);
    }
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setSubscribedMsg('ACCESS GRANTED. CHECK YOUR EMAIL FOR REDEMPTION.');
    setEmailInput('');
    setTimeout(() => setSubscribedMsg(''), 4000);
  };

  const formatNumber = (num) => String(num).padStart(2, '0');

  // Swipe carousel controls
  const handleScrollCarousel = (direction) => {
    const el = document.getElementById('arrivals-tray');
    if (el) {
      const scrollAmt = direction === 'left' ? -340 : 340;
      el.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#050506] text-white font-sans overflow-x-hidden space-y-24 md:space-y-32 pb-16 relative">
      
      {/* NON-BLOCKING INTRO SCREEN OVERLAY (Fades smoothly out without trapping page mounting) */}
      {showIntroOverlay && (
        <div
          className={`fixed inset-0 z-[100] bg-[#050506] flex flex-col items-center justify-center space-y-5 transition-opacity duration-700 ${
            isIntroFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <h1 className="font-heading font-black text-6xl md:text-7xl tracking-tighter text-[#FFCC00] animate-intro-logo">
            TRIPLE A
          </h1>
          <div className="h-[2px] bg-[#FFCC00] animate-intro-line" />
          <p className="font-mono text-xs tracking-[0.25em] text-zinc-400 uppercase font-semibold">
            FUEL YOUR PERFORMANCE
          </p>
        </div>
      )}

      {/* SECTION 1: CINEMATIC HERO */}
      <section className="relative min-h-[92vh] flex items-center justify-center bg-black overflow-hidden">
        {/* Parallax background overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_BG_IMAGE}
            alt="Triple A Supplement Launch Banner"
            className="h-full w-full object-cover opacity-25 filter grayscale contrast-125 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-black/50 to-black/85" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-28 text-center space-y-8">
          {/* Tagline pill */}
          <div className="inline-flex items-center gap-2.5 border border-[#FFCC00]/40 bg-black/80 px-5 py-2 rounded-full backdrop-blur-md shadow-lg transition-all hover:border-[#FFCC00] cursor-default">
            <span className="w-2 h-2 rounded-full bg-[#FFCC00] animate-ping" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#FFCC00] font-extrabold">
              ELITE NUTRITION STACK
            </span>
          </div>

          {/* Main Display Heading */}
          <h1 className="font-heading font-black text-5xl sm:text-7xl md:text-8xl tracking-tight uppercase leading-[0.9] text-white">
            FUEL YOUR
            <br />
            <span className="text-[#FFCC00] bg-clip-text">PERFORMANCE.</span>
          </h1>

          {/* Slogan details */}
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-300 leading-relaxed uppercase tracking-wider font-mono">
            Premium supplements engineered to help you train harder, recover better, and perform at your best.
          </p>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/shop"
              className="bg-[#FFCC00] hover:bg-yellow-300 text-black font-heading font-black text-xs px-10 py-4 rounded-xl uppercase tracking-widest shadow-lg hover:shadow-[0_0_25px_rgba(255,204,0,0.4)] transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              SHOP SUPPLEMENTS <span>→</span>
            </Link>
            <Link
              to="/shop?sort_by=featured"
              className="border border-zinc-700 bg-black/60 hover:bg-white hover:text-black text-white font-heading font-bold text-xs px-10 py-4 rounded-xl uppercase tracking-widest backdrop-blur-md transition-all hover:-translate-y-0.5"
            >
              EXPLORE BEST SELLERS
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2: INFINITE TICKER MARQUEE SLIDER (Directly under Hero) */}
      <section className="relative overflow-hidden bg-[#0A0A0E] border-y border-[#1D1D26] py-5 z-20">
        <div className="animate-marquee-slow flex items-center gap-12 whitespace-nowrap select-none">
          {[...marqueeItems, ...marqueeItems].map((item, idx) => (
            <span
              key={idx}
              className="font-mono text-xs uppercase tracking-widest text-zinc-300 font-bold flex items-center gap-3 shrink-0"
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* SECTION 3: ENHANCED WHY TRIPLE A (Moved immediately after Hero & Slider) */}
      <section className="mx-auto max-w-[1500px] px-6 space-y-12 reveal-on-scroll">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
            THE TRIPLE A STANDARD
          </span>
          <h2 className="font-heading font-black text-4xl sm:text-5xl uppercase text-white tracking-tight">
            WHY <span className="text-[#FFCC00]">TRIPLE A?</span>
          </h2>
          <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider leading-relaxed">
            Uncompromising purity, high bioavailability, and formulations certified for elite performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="group bg-[#0B0B0F] border border-[#1C1C26] hover:border-[#FFCC00]/50 p-8 rounded-xl space-y-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_rgba(255,204,0,0.08)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-4xl">🧪</span>
              <span className="font-mono text-xs font-bold text-[#FFCC00] bg-[#14141E] px-2.5 py-1 rounded-md border border-[#222230]">01</span>
            </div>
            <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors">
              PURE QUALITY
            </h3>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
              Every batch undergoes independent HPLC lab testing to verify exact profile purity and dosage potency.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group bg-[#0B0B0F] border border-[#1C1C26] hover:border-[#FFCC00]/50 p-8 rounded-xl space-y-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_rgba(255,204,0,0.08)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-4xl">🏃‍♂️</span>
              <span className="font-mono text-xs font-bold text-[#FFCC00] bg-[#14141E] px-2.5 py-1 rounded-md border border-[#222230]">02</span>
            </div>
            <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors">
              ATHLETE TESTED
            </h3>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
              Engineered specifically for high-intensity athletes demanding clean energy without crashing.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group bg-[#0B0B0F] border border-[#1C1C26] hover:border-[#FFCC00]/50 p-8 rounded-xl space-y-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_rgba(255,204,0,0.08)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-4xl">🛡</span>
              <span className="font-mono text-xs font-bold text-[#FFCC00] bg-[#14141E] px-2.5 py-1 rounded-md border border-[#222230]">03</span>
            </div>
            <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors">
              AUTHENTICITY
            </h3>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
              Zero proprietary blends. Complete 100% ingredient transparency printed on every label.
            </p>
          </div>

          {/* Card 4 */}
          <div className="group bg-[#0B0B0F] border border-[#1C1C26] hover:border-[#FFCC00]/50 p-8 rounded-xl space-y-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_rgba(255,204,0,0.08)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-4xl">🏆</span>
              <span className="font-mono text-xs font-bold text-[#FFCC00] bg-[#14141E] px-2.5 py-1 rounded-md border border-[#222230]">04</span>
            </div>
            <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors">
              ELITE RESULTS
            </h3>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
              Rapid digestive absorption profiles designed to fuel muscle repair and strength gains.
            </p>
          </div>

        </div>
      </section>

      {/* SECTION 4: PRODUCT CATEGORIES */}
      <section className="mx-auto max-w-[1500px] px-6 space-y-8 reveal-on-scroll">
        <div className="border-b border-[#1C1C24] pb-6 flex items-end justify-between">
          <div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase text-white">
              SHOP BY <span className="text-[#FFCC00]">CATEGORY</span>
            </h2>
            <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mt-1">
              Select your targeted supplement category.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.slug}
              onClick={() => navigate(`/shop?category=${cat.slug}`)}
              className="group relative aspect-[4/5] bg-[#0E0E11] border border-[#1A1A22] rounded-xl overflow-hidden cursor-pointer hover:border-[#FFCC00]/50 transition-all duration-500 hover:shadow-2xl"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover opacity-30 filter grayscale group-hover:scale-108 group-hover:rotate-1 group-hover:opacity-45 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
              </div>

              <div className="absolute inset-0 z-10 p-6 flex flex-col justify-end space-y-2">
                <span className="font-mono text-[10px] text-[#FFCC00] uppercase tracking-widest font-extrabold">{cat.count}</span>
                <h3 className="font-heading font-black text-3xl uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors flex items-center justify-between">
                  {cat.name} <span className="text-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">→</span>
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: FLAGSHIP COMMERCIAL PRODUCT FEATURE */}
      <section className="mx-auto max-w-[1500px] px-6 reveal-on-scroll">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0B0B0E] border border-[#1C1C26] p-8 lg:p-16 rounded-2xl relative overflow-hidden">
          
          <div className="lg:col-span-6 space-y-6 z-10">
            <div className="inline-flex items-center gap-2 bg-[#FFCC00]/10 border border-[#FFCC00]/30 px-3.5 py-1 rounded-full">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFCC00] font-extrabold">FLAGSHIP FORMULA</span>
            </div>

            <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl uppercase text-white leading-[0.9] tracking-tight">
              PERFORMANCE
              <br />
              STARTS <span className="text-[#FFCC00]">HERE.</span>
            </h2>

            <p className="text-sm text-zinc-400 font-mono uppercase tracking-wider leading-relaxed">
              Unlock ultimate bioavailability with cold-filtered Whey Isolate. Clean formulation, zero fillers, engineered for explosive athletic results.
            </p>

            <ul className="space-y-3 font-mono text-xs text-zinc-300 pt-2">
              <li className="flex items-center gap-3"><span className="text-[#FFCC00] font-bold text-base">✓</span> 27G ULTRA-PURE PROTEIN PER SCOOP</li>
              <li className="flex items-center gap-3"><span className="text-[#FFCC00] font-bold text-base">✓</span> 0G ADDED SUGARS & ZERO FILLERS</li>
              <li className="flex items-center gap-3"><span className="text-[#FFCC00] font-bold text-base">✓</span> 100% GRASS-FED ISOLATE SOURCE</li>
            </ul>

            <div className="pt-4 flex items-center gap-4">
              <Link to="/products/triplea-whey-isolate" className="bg-[#FFCC00] hover:bg-yellow-300 text-black font-heading font-bold text-xs px-8 py-3.5 rounded-xl uppercase tracking-widest transition-all shadow-md">
                VIEW FORMULATION SPECIFICATIONS
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 aspect-square w-full max-w-md mx-auto overflow-hidden bg-[#050506] border border-[#1C1C26] rounded-full p-8 flex items-center justify-center relative shadow-2xl">
            <img
              src={COMMERCIAL_SHOT_IMAGE}
              alt="Whey Isolate flagship visual spotlight"
              className="max-h-[85%] max-w-[85%] object-contain filter contrast-125 brightness-95 rotate-3 hover:rotate-6 hover:scale-105 transition-transform duration-500 z-10"
            />
            <div className="absolute inset-0 bg-radial-gradient from-[#FFCC00]/15 to-transparent blur-3xl z-0" />
          </div>

        </div>
      </section>

      
      {/* SECTION 7: BEST SELLERS */}
      <section className="mx-auto max-w-[1500px] px-6 space-y-8 reveal-on-scroll">
        <div className="flex items-end justify-between pb-6 border-b border-[#1C1C24]">
          <div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase text-white">
              BEST <span className="text-[#FFCC00]">SELLERS</span>
            </h2>
            <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider mt-1">
              Proven formulations trusted by serious athletes worldwide.
            </p>
          </div>
          <Link
            to="/shop"
            className="font-mono text-xs text-[#FFCC00] hover:underline uppercase tracking-widest font-bold shrink-0 hidden sm:block"
          >
            Shop All →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* SECTION 8: PERFORMANCE DEALS */}
      <section className="mx-auto max-w-[1500px] px-6 space-y-8 reveal-on-scroll">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1C1C24]">
          <div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase text-white">
              PERFORMANCE <span className="text-[#FFCC00]">DEALS</span>
            </h2>
            <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider mt-1">
              Exclusive pricing on flagship nutrition.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#0B0B0E] border border-[#1C1C26] px-5 py-2.5 rounded-lg font-mono text-xs text-zinc-300 shrink-0 pulse-glow-deal">
            <span>ENDS IN</span>
            <span className="text-[#FFCC00] font-black tracking-widest text-sm">
              {formatNumber(countdown.hours)}H : {formatNumber(countdown.minutes)}M : {formatNumber(countdown.seconds)}S
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-[#0B0B0E] border border-[#1C1C26] p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center rounded-xl hover:border-[#FFCC00]/40 transition-all duration-300">
            <div className="w-40 h-40 bg-[#050506] border border-[#16161F] rounded-2xl p-4 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80"
                alt="Titanium Whey Protein"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex-1 space-y-4 text-center sm:text-left w-full">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="bg-[#FF4A4A] text-white font-mono font-bold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  SAVE 30%
                </span>
                <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">LIMITED TIME DROP</span>
              </div>

              <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white leading-none">
                TITANIUM WHEY
              </h3>
              <p className="text-xs font-mono text-zinc-400">
                Hydrolyzed isolate, 30g Protein per scoop. Ultimate bioavailability.
              </p>

              <div className="flex items-baseline justify-center sm:justify-start gap-3">
                <span className="font-heading font-black text-3xl text-[#FFCC00]">$48.99</span>
                <span className="font-heading text-sm text-zinc-500 line-through">$69.99</span>
              </div>

              <button
                type="button"
                onClick={() => handleClaimOffer('triplea-whey-isolate', 1, 'TITANIUM WHEY', 48.99, 'Protein', 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80')}
                className="bg-[#FFCC00] hover:bg-yellow-300 text-black font-heading font-bold text-xs px-6 py-3 rounded-lg w-full transition-all shadow-md"
              >
                CLAIM OFFER
              </button>
            </div>
          </div>

          <div className="bg-[#0B0B0E] border border-[#1C1C26] p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center rounded-xl hover:border-[#FFCC00]/40 transition-all duration-300">
            <div className="w-40 h-40 bg-[#050506] border border-[#16161F] rounded-2xl p-4 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80"
                alt="Ignition Pre-Workout"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex-1 space-y-4 text-center sm:text-left w-full">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="bg-[#FFCC00] text-black font-mono font-bold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  BUY 1 GET 1
                </span>
                <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">BOGO EXCLUSIVE</span>
              </div>

              <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white leading-none">
                IGNITION PRE
              </h3>
              <p className="text-xs font-mono text-zinc-400">
                High-Stimulant Focus Matrix. Pure adrenaline.
              </p>

              <div className="flex items-baseline justify-center sm:justify-start gap-3">
                <span className="font-heading font-black text-3xl text-[#FFCC00]">$39.99</span>
              </div>

              <button
                type="button"
                onClick={() => handleClaimOffer('nitric-surge-preworkout', 3, 'IGNITION PRE', 39.99, 'Pre-Workout', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80')}
                className="border border-[#22222E] hover:border-[#FFCC00] bg-[#14141E] hover:bg-[#FFCC00] text-white hover:text-black font-heading font-bold text-xs px-6 py-3 rounded-lg w-full transition-all"
              >
                ADD TO CART
              </button>
            </div>
          </div>

        </div>

        {cartFeedback && (
          <p className="text-center font-mono text-xs text-[#FFCC00] font-bold animate-pulse">
            {cartFeedback}
          </p>
        )}
      </section>

    
      {/* SECTION 10: CUSTOMER REVIEWS */}
      <section className="mx-auto max-w-[1500px] px-6 reveal-scale">
        <div className="bg-[#0B0B0E] border border-[#1C1C26] rounded-2xl p-8 sm:p-16 text-center space-y-6 relative overflow-hidden">
          
          <span className="text-5xl text-[#FFCC00]">“</span>

          <div className="min-h-[120px] flex items-center justify-center">
            <p className="text-lg sm:text-2xl font-medium text-zinc-200 italic max-w-3xl leading-relaxed transition-all duration-500 animate-fadeIn">
              {testimonials[activeReview].quote}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-heading font-bold text-base text-[#FFCC00] uppercase tracking-widest">{testimonials[activeReview].author}</h4>
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Verified Buyer &bull; {testimonials[activeReview].product}</span>
          </div>

          <div className="flex items-center justify-center gap-2 pt-4">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveReview(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  activeReview === i ? 'bg-[#FFCC00] w-6' : 'bg-zinc-800'
                }`}
                aria-label={`Testimonial dot ${i + 1}`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 11: INSTAGRAM GALLERY */}
      <section className="mx-auto max-w-[1500px] px-6 space-y-8 reveal-on-scroll">
        <div className="border-b border-[#1C1C24] pb-6 text-center">
          <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase text-white">
            WE ARE <span className="text-[#FFCC00]">TRIPLE A</span>
          </h2>
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mt-1">
            Join the elite community on Instagram #TripleAElite.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80'
          ].map((url, i) => (
            <div
              key={i}
              className="group relative aspect-square bg-[#0B0B0E] border border-[#1C1C26] rounded-xl overflow-hidden"
            >
              <img
                src={url}
                alt="Instagram Athlete Feed"
                className="w-full h-full object-cover opacity-60 filter grayscale group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-85 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                <span className="font-mono text-xs text-[#FFCC00] font-bold uppercase tracking-widest">@TRIPLEA_ATHLETICS</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 12: LEVEL UP NEWSLETTER */}
      <section className="mx-auto max-w-[1500px] px-6">
        <ChamferCard className="p-8 sm:p-16 text-center max-w-4xl mx-auto space-y-6 bg-[#0B0B0E] border border-[#1C1C26] rounded-2xl relative overflow-hidden">
          <h2 className="font-heading font-black text-4xl sm:text-5xl uppercase text-white leading-none tracking-tight">
            LEVEL UP YOUR <span className="text-[#FFCC00]">PERFORMANCE.</span>
          </h2>
          <p className="font-mono text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto uppercase tracking-wider leading-relaxed">
            Get supplement advice, new product drops, and exclusive offers.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2 z-10 relative">
            <input
              type="email"
              placeholder="ENTER YOUR EMAIL"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 bg-[#050506] border border-[#1C1C26] text-white px-4 py-3.5 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-xl placeholder:text-zinc-600"
              required
            />
            <button type="submit" className="bg-[#FFCC00] hover:bg-yellow-300 text-black font-heading font-bold text-xs px-8 py-3.5 rounded-xl uppercase tracking-widest transition-all">
              JOIN TRIPLE A
            </button>
          </form>

          {subscribedMsg && (
            <p className="font-mono text-xs text-[#FFCC00] font-bold animate-pulse pt-2">
              {subscribedMsg}
            </p>
          )}

          <div className="absolute inset-0 bg-gradient-to-tr from-[#FFCC00]/5 to-transparent blur-3xl z-0" />
        </ChamferCard>
      </section>

    </div>
  );
};

export default HomePage;
