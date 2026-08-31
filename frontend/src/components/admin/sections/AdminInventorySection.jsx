import React, { useEffect, useMemo, useState } from 'react';

import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProducts,
  updateAdminProduct,
} from '../../../services/api/admin.js';

const MAX_IMAGES = 20;

const categoryOptions = [
  { label: 'Supplements', value: 'Supplements', slug: 'supplements' },
  { label: 'Vitamins', value: 'Vitamins', slug: 'vitamins' },
  { label: 'Amino Acids', value: 'Amino Acids', slug: 'amino-acids' },
  { label: 'Gym Accessories', value: 'Gym Accessories', slug: 'gym-accessories' },
];

const supplementSubcategoryOptions = [
  { label: 'Creatine', value: 'Creatine', slug: 'creatine' },
  { label: 'Protein', value: 'Protein', slug: 'protein' },
  { label: 'Carb', value: 'Carb', slug: 'carb' },
  { label: 'Pre-Workout', value: 'Pre-Workout', slug: 'pre-workout' },
];

const createEmptyVariant = () => ({
  id: null,
  flavor: '',
  weightValue: '',
  weightUnit: 'g',
  stockQuantity: 0,
});

const createEmptyForm = () => ({
  name: '',
  description: '',
  basePrice: '',
  categoryName: 'Supplements',
  subcategoryName: 'Protein',
  hasFlavor: false,
  hasWeight: false,
  flavors: [''],
  weights: [{ value: '', unit: 'g', price: '' }],
  variants: [createEmptyVariant()],
  images: [''],
});

