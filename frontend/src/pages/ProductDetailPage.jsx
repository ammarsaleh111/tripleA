import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProductBySlug as getProductBySlugApi, getProducts as getProductsApi } from '../services/api/products.js';
import { useAppContext } from '../context/AppContext.jsx';
import ProductCard from '../components/shop/ProductCard.jsx';

const DEFAULT_SHIPPING_MESSAGE =
  'Cash on Delivery available. Fast delivery on all supplement orders.';
const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=900&q=80';

const FEATURE_PANELS = [
  {
    title: 'Peak Performance',
    body: 'Formulated for intensive training sessions and maximum muscle recovery.',
  },
  {
    title: 'Premium Quality',
    body: 'Independently lab tested for purity, potency, and label accuracy.',
  },
  {
    title: 'COD Checkout',
    body: 'Order fast and pay cash when your delivery arrives.',
  },
];

const EMPTY_PRODUCT = {
  id: null,
  name: 'Product',
  category: 'Collection',
  price: 0,
  rating: 0,
  reviewCount: 0,
  colors: [],
  sizes: [],
  hasFlavor: false,
  hasWeight: false,
  description: 'Product details are unavailable.',
  materials: 'Specification details are unavailable.',
  shipping: DEFAULT_SHIPPING_MESSAGE,
  images: [FALLBACK_PRODUCT_IMAGE],
  variants: [],
};

