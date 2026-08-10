import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';

const primaryLinks = [
  'Dashboard',
  'Inventory',
  'Orders',
  'Messages',
  'Customers',
  'Analytics',
  'Settings',
];

const SidebarIcon = ({ active = false }) => (
  <span
    className={`grid h-4 w-4 place-items-center border text-[8px] ${
      active
        ? 'border-[#FFCC00] bg-[#FFCC00] text-black font-bold'
        : 'border-[#282828] bg-[#0A0A0A] text-zinc-500'
    }`}
  >
    ⚡
  </span>
);

const AdminSidebar = ({ activeSection, onSectionChange, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAppContext();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/70 backdrop-blur-sm transition md:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-[min(272px,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-[#282828] bg-[#141414] px-5 py-6 transition duration-300 sm:px-6 md:sticky md:z-0 md:w-[272px] md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <p className="font-heading font-black italic text-2xl uppercase leading-none tracking-tighter text-[#FFCC00]">
            TRIPLE A GYM
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            ADMIN PORTAL
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          {primaryLinks.map((item) => {
            const isActive = item === activeSection;

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onSectionChange(item);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-3.5 text-left font-heading font-black italic text-xs uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'border-[#FFCC00] bg-[#0A0A0A] text-[#FFCC00]'
                    : 'border-transparent text-zinc-400 hover:bg-[#0A0A0A]/50 hover:text-white'
                }`}
              >
                <SidebarIcon active={isActive} />
                {item}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-[#282828] space-y-4">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="btn-primary w-full py-3.5 text-center text-xs block"
          >
            VIEW LIVE STORE
          </button>

          <div className="space-y-3 font-mono text-xs uppercase text-zinc-400">
            <button type="button" onClick={() => navigate('/')} className="block hover:text-[#FFCC00]">
              ← STORE HOME
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/auth', { replace: true });
              }}
              className="block text-red-400 hover:text-red-300"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;

