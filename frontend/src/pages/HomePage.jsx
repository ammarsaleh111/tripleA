import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts as getProductsApi } from '../services/api/products.js';
import ProductCard from '../components/shop/ProductCard.jsx';
import ChamferCard from '../components/common/ChamferCard.jsx';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=85';
const GYM_FLOOR_IMAGE =
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=80';

const fallbackProducts = [
  {
    id: 'whey-isolate',
    slug: 'triple-a-whey-isolate',
    defaultVariantId: 101,
    totalStock: 15,
    name: 'TRIPLE A WHEY ISOLATE',
    price: 49.99,
    colorName: 'Supplements',
    imageUrl: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=800&q=80',
    isNew: true,
    rating: 5,
    reviewCount: 128,
    badgeText: 'BEST SELLER',
  },
  {
    id: 'pure-creatine',
    slug: 'pure-creatine-monohydrate',
    defaultVariantId: 102,
    totalStock: 3,
    name: 'PURE CREATINE',
    price: 24.99,
    colorName: 'Supplements',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
    isNew: false,
    rating: 5,
    reviewCount: 84,
    badgeText: 'LOW STOCK: 3 LEFT',
  },
  {
    id: 'nitric-surge',
    slug: 'nitric-surge-preworkout',
    defaultVariantId: 103,
    totalStock: 20,
    name: 'NITRIC SURGE PRE',
    price: 39.99,
    colorName: 'Supplements',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    isNew: true,
    rating: 5,
    reviewCount: 210,
    badgeText: 'HOT DROP',
  },
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
  rating: Number(item.avg_rating || 5),
  reviewCount: Number(item.review_count || 96),
  badgeText: item.is_featured ? 'BEST SELLER' : '',
});

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [subscribedMsg, setSubscribedMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const response = await getProductsApi({ sort_by: 'featured', limit: 3, page: 1 });
        const mapped = Array.isArray(response?.data) ? response.data.map(mapProduct) : [];
        if (isMounted) setProducts(mapped.length ? mapped : fallbackProducts);
      } catch {
        if (isMounted) setProducts(fallbackProducts);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setSubscribedMsg('ACCESS GRANTED. CHECK YOUR INBOX FOR YOUR VIP CODE.');
    setEmailInput('');
    setTimeout(() => setSubscribedMsg(''), 4000);
  };

  const displayProducts = products.length ? products : fallbackProducts;

  return (
    <div className="bg-[#0A0A0A] text-[#FFF8E7] font-sans overflow-x-hidden space-y-20 pb-16">
      
      {/* SECTION 1: HERO */}
      <section className="relative min-h-[85vh] flex items-center justify-center border-b border-[#282828] bg-black pt-16">
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_IMAGE}
            alt="Triple A Gym Industrial Floor"
            className="h-full w-full object-cover opacity-35 filter grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-black/60 to-black/80" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center space-y-6">
          <h1 className="font-heading font-black italic text-5xl sm:text-7xl md:text-8xl tracking-tight uppercase leading-none text-[#FFCC00] drop-shadow-2xl">
            UNLEASH YOUR
            <br />
            <span className="text-white">POTENTIAL</span>
          </h1>

          <p className="mx-auto max-w-xl font-mono text-xs sm:text-sm text-zinc-400 leading-relaxed uppercase tracking-wider">
            worked in strength essentials like no other - build your peak potential with equipment designed to standard in supreme limits - non stop
          </p>

          <div className="pt-4">
            <Link
              to="/shop"
              className="btn-primary inline-block text-base px-10 py-4 shadow-[0_0_30px_rgba(255,204,0,0.3)]"
            >
              START TRAINING
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE ARSENAL */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="flex items-center justify-between pb-6 border-b border-[#282828] mb-8">
          <h2 className="font-heading font-black italic text-3xl sm:text-4xl uppercase text-white">
            THE ARSENAL
          </h2>
          <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest">
            May 12 Release
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <ChamferCard className="p-8 space-y-4">
            <div className="w-10 h-10 bg-[#FFCC00] text-black font-mono font-bold flex items-center justify-center text-lg chamfer-badge">
              ⚡
            </div>
            <h3 className="font-heading font-black italic text-xl uppercase text-white">
              ELITE EQUIPMENT
            </h3>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Heavy duty power racks, Olympic barbells, and calibrated plates designed for maximum output.
            </p>
          </ChamferCard>

          {/* Card 2 */}
          <ChamferCard className="p-8 space-y-4">
            <div className="w-10 h-10 bg-[#FFCC00] text-black font-mono font-bold flex items-center justify-center text-lg chamfer-badge">
              ⏱
            </div>
            <h3 className="font-heading font-black italic text-xl uppercase text-white">
              24/7 ACCESS
            </h3>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Zero excuses, open 24 hours. Keycard access for dedicated lifters, anytime day or night.
            </p>
          </ChamferCard>

          {/* Card 3 */}
          <ChamferCard className="p-8 space-y-4">
            <div className="w-10 h-10 bg-[#FFCC00] text-black font-mono font-bold flex items-center justify-center text-lg chamfer-badge">
              🏋️
            </div>
            <h3 className="font-heading font-black italic text-xl uppercase text-white">
              IRON COMMUNITY
            </h3>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              Train alongside dedicated powerlifters and athletes in a focused, high-energy environment built for progress.
            </p>
          </ChamferCard>
        </div>
      </section>

      {/* SECTION 3: THE FLOOR */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="flex items-center justify-between pb-6 border-b border-[#282828] mb-8">
          <h2 className="font-heading font-black italic text-3xl sm:text-4xl uppercase text-white">
            THE FLOOR
          </h2>
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
            02/03
          </span>
        </div>

        <div className="relative aspect-[21/9] w-full overflow-hidden bg-[#141414] border border-[#282828] p-3 chamfer-box-lg">
          <img
            src={GYM_FLOOR_IMAGE}
            alt="The Floor Gym Facility"
            className="w-full h-full object-cover filter contrast-125 brightness-90"
          />
        </div>
      </section>

      {/* SECTION 4: COMMITMENT (MEMBERSHIPS) */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="flex items-center justify-between pb-6 border-b border-[#282828] mb-8">
          <h2 className="font-heading font-black italic text-3xl sm:text-4xl uppercase text-white">
            COMMITMENT
          </h2>
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
            03/05
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Standard Tier */}
          <ChamferCard className="p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="font-heading font-black italic text-2xl uppercase text-white">
                STANDARD
              </h3>
              <div className="font-heading font-black italic text-4xl text-[#FFCC00]">
                $50 <span className="text-xs font-mono font-normal text-zinc-400">/ mo</span>
              </div>
              <ul className="space-y-3 font-mono text-xs text-zinc-300">
                <li className="flex items-center gap-2"><span className="text-[#FFCC00]">✓</span> Hardcore Floor Access</li>
                <li className="flex items-center gap-2"><span className="text-[#FFCC00]">✓</span> Locker Room Access</li>
                <li className="flex items-center gap-2"><span className="text-[#FFCC00]">✓</span> Open Training Hours</li>
              </ul>
            </div>
            <Link to="/auth?tab=register" className="btn-secondary w-full py-3 text-center block">
              SELECT
            </Link>
          </ChamferCard>

          {/* Pro Athlete Tier (Yellow Highlighted) */}
          <div className="bg-[#FFCC00] text-black p-8 flex flex-col justify-between space-y-6 chamfer-box shadow-[0_0_40px_rgba(255,204,0,0.25)]">
            <div className="space-y-4">
              <div className="inline-block bg-black text-[#FFCC00] font-mono font-bold text-[10px] uppercase tracking-widest px-3 py-1 chamfer-badge">
                MOST POPULAR
              </div>
              <h3 className="font-heading font-black italic text-3xl uppercase text-black">
                PRO ATHLETE
              </h3>
              <div className="font-heading font-black italic text-4xl text-black">
                $85 <span className="text-xs font-mono font-normal text-zinc-800">/ mo</span>
              </div>
              <ul className="space-y-3 font-mono text-xs text-black font-semibold">
                <li className="flex items-center gap-2"><span>✓</span> Hardcore Floor Access</li>
                <li className="flex items-center gap-2"><span>✓</span> Recovery Suite Access</li>
                <li className="flex items-center gap-2"><span>✓</span> 24/7 Unlimited Access</li>
                <li className="flex items-center gap-2"><span>✓</span> Weekly Training Program</li>
              </ul>
            </div>
            <Link to="/auth?tab=register" className="bg-black text-[#FFCC00] font-heading font-black italic uppercase text-center py-3.5 px-6 hover:bg-zinc-900 transition-colors chamfer-btn block">
              SELECT PRO
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 5: MOST SELLING PRODUCTS */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="flex items-center justify-between pb-6 border-b border-[#282828] mb-8">
          <h2 className="font-heading font-black italic text-3xl sm:text-4xl uppercase text-white">
            MOST SELLING
          </h2>
          <Link to="/shop" className="font-mono text-xs text-[#FFCC00] hover:underline uppercase tracking-widest">
            Shop All →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {displayProducts.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center pt-8">
          <Link to="/shop" className="btn-outlined inline-block text-xs px-8 py-3">
            VIEW ALL PRODUCTS
          </Link>
        </div>
      </section>

      {/* SECTION 6: OPERATING HOURS */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="flex items-center justify-between pb-6 border-b border-[#282828] mb-8">
          <h2 className="font-heading font-black italic text-3xl sm:text-4xl uppercase text-white">
            OPERATING HOURS
          </h2>
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
            Schedule
          </span>
        </div>

        <ChamferCard className="p-8 max-w-4xl mx-auto divide-y divide-[#222222]">
          <div className="flex flex-col sm:flex-row justify-between py-4 font-mono text-sm gap-2">
            <span className="text-zinc-400 uppercase">Monday - Friday</span>
            <span className="text-[#FFCC00] font-bold">5:00 AM - 11:00 PM</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between py-4 font-mono text-sm gap-2">
            <span className="text-zinc-400 uppercase">Saturday - Sunday</span>
            <span className="text-[#FFCC00] font-bold">7:00 AM - 9:00 PM</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between py-4 font-mono text-sm gap-2">
            <span className="text-zinc-400 uppercase">Pro Athlete Members</span>
            <span className="text-white font-bold">24/7 KEYCARD ACCESS</span>
          </div>
        </ChamferCard>
      </section>

      {/* SECTION 7: THE COMPOUND */}
      <section className="mx-auto max-w-[1500px] px-6">
        <div className="flex items-center justify-between pb-6 border-b border-[#282828] mb-8">
          <h2 className="font-heading font-black italic text-3xl sm:text-4xl uppercase text-white">
            THE COMPOUND
          </h2>
          <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">
            Location
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Map Preview Box */}
          <div className="md:col-span-2 bg-[#141414] border border-[#282828] min-h-[300px] flex items-center justify-center p-6 chamfer-box">
            <div className="text-center space-y-2">
              <span className="text-4xl">📍</span>
              <p className="font-heading font-black italic text-xl uppercase text-white">INTERACTIVE COMPOUND MAP</p>
              <p className="font-mono text-xs text-zinc-400">123 Industrial Compound Drive, Iron City, NY</p>
            </div>
          </div>

          {/* Yellow Find Us Panel */}
          <div className="bg-[#FFCC00] text-black p-8 flex flex-col justify-between space-y-6 chamfer-box">
            <div className="space-y-4">
              <h3 className="font-heading font-black italic text-3xl uppercase text-black">
                FIND US
              </h3>
              <p className="font-heading font-black italic text-lg text-black">
                TRIPLE A GYM HQ
              </p>
              <p className="font-mono text-xs text-zinc-900 leading-relaxed">
                123 Industrial Compound Drive<br />
                Iron City, NY 10001
              </p>
            </div>

            <div className="space-y-2 font-mono text-xs text-black">
              <p>📞 +1 (800) 555-IRON</p>
              <p>✉️ info@tripleagym.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: NO MORE EXCUSES (NEWSLETTER) */}
      <section className="mx-auto max-w-[1500px] px-6">
        <ChamferCard className="p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-6">
          <h2 className="font-heading font-black italic text-4xl sm:text-5xl uppercase text-[#FFCC00]">
            NO MORE EXCUSES
          </h2>
          <p className="font-mono text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto uppercase tracking-wider">
            Join our elite list to receive training tips, special drops, & 10% off your first supplement order.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="ENTER YOUR EMAIL"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 bg-[#0A0A0A] border border-[#282828] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input"
              required
            />
            <button type="submit" className="btn-primary text-xs px-6 py-3 shrink-0">
              GET STARTED
            </button>
          </form>

          {subscribedMsg && (
            <p className="font-mono text-xs text-[#FFCC00] font-bold animate-pulse pt-2">
              {subscribedMsg}
            </p>
          )}
        </ChamferCard>
      </section>

    </div>
  );
};

export default HomePage;


