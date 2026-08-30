import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext.jsx';

const ProductCard = ({ product }) => {
  const { addCartItem } = useAppContext();
  const navigate = useNavigate();
  const [cartFeedback, setCartFeedback] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (product.hasOptions) {
      navigate(`/products/${product.slug}`);
      return;
    }

    if (!product.defaultVariantId) {
      setCartFeedback('Unavailable');
      return;
    }

    setIsAdding(true);

    const result = await addCartItem({
      variantId: product.defaultVariantId,
      quantity: 1,
      optimisticItem: {
        id: `temp-${product.defaultVariantId}`,
        cartItemId: `temp-${product.defaultVariantId}`,
        variantId: product.defaultVariantId,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variant: product.colorName || 'Standard',
        unitPrice: Number(product.price || 0),
        quantity: 1,
        imageUrl: product.imageUrl,
      },
    });

    setIsAdding(false);

    if (!result.success) {
      setCartFeedback(result.message || 'Error');
      setTimeout(() => setCartFeedback(''), 2000);
      return;
    }

    setCartFeedback('Added');
    setTimeout(() => setCartFeedback(''), 2000);
  };

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const isOutOfStock = Number(product.totalStock || product.defaultVariantStock || 0) <= 0;
  const stockCount = Number(product.totalStock || product.defaultVariantStock || 0);
  const hasDiscount = Number(product.originalPrice || 0) > Number(product.price || 0);

  const badgeText = hasDiscount
    ? product.discountLabel || 'SALE'
    : product.isNew
    ? 'NEW'
    : stockCount > 0 && stockCount <= 5
    ? 'LOW STOCK'
    : product.badgeText || (product.rating >= 4.8 ? 'BEST SELLER' : null);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl p-[1px] transition-all duration-500 ease-out hover:-translate-y-1.5"
      style={{
        background:
          'linear-gradient(155deg, rgba(255,204,0,0.22) 0%, rgba(255,255,255,0.04) 22%, rgba(20,20,26,0.6) 45%, rgba(255,204,0,0.08) 100%)',
      }}
    >
      {/* Inner shell */}
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-[#0A0A0D] transition-colors duration-500 group-hover:bg-[#0C0C10]">

        {/* Corner glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-[#FFCC00]/[0.09] blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

        {/* IMAGE AREA — full-bleed, 4:3 ratio, no padding boxing */}
        <Link to={`/products/${product.slug}`} className="relative block">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>

            {/* Dark gradient bg — no visible box */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#111115] via-[#0D0D11] to-[#080809]" />

            {/* Soft radial glow under product */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-2/3 w-3/4 rounded-full bg-[#FFCC00]/[0.06] blur-3xl transition-all duration-700 group-hover:bg-[#FFCC00]/[0.11]" />

            {/* Badge */}
            {badgeText && (
              <span className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full border border-[#FFCC00]/25 bg-black/60 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#FFCC00] backdrop-blur-md">
                <span className="h-1 w-1 rounded-full bg-[#FFCC00] shadow-[0_0_6px_rgba(255,204,0,0.9)]" />
                {badgeText}
              </span>
            )}

           

            {/* Product image — object-contain fills frame, slight inset scale so edges breathe naturally */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="relative z-[1] h-full w-full object-contain scale-[0.88] transition-transform duration-700 ease-out group-hover:scale-[0.96] drop-shadow-[0_20px_36px_rgba(0,0,0,0.75)]"
              loading="lazy"
            />

            {/* Bottom fade into card body — seamless transition, no hard edge */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0A0A0D] to-transparent" />

            {/* Sheen sweep */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full" />
          </div>
        </Link>

        {/* CARD BODY — compact, no dead space */}
        <div className="flex flex-col gap-3 px-4 pt-2 pb-4">

          {/* Category + Rating */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFCC00]/70">
              {product.colorName || 'Supplement'}
            </span>
            <div className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono">
              <span className="text-[#FFCC00]">★</span>
              <span className="font-bold text-white">{product.rating || '5.0'}</span>
            </div>
          </div>

          {/* Name */}
          <Link to={`/products/${product.slug}`}>
            <h3 className="font-heading text-[15px] font-extrabold leading-snug tracking-tight text-white line-clamp-1 transition-colors group-hover:text-[#FFCC00]">
              {product.name}
            </h3>
          </Link>

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-3">
            <span className="font-heading text-xl font-black tracking-tight text-white">
              {Number(product.price || 0).toFixed(2)} EGP
              {hasDiscount && (
                <span className="ml-2 align-middle font-mono text-xs font-bold text-zinc-500 line-through">
                  {Number(product.originalPrice || 0).toFixed(2)} EGP
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || !product.defaultVariantId || isAdding}
              className="group/btn relative flex shrink-0 items-center overflow-hidden rounded-lg bg-gradient-to-b from-[#FFDB4D] to-[#FFCC00] px-4 py-2 font-heading text-xs font-bold text-black shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_4px_14px_rgba(255,204,0,0.25)] transition-all duration-300 hover:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_6px_20px_rgba(255,204,0,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full" />
              <span className="relative">
                {isOutOfStock ? 'OUT OF STOCK' : product.hasOptions ? 'VIEW OPTIONS' : isAdding ? 'ADDING...' : '+ ADD TO CART'}
              </span>
            </button>
          </div>
        </div>

        {/* Cart Feedback Toast */}
        {cartFeedback && (
          <div className="absolute inset-x-3 bottom-14 z-20 animate-fadeIn rounded-lg border border-[#FFCC00]/60 bg-[#050506]/95 py-1.5 text-center font-mono text-[10px] font-bold tracking-widest text-[#FFCC00] shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md">
            {cartFeedback}
          </div>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
