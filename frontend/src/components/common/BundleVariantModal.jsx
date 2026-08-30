import { useEffect, useMemo, useState } from 'react';

import { useAppContext } from '../../context/AppContext.jsx';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;

/**
 * Modal that lets the customer pick the exact flavor/weight variant for every
 * bundle component that has more than one option. Selections are validated by
 * the backend before the bundle enters the cart.
 */
const BundleVariantModal = ({ offer, onClose }) => {
  const { addBundleItem } = useAppContext();
  const [selections, setSelections] = useState({});
  const [feedback, setFeedback] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const components = useMemo(
    () => (Array.isArray(offer?.products) ? offer.products : []),
    [offer],
  );

  const selectable = useMemo(
    () => components.filter((product) => (product.variants || []).length > 1),
    [components],
  );

  useEffect(() => {
    if (!offer) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [offer, onClose]);

  if (!offer) return null;

  const allSelected = selectable.every((product) => selections[product.id]);

  const handleSelect = (productId, variantId) => {
    setSelections((current) => ({ ...current, [productId]: variantId }));
    setFeedback('');
  };

  const handleConfirm = async () => {
    if (!allSelected) {
      setFeedback('Select an option for every product in the bundle.');
      return;
    }

    setIsAdding(true);
    setFeedback('');

    const result = await addBundleItem({
      offerId: offer.id,
      quantity: 1,
      variantSelections: selections,
    });

    setIsAdding(false);

    if (!result.success) {
      setFeedback(result.message || 'Unable to add bundle.');
      return;
    }

    onClose(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1C1C26] bg-[#0B0B0E] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#1C1C26] pb-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00]">Bundle Offer</p>
            <h3 className="mt-1 font-heading text-2xl font-black uppercase tracking-tight text-white">
              {offer.name}
            </h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Choose your options for each product
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-lg border border-[#22222E] bg-[#14141E] px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {components.map((product) => {
            const variants = product.variants || [];
            const needsChoice = variants.length > 1;

            return (
              <div key={product.id} className="rounded-xl border border-[#1C1C26] bg-[#050506] p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={product.primaryImage || FALLBACK_IMAGE}
                    alt={product.name}
                    className="h-12 w-12 rounded-lg border border-[#1C1C26] bg-[#14141E] object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-black uppercase text-white">{product.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                      {formatMoney(product.basePrice)}
                    </p>
                  </div>
                  {!needsChoice && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Standard</span>
                  )}
                </div>

                {needsChoice && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variants.map((variant) => {
                      const isSelected = Number(selections[product.id]) === Number(variant.id);
                      const isOutOfStock = Number(variant.stockQuantity || 0) <= 0;
                      const label = [variant.flavor, variant.weightLabel].filter(Boolean).join(' / ') || variant.sku;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleSelect(product.id, variant.id)}
                          className={`rounded-lg border px-3 py-2 font-mono text-xs font-bold uppercase transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                            isSelected
                              ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
                              : 'border-[#1C1C26] bg-[#0B0B0E] text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {label}
                          {isOutOfStock ? ' (out)' : ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#1C1C26] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Bundle price</p>
            <p className="font-heading text-2xl font-black text-[#FFCC00]">{formatMoney(offer.bundlePrice)}</p>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isAdding || !allSelected}
            className="rounded-lg bg-[#FFCC00] px-6 py-3 font-heading text-xs font-black uppercase tracking-widest text-black shadow-md transition-all hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAdding ? 'Adding...' : allSelected ? 'Add Bundle To Cart' : 'Select All Options'}
          </button>
        </div>

        {feedback && (
          <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00]">{feedback}</p>
        )}
      </div>
    </div>
  );
};

export default BundleVariantModal;