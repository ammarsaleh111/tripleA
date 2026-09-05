import { useEffect, useMemo, useState } from 'react';

import {
  createAdminOffer,
  deleteAdminOffer,
  getAdminOffers,
  getAdminProducts,
  updateAdminOffer,
  updateAdminOfferStatus,
} from '../../../services/api/admin.js';

const emptyForm = {
  offerType: 'bundle',
  name: '',
  description: '',
  imageUrl: '',
  productIds: [],
  productId: '',
  discountVariantId: '',
  bundleVariantIds: {},
  bundlePrice: '',
  discountType: 'percentage',
  discountValue: '',
  startsAt: '',
  noExpiration: true,
  endsAt: '',
  isActive: true,
};

const fieldClass = 'w-full border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-[#FFCC00]';

// Unique weight tiers of a product, with a representative variant id each.
// A discount/bundle targets the WEIGHT (all flavors of it), never a flavor.
// NOTE: the admin products API returns camelCase variants (weightValue/
// weightUnit) while some offer payloads use snake_case — accept both.
const weightTiersFor = (product) => {
  const tiers = [];
  const seen = new Set();
  (product?.variants || []).forEach((variant) => {
    const weightValue = variant.weight_value ?? variant.weightValue;
    const weightUnit = variant.weight_unit ?? variant.weightUnit;
    if (weightValue === null || weightValue === undefined) return;
    const label = `${Number(weightValue).toString()} ${weightUnit || 'g'}`;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tiers.push({ label, variantId: Number(variant.id) });
  });
  return tiers;
};

const getStatus = (offer) => {
  if (!offer.isActive) return 'Inactive';
  const now = Date.now();
  const starts = new Date(offer.startsAt).getTime();
  const ends = offer.endsAt ? new Date(offer.endsAt).getTime() : null;
  if (starts > now) return 'Scheduled';
  if (ends && ends <= now) return 'Expired';
  return 'Active';
};

const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');

