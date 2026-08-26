import React from 'react';

const categoryOptions = [
  { label: 'Proteins', value: 'protein', count: 24 },
  { label: 'Pre-Workouts', value: 'pre-workout', count: 15 },
  { label: 'Amino Acids', value: 'amino-acids', count: 10 },
  { label: 'Creatine', value: 'creatine', count: 8 },
];

const goalOptions = [
  { label: 'Muscle Gain', value: 'muscle gain' },
  { label: 'Fat Loss', value: 'fat loss' },
  { label: 'Endurance', value: 'endurance' },
];

const SidebarFilter = ({ filters, onFilterChange }) => {
  const selectedCategory = filters?.category || '';
  const selectedGoal = filters?.goal || '';
  const minPrice = filters?.minPrice || '';
  const maxPrice = filters?.maxPrice || '';

  const handleClearAll = () => {
    onFilterChange('category', '');
    onFilterChange('goal', '');
    onFilterChange('minPrice', '');
    onFilterChange('maxPrice', '');
  };

  return (
    <aside className="bg-[#141416] border border-[#222225] p-6 text-white w-full sticky top-24 hidden md:block rounded-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#222225]">
        <h3 className="font-heading font-bold text-lg text-white">
          Filters
        </h3>
        {(selectedCategory || selectedGoal || minPrice || maxPrice) && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-mono text-[#FFCC00] hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* CATEGORY CHECKBOXES */}
      <div className="mb-8">
        <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">
          Category
        </h4>
        <ul className="space-y-3">
          {categoryOptions.map((cat) => {
            const isChecked = selectedCategory.toLowerCase() === cat.value;
            return (
              <li key={cat.label}>
                <button
                  type="button"
                  onClick={() => onFilterChange('category', isChecked ? '' : cat.value)}
                  className="flex items-center justify-between w-full text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 border transition-colors flex items-center justify-center rounded-sm ${
                        isChecked
                          ? 'bg-[#FFCC00] border-[#FFCC00]'
                          : 'border-zinc-700 bg-[#0A0A0B] group-hover:border-[#FFCC00]'
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-black fill-current" viewBox="0 0 20 20">
                          <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm font-mono tracking-wider transition-colors ${
                        isChecked ? 'text-[#FFCC00] font-bold' : 'text-zinc-400 group-hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-zinc-600">({cat.count})</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* GOAL PILLS */}
      <div className="mb-8 border-t border-[#222225] pt-6">
        <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">
          Goal
        </h4>
        <div className="flex flex-wrap gap-2.5">
          {goalOptions.map((goal) => {
            const isSelected = selectedGoal.toLowerCase() === goal.value;
            return (
              <button
                key={goal.label}
                type="button"
                onClick={() => onFilterChange('goal', isSelected ? '' : goal.value)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest rounded-full transition-all border ${
                  isSelected
                    ? 'bg-[#FFCC00] border-[#FFCC00] text-black font-extrabold shadow-[0_0_12px_rgba(255,204,0,0.2)]'
                    : 'bg-[#0E0E10] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {goal.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* PRICE RANGE INPUTS */}
      <div className="mb-6 border-t border-[#222225] pt-6">
        <h4 className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-4">
          Price Range
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onFilterChange('minPrice', e.target.value)}
            className="w-full bg-[#0A0A0B] border border-[#222225] text-white px-3 py-2 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-sm placeholder:text-zinc-700"
          />
          <span className="text-zinc-600 font-mono">-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onFilterChange('maxPrice', e.target.value)}
            className="w-full bg-[#0A0A0B] border border-[#222225] text-white px-3 py-2 font-mono text-xs focus:border-[#FFCC00] focus:outline-none rounded-sm placeholder:text-zinc-700"
          />
        </div>
      </div>

    </aside>
  );
};

export default SidebarFilter;
