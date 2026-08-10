import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';

const ProductCard = ({ product }) => {
  const { addCartItem } = useAppContext();
  const [cartFeedback, setCartFeedback] = useState('');

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!product.defaultVariantId) {
      setCartFeedback('Variant unavailable');
      return;
    }

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

    if (!result.success) {
      setCartFeedback(result.message || 'Unable to add');
      return;
    }

    setCartFeedback('ADDED TO TRANSMISSION');
    setTimeout(() => setCartFeedback(''), 2500);
  };

  const isOutOfStock = Number(product.totalStock || product.defaultVariantStock || 0) <= 0;
  const stockCount = Number(product.totalStock || product.defaultVariantStock || 0);

  // Badge logic matching reference design
  const badgeText = product.isNew
    ? 'BEST SELLER'
    : stockCount > 0 && stockCount <= 5
    ? `LOW STOCK: ${stockCount} LEFT`
    : product.badgeText || (product.rating >= 4.7 ? 'BEST SELLER' : null);

  return (
    <article className="group relative bg-[#141414] border border-[#282828] p-4 flex flex-col justify-between transition-all duration-300 hover:border-[#FFCC00]/60 chamfer-box">
      <Link to={`/products/${product.slug}`} className="block">
        {/* Badge header */}
        <div className="h-6 mb-2 flex items-center justify-start">
          {badgeText && (
            <span className="bg-[#FFF8E7] text-black font-mono font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-0.5 chamfer-badge">
              {badgeText}
            </span>
          )}
        </div>

        {/* Product Image Box */}
        <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden bg-[#0A0A0A] border border-[#222222] flex items-center justify-center p-3">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Product Details */}
        <div className="space-y-2 mb-4">
          <h3 className="font-heading font-black italic text-lg uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors leading-tight">
            {product.name}
          </h3>

          {/* Ratings */}
          <div className="flex items-center gap-2">
            <div className="flex text-[#FFCC00] text-xs">
              {[...Array(5)].map((_, i) => (
                <span key={i}>
                  {i < Math.floor(product.rating || 5) ? '★' : '☆'}
                </span>
              ))}
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              ({product.reviewCount || 128})
            </span>
          </div>
        </div>
      </Link>

      {/* Footer / Price & Add to Cart */}
      <div className="pt-3 border-t border-[#222222] flex items-center justify-between gap-3 mt-auto">
        <span className="font-heading font-black italic text-xl text-white">
          ${product.price.toFixed(2)}
        </span>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || !product.defaultVariantId}
          className="btn-primary text-xs px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isOutOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
        </button>
      </div>

      {cartFeedback && (
        <p className="mt-2 text-center text-[10px] font-mono tracking-widest text-[#FFCC00] animate-pulse">
          {cartFeedback}
        </p>
      )}
    </article>
  );
};

export default ProductCard;