const AdminOffersSection = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedProducts = useMemo(
    () => products.filter((product) => form.productIds.includes(Number(product.id))),
    [form.productIds, products],
  );

  const loadData = async () => {
    const [offerResponse, productResponse] = await Promise.all([
      getAdminOffers(),
      getAdminProducts({ limit: 100 }),
    ]);
    setOffers(Array.isArray(offerResponse?.data) ? offerResponse.data : []);
    setProducts(Array.isArray(productResponse?.data) ? productResponse.data : []);
  };

  useEffect(() => {
    loadData().catch(() => setMessage('Unable to load offers.'));
  }, []);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const editOffer = (offer) => {
    setEditingId(offer.id);
    const bundleVariantIds = {};
    (offer.products || []).forEach((product) => {
      if (product.selectedVariantId) bundleVariantIds[Number(product.id)] = Number(product.selectedVariantId);
    });
    setForm({
      ...emptyForm,
      offerType: offer.offerType,
      name: offer.name || '',
      description: offer.description || '',
      imageUrl: offer.imageUrl || '',
      productIds: (offer.products || []).map((product) => Number(product.id)),
      productId: offer.product?.id || '',
      discountVariantId: offer.product?.variantId || '',
      bundleVariantIds,
      bundlePrice: offer.bundlePrice ?? '',
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountValue ?? '',
      startsAt: toInputDate(offer.startsAt),
      noExpiration: !offer.endsAt,
      endsAt: toInputDate(offer.endsAt),
      isActive: Boolean(offer.isActive),
    });
  };

  const submitOffer = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!form.name.trim()) return setMessage('Offer name is required.');
    if (!form.startsAt) return setMessage('Start date/time is required.');
    if (!form.noExpiration && !form.endsAt) return setMessage('End date/time is required.');
    if (form.offerType === 'bundle' && form.productIds.length < 2) return setMessage('Select at least two products.');
    if (form.offerType === 'bundle' && (!form.bundlePrice || Number(form.bundlePrice) <= 0)) {
      return setMessage('Bundle price must be greater than zero.');
    }
    if (form.offerType === 'product_discount' && !form.productId) return setMessage('Select a product.');
    if (form.offerType === 'product_discount' && (!form.discountValue || Number(form.discountValue) <= 0)) {
      return setMessage('Discount value must be greater than zero.');
    }
    if (form.offerType === 'product_discount' && form.discountType === 'percentage' && Number(form.discountValue) > 100) {
      return setMessage('Percentage discount cannot exceed 100.');
    }

    // Weight targeting: a product with multiple weight tiers MUST have the
    // discount's weight selected explicitly (flavor is never required).
    const selectedProduct = products.find((product) => Number(product.id) === Number(form.productId));
    const discountTiers = weightTiersFor(selectedProduct);
    if (form.offerType === 'product_discount' && discountTiers.length > 1 && !form.discountVariantId) {
      return setMessage('Select which weight the discount applies to.');
    }

    const bundleVariantIds = {};
    let missingBundleWeight = '';
    for (const productId of form.productIds) {
      const product = products.find((item) => Number(item.id) === Number(productId));
      const tiers = weightTiersFor(product);
      const selected = form.bundleVariantIds[Number(productId)];
      if (tiers.length > 1) {
        if (!selected) {
          missingBundleWeight = product?.name || 'a bundle product';
          break;
        }
        bundleVariantIds[Number(productId)] = Number(selected);
      } else if (tiers.length === 1 && selected) {
        bundleVariantIds[Number(productId)] = Number(selected);
      } else if (tiers.length === 1) {
        bundleVariantIds[Number(productId)] = tiers[0].variantId;
      }
    }
    if (missingBundleWeight) {
      return setMessage(`Select the weight to include for "${missingBundleWeight}".`);
    }

    const payload = {
      offer_type: form.offerType,
      name: form.name,
      description: form.description,
      image_url: form.imageUrl.trim() || undefined,
      starts_at: new Date(form.startsAt).toISOString(),
      ends_at: form.noExpiration ? null : new Date(form.endsAt).toISOString(),
      is_active: form.isActive,
      ...(form.offerType === 'bundle'
        ? { product_ids: form.productIds, variant_ids: bundleVariantIds, bundle_price: Number(form.bundlePrice) }
        : {
            product_id: Number(form.productId),
            variant_id: discountTiers.length > 1 ? Number(form.discountVariantId) : (discountTiers.length === 1 ? discountTiers[0].variantId : null),
            discount_type: form.discountType,
            discount_value: Number(form.discountValue),
          }),
    };

    try {
      setIsSaving(true);
      if (editingId) await updateAdminOffer(editingId, payload);
      else await createAdminOffer(payload);
      setMessage(editingId ? 'Offer updated.' : 'Offer created.');
      resetForm();
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to save offer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (offerId) => {
    await deleteAdminOffer(offerId);
    await loadData();
  };

  return (
    <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
      <form onSubmit={submitOffer} className="space-y-4 border border-white/10 bg-zinc-900/60 p-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#FFCC00]">Admin Offers</p>
          <h2 className="font-heading text-2xl font-black uppercase text-white">{editingId ? 'Edit Offer' : 'Add Offer'}</h2>
        </div>
        <label className="block space-y-1 text-xs uppercase tracking-widest text-white/55">
          Offer Type
          <select className={fieldClass} value={form.offerType} onChange={(e) => updateForm('offerType', e.target.value)}>
            <option value="bundle">Bundle Offer</option>
            <option value="product_discount">Product Discount</option>
          </select>
        </label>
        <input className={fieldClass} placeholder="Offer name" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
        <textarea className={`${fieldClass} min-h-20`} placeholder="Description" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
        <input className={fieldClass} type="url" placeholder="Bundle image URL (optional)" value={form.imageUrl} onChange={(e) => updateForm('imageUrl', e.target.value)} />

        {form.offerType === 'bundle' ? (
          <>
            <select className={fieldClass} value="" onChange={(e) => {
              const id = Number(e.target.value);
              if (id && !form.productIds.includes(id)) {
                const product = products.find((item) => Number(item.id) === id);
                const tiers = weightTiersFor(product);
                setForm((current) => ({
                  ...current,
                  productIds: [...current.productIds, id],
                  bundleVariantIds: {
                    ...current.bundleVariantIds,
                    ...(tiers.length === 1 ? { [id]: tiers[0].variantId } : {}),
                  },
                }));
              }
            }}>
              <option value="">Add existing product</option>
              {products.filter((product) => !form.productIds.includes(Number(product.id))).map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <div className="space-y-2">
              {selectedProducts.map((product) => {
                const tiers = weightTiersFor(product);
                const selected = form.bundleVariantIds[Number(product.id)] || '';
                return (
                  <div key={product.id} className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => {
                      const nextIds = form.productIds.filter((id) => id !== Number(product.id));
                      const nextMap = { ...form.bundleVariantIds };
                      delete nextMap[Number(product.id)];
                      setForm((current) => ({ ...current, productIds: nextIds, bundleVariantIds: nextMap }));
                    }} className="border border-[#FFCC00]/40 px-2 py-1 text-[10px] uppercase text-[#FFCC00]">
                      {product.name} x
                    </button>
                    {tiers.length > 1 && (
                      <select
                        className={`${fieldClass} max-w-40`}
                        value={selected}
                        onChange={(e) => updateForm('bundleVariantIds', { ...form.bundleVariantIds, [Number(product.id)]: e.target.value ? Number(e.target.value) : '' })}
                      >
                        <option value="">Select weight…</option>
                        {tiers.map((tier) => <option key={tier.variantId} value={tier.variantId}>{tier.label}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            <input className={fieldClass} type="number" min="0" step="0.01" placeholder="Bundle price" value={form.bundlePrice} onChange={(e) => updateForm('bundlePrice', e.target.value)} />
          </>
        ) : (
          <>
            <select className={fieldClass} value={form.productId} onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : '';
              const product = products.find((item) => Number(item.id) === Number(id));
              const tiers = weightTiersFor(product);
              setForm((current) => ({
                ...current,
                productId: id,
                discountVariantId: tiers.length === 1 ? tiers[0].variantId : '',
              }));
            }}>
              <option value="">Select existing product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            {(() => {
              const product = products.find((item) => Number(item.id) === Number(form.productId));
              const tiers = weightTiersFor(product);
              if (tiers.length <= 1) return null;
              return (
                <label className="block space-y-1 text-xs uppercase tracking-widest text-white/55">
                  Discount weight (required — all flavors of this weight)
                  <select className={fieldClass} value={form.discountVariantId} onChange={(e) => updateForm('discountVariantId', e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Select weight…</option>
                    {tiers.map((tier) => <option key={tier.variantId} value={tier.variantId}>{tier.label}</option>)}
                  </select>
                </label>
              );
            })()}
            <select className={fieldClass} value={form.discountType} onChange={(e) => updateForm('discountType', e.target.value)}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <input className={fieldClass} type="number" min="0" step="0.01" placeholder="Discount value" value={form.discountValue} onChange={(e) => updateForm('discountValue', e.target.value)} />
          </>
        )}

        <input className={fieldClass} type="datetime-local" value={form.startsAt} onChange={(e) => updateForm('startsAt', e.target.value)} />
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
          <input type="checkbox" checked={form.noExpiration} onChange={(e) => updateForm('noExpiration', e.target.checked)} />
          No expiration
        </label>
        {!form.noExpiration && <input className={fieldClass} type="datetime-local" value={form.endsAt} onChange={(e) => updateForm('endsAt', e.target.value)} />}
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
          <input type="checkbox" checked={form.isActive} onChange={(e) => updateForm('isActive', e.target.checked)} />
          Active
        </label>
        {message && <p className="text-xs uppercase tracking-widest text-[#FFCC00]">{message}</p>}
        <div className="flex gap-2">
          <button className="btn-primary px-5 py-2 text-xs" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Offer'}</button>
          {editingId && <button type="button" className="border border-white/20 px-5 py-2 text-xs uppercase text-white" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <div className="overflow-hidden border border-white/10 bg-zinc-900/60">
        <div className="grid grid-cols-[1fr_120px_110px_170px] gap-3 border-b border-white/10 px-4 py-3 text-[10px] uppercase tracking-widest text-white/45">
          <span>Offer</span><span>Type</span><span>Status</span><span>Actions</span>
        </div>
        {offers.map((offer) => (
          <div key={offer.id} className="grid grid-cols-[1fr_120px_110px_170px] gap-3 border-b border-white/5 px-4 py-3 text-xs text-white/75">
            <span>
              {offer.name}
              <span className="ml-2 text-[10px] text-white/40">
                {offer.offerType === 'bundle'
                  ? `${Number(offer.bundlePrice || 0).toFixed(0)} EGP`
                  : `${offer.discountType === 'percentage' ? `${Number(offer.discountValue || 0)}%` : `${Number(offer.discountValue || 0).toFixed(0)} EGP`} off ${offer.product?.name || ''}${offer.product?.variantWeightLabel ? ` — ${offer.product.variantWeightLabel}` : ''}`}
              </span>
            </span>
            <span>{offer.offerType === 'bundle' ? 'Bundle' : 'Discount'}</span>
            <span className={getStatus(offer) === 'Active' ? 'text-[#FFCC00]' : getStatus(offer) === 'Expired' ? 'text-red-400' : 'text-white/60'}>
              {getStatus(offer)}
            </span>
            <span className="flex gap-2">
              <button className="text-[#FFCC00]" onClick={() => editOffer(offer)}>Edit</button>
              <button className="text-white/70" onClick={async () => { await updateAdminOfferStatus(offer.id, { is_active: !offer.isActive }); await loadData(); }}>{offer.isActive ? 'Disable' : 'Enable'}</button>
              <button className="text-red-400" onClick={() => handleDelete(offer.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdminOffersSection;