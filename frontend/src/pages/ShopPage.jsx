import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/shop/ProductCard.jsx';
import SidebarFilter from '../components/shop/SidebarFilter.jsx';
import ChamferCard from '../components/common/ChamferCard.jsx';
import { getProducts as getProductsApi } from '../services/api/products.js';

const fallbackSupplementCatalog = [
  {
    id: 'whey-isolate',
    slug: 'triplea-whey-isolate',
    defaultVariantId: 1,
    totalStock: 85,
    name: 'Iso-Surge Elite Whey',
    price: 59.99,
    colorName: 'Protein',
    imageUrl: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=700&q=80',
    isNew: true,
    rating: 5,
    reviewCount: 124,
    badgeText: 'BEST SELLER',
  },
  {
    id: 'nitric-surge',
    slug: 'nitric-surge-preworkout',
    defaultVariantId: 3,
    totalStock: 78,
    name: 'Ignition Protocol V2',
    price: 44.99,
    colorName: 'Pre-Workout',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=700&q=80',
    isNew: false,
    rating: 5,
    reviewCount: 89,
    badgeText: '',
  },
  {
    id: 'bcaa-matrix',
    slug: 'bcaa-recovery-matrix',
    defaultVariantId: 4,
    totalStock: 85,
    name: 'Hydra-Surge BCAA',
    price: 34.99,
    colorName: 'Amino Acids',
    imageUrl: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=700&q=80',
    isNew: true,
    rating: 5,
    reviewCount: 42,
    badgeText: 'NEW ARRIVAL',
  },
  {
    id: 'pure-creatine',
    slug: 'pure-creatine-monohydrate',
    defaultVariantId: 2,
    totalStock: 112,
    name: 'Pure Creatine Monohydrate',
    price: 24.99,
    colorName: 'Creatine',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=700&q=80',
    isNew: false,
    rating: 5,
    reviewCount: 211,
    badgeText: 'BEST SELLER',
  },
  {
    id: 'mass-gainer-pro',
    slug: 'mass-gainer-pro-1000',
    defaultVariantId: 5,
    totalStock: 30,
    name: 'Mass Gainer Pro 1000',
    price: 64.99,
    colorName: 'Protein',
    imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=700&q=80',
    isNew: false,
    rating: 4.9,
    reviewCount: 142,
    badgeText: 'BEST SELLER',
  },
  {
    id: 'multi-v-iron',
    slug: 'iron-core-multi-v',
    defaultVariantId: 6,
    totalStock: 28,
    name: 'Iron Core Multi-V',
    price: 19.99,
    colorName: 'Vitamins',
    imageUrl: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=700&q=80',
    isNew: false,
    rating: 5,
    reviewCount: 65,
    badgeText: '',
  },
];

const ShopPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  
  const [meta, setMeta] = useState({
    totalCount: 6,
    totalPages: 1,
    currentPage: 1,
    limit: 12,
  });

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    goal: searchParams.get('goal') || '',
    minPrice: '',
    maxPrice: '',
    sort_by: searchParams.get('sort_by') || 'featured',
    page: 1,
    limit: 12,
  });

  const mapApiProductToCard = (item) => {
    // Check for standard display names
    let displayName = item.name || '';
    if (displayName.toLowerCase().includes('whey isolate')) displayName = 'Iso-Surge Elite Whey';
    if (displayName.toLowerCase().includes('nitric surge')) displayName = 'Ignition Protocol V2';
    if (displayName.toLowerCase().includes('bcaa recovery')) displayName = 'Hydra-Surge BCAA';
    if (displayName.toLowerCase().includes('creatine')) displayName = 'Pure Creatine Monohydrate';

    return {
      id: item.id,
      slug: item.slug,
      defaultVariantId: Number(item.default_variant_id || item.id) || null,
      defaultVariantStock: Number(item.default_variant_stock || item.total_stock || 10),
      totalStock: Number(item.total_stock || 10),
      name: displayName || String(item.name || '').toUpperCase(),
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
    };
  };

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
        const response = await getProductsApi({
          category: filters.category,
          sort_by: filters.sort_by,
          page: filters.page,
          limit: filters.limit
        });
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
  }, [filters.category, filters.sort_by, filters.page, filters.limit]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: searchParams.get('category') || '',
      sort_by: searchParams.get('sort_by') || current.sort_by || 'featured',
      page: 1,
    }));
  }, [searchParams]);

  // Client side filters mapping for supplementary parameters
  const filteredProducts = products.filter((p) => {
    if (filters.category && !p.colorName.toLowerCase().includes(filters.category.toLowerCase())) {
      return false;
    }
    // Filter goals
    if (filters.goal) {
      const g = filters.goal.toLowerCase();
      const cat = p.colorName.toLowerCase();
      if (g === 'muscle gain') {
        if (cat !== 'protein' && cat !== 'creatine') return false;
      } else if (g === 'endurance') {
        if (cat !== 'amino acids' && cat !== 'pre-workout') return false;
      } else if (g === 'fat loss') {
        // Fallback filter
        if (cat !== 'vitamins' && cat !== 'amino acids') return false;
      }
    }
    // Filter price
    if (filters.minPrice && p.price < Number(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && p.price > Number(filters.maxPrice)) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-full font-sans bg-[#0A0A0B] text-[#FFF8E7] pb-16">
      
      {/* Header Area */}
      <div className="mx-auto max-w-[1500px] px-6 md:px-12 pt-6 pb-4">
        
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 font-mono text-xs text-zinc-500 uppercase tracking-widest">
          <Link to="/" className="hover:text-[#FFCC00]">Home</Link>
          <span>/</span>
          <span className="text-white">Shop</span>
        </div>

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#222225]">
          <div className="space-y-3">
            <h1 className="font-heading font-black text-5xl sm:text-6xl uppercase text-white tracking-tight leading-[0.9]">
              ALL SUPPLEMENTS
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed uppercase tracking-wider font-mono">
              Fuel your ambition with our elite range of high-performance nutrition. Designed for serious athletes who demand uncompromising power and precision.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
              className="btn-secondary text-xs px-4 py-2.5 md:hidden font-bold"
            >
              {isMobileFiltersOpen ? 'HIDE FILTERS' : 'FILTERS'}
            </button>

            <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest hidden sm:inline font-bold">Sort by:</span>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="bg-[#141416] border border-[#222225] text-white px-4 py-2.5 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-sm cursor-pointer hover:border-zinc-700 transition-colors"
            >
              <option value="featured">Best Selling</option>
              <option value="newest">New Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Shop Grid Area */}
      <div className="mx-auto max-w-[1500px] px-6 md:px-12 grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr] gap-8 pt-6">
        
        {/* Sidebar Filters */}
        <SidebarFilter filters={filters} onFilterChange={handleFilterChange} />

        {/* Mobile Filters Drawer */}
        {isMobileFiltersOpen && (
          <div className="md:hidden border-b border-[#222225] pb-6">
            <SidebarFilter filters={filters} onFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Product Grid Area */}
        <div className="space-y-10">
          {isLoading && (
            <div className="py-24 text-center font-mono text-xs text-zinc-500 animate-pulse">
              SYNCING SUPPLEMENT CATALOG...
            </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <ChamferCard className="p-16 text-center space-y-4 rounded-sm bg-[#141416]/50 border border-[#222225]">
              <p className="font-heading font-black text-xl uppercase text-white">NO FORMULATIONS MATCHED</p>
              <p className="font-mono text-xs text-zinc-500">Try resetting your filters or adjusting your budget limits.</p>
              <button
                type="button"
                onClick={() => {
                  handleFilterChange('category', '');
                  handleFilterChange('goal', '');
                  handleFilterChange('minPrice', '');
                  handleFilterChange('maxPrice', '');
                }}
                className="btn-primary text-xs px-6 py-2.5 font-bold font-heading"
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
          <div className="pt-8 flex items-center justify-between font-mono text-xs text-zinc-500 border-t border-[#222225]">
            <span className="uppercase">Showing 1-{filteredProducts.length} of {meta.totalCount} Products</span>
            <div className="flex items-center gap-1">
              {/* Previous page arrow */}
              <button
                type="button"
                disabled={meta.currentPage <= 1}
                onClick={() => handleFilterChange('page', meta.currentPage - 1)}
                className="w-8 h-8 bg-[#141416] border border-[#222225] flex items-center justify-center text-white disabled:opacity-30 rounded-sm hover:border-zinc-700 transition-colors"
              >
                &lt;
              </button>

              {/* Page Numbers */}
              {[...Array(meta.totalPages || 1)].map((_, i) => {
                const pageNum = i + 1;
                const isSelected = meta.currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handleFilterChange('page', pageNum)}
                    className={`w-8 h-8 font-bold flex items-center justify-center rounded-sm transition-all border ${
                      isSelected
                        ? 'bg-[#FFCC00] border-[#FFCC00] text-black'
                        : 'bg-[#141416] border-[#222225] text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next page arrow */}
              <button
                type="button"
                disabled={meta.currentPage >= meta.totalPages}
                onClick={() => handleFilterChange('page', meta.currentPage + 1)}
                className="w-8 h-8 bg-[#141416] border border-[#222225] flex items-center justify-center text-white disabled:opacity-30 rounded-sm hover:border-zinc-700 transition-colors"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
