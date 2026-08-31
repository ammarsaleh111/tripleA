import { Link } from 'react-router-dom';
import { useState } from 'react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatLastSynced = (value) => {
  if (!(value instanceof Date)) {
    return 'Not synced';
  }

  return value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const MenuIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

const SearchIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M20 20L16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

const BellIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
    <path
      d="M6.5 16.5h11l-1.4-1.7a3 3 0 01-.7-1.9V10a4.5 4.5 0 10-9 0v2.9a3 3 0 01-.7 1.9L4.5 16.5h2zM10 19a2 2 0 004 0"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const GridIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="6" cy="6" r="1.6" />
    <circle cx="12" cy="6" r="1.6" />
    <circle cx="18" cy="6" r="1.6" />
    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />
    <circle cx="6" cy="18" r="1.6" />
    <circle cx="12" cy="18" r="1.6" />
    <circle cx="18" cy="18" r="1.6" />
  </svg>
);

const AdminTopbar = ({
  searchTerm,
  onSearchChange,
  onOpenSidebar,
  dashboardSnapshot,
  inventorySnapshot,
  isDashboardLoading,
  onRefreshDashboard,
  lastSyncedAt,
}) => {
  const [activePanel, setActivePanel] = useState('');
  const pendingOrders = Number(dashboardSnapshot?.pendingOrders || 0);
  const newMessages = Number(dashboardSnapshot?.newMessages || 0);
  const unresolvedMessages = Number(dashboardSnapshot?.unresolvedMessages || 0);
  const lowStockVariants = Number(inventorySnapshot?.lowStockVariants || 0);
  const allTimeRevenue = Number(dashboardSnapshot?.allTimeRevenue || 0);
  const hasAlerts = pendingOrders + newMessages + lowStockVariants > 0;

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-zinc-900 text-white/70 transition-all duration-300 ease-in-out hover:text-white md:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon />
        </button>
        <div>
          <p className="font-display text-[1.85rem] font-bold uppercase tracking-[-0.05em] text-[#FFCC00]">
            TripleA Admin
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center">
        

        <div className="relative flex flex-wrap items-center gap-3 text-white/65">
          
          <div className="flex items-center gap-3 border border-white/10 bg-zinc-900 px-3 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#FFCC00] text-[10px] font-bold text-black">
              TA
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
                TripleA Admin
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#FFCC00]">
                Super Admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTopbar;