const uniqueTrimmed = (items) => {
  const seen = new Set();
  return items
    .map((item) => String(item || '').trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const variantKey = ({ flavor = '', weightValue = '', weightUnit = '' }) =>
  `${String(flavor).trim().toLowerCase()}::${String(weightValue).trim()}::${String(weightUnit).trim()}`;

const weightLabel = (weight) => {
  const value = String(weight?.value ?? weight?.weightValue ?? '').trim();
  const unit = String(weight?.unit ?? weight?.weightUnit ?? 'g').trim();
  return value && unit ? `${Number(value).toString()} ${unit}` : '';
};

const buildVariantsFromOptions = ({ hasFlavor, hasWeight, basePrice, flavors, weights, variants }) => {
  if (!hasFlavor && !hasWeight) {
    return variants.length ? variants : [createEmptyVariant()];
  }

  const previousMap = new Map((variants || []).map((variant) => [variantKey(variant), variant]));
  const activeFlavors = hasFlavor ? uniqueTrimmed(flavors) : [''];
  const base = Number(basePrice) || 0;
  const activeWeights = hasWeight
    ? weights
        .map((weight) => ({
          value: String(weight.value || '').trim(),
          unit: weight.unit === 'kg' ? 'kg' : 'g',
          price: weight.price === undefined || weight.price === null || weight.price === '' ? null : Number(weight.price),
        }))
        .filter((weight) => weight.value && Number(weight.value) > 0)
    : [{ value: '', unit: '', price: null }];

  if (!activeFlavors.length || !activeWeights.length) return [];

  return activeFlavors.flatMap((flavor) =>
    activeWeights.map((weight) => {
      const previous = previousMap.get(variantKey({ flavor, weightValue: weight.value, weightUnit: weight.unit }));
      // PRICE COMES FROM THE WEIGHT: every flavor of the same weight shares
      // one price (priceModifier = weight price − product base price), so
      // changing flavor can never change the price.
      const priceModifier =
        weight.price !== null && Number.isFinite(weight.price)
          ? Number((Number(weight.price) - base).toFixed(2))
          : previous?.priceModifier ?? 0;
      return {
        id: previous?.id || null,
        flavor,
        weightValue: weight.value,
        weightUnit: weight.unit,
        priceModifier,
        stockQuantity: previous?.stockQuantity ?? 0,
      };
    }),
  );
};

const inferCategoryFields = (product) => {
  if (product?.parentCategoryName === 'Supplements' || product?.parentCategorySlug === 'supplements') {
    return { categoryName: 'Supplements', subcategoryName: product.categoryName || 'Protein' };
  }

  const direct = categoryOptions.find(
    (category) => category.label === product?.categoryName || category.slug === product?.categorySlug,
  );
  return {
    categoryName: direct?.value || 'Supplements',
    subcategoryName: direct?.value === 'Supplements' ? 'Protein' : '',
  };
};

const normalizeProductToForm = (product) => {
  const variants = Array.isArray(product?.variants) && product.variants.length
    ? product.variants.map((variant) => ({
        id: variant.id,
        flavor: variant.flavor || variant.color || '',
        weightValue: variant.weightValue ?? variant.weight_value ?? '',
        weightUnit: variant.weightUnit || variant.weight_unit || 'g',
        priceModifier: Number(variant.priceModifier ?? variant.price_modifier ?? 0),
        stockQuantity: Number(variant.stockQuantity ?? variant.stock_quantity ?? 0),
      }))
    : [createEmptyVariant()];
  const hasFlavor = Boolean(product?.hasFlavor);
  const hasWeight = Boolean(product?.hasWeight);
  const { categoryName, subcategoryName } = inferCategoryFields(product);
  const images = Array.isArray(product?.images) && product.images.length
    ? product.images.map((image) => image.imageUrl || image.image_url || '').filter(Boolean).slice(0, MAX_IMAGES)
    : [product?.primaryImage || product?.primary_image || ''];
  const uniqueWeights = variants
    .filter((variant) => variant.weightValue)
    .map((variant) => {
      const key = weightLabel(variant);
      // Derive the single weight price from any variant of that weight:
      // price = product base price + price modifier.
      const price = Number(product?.basePrice ?? 0) + Number(variant.priceModifier ?? variant.price_modifier ?? 0);
      return { value: String(variant.weightValue), unit: variant.weightUnit || 'g', price: String(price) };
    })
    .filter((weight, index, list) => list.findIndex((item) => weightLabel(item) === weightLabel(weight)) === index);

  return {
    name: product?.name || '',
    description: product?.description || '',
    basePrice: String(product?.basePrice ?? ''),
    categoryName,
    subcategoryName,
    hasFlavor,
    hasWeight,
    flavors: hasFlavor ? uniqueTrimmed(variants.map((variant) => variant.flavor)) : [''],
    weights: hasWeight && uniqueWeights.length ? uniqueWeights : [{ value: '', unit: 'g', price: '' }],
    variants,
    images: images.length ? images : [''],
  };
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const parseNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const createPayloadFromForm = ({ form, removedVariantIds, isEdit }) => {
  const category = categoryOptions.find((item) => item.value === form.categoryName) || categoryOptions[0];
  const subcategory = supplementSubcategoryOptions.find((item) => item.value === form.subcategoryName);
  const imageCount = form.images.filter((image) => String(image || '').trim()).length;
  const variants = buildVariantsFromOptions(form);

  if (!String(form.name || '').trim()) throw new Error('Product name is required.');
  if (!String(form.description || '').trim()) throw new Error('Description is required.');
  if (!Number.isFinite(parseNonNegativeNumber(form.basePrice, NaN))) throw new Error('Price must be a valid number.');
  if (category.slug === 'supplements' && !subcategory) throw new Error('Supplements require a subcategory.');
  if (!variants.length) throw new Error('Add at least one valid option or disable Flavor and Weight.');
  if (form.hasWeight) {
    for (const weight of form.weights) {
      if (String(weight.value || '').trim() && Number(weight.value) > 0 && !Number.isFinite(Number(weight.price))) {
        throw new Error('Every weight needs a price (the price applies to all flavors of that weight).');
      }
    }
  }
  if (imageCount > MAX_IMAGES) throw new Error(`You can add up to ${MAX_IMAGES} image URLs.`);

  const payload = {
    name: String(form.name || '').trim(),
    description: String(form.description || '').trim(),
    base_price: parseNonNegativeNumber(form.basePrice, NaN),
    category_name: category.value,
    category_slug: category.slug,
    subcategory_name: category.slug === 'supplements' ? subcategory?.value : undefined,
    subcategory_slug: category.slug === 'supplements' ? subcategory?.slug : undefined,
    has_flavor: Boolean(form.hasFlavor),
    has_weight: Boolean(form.hasWeight),
    variants: variants.map((variant) => ({
      id: variant.id || undefined,
      flavor: form.hasFlavor ? variant.flavor : null,
      weight_value: form.hasWeight ? Number(variant.weightValue) : null,
      weight_unit: form.hasWeight ? variant.weightUnit : null,
      size: form.hasWeight && variant.weightValue ? `${Number(variant.weightValue).toString()} ${variant.weightUnit}` : null,
      color: form.hasFlavor ? variant.flavor : null,
      color_hex: null,
      // Weight-driven pricing: price_modifier = weight price − base price.
      price_modifier: Number(variant.priceModifier ?? 0),
      stock_quantity: parseNonNegativeNumber(variant.stockQuantity, 0),
    })),
    images: uniqueTrimmed(form.images).slice(0, MAX_IMAGES).map((imageUrl, index) => ({
      image_url: imageUrl,
      is_primary: index === 0,
    })),
  };

  if (isEdit && removedVariantIds.length) payload.removed_variant_ids = removedVariantIds;
  return payload;
};

const AdminInventorySection = ({ inventory, onInventoryMutated }) => {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, limit: 12, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [removedVariantIds, setRemovedVariantIds] = useState([]);
  const [productPendingDelete, setProductPendingDelete] = useState(null);

  const metrics = useMemo(
    () => [
      { label: 'Products', value: Number(inventory?.totalProducts || 0) },
      { label: 'Variants / SKUs', value: Number(inventory?.totalVariants || 0) },
      { label: 'Low Stock Variants', value: Number(inventory?.lowStockVariants || 0) },
      { label: 'Featured Products', value: Number(inventory?.featuredProducts || 0) },
    ],
    [inventory],
  );

  const refreshProducts = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await getAdminProducts({ page, limit: meta.limit, search: searchQuery.trim() || undefined });
      setProducts(Array.isArray(response?.data) ? response.data : []);
      setMeta((previous) => ({
        ...previous,
        totalCount: Number(response?.meta?.totalCount || 0),
        page: Number(response?.meta?.page || page),
        limit: Number(response?.meta?.limit || previous.limit),
        totalPages: Math.max(1, Number(response?.meta?.totalPages || 1)),
      }));
    } catch (error) {
      setLoadError(error?.response?.data?.message || 'Unable to load products from the database.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, [page, searchQuery]);

  const syncVariantRows = (draft) => {
    const nextVariants = buildVariantsFromOptions(draft);
    const removedIds = draft.variants
      .filter((variant) => variant.id && !nextVariants.some((nextVariant) => nextVariant.id === variant.id))
      .map((variant) => variant.id);

    if (removedIds.length) {
      setRemovedVariantIds((current) => Array.from(new Set([...current, ...removedIds])));
    }

    return { ...draft, variants: nextVariants.length ? nextVariants : draft.variants };
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProductId(null);
    setFormData(createEmptyForm());
    setRemovedVariantIds([]);
  };

  const openCreateForm = () => {
    setActionMessage('');
    setLoadError('');
    setEditingProductId(null);
    setRemovedVariantIds([]);
    setFormData(createEmptyForm());
    setIsFormOpen(true);
  };

  const openEditForm = (product) => {
    setActionMessage('');
    setLoadError('');
    setEditingProductId(product.id);
    setRemovedVariantIds([]);
    setFormData(normalizeProductToForm(product));
    setIsFormOpen(true);
  };

  const updateFormField = (field, value) => {
    setFormData((previous) => {
      const next = { ...previous, [field]: value };
      if (field === 'categoryName' && value !== 'Supplements') next.subcategoryName = '';
      if (field === 'categoryName' && value === 'Supplements' && !next.subcategoryName) next.subcategoryName = 'Protein';
      if (field === 'hasFlavor' || field === 'hasWeight') return syncVariantRows(next);
      return next;
    });
  };

  const updateOptionList = (field, index, value) => {
    setFormData((previous) => syncVariantRows({
      ...previous,
      [field]: previous[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addOption = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: [...previous[field], value] }));
  };

  const removeOption = (field, index) => {
    setFormData((previous) => syncVariantRows({
      ...previous,
      [field]: previous[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateVariantStock = (index, value) => {
    setFormData((previous) => ({
      ...previous,
      variants: previous.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, stockQuantity: value } : variant,
      ),
    }));
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionMessage('');
    setLoadError('');

    try {
      const isEdit = Boolean(editingProductId);
      const payload = createPayloadFromForm({ form: formData, removedVariantIds, isEdit });

      if (isEdit) {
        await updateAdminProduct(editingProductId, payload);
        setActionMessage('Product updated successfully.');
      } else {
        await createAdminProduct(payload);
        setActionMessage('Product created successfully.');
      }

      closeForm();
      if (typeof onInventoryMutated === 'function') await onInventoryMutated();
      await refreshProducts();
    } catch (error) {
      setLoadError(error?.response?.data?.message || error?.message || 'Unable to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productPendingDelete?.id) return;
    setIsDeleting(true);
    setActionMessage('');
    setLoadError('');

    try {
      await deleteAdminProduct(productPendingDelete.id);
      setActionMessage('Product deleted successfully.');
      setProductPendingDelete(null);
      if (typeof onInventoryMutated === 'function') await onInventoryMutated();
      if (products.length === 1 && page > 1) setPage((current) => Math.max(1, current - 1));
      else await refreshProducts();
    } catch (error) {
      setLoadError(error?.response?.data?.message || 'Unable to delete this product.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tighter text-white">Inventory Management</h2>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-400">Simple catalog CRUD synced with PostgreSQL</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="text" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }} placeholder="Search by product or slug" className="w-64 max-w-full border border-white/10 bg-[#121212] px-4 py-3 text-[11px] uppercase tracking-wider text-white outline-none focus:border-[var(--theme-accent)]" />
          <button type="button" onClick={openCreateForm} className="bg-[var(--theme-accent)] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--theme-accent-hover)]">Add Product</button>
        </div>
      </div>

      {actionMessage && <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-[var(--theme-accent)]">{actionMessage}</p>}
      {loadError && <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-yellow-400">{loadError}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="border border-white/5 bg-[#111] p-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">{metric.label}</p>
            <p className="font-display text-4xl font-black tracking-tighter text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto border border-white/5 bg-[#101010]">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase tracking-[0.18em] text-white/45">
              <th className="px-5 py-4 text-left">Product</th>
              <th className="px-5 py-4 text-left">Category</th>
              <th className="px-5 py-4 text-left">Price</th>
              <th className="px-5 py-4 text-left">Stock</th>
              <th className="px-5 py-4 text-left">Variants</th>
              <th className="px-5 py-4 text-left">Updated</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-white/60">Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-white/60">No products found.</td></tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-white/5 text-sm text-white/90">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-white/45">/{product.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-white/75">{product.parentCategoryName ? `${product.parentCategoryName} / ${product.categoryName}` : product.categoryName || 'Uncategorized'}</td>
                  <td className="px-5 py-4">{Number(product.basePrice || 0).toFixed(2)} EGP</td>
                  <td className="px-5 py-4">{Number(product.totalStock || 0)}</td>
                  <td className="px-5 py-4">{Number(product.variantCount || 0)}</td>
                  <td className="px-5 py-4 text-white/65">{formatDateTime(product.updatedAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditForm(product)} className="border border-white/15 bg-[#1f1f1f] px-4 py-2 text-[10px] uppercase tracking-widest text-white transition-colors hover:border-neon">Edit</button>
                      <button type="button" onClick={() => setProductPendingDelete(product)} className="border border-red-500/40 bg-[#2a1313] px-4 py-2 text-[10px] uppercase tracking-widest text-red-200 transition-colors hover:border-red-400">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-[0.16em] text-white/55">
        <p>Showing {products.length} of {meta.totalCount} products</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">Prev</button>
          <span className="px-2 text-[10px] text-white/60">Page {page} / {Math.max(1, meta.totalPages)}</span>
          <button type="button" disabled={page >= meta.totalPages || isLoading} onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))} className="border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">Next</button>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl border border-white/10 bg-[#0f0f0f] p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">{editingProductId ? 'Update Product' : 'Create Product'}</p>
                <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-tight text-white">{editingProductId ? 'Edit Catalog Item' : 'New Catalog Item'}</h3>
              </div>
              <button type="button" onClick={closeForm} className="border border-white/15 bg-[#1a1a1a] px-4 py-2 text-[10px] uppercase tracking-widest text-white hover:border-white">Close</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-7">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Name</span>
                  <input value={formData.name} onChange={(event) => updateFormField('name', event.target.value)} type="text" className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-[var(--theme-accent)]" required />
                </label>
                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Price</span>
                  <input value={formData.basePrice} onChange={(event) => updateFormField('basePrice', event.target.value)} type="number" min="0" step="0.01" className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-[var(--theme-accent)]" required />
                </label>
                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Category</span>
                  <select value={formData.categoryName} onChange={(event) => updateFormField('categoryName', event.target.value)} className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-[var(--theme-accent)]" required>
                    {categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                </label>
                {formData.categoryName === 'Supplements' && (
                  <label className="space-y-2">
                    <span className="block text-[10px] uppercase tracking-widest text-white/45">Supplements Subcategory</span>
                    <select value={formData.subcategoryName} onChange={(event) => updateFormField('subcategoryName', event.target.value)} className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-[var(--theme-accent)]" required>
                      {supplementSubcategoryOptions.map((subcategory) => <option key={subcategory.value} value={subcategory.value}>{subcategory.label}</option>)}
                    </select>
                  </label>
                )}
              </div>

              <label className="block space-y-2">
                <span className="block text-[10px] uppercase tracking-widest text-white/45">Description</span>
                <textarea value={formData.description} onChange={(event) => updateFormField('description', event.target.value)} className="min-h-[120px] w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-[var(--theme-accent)]" required />
              </label>

              <div className="border border-white/10 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">Product Options</p>
                  <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-widest text-white/70">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={formData.hasFlavor} onChange={(event) => updateFormField('hasFlavor', event.target.checked)} /> Flavor</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={formData.hasWeight} onChange={(event) => updateFormField('hasWeight', event.target.checked)} /> Weight</label>
                  </div>
                </div>

                {formData.hasFlavor && (
                  <div className="mb-5 space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/45">Flavors</p>
                    {formData.flavors.map((flavor, index) => (
                      <div key={`flavor-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
                        <input value={flavor} onChange={(event) => updateOptionList('flavors', index, event.target.value)} type="text" placeholder="Chocolate" className="border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--theme-accent)]" />
                        <button type="button" onClick={() => removeOption('flavors', index)} disabled={formData.flavors.length === 1} className="border border-red-500/40 bg-[#2a1313] px-3 py-2 text-[10px] uppercase tracking-widest text-red-200 disabled:cursor-not-allowed disabled:opacity-40">Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption('flavors', '')} className="border border-white/15 bg-[#1f1f1f] px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-[var(--theme-accent)]">Add Flavor</button>
                  </div>
                )}

                {formData.hasWeight && (
                  <div className="mb-5 space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-white/45">Weights</p>
                    {formData.weights.map((weight, index) => (
                      <div key={`weight-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px_110px]">
                        <input value={weight.value} onChange={(event) => updateOptionList('weights', index, { ...weight, value: event.target.value })} type="number" min="0" step="0.01" placeholder="500" className="border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--theme-accent)]" />
                        <select value={weight.unit} onChange={(event) => updateOptionList('weights', index, { ...weight, unit: event.target.value })} className="border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--theme-accent)]">
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                        </select>
                        <input value={weight.price ?? ''} onChange={(event) => updateOptionList('weights', index, { ...weight, price: event.target.value })} type="number" min="0" step="0.01" placeholder="Price (EGP)" title="Price for this weight — shared by all flavors" className="border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--theme-accent)]" />
                        <button type="button" onClick={() => removeOption('weights', index)} disabled={formData.weights.length === 1} className="border border-red-500/40 bg-[#2a1313] px-3 py-2 text-[10px] uppercase tracking-widest text-red-200 disabled:cursor-not-allowed disabled:opacity-40">Remove</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption('weights', { value: '', unit: 'g', price: '' })} className="border border-white/15 bg-[#1f1f1f] px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-[var(--theme-accent)]">Add Weight</button>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">Variant Stock</p>
                  {formData.variants.map((variant, index) => (
                    <div key={`${variantKey(variant)}-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                      <div className="border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white/80">
                        {[variant.flavor, variant.weightValue ? `${Number(variant.weightValue).toString()} ${variant.weightUnit}` : ''].filter(Boolean).join(' / ') || 'Standard Product'}
                      </div>
                      <input value={variant.stockQuantity} onChange={(event) => updateVariantStock(index, event.target.value)} type="number" min="0" step="1" placeholder="Stock" className="border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-[var(--theme-accent)]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">Image Links</p>
                  <button type="button" onClick={() => addOption('images', '')} disabled={formData.images.length >= MAX_IMAGES} className="border border-white/15 bg-[#1f1f1f] px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-40">Add Image</button>
                </div>
                <div className="space-y-4">
                  {formData.images.map((imageUrl, index) => (
                    <div key={`image-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
                      <input value={imageUrl} onChange={(event) => updateOptionList('images', index, event.target.value)} type="url" placeholder="https://example.com/product-image.jpg" className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-[var(--theme-accent)]" />
                      <button type="button" onClick={() => removeOption('images', index)} disabled={formData.images.length === 1} className="border border-red-500/40 bg-[#2a1313] px-3 py-2 text-[10px] uppercase tracking-widest text-red-200 disabled:cursor-not-allowed disabled:opacity-40">Remove</button>
                    </div>
                  ))}
                  {formData.images.find((imageUrl) => String(imageUrl || '').trim()) ? (
                    <img src={formData.images.find((imageUrl) => String(imageUrl || '').trim())} alt="Product preview" className="h-44 w-full border border-white/10 object-cover md:h-36" />
                  ) : (
                    <p className="text-xs text-white/45">Paste direct image links here. The first URL is used as the primary image.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="button" onClick={closeForm} className="border border-white/15 bg-[#1a1a1a] px-5 py-3 text-[10px] uppercase tracking-widest text-white">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-[var(--theme-accent)] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--theme-accent-hover)] disabled:cursor-not-allowed disabled:opacity-45">
                  {isSaving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productPendingDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-white/10 bg-[#111] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">Confirm Delete</p>
            <h4 className="mt-3 font-display text-xl font-black uppercase tracking-tight text-white">Delete {productPendingDelete.name}?</h4>
            <p className="mt-4 text-sm leading-6 text-white/70">This action permanently removes the product from the catalog. It will also disappear from shop pages.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setProductPendingDelete(null)} className="border border-white/15 bg-[#1a1a1a] px-5 py-3 text-[10px] uppercase tracking-widest text-white">Cancel</button>
              <button type="button" onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600 px-5 py-3 text-[10px] uppercase tracking-widest text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45">{isDeleting ? 'Deleting...' : 'Delete Product'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventorySection;