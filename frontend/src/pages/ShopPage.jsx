import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/shop/ProductCard.jsx';
import SidebarFilter from '../components/shop/SidebarFilter.jsx';
import ChamferCard from '../components/common/ChamferCard.jsx';
import { getProducts as getProductsApi } from '../services/api/products.js';

const fallbackSupplementCatalog = [
  {
    id: 'whey-isolate',
    slug: 'triple-a-whey-isolate',
    defaultVariantId: 101,
    totalStock: 15,
    name: 'TRIPLE A WHEY ISOLATE',
    price: 49.99,
    colorName: 'Protein',
    imageUrl: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=700&q=80',
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
    colorName: 'Creatine',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=700&q=80',
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
    colorName: 'Pre-Workout',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=700&q=80',
    isNew: true,
    rating: 5,
    reviewCount: 210,
    badgeText: 'HOT DROP',
  },
  {
    id: 'bcaa-matrix',
    slug: 'bcaa-matrix-formula',
    defaultVariantId: 104,
    totalStock: 12,
    name: 'BCAA RECOVERY MATRIX',
    price: 32.99,
    colorName: 'Amino Acids',
    imageUrl: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=700&q=80',
    isNew: false,
    rating: 4.8,
    reviewCount: 76,
    badgeText: 'RECOVERY',
  },
  {
    id: 'mass-gainer-pro',
    slug: 'mass-gainer-pro',
    defaultVariantId: 105,
    totalStock: 8,
    name: 'MASS GAINER PRO 1000',
    price: 64.99,
    colorName: 'Protein',
    imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=700&q=80',
    isNew: true,
    rating: 4.9,
    reviewCount: 142,
    badgeText: 'HIGH CALORIE',
  },
  {
    id: 'multi-v-iron',
    slug: 'multi-v-iron-complex',
    defaultVariantId: 106,
    totalStock: 25,
    name: 'IRON CORE MULTI-V',
    price: 19.99,
    colorName: 'Vitamins',
    imageUrl: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=700&q=80',
    isNew: false,
    rating: 5,
    reviewCount: 65,
    badgeText: 'DAILY ESSENTIAL',
  },
];

const ShopPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [meta, setMeta] = useState({
    totalCount: 6,
    totalPages: 1,
    currentPage: 1,
    limit: 12,
  });
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    sort_by: searchParams.get('sort_by') || 'featured',
    page: 1,
    limit: 12,
  });

  const mapApiProductToCard = (item) => ({
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
      'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=700&q=80',
    isNew: Boolean(item.is_featured),
    rating: Number(item.avg_rating || 5),
    reviewCount: Number(item.review_count || 128),
    badgeText: item.is_featured ? 'BEST SELLER' : '',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1,
    }));
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await getProductsApi(filters);
        const nextProducts = Array.isArray(response?.data) && response.data.length > 0
          ? response.data.map(mapApiProductToCard)
          : fallbackSupplementCatalog;

        setProducts(nextProducts);
        setMeta({
          totalCount: Number(response?.meta?.totalCount || nextProducts.length),
          totalPages: Number(response?.meta?.totalPages || 1),
          currentPage: Number(response?.meta?.currentPage || filters.page),
          limit: Number(response?.meta?.limit || filters.limit),
        });
      } catch (error) {
        setProducts(fallbackSupplementCatalog);
        setMeta({
          totalCount: fallbackSupplementCatalog.length,
          totalPages: 1,
          currentPage: 1,
          limit: 12,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [filters]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: searchParams.get('category') || '',
      sort_by: searchParams.get('sort_by') || current.sort_by || 'featured',
      page: 1,
    }));
  }, [searchParams]);

  // Filter fallback items client side if API unavailable
  const filteredProducts = products.filter((p) => {
    if (filters.category && !p.colorName.toLowerCase().includes(filters.category.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-full font-sans bg-[#0A0A0A] text-[#FFF8E7] pb-16">
      {/* Top Header Banner matching Reference Screen 3 */}
      <div className="mx-auto max-w-[1500px] px-4 md:px-8 pt-6 pb-4">
        
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-widest">
          <Link to="/" className="hover:text-[#FFCC00]">HOME</Link>
          <span>/</span>
          <span className="text-white">SHOP</span>
        </div>

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#282828]">
          <div className="space-y-2">
            <h1 className="font-heading font-black italic text-5xl sm:text-7xl uppercase text-white tracking-tight leading-none">
              FUEL YOUR <span className="text-[#FFCC00]">GRIND</span>
            </h1>
            <p className="font-mono text-xs sm:text-sm text-zinc-400 uppercase tracking-wider">
              Industrial grade supplements for peak performance.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
              className="btn-secondary text-xs px-4 py-2 md:hidden"
            >
              {isMobileFiltersOpen ? 'HIDE FILTERS' : 'FILTERS'}
            </button>

            <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest hidden sm:inline">SORT BY:</span>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="bg-[#141414] border border-[#282828] text-white px-4 py-2 font-mono text-xs focus:border-[#FFCC00] focus:outline-none chamfer-input cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="newest">New Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Shop Grid Area */}
      <div className="mx-auto max-w-[1500px] px-4 md:px-8 grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr] gap-8 pt-4">
        
        {/* Sidebar Filters */}
        <SidebarFilter filters={filters} onFilterChange={handleFilterChange} />

        {/* Product Grid */}
        <div className="space-y-8">
          {isLoading && (
            <div className="py-16 text-center font-mono text-xs text-zinc-400 animate-pulse">
              SYNCING INDUSTRIAL SUPPLEMENT CATALOG...
            </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <ChamferCard className="p-12 text-center space-y-4">
              <p className="font-heading font-black italic text-xl uppercase text-white">NO TRANSMISSIONS MATCHED</p>
              <p className="font-mono text-xs text-zinc-500">Try resetting your category or brand filter parameters.</p>
              <button
                type="button"
                onClick={() => handleFilterChange('category', '')}
                className="btn-primary text-xs px-6 py-2"
              >
                RESET FILTERS
              </button>
            </ChamferCard>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          <div className="pt-12 flex items-center justify-between font-mono text-xs text-zinc-500 border-t border-[#222222]">
            <span>SHOWING {filteredProducts.length} OF {meta.totalCount} SUPPLEMENTS</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={meta.currentPage <= 1}
                onClick={() => handleFilterChange('page', meta.currentPage - 1)}
                className="w-8 h-8 bg-[#141414] border border-[#282828] flex items-center justify-center text-white disabled:opacity-30"
              >
                ‹
              </button>
              <span className="text-[#FFCC00] font-bold px-2">{meta.currentPage}</span>
              <button
                type="button"
                disabled={meta.currentPage >= meta.totalPages}
                onClick={() => handleFilterChange('page', meta.currentPage + 1)}
                className="w-8 h-8 bg-[#141414] border border-[#282828] flex items-center justify-center text-white disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;


