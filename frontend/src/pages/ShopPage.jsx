import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/shop/ProductCard.jsx';
import SidebarFilter from '../components/shop/SidebarFilter.jsx';
import ChamferCard from '../components/common/ChamferCard.jsx';
import { getProducts as getProductsApi } from '../services/api/products.js';

const ShopPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  
  const [meta, setMeta] = useState({
    totalCount: 6,
    totalPages: 1,
    currentPage: 1,
    limit: 12,
  });

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    goal: searchParams.get('goal') || '',
    stockStatus: searchParams.get('stock_status') || '',
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
      defaultVariantStock: Number(item.default_variant_stock || 0),
      totalStock: Number(item.total_stock || 0),
      name: displayName || String(item.name || '').toUpperCase(),
      price: Number(item.base_price ?? item.price ?? 0),
      colorName: item.parent_category_name ? `${item.parent_category_name} / ${item.category_name}` : item.category_name || 'Supplements',
      categorySlug: item.category_slug || '',
      parentCategorySlug: item.parent_category_slug || '',
      hasOptions: Boolean(item.has_flavor || item.has_weight || Number(item.variant_count || 0) > 1),
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
        setLoadError('');
        const response = await getProductsApi({
          category: filters.category,
          search: filters.search || undefined,
          price_min: filters.minPrice || undefined,
          price_max: filters.maxPrice || undefined,
          stock_status: filters.stockStatus || undefined,
          sort_by: filters.sort_by,
          page: filters.page,
          limit: filters.limit
        });
        setProducts(Array.isArray(response?.data) ? response.data.map(mapApiProductToCard) : []);
        setMeta({
          totalCount: Number(response?.meta?.totalCount || 0),
          totalPages: Number(response?.meta?.totalPages || 1),
          currentPage: Number(response?.meta?.currentPage || filters.page),
          limit: Number(response?.meta?.limit || filters.limit),
        });
      } catch (error) {
        setProducts([]);
        setLoadError(error?.response?.data?.message || 'Unable to load products from the database.');
        setMeta({
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
          limit: 12,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [filters.category, filters.search, filters.minPrice, filters.maxPrice, filters.stockStatus, filters.sort_by, filters.page, filters.limit]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: searchParams.get('category') || '',
      search: searchParams.get('search') || '',
      sort_by: searchParams.get('sort_by') || current.sort_by || 'featured',
      page: 1,
    }));
  }, [searchParams]);

  // Client side filters mapping for supplementary parameters
  const filteredProducts = products.filter((p) => {
    if (
      filters.category &&
      p.categorySlug !== filters.category &&
      p.parentCategorySlug !== filters.category &&
      !p.colorName.toLowerCase().includes(filters.category.toLowerCase())
    ) {
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
              <p className="font-heading font-black text-xl uppercase text-white">{loadError ? 'CATALOG UNAVAILABLE' : 'NO FORMULATIONS MATCHED'}</p>
              <p className="font-mono text-xs text-zinc-500">{loadError || 'Try resetting your filters or adjusting your budget limits.'}</p>
              <button
                type="button"
                onClick={() => {
                  handleFilterChange('category', '');
                  handleFilterChange('goal', '');
                  handleFilterChange('stockStatus', '');
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
