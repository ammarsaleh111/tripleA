import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';
import ChamferCard from '../components/common/ChamferCard.jsx';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=400&q=80';

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

const inputClassName =
  'w-full bg-[#050506] border border-[#1C1C26] text-white px-4 py-3 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-xl placeholder:text-zinc-600';

const createInitialForm = (user) => ({
  name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
  phone: '',
  email: user?.email || '',
  city: '',
  address: '',
  notes: '',
});

const ORDER_CONFIRMATION_STORAGE_KEY = 'triplea_latest_order_confirmation';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { authUser, cart, cartLoading, cartSyncing, checkoutLoading, checkoutCart } = useAppContext();
  const [formValues, setFormValues] = useState(() => createInitialForm(authUser));
  const [submitError, setSubmitError] = useState('');

  const items = cart?.items || [];
  const subtotal = Number(cart?.subtotal || 0);
  const shipping = 0;
  const tax = 0;
  const total = Number(subtotal.toFixed(2));
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const isSubmitting = checkoutLoading || cartSyncing;

  const requiredFields = useMemo(
    () => ({
      name: 'Full name',
      phone: 'WhatsApp / phone',
      address: 'Delivery address',
    }),
    [],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const validateForm = () => {
    for (const key of Object.keys(requiredFields)) {
      if (!String(formValues[key] || '').trim()) {
        return `${requiredFields[key]} is required.`;
      }
    }

    if (formValues.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formValues.email.trim())) {
        return 'Please provide a valid email address.';
      }
    }

    return '';
  };

  const handleConfirmOrder = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!items.length) {
      setSubmitError('Your cart is empty. Add items before checkout.');
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    const result = await checkoutCart({
      customer: {
        name: formValues.name,
        phone: formValues.phone,
        address: formValues.address,
      },
      total,
    });

    if (!result.success) {
      setSubmitError(result.message || 'Unable to complete checkout.');
      return;
    }

    const orderResponse = result?.data || {};
    sessionStorage.setItem(ORDER_CONFIRMATION_STORAGE_KEY, JSON.stringify(orderResponse));
    navigate('/order-success', { state: { order: orderResponse }, replace: true });
  };

  if (!cartLoading && !items.length) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16 text-white">
        <ChamferCard className="p-12 text-center space-y-4">
          <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest">YOUR CART</span>
          <h1 className="font-heading font-black text-4xl uppercase text-white">YOUR CART IS EMPTY</h1>
          <p className="font-mono text-xs text-zinc-400">Add supplements to your cart before proceeding to checkout.</p>
          <div className="pt-4">
            <Link to="/shop" className="btn-primary inline-block text-xs px-8 py-3">
              SHOP SUPPLEMENTS
            </Link>
          </div>
        </ChamferCard>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 text-white">
      <div className="border-b border-[#1C1C24] pb-6">
        <span className="font-mono text-xs text-[#FFCC00] uppercase tracking-widest">CHECKOUT</span>
        <h1 className="font-heading font-black text-4xl sm:text-6xl uppercase text-white mt-1">FAST CHECKOUT</h1>
        <p className="font-mono text-xs text-zinc-400 mt-1 uppercase">CASH ON DELIVERY â€¢ DIRECT DISPATCH</p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form id="checkout-form" onSubmit={handleConfirmOrder}>
          <ChamferCard className="p-6 sm:p-8 space-y-6">
            <h2 className="font-heading font-bold text-2xl uppercase text-white border-b border-[#1C1C26] pb-3">
              RECIPIENT & ADDRESS
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2 block">
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">FULL NAME *</span>
                <input name="name" value={formValues.name} onChange={handleChange} placeholder="ENTER YOUR FULL NAME" className={inputClassName} />
              </label>

              <label className="space-y-2 block">
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">PHONE / WHATSAPP *</span>
                <input name="phone" value={formValues.phone} onChange={handleChange} placeholder="+1 (800) 000-0000" className={inputClassName} />
              </label>

              <label className="space-y-2 block">
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">EMAIL ADDRESS</span>
                <input type="email" name="email" value={formValues.email} onChange={handleChange} placeholder="athlete@example.com" className={inputClassName} />
              </label>

              <label className="space-y-2 block">
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">CITY</span>
                <input name="city" value={formValues.city} onChange={handleChange} placeholder="CITY / REGION" className={inputClassName} />
              </label>

              <label className="space-y-2 sm:col-span-2 block">
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">DELIVERY ADDRESS *</span>
                <input name="address" value={formValues.address} onChange={handleChange} placeholder="STREET, BUILDING, SUITE" className={inputClassName} />
              </label>

              <label className="space-y-2 sm:col-span-2 block">
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">DELIVERY INSTRUCTIONS</span>
                <textarea rows={3} name="notes" value={formValues.notes} onChange={handleChange} placeholder="Gate code, delivery times, special notes" className={`${inputClassName} resize-none`} />
              </label>
            </div>

            {submitError && (
              <div className="border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-400 font-bold uppercase tracking-widest">
                {submitError}
              </div>
            )}
          </ChamferCard>
        </form>

        <aside>
          <ChamferCard className="p-6 space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-[#1C1C26] pb-4">
              <div>
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">SUMMARY</span>
                <h3 className="font-heading font-black text-xl uppercase text-white">{itemCount} ITEMS</h3>
              </div>
              <span className="bg-[#FFCC00] text-black font-mono font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md">
                COD PAY
              </span>
            </div>

            <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <article key={item.id} className="flex gap-3 rounded-lg border border-[#1C1C26] bg-[#050506] p-3">
                  <img src={item.imageUrl || FALLBACK_IMAGE} alt={item.name || 'Cart item'} className="h-16 w-14 border border-[#1C1C26] object-contain bg-[#14141E] p-1" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-heading font-black text-xs uppercase text-white">{item.name}</p>
                    <p className="font-mono text-[10px] uppercase text-zinc-500">QTY {item.quantity}</p>
                  </div>
                  <p className="font-heading font-black text-sm text-[#FFCC00]">{formatMoney(item.lineTotal || item.unitPrice * item.quantity || 0)}</p>
                </article>
              ))}
            </div>

            <div className="border-t border-[#1C1C26] pt-4 font-mono text-xs space-y-2">
              <div className="flex justify-between text-zinc-400"><span>SUBTOTAL</span><span>{formatMoney(subtotal)}</span></div>
              <div className="flex justify-between text-zinc-400"><span>DISPATCH & SHIPPING</span><span>{formatMoney(shipping)}</span></div>
              <div className="flex justify-between border-t border-[#1C1C26] pt-3 text-base font-bold text-white">
                <span>TOTAL</span>
                <span className="text-[#FFCC00] font-heading font-black text-xl">{formatMoney(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting || cartLoading || !items.length}
              className="btn-primary w-full py-4 text-center text-sm disabled:opacity-40"
            >
              {checkoutLoading ? 'TRANSMITTING ORDER...' : 'CONFIRM COD ORDER'}
            </button>

            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Cash on delivery payment will be collected upon arrival.
            </p>
          </ChamferCard>
        </aside>
      </div>
    </section>
  );
};

export default CheckoutPage;
