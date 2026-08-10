import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80';

const CartSidebar = ({ isOpen, onClose }) => {
  const {
    cart,
    cartLoading,
    cartSyncing,
    cartError,
    refreshCart,
    updateCartItemQuantity,
    removeCartItemById,
  } = useAppContext();
  const [clearingCart, setClearingCart] = useState(false);
  const navigate = useNavigate();

  const cartItems = cart?.items || [];
  const itemCount = Number(cart?.itemCount || cartItems.length || 0);
  const isActionDisabled = cartSyncing || cartLoading || clearingCart;

  useEffect(() => {
    if (isOpen) {
      refreshCart({ silent: true });
    }
  }, [isOpen, refreshCart]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleUpdateQuantity = async (id, delta) => {
    const item = cartItems.find((cartItem) => cartItem.id === id);
    if (!item) return;

    const nextQuantity = Math.max(1, Number(item.quantity || 0) + delta);
    if (nextQuantity === Number(item.quantity || 0)) return;

    await updateCartItemQuantity({
      cartItemId: id,
      quantity: nextQuantity,
    });
  };

  const handleRemoveItem = async (id) => {
    await removeCartItemById(id);
  };

  const handleClearCart = async () => {
    if (!cartItems.length) return;
    setClearingCart(true);
    try {
      const itemIds = cartItems.map((item) => item.id);
      for (const itemId of itemIds) {
        await removeCartItemById(itemId);
      }
      await refreshCart();
    } finally {
      setClearingCart(false);
    }
  };

  const handleProceedToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const handleViewCart = () => {
    onClose();
    navigate('/cart');
  };

  const subtotal = Number(cart?.subtotal || 0);
  const total = subtotal;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          isOpen
            ? 'pointer-events-auto bg-black/80 backdrop-blur-sm opacity-100'
            : 'pointer-events-none bg-black/0 opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[440px] transform flex-col bg-[#141414] border-l border-[#282828] shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[#282828] px-6 py-5 bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#FFCC00]" />
            <div>
              <h2 className="font-heading font-black italic text-lg uppercase tracking-wider text-white">
                TRANSMISSION CART
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'} SELECTED
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable Items ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Loading State */}
          {cartLoading && !cartItems.length && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FFCC00]/20 border-t-[#FFCC00]" />
              <p className="mt-4 font-mono text-xs uppercase tracking-widest text-zinc-400">Syncing transmission...</p>
            </div>
          )}

          {/* Syncing indicator */}
          {cartSyncing && cartItems.length > 0 && (
            <div className="flex items-center gap-2 border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 py-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#FFCC00]/30 border-t-[#FFCC00]" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#FFCC00]">Updating cart...</p>
            </div>
          )}

          {/* Error */}
          {cartError && (
            <div className="border border-red-500/40 bg-red-500/10 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-red-400">{cartError}</p>
            </div>
          )}

          {/* Empty State */}
          {!cartLoading && !cartItems.length && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-[#0A0A0A] border border-[#282828] flex items-center justify-center mb-4 chamfer-box">
                <span className="text-2xl text-zinc-600">🛒</span>
              </div>
              <p className="font-heading font-black italic text-lg uppercase text-white">Cart is Empty</p>
              <p className="mt-2 max-w-[220px] font-mono text-xs text-zinc-500">
                Browse supplements & equipment to fill your arsenal.
              </p>
            </div>
          )}

          {/* Cart Items */}
          <div className="space-y-3">
            {cartItems.map((item) => {
              const unitPrice = Number(item.unitPrice || item.price || 0);
              const subtotalValue = Number(item.lineTotal || item.totalPrice || unitPrice * Number(item.quantity || 0));

              return (
                <article
                  key={item.id}
                  className="bg-[#0A0A0A] border border-[#282828] p-3.5 flex items-start gap-3.5 chamfer-box transition-all hover:border-[#FFCC00]/40"
                >
                  {/* Thumbnail */}
                  <div className="h-20 w-16 bg-[#141414] border border-[#222222] flex-shrink-0 flex items-center justify-center p-1">
                    <img
                      src={item.imageUrl || FALLBACK_IMAGE}
                      alt={item.name || 'Cart item'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading font-black italic text-sm uppercase text-white truncate">
                        {item.name || 'Product'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isActionDisabled}
                        className="text-zinc-500 hover:text-red-400 transition-colors text-xs font-mono"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="font-mono text-xs text-[#FFCC00] font-bold">
                      {formatMoney(unitPrice)}
                    </div>

                    {/* Quantity modifier */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center border border-[#282828] bg-[#141414]">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          disabled={isActionDisabled || Number(item.quantity || 0) <= 1}
                          className="w-7 h-7 font-mono font-bold text-zinc-300 hover:text-[#FFCC00] disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono text-xs font-bold text-white border-x border-[#282828]">
                          {Number(item.quantity || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          disabled={isActionDisabled}
                          className="w-7 h-7 font-mono font-bold text-zinc-300 hover:text-[#FFCC00] disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-heading font-black italic text-sm text-white">
                        {formatMoney(subtotalValue)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-[#282828] bg-[#0A0A0A] p-6 space-y-4">
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              disabled={!cartItems.length || isActionDisabled}
              className="w-full font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors"
            >
              {clearingCart ? 'CLEARING...' : 'CLEAR ALL ITEMS'}
            </button>
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-[#222222]">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">TOTAL</span>
            <span className="font-heading font-black italic text-2xl text-[#FFCC00]">
              {formatMoney(total)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={!cartItems.length || cartSyncing || clearingCart || cartLoading}
              className="btn-primary w-full py-3.5 text-center text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              PROCEED TO CHECKOUT
            </button>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={handleViewCart}
                className="btn-secondary w-full py-3 text-center text-xs"
              >
                VIEW FULL CART
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default CartSidebar;