const Accordion = ({ title, content, isOpen, onClick }) => {
  const safeContent = String(content || '').trim() || 'No details available right now.';

  return (
    <div className="border-b border-[#1C1C26]">
      <button
        type="button"
        className="group flex w-full items-center justify-between py-4 text-left transition-all duration-300 ease-in-out hover:text-white"
        onClick={onClick}
      >
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition-all duration-300 ease-in-out group-hover:text-[#FFCC00]">
          {title}
        </span>
        <svg
          className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#FFCC00]' : 'text-zinc-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-sm leading-relaxed text-zinc-400">{safeContent}</p>
      </div>
    </div>
  );
};

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addCartItem } = useAppContext();
  const [product, setProduct] = useState(EMPTY_PRODUCT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cartFeedback, setCartFeedback] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState('description');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const materialsSectionRef = useRef(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await getProductBySlugApi(slug);
        const data = response?.data;

        if (!data) {
          throw new Error('Invalid product response payload.');
        }

        const hasFlavor = Boolean(data.has_flavor ?? data.hasFlavor);
        const hasWeight = Boolean(data.has_weight ?? data.hasWeight);
        const colorSource = hasFlavor
          ? Array.isArray(data.availableFlavors)
            ? data.availableFlavors
            : Array.isArray(data.availableColors)
            ? data.availableColors
            : Array.from(
                new Map(
                  (data.variants || [])
                    .filter((variant) => variant.flavor || variant.color)
                    .map((variant) => [
                      variant.flavor || variant.color,
                      { name: variant.flavor || variant.color, hex: variant.color_hex || '#1f1f1f' },
                    ]),
                ).values(),
              )
          : [];

        const mappedColors = colorSource.map((color, index) => ({
          id: `api-color-${index + 1}`,
          name: color.name,
          hex: color.hex || '#1f1f1f',
        }));

        const mappedImages = (data.images || []).map((image) => image.image_url).filter(Boolean);
        const mappedSizes = hasWeight
          ? Array.isArray(data.availableWeights)
            ? data.availableWeights.map((weight) => weight.label || `${Number(weight.value).toString()} ${weight.unit}`)
            : Array.isArray(data.availableSizes)
            ? data.availableSizes
            : Array.from(new Set((data.variants || []).map((variant) => variant.weight_label || variant.size).filter(Boolean)))
          : [];

        const nextProduct = {
          id: data.id,
          name: data.name || EMPTY_PRODUCT.name,
          category: data.category_name || EMPTY_PRODUCT.category,
          price: Number(data.base_price || 0),
          rating: Number(data.reviews?.rating || 0),
          reviewCount: Number(data.reviews?.count || 0),
          colors: mappedColors,
          sizes: mappedSizes,
          hasFlavor,
          hasWeight,
          description: data.description || EMPTY_PRODUCT.description,
          materials: data.materials_care || EMPTY_PRODUCT.materials,
          shipping: DEFAULT_SHIPPING_MESSAGE,
          images: mappedImages.length ? mappedImages : [FALLBACK_PRODUCT_IMAGE],
          variants: Array.isArray(data.variants) ? data.variants : [],
        };

        setProduct(nextProduct);
        setSelectedColor(nextProduct.hasFlavor ? nextProduct.colors[0] || null : null);
        setSelectedSize(nextProduct.hasWeight ? nextProduct.sizes[0] || '' : '');
        setQuantity(1);
        setActiveImage(0);
      } catch (error) {
        console.error('Failed to load product from API.', error);
        setErrorMessage('Unable to fetch live product details right now.');
        setProduct(EMPTY_PRODUCT);
        setSelectedColor(null);
        setSelectedSize('');
        setQuantity(1);
        setActiveImage(0);
      } finally {
        setIsLoading(false);
      }
    };

    if (!slug) {
      setErrorMessage('Product slug is missing.');
      setProduct(EMPTY_PRODUCT);
      return;
    }

    loadProduct();
  }, [slug]);

  const selectedVariant = useMemo(
    () =>
      (product.variants || []).find((variant) => {
        const variantWeightLabel = variant.weight_label ||
          (variant.weight_value && variant.weight_unit ? `${Number(variant.weight_value).toString()} ${variant.weight_unit}` : variant.size);
        const sizeMatch = product.hasWeight && selectedSize
          ? String(variantWeightLabel || '').toUpperCase() === String(selectedSize || '').toUpperCase()
          : true;
        const colorMatch = product.hasFlavor && selectedColor
          ? String(variant.flavor || variant.color || '').toLowerCase() === String(selectedColor?.name || '').toLowerCase()
          : true;
        return sizeMatch && colorMatch;
      }) || null,
    [product.variants, selectedColor, selectedSize],
  );

  const selectedStock = Math.max(0, Number(selectedVariant?.stock_quantity || 0));
  const maxSelectableQuantity = Math.max(1, Math.min(10, selectedStock || 10));
  const hasMultipleImages = product.images.length > 1;

  const shortDescription = useMemo(() => {
    const value = String(product.description || '').replace(/\s+/g, ' ').trim();
    if (!value) {
      return 'Premium supplement engineered for maximum performance.';
    }
    if (value.length <= 150) {
      return value;
    }
    return `${value.slice(0, 147)}...`;
  }, [product.description]);

  const canAddToCart = Boolean(selectedVariant) && selectedStock > 0 && !isLoading;

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant?.id]);

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), maxSelectableQuantity));
  }, [maxSelectableQuantity]);

  const goToPreviousImage = () => {
    setActiveImage((current) => (current - 1 + product.images.length) % product.images.length);
  };

  const goToNextImage = () => {
    setActiveImage((current) => (current + 1) % product.images.length);
  };

  const handleAddToCart = async () => {
    setCartFeedback('');

    if (!selectedVariant) {
      setCartFeedback('Selected option is unavailable.');
      return { success: false };
    }

    if (selectedStock <= 0) {
      setCartFeedback('This option is currently out of stock.');
      return { success: false };
    }

    const selectedVariantId = Number(selectedVariant.id);
    const selectedQuantity = Math.min(Math.max(1, quantity), maxSelectableQuantity);
    const selectedVariantLabel = [
      selectedVariant.flavor || selectedVariant.color || selectedColor?.name,
      selectedVariant.weight_label || selectedVariant.size || selectedSize,
    ].filter(Boolean).join(' / ') || 'Standard';

    const result = await addCartItem({
      variantId: selectedVariantId,
      quantity: selectedQuantity,
      optimisticItem: {
        id: `temp-${selectedVariantId}`,
        cartItemId: `temp-${selectedVariantId}`,
        variantId: selectedVariantId,
        productId: product.id,
        slug,
        name: product.name,
        variant: selectedVariantLabel,
        color: selectedVariant.flavor || selectedVariant.color || selectedColor?.name || null,
        flavor: selectedVariant.flavor || selectedVariant.color || selectedColor?.name || null,
        size: selectedVariant.weight_label || selectedVariant.size || selectedSize || null,
        unitPrice: Number(product.price || 0),
        quantity: selectedQuantity,
        imageUrl: product.images?.[0] || FALLBACK_PRODUCT_IMAGE,
      },
    });

    if (!result.success) {
      setCartFeedback(result.message || 'Unable to add this item to cart.');
      return result;
    }

    setCartFeedback(`${selectedQuantity} item${selectedQuantity > 1 ? 's' : ''} added to cart.`);
    return result;
  };

  const handleBuyNow = async () => {
    const result = await handleAddToCart();
    if (result?.success) {
      navigate('/checkout');
    }
  };

  const handleShowSizeGuide = () => {
    setShowSizeGuide(true);
  };

  useEffect(() => {
    let isMounted = true;

    const loadRelatedProducts = async () => {
      try {
        const response = await getProductsApi({ category: '', sort_by: 'featured', limit: 4, page: 1 });
        const mapped = Array.isArray(response?.data)
          ? response.data
              .filter((item) => item.slug !== slug)
              .map((item) => ({
                id: item.id,
                slug: item.slug,
                defaultVariantId: Number(item.default_variant_id || 0) || null,
                defaultVariantStock: Number(item.default_variant_stock || 0),
                totalStock: Number(item.total_stock || 0),
                name: item.name,
                price: Number(item.base_price || 0),
                colorName: item.category_name || 'Supplements',
                imageUrl:
                  item.primary_image ||
                  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=700&q=80',
                isNew: Boolean(item.is_featured),
                rating: Number(item.avg_rating || 0),
                reviewCount: Number(item.review_count || 0),
                badgeText: item.is_featured ? 'Related' : '',
              }))
          : [];
        if (isMounted) setRelatedProducts(mapped.slice(0, 4));
      } catch {
        if (isMounted) setRelatedProducts([]);
      }
    };

    loadRelatedProducts();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const stockStatusLabel = !selectedVariant
    ? `Select ${[product.hasFlavor ? 'flavor' : '', product.hasWeight ? 'weight' : ''].filter(Boolean).join(' and ') || 'option'}`
    : selectedStock > 0
      ? `${selectedStock} in stock`
      : 'Out of stock';

  const stockStatusClass = !selectedVariant
    ? 'text-zinc-400'
    : selectedStock > 0
      ? 'text-[#FFCC00]'
      : 'text-red-400';

  return (
    <section className="mx-auto w-full max-w-[1500px] px-4 py-8 text-white sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <Link to="/" className="cursor-pointer transition-colors hover:text-[#FFCC00]">Home</Link>
        <span>&gt;</span>
        <Link to="/shop" className="cursor-pointer transition-colors hover:text-[#FFCC00]">Shop</Link>
        <span>&gt;</span>
        <span className="text-white">{product.name}</span>
      </div>

      {errorMessage && !isLoading && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1C1C26] bg-[#0B0B0E] px-4 py-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FFCC00]">{errorMessage}</p>
          <Link
            to="/shop"
            className="rounded-lg border border-[#22222E] bg-[#14141E] px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00]"
          >
            Back To Shop
          </Link>
        </div>
      )}

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        {/* Gallery Panel */}
        <div className="bg-[#0B0B0E] border border-[#1C1C26] rounded-2xl p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-xl border border-[#1C1C26] bg-[#050506]">
            {isLoading ? (
              <div className="h-[320px] animate-pulse bg-[#14141E] sm:h-[460px] lg:h-[560px]" />
            ) : (
              <img
                src={product.images[activeImage] || FALLBACK_PRODUCT_IMAGE}
                alt={product.name}
                className="h-[320px] w-full object-cover transition-transform duration-500 ease-in-out hover:scale-[1.02] sm:h-[460px] lg:h-[560px]"
              />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="rounded-full border border-[#FFCC00]/25 bg-black/60 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#FFCC00] backdrop-blur-md">
                {product.category}
              </span>
              <span className="rounded-full border border-[#FFCC00]/25 bg-black/60 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#FFCC00] backdrop-blur-md">
                {activeImage + 1} / {product.images.length}
              </span>
            </div>

            {hasMultipleImages && !isLoading && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-[#22222E] bg-black/60 text-zinc-300 backdrop-blur-md transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00]"
                  aria-label="Previous image"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goToNextImage}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-[#22222E] bg-black/60 text-zinc-300 backdrop-blur-md transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00]"
                  aria-label="Next image"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-7">
            {product.images.map((img, index) => (
              <button
                key={`${img}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`overflow-hidden rounded-lg border transition-all duration-300 ${
                  activeImage === index
                    ? 'border-[#FFCC00] shadow-[0_0_0_1px_rgba(255,204,0,0.35)]'
                    : 'border-[#1C1C26] hover:border-zinc-600'
                }`}
                aria-label={`Show image ${index + 1}`}
              >
                <img src={img} alt={`${product.name} view ${index + 1}`} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Panel */}
        <aside className="h-fit rounded-2xl border border-[#1C1C26] bg-[#0B0B0E] p-5 sm:p-6 xl:sticky xl:top-28">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-[#FFCC00]">
            {product.category}
          </p>
          <h1 className="mt-4 font-heading text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{shortDescription}</p>

          <div className="mt-5 flex items-end justify-between gap-4">
            <p className="font-heading text-4xl font-black tracking-tight text-[#FFCC00]">
              ${product.price.toFixed(2)}
            </p>
            <div className="flex items-center gap-1">
              <div className="flex text-[#FFCC00]">
                {[...Array(5)].map((_, index) => (
                  <svg
                    key={`rating-star-${index}`}
                    className={`h-3 w-3 ${index < Math.floor(product.rating) ? 'fill-current' : 'fill-zinc-700'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                {product.reviewCount} reviews
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-7">
            {product.hasFlavor && (
            <div>
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Flavor / {selectedColor?.name || 'N/A'}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.length > 0 ? (
                  product.colors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`h-9 w-9 rounded-full border-2 p-0.5 transition-all duration-300 ease-in-out ${
                        selectedColor?.id === color.id
                          ? 'border-[#FFCC00] shadow-[0_0_0_1px_rgba(255,204,0,0.35)]'
                          : 'border-transparent hover:border-zinc-500'
                      }`}
                      aria-label={`Select flavor ${color.name}`}
                    >
                      <span
                        className="block h-full w-full rounded-full border border-white/20"
                        style={{ backgroundColor: color.hex }}
                      />
                    </button>
                  ))
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">No flavor options</p>
                )}
              </div>
            </div>
            )}

            {product.hasWeight && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Weight</p>
                <button
                  type="button"
                  onClick={handleShowSizeGuide}
                  className="font-mono text-xs uppercase tracking-widest text-[#FFCC00] hover:underline"
                >
                  WEIGHT GUIDE
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {product.sizes.length > 0 ? (
                  product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-lg border py-2.5 font-mono text-xs font-bold uppercase transition-all ${
                        selectedSize === size
                          ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
                          : 'border-[#1C1C26] bg-[#050506] text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full font-mono text-xs uppercase tracking-widest text-zinc-500">
                    No size options
                  </p>
                )}
              </div>
            </div>
            )}

            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-zinc-400">QUANTITY</p>
              <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#1C1C26] bg-[#050506]">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="px-4 py-2 font-mono text-sm text-zinc-400 transition-colors hover:text-[#FFCC00]"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="min-w-10 border-x border-[#1C1C26] px-2 text-center font-mono text-sm font-bold text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(maxSelectableQuantity, current + 1))}
                  className="px-4 py-2 font-mono text-sm text-zinc-400 transition-colors hover:text-[#FFCC00]"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFCC00] py-4 font-heading text-xs font-black uppercase tracking-widest text-black shadow-lg transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(255,204,0,0.4)] disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {selectedStock > 0 ? 'ADD TO CART' : 'UNAVAILABLE'}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!canAddToCart}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#22222E] bg-[#14141E] py-4 font-heading text-xs font-bold uppercase tracking-widest text-white transition-all hover:border-[#FFCC00] hover:bg-white hover:text-black disabled:opacity-40"
          >
            BUY NOW (EXPRESS CHECKOUT)
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 font-mono text-xs uppercase tracking-widest">
            <p className={stockStatusClass}>{stockStatusLabel}</p>
            <p className="text-zinc-500">CASH ON DELIVERY</p>
          </div>

          {cartFeedback && (
            <p className="mt-3 animate-pulse font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00]">
              {cartFeedback}
            </p>
          )}

          <div ref={materialsSectionRef} className="mt-8 border-t border-[#1C1C26]">
            <Accordion
              title="PRODUCT DETAILS"
              content={product.description}
              isOpen={openAccordion === 'description'}
              onClick={() => setOpenAccordion(openAccordion === 'description' ? '' : 'description')}
            />
            <Accordion
              title="INGREDIENTS & SPECIFICATIONS"
              content={product.materials}
              isOpen={openAccordion === 'materials'}
              onClick={() => setOpenAccordion(openAccordion === 'materials' ? '' : 'materials')}
            />
            <Accordion
              title="SHIPPING & DISPATCH"
              content={product.shipping}
              isOpen={openAccordion === 'shipping'}
              onClick={() => setOpenAccordion(openAccordion === 'shipping' ? '' : 'shipping')}
            />
          </div>
        </aside>
      </div>

      {/* Feature Panels */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {FEATURE_PANELS.map((panel, index) => (
          <article
            key={panel.title}
            className="rounded-xl border border-[#1C1C26] bg-[#0B0B0F] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#FFCC00]/50"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00]">0{index + 1}</p>
            <h3 className="mt-2 font-heading text-xl font-black uppercase tracking-tight text-white">{panel.title}</h3>
            <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-400">{panel.body}</p>
          </article>
        ))}
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-6">
          <div className="w-full max-w-3xl rounded-2xl border border-[#1C1C26] bg-[#0B0B0E] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#1C1C26] pb-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00]">SPECIFICATIONS</p>
                <h3 className="mt-1 font-heading text-3xl font-black uppercase tracking-tight text-white">
                  SUPPLEMENT SPEC GUIDE
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="rounded-lg border border-[#22222E] bg-[#14141E] px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00]"
              >
                CLOSE
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#1C1C26] bg-[#050506] p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">DOSAGE & FORMULA</p>
                <p className="mt-2 font-mono text-xl font-bold text-white">1 SCOOP (30g)</p>
              </div>
              <div className="rounded-xl border border-[#1C1C26] bg-[#050506] p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">RECOMMENDED USAGE</p>
                <p className="mt-2 font-mono text-xs text-zinc-300">Consume 30 minutes pre or post training.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#1C1C24] pb-6">
            <h2 className="font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              RELATED <span className="text-[#FFCC00]">SUPPLEMENTS</span>
            </h2>
            <Link
              to="/shop"
              className="shrink-0 font-mono text-xs font-bold uppercase tracking-widest text-[#FFCC00] hover:underline"
            >
              VIEW ALL →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
};

export default ProductDetailPage;
