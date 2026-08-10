import React from 'react';

const categoryOptions = [
  { label: 'All Supplements', value: '' },
  { label: 'Protein', value: 'protein' },
  { label: 'Creatine', value: 'creatine' },
  { label: 'Pre-Workout', value: 'pre-workout' },
];

const brandOptions = [
  { label: 'TRIPLE A', value: 'triple-a' },
  { label: 'Iron Core', value: 'iron-core' },
  { label: 'Apex Labs', value: 'apex-labs' },
];

const SidebarFilter = ({ filters, onFilterChange }) => {
  const selectedCategory = filters?.category || '';
  const selectedBrand = filters?.brand || '';

  return (
    <aside className="bg-[#141414] border border-[#282828] p-6 text-white w-full sticky top-24 hidden md:block chamfer-box">
      {/* Filters Title Header */}
      <div className="flex items-center gap-3 mb-8 border-b border-[#222222] pb-4">
        <div className="w-1 h-6 bg-[#FFCC00]" />
        <h3 className="font-heading font-black italic text-xl uppercase tracking-wider text-white">
          FILTERS
        </h3>
      </div>

      {/* CATEGORY SECTION */}
      <div className="mb-8">
        <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">
          CATEGORY
        </h4>
        <ul className="space-y-3">
          {categoryOptions.map((cat) => {
            const isChecked = selectedCategory === cat.value;
            return (
              <li key={cat.label}>
                <button
                  type="button"
                  onClick={() => onFilterChange('category', isChecked ? '' : cat.value)}
                  className="flex items-center gap-3 w-full text-left group cursor-pointer"
                >
                  <div
                    className={`w-4 h-4 border transition-colors flex items-center justify-center ${
                      isChecked
                        ? 'bg-[#FFCC00] border-[#FFCC00]'
                        : 'border-zinc-700 bg-[#0A0A0A] group-hover:border-[#FFCC00]'
                    }`}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3 text-black fill-current" viewBox="0 0 20 20">
                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-xs font-mono tracking-wider transition-colors ${
                      isChecked ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* BRAND SECTION */}
      <div className="mb-8">
        <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">
          BRAND
        </h4>
        <ul className="space-y-3">
          {brandOptions.map((brand) => {
            const isChecked = selectedBrand === brand.value;
            return (
              <li key={brand.label}>
                <button
                  type="button"
                  onClick={() => onFilterChange('brand', isChecked ? '' : brand.value)}
                  className="flex items-center gap-3 w-full text-left group cursor-pointer"
                >
                  <div
                    className={`w-4 h-4 border transition-colors flex items-center justify-center ${
                      isChecked
                        ? 'bg-[#FFCC00] border-[#FFCC00]'
                        : 'border-zinc-700 bg-[#0A0A0A] group-hover:border-[#FFCC00]'
                    }`}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3 text-black fill-current" viewBox="0 0 20 20">
                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-xs font-mono tracking-wider transition-colors ${
                      isChecked ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    {brand.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Reset Filters */}
      {(selectedCategory || selectedBrand) && (
        <button
          type="button"
          onClick={() => {
            onFilterChange('category', '');
            onFilterChange('brand', '');
          }}
          className="w-full text-center text-xs font-mono text-[#FFCC00] hover:underline pt-4 border-t border-[#222222]"
        >
          RESET ALL FILTERS
        </button>
      )}
    </aside>
  );
};

export default SidebarFilter;





