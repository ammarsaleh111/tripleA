import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts as getProductsApi } from '../services/api/products.js';
import { getActiveOffers as getActiveOffersApi } from '../services/api/offers.js';
import ProductCard from '../components/shop/ProductCard.jsx';
import ChamferCard from '../components/common/ChamferCard.jsx';
import BundleVariantModal from '../components/common/BundleVariantModal.jsx';
import { useAppContext } from '../context/AppContext.jsx';

const HERO_BG_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=85';

const categories = [
  { name: 'Supplements', slug: 'supplements', image: 'https://www.image2url.com/r2/default/images/1788102844290-ca5fed96-5acf-4109-b2e4-6a7501449610.jpg' },
  { name: 'Vitamins', slug: 'vitamins', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=700&q=80' },
  { name: 'Amino Acids', slug: 'amino-acids', image: 'https://www.image2url.com/r2/default/images/1788102534487-613333bb-8dab-4a79-9c22-90673174e37a.jpg' },
  { name: 'Gym Accessories', slug: 'gym-accessories', image: 'https://www.image2url.com/r2/default/images/1788102766255-b46e3cdc-582d-4d63-9369-db909c92fea1.jpg' },
];

const mapProduct = (item) => ({
  id: item.id,
  slug: item.slug,
  defaultVariantId: Number(item.default_variant_id || item.id) || null,
  defaultVariantStock: Number(item.default_variant_stock || item.total_stock || 10),
  totalStock: Number(item.total_stock || 10),
  name: String(item.name || '').toUpperCase(),
  originalPrice: Number(item.base_price || item.price || 49.99),
  price: Number(item.effective_price || item.base_price || item.price || 49.99),
  discountLabel: item.discount_type
    ? item.discount_type === 'percentage'
      ? `${Number(item.discount_value || 0)}% OFF`
      : `${Number(item.discount_value || 0).toFixed(2)} EGP OFF`
    : '',
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

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;

const getProductImage = (product) =>
  product?.imageUrl || product?.image_url || product?.primaryImage || product?.primary_image || '';

const BundleOfferCard = ({ offer, onAddBundle }) => {
  const needsSelection = (offer.products || []).some((product) => (product.variants || []).length > 1);
  const includedProducts = Array.isArray(offer.products) ? offer.products : [];
  const originalTotal = includedProducts.reduce(
    (sum, product) => sum + Number(product.basePrice || product.base_price || 0),
    0,
  );
  const savings = Math.max(0, originalTotal - Number(offer.bundlePrice || 0));
  const productImages = includedProducts.map(getProductImage).filter(Boolean).slice(0, 4);

  return (
    <article className="group relative overflow-hidden rounded-xl border border-[#1C1C26] bg-[#0B0B0E] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-[#FFCC00]/50 hover:shadow-[0_16px_38px_rgba(255,204,0,0.08)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#FFCC00] opacity-70" />

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-[#16161F] bg-[#050506] p-4 lg:w-44 lg:shrink-0">
          {productImages.length > 0 ? (
            <div className="grid w-full grid-cols-2 gap-2">
              {productImages.map((imageUrl, index) => (
                <img
                  key={`${imageUrl}-${index}`}
                  src={imageUrl}
                  alt={`${offer.name} product ${index + 1}`}
                  className="aspect-square w-full rounded-lg border border-[#1C1C26] bg-[#14141E] object-contain p-1"
                />
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="font-heading text-3xl font-black text-[#FFCC00]">AAA</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-zinc-500">Bundle Stack</p>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-[#FFCC00] px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-black">
              Bundle Offer
            </span>
            <span className={offer.isAvailable ? 'font-mono text-[10px] font-bold uppercase tracking-widest text-[#FFCC00]' : 'font-mono text-[10px] font-bold uppercase tracking-widest text-red-400'}>
              {offer.isAvailable ? 'In Stock' : 'Out Of Stock'}
            </span>
          </div>

          <div>
            <h3 className="break-words font-heading text-2xl font-black uppercase leading-tight tracking-tight text-white group-hover:text-[#FFCC00]">
              {offer.name}
            </h3>
            {offer.description && (
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{offer.description}</p>
            )}
          </div>

          <ul className="grid gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400 sm:grid-cols-2">
            {includedProducts.map((product) => (
              <li key={product.id} className="min-w-0 truncate">+ {product.name}</li>
            ))}
          </ul>

          <div className="grid gap-3 border-y border-[#1C1C26] py-4 sm:grid-cols-3">
            {originalTotal > 0 && (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Original</p>
                <p className="font-heading text-lg font-black text-zinc-300 line-through">{formatMoney(originalTotal)}</p>
              </div>
            )}
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Bundle</p>
              <p className="font-heading text-2xl font-black text-[#FFCC00]">{formatMoney(offer.bundlePrice)}</p>
            </div>
            {savings > 0 && (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Save</p>
                <p className="font-heading text-lg font-black text-white">{formatMoney(savings)}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {offer.endsAt ? `Available until ${new Date(offer.endsAt).toLocaleDateString()}` : 'No expiration'}
            </p>
            <button
              type="button"
              disabled={!offer.isAvailable}
              onClick={() => onAddBundle(offer)}
              className="rounded-lg bg-[#FFCC00] px-6 py-3 font-heading text-xs font-black uppercase tracking-widest text-black shadow-md transition-all hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {needsSelection ? 'Choose Options' : 'Get Bundle'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { addBundleItem } = useAppContext();
  const [products, setProducts] = useState([]);
  const [bundleOffers, setBundleOffers] = useState([]);
  const [cartFeedback, setCartFeedback] = useState('');
  const [variantModalOffer, setVariantModalOffer] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadOffers = async () => {
      try {
        const response = await getActiveOffersApi();
        const bundles = Array.isArray(response?.data)
          ? response.data.filter((offer) => offer.offerType === 'bundle')
          : [];
        if (isMounted) setBundleOffers(bundles);
      } catch {
        if (isMounted) setBundleOffers([]);
      }
    };

    loadOffers();
    return () => {
      isMounted = false;
    };
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

  const handleAddBundle = async (offer) => {
    // Bundles with multi-option components require the customer to pick the
    // exact flavor/weight before the bundle can enter the cart.
    const needsSelection = (offer.products || []).some((product) => (product.variants || []).length > 1);
    if (needsSelection) {
      setVariantModalOffer(offer);
      return;
    }

    const result = await addBundleItem({
      offerId: offer.id,
      quantity: 1,
      optimisticItem: {
        id: `temp-bundle-${offer.id}`,
        cartItemId: `temp-bundle-${offer.id}`,
        itemType: 'bundle',
        offerId: offer.id,
        name: offer.name,
        variant: 'Bundle offer',
        unitPrice: Number(offer.bundlePrice || 0),
        lineTotal: Number(offer.bundlePrice || 0),
        quantity: 1,
        products: offer.products || [],
      },
    });

    setCartFeedback(result.success ? `Added ${offer.name} to cart!` : result.message || 'Unable to add bundle.');
    setTimeout(() => setCartFeedback(''), 2500);
  };

  return (
    <div className="bg-[#050506] text-white font-sans overflow-x-hidden space-y-24 md:space-y-32 pb-16 relative">
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

      {/* SECTION 2: PRODUCT CATEGORIES */}
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
                <h3 className="font-heading font-black text-3xl uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors flex items-center justify-between">
                  {cat.name} <span className="text-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">→</span>
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: TRIPLE A OFFERS */}
      {bundleOffers.length > 0 && (
        <section className="mx-auto max-w-[1500px] px-6 space-y-8 reveal-on-scroll">
          <div className="flex flex-col gap-4 border-b border-[#1C1C24] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading font-black text-3xl uppercase text-white sm:text-4xl">
                TRIPLE A <span className="text-[#FFCC00]">OFFERS</span>
              </h2>
              <p className="mt-1 font-mono text-xs uppercase tracking-wider text-zinc-400 sm:text-sm">
                More value. More performance.
              </p>
            </div>
            <Link
              to="/shop?offers=bundles"
              className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00] hover:underline"
            >
              VIEW ALL OFFERS
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            {bundleOffers.map((offer) => (
              <BundleOfferCard key={offer.id} offer={offer} onAddBundle={handleAddBundle} />
            ))}
          </div>

          {cartFeedback && (
            <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00]">
              {cartFeedback}
            </p>
          )}
        </section>
      )}

      {/* SECTION 4: BEST SELLERS */}
      <section className="mx-auto max-w-[1500px] px-6 space-y-8 reveal-on-scroll">
        <div className="flex items-end justify-between pb-6 border-b border-[#1C1C24]">
          <div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase text-white">
              BEST <span className="text-[#FFCC00]">SELLERS</span>
            </h2>
            <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider mt-1">
              Top products. Ready for your next goal.
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
{/* SECTION 5: WHY TRIPLE A */}
  <section className="mx-auto max-w-[1500px] px-6 space-y-12 reveal-on-scroll">
    <div className="text-center space-y-3 max-w-3xl mx-auto">
      <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest font-extrabold">
        THE TRIPLE A STANDARD
      </span>
      <h2 className="font-heading font-black text-4xl sm:text-5xl uppercase text-white tracking-tight">
        WHY <span className="text-[#FFCC00]">TRIPLE A?</span>
      </h2>
      <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider leading-relaxed">
        100% original imported supplements, verified batch testing, and lightning-fast shipping across Egypt.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[
        ['100% ORIGINAL', 'Imported directly from official global manufacturers. Guaranteed authentic seals and verified batch numbers on every tub.'],
        ['BUILT FOR GAINS', 'Formulated and handpicked for serious athletes—max bioavailability, high protein yield, and proven performance.'],
        ['EGYPT-WIDE SHIPPING', 'Fast, reliable delivery straight to your doorstep across Cairo, Giza, Alexandria, and all governorates.'],
      ].map(([title, body], index) => (
        <div key={title} className="group bg-[#0B0B0F] border border-[#1C1C26] hover:border-[#FFCC00]/50 p-8 rounded-xl space-y-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_35px_rgba(255,204,0,0.08)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#FFCC00] bg-[#14141E] px-2.5 py-1 rounded-md border border-[#222230]">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">
            {body}
          </p>
        </div>
      ))}
    </div>
  </section>

      {/* BUNDLE VARIANT SELECTION MODAL */}
      {variantModalOffer && (
        <BundleVariantModal
          offer={variantModalOffer}
          onClose={(added) => {
            setVariantModalOffer(null);
            if (added) {
              setCartFeedback(`Added ${variantModalOffer.name} to cart!`);
              setTimeout(() => setCartFeedback(''), 2500);
            }
          }}
        />
      )}

      {/* SECTION 6: FINAL CTA */}
      <section className="mx-auto max-w-[1500px] px-6">
        <ChamferCard className="p-8 sm:p-16 text-center max-w-4xl mx-auto space-y-6 bg-[#0B0B0E] border border-[#1C1C26] rounded-2xl relative overflow-hidden">
          <h2 className="font-heading font-black text-4xl sm:text-5xl uppercase text-white leading-none tracking-tight">
            READY TO <span className="text-[#FFCC00]">LEVEL UP?</span>
          </h2>
          <p className="font-mono text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto uppercase tracking-wider leading-relaxed">
            Your next step starts here.
          </p>

          <Link
            to="/shop"
            className="relative z-10 inline-flex items-center justify-center rounded-xl bg-[#FFCC00] px-10 py-4 font-heading text-xs font-black uppercase tracking-widest text-black shadow-lg transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(255,204,0,0.4)]"
          >
            SHOP TRIPLE A
          </Link>

          <div className="absolute inset-0 bg-gradient-to-tr from-[#FFCC00]/5 to-transparent blur-3xl z-0" />
        </ChamferCard>
      </section>

    </div>
  );
};

export default HomePage;
