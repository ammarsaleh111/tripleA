import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAppContext } from '../context/AppContext.jsx';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatOrderDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const statusTheme = {
  pending: {
    label: 'Pending',
    text: 'text-[#FFCC00]',
    surface: 'border-[#FFCC00]/30 bg-[#FFCC00]/10',
  },
  processing: {
    label: 'Processing',
    text: 'text-[#FFCC00]',
    surface: 'border-[#FFCC00]/30 bg-[#FFCC00]/10',
  },
  shipped: {
    label: 'Shipped',
    text: 'text-zinc-300',
    surface: 'border-[#222230] bg-[#14141E]',
  },
  delivered: {
    label: 'Delivered',
    text: 'text-[#FFCC00]',
    surface: 'border-[#FFCC00]/30 bg-[#FFCC00]/10',
  },
  cancelled: {
    label: 'Cancelled',
    text: 'text-red-400',
    surface: 'border-red-500/30 bg-red-500/10',
  },
};

const statusKeys = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const getNormalizedStatus = (value) => String(value || '').trim().toLowerCase();

const UserDashboardPage = () => {
  const { authToken, authUser, orders, refreshMyOrders } = useAppContext();
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const role = String(authUser?.role || '').trim().toLowerCase();

  useEffect(() => {
    if (authToken && role === 'customer') {
      let isMounted = true;
      setOrdersRefreshing(true);

      Promise.resolve(refreshMyOrders()).finally(() => {
        if (isMounted) {
          setOrdersRefreshing(false);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    return undefined;
  }, [authToken, role]);

  const safeOrders = useMemo(() => {
    const value = Array.isArray(orders) ? [...orders] : [];
    value.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return value;
  }, [orders]);

  const dashboardStats = useMemo(() => {
    const totalOrders = safeOrders.length;
    const totalSpent = safeOrders.reduce(
      (accumulator, order) => accumulator + Number(order.total_amount || order.totalAmount || 0),
      0,
    );
    const averageOrderValue = totalOrders ? totalSpent / totalOrders : 0;

    const statusCounts = statusKeys.reduce(
      (accumulator, key) => ({ ...accumulator, [key]: 0 }),
      {},
    );

    safeOrders.forEach((order) => {
      const normalizedStatus = getNormalizedStatus(order.status);
      if (Object.prototype.hasOwnProperty.call(statusCounts, normalizedStatus)) {
        statusCounts[normalizedStatus] += 1;
      }
    });

    const activeOrders =
      statusCounts.pending + statusCounts.processing + statusCounts.shipped;
    const latestOrderDate = safeOrders[0]?.created_at
      ? formatOrderDate(safeOrders[0].created_at)
      : 'No orders yet';

    return {
      totalOrders,
      totalSpent,
      averageOrderValue,
      activeOrders,
      statusCounts,
      latestOrderDate,
    };
  }, [safeOrders]);

  if (!authToken) {
    return <Navigate to="/auth" replace />;
  }

  if (!authUser) {
    return (
      <section className="mx-auto flex min-h-[65vh] w-full max-w-5xl items-center justify-center px-6 py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#FFCC00]">
          Restoring your dashboard...
        </p>
      </section>
    );
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const recentOrders = safeOrders.slice(0, 6);

  const handleRefreshOrders = async () => {
    setOrdersRefreshing(true);
    try {
      await refreshMyOrders();
    } finally {
      setOrdersRefreshing(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] px-4 py-8 text-white sm:px-6">
      {/* Hero Panel */}
      <div className="rounded-2xl border border-[#1C1C26] bg-[#0B0B0E] p-6 sm:p-10">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-mono text-xs font-extrabold uppercase tracking-widest text-[#FFCC00]">
              Customer Dashboard
            </p>
            <h1 className="mt-4 font-heading text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
              Welcome, {authUser.firstName || 'Athlete'}
            </h1>
            <p className="mt-3 max-w-2xl font-mono text-xs uppercase tracking-wider leading-relaxed text-zinc-400">
              Manage your account, track your orders, and continue shopping from one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#222230] bg-[#14141E] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                {authUser.tierStatus || 'Member'} Tier
              </span>
              <span className="rounded-full border border-[#222230] bg-[#14141E] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                {Number(authUser.rewardPoints || 0)} Points
              </span>
              <span className="rounded-full border border-[#222230] bg-[#14141E] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                Latest: {dashboardStats.latestOrderDate}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="rounded-xl bg-[#FFCC00] px-6 py-3 font-heading text-xs font-black uppercase tracking-widest text-black shadow-md transition-all hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(255,204,0,0.4)]"
              >
                Continue Shopping
              </Link>
              <Link
                to="/cart"
                className="rounded-xl border border-[#22222E] bg-[#14141E] px-6 py-3 font-heading text-xs font-bold uppercase tracking-widest text-white transition-all hover:border-[#FFCC00] hover:text-[#FFCC00]"
              >
                Open Cart
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-[#22222E] bg-[#14141E] px-6 py-3 font-heading text-xs font-bold uppercase tracking-widest text-white transition-all hover:border-[#FFCC00] hover:text-[#FFCC00]"
              >
                Home
              </Link>
            </div>
          </div>

          <aside className="rounded-xl border border-[#1C1C26] bg-[#0B0B0F] p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Account Snapshot</p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-[#1C1C26] bg-[#050506] px-3 py-2">
                <span className="text-zinc-500">Member Since</span>
                <span className="font-semibold text-white">
                  {authUser.createdAt ? formatOrderDate(authUser.createdAt) : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#1C1C26] bg-[#050506] px-3 py-2">
                <span className="text-zinc-500">Active Orders</span>
                <span className="font-semibold text-[#FFCC00]">{dashboardStats.activeOrders}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#1C1C26] bg-[#050506] px-3 py-2">
                <span className="text-zinc-500">Average Order</span>
                <span className="font-semibold text-white">{currencyFormatter.format(dashboardStats.averageOrderValue)}</span>
              </div>
              <div className="rounded-lg border border-[#1C1C26] bg-[#050506] px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Primary Email</p>
                <p className="mt-1 break-all text-sm font-semibold text-white">{authUser.email || 'Not set'}</p>
              </div>
            </div>
          </aside>
        </div>

        {/* Stat Cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[#1C1C26] bg-[#0B0B0F] p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Total Orders</p>
            <p className="mt-2 font-heading text-3xl font-black text-white">{dashboardStats.totalOrders}</p>
          </article>
          <article className="rounded-xl border border-[#1C1C26] bg-[#0B0B0F] p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Total Spend</p>
            <p className="mt-2 font-heading text-3xl font-black text-[#FFCC00]">
              {currencyFormatter.format(dashboardStats.totalSpent)}
            </p>
          </article>
          <article className="rounded-xl border border-[#1C1C26] bg-[#0B0B0F] p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Average Order</p>
            <p className="mt-2 font-heading text-3xl font-black text-white">
              {currencyFormatter.format(dashboardStats.averageOrderValue)}
            </p>
          </article>
          <article className="rounded-xl border border-[#1C1C26] bg-[#0B0B0F] p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Reward Points</p>
            <p className="mt-2 font-heading text-3xl font-black text-white">{Number(authUser.rewardPoints || 0)}</p>
          </article>
        </div>

        {/* Status Counts */}
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {statusKeys.map((key) => {
            const config = statusTheme[key];
            return (
              <article key={key} className={`rounded-xl border bg-[#0B0B0F] p-3 ${config.surface}`}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{config.label}</p>
                <p className={`mt-1 font-heading text-2xl font-black ${config.text}`}>
                  {dashboardStats.statusCounts[key]}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      {/* Profile + Orders */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-[#1C1C26] bg-[#0B0B0E] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3 border-b border-[#1C1C26] pb-4">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFCC00]">Profile</p>
              <h2 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                Saved Details
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#1C1C26] bg-[#050506] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Full Name</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {authUser.firstName} {authUser.lastName}
              </p>
            </div>
            <div className="rounded-lg border border-[#1C1C26] bg-[#050506] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Email</p>
              <p className="mt-1 break-all text-sm font-semibold text-white">{authUser.email || 'Not set'}</p>
            </div>
            <div className="rounded-lg border border-[#1C1C26] bg-[#050506] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Phone Number</p>
              <p className="mt-1 text-sm font-semibold text-white">{authUser.phoneNumber || 'Not set'}</p>
            </div>
            <div className="rounded-lg border border-[#1C1C26] bg-[#050506] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Member Since</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {authUser.createdAt ? formatOrderDate(authUser.createdAt) : 'Unknown'}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[#1C1C26] bg-[#0B0B0E] p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#1C1C26] pb-4">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFCC00]">
                Recent Orders
              </p>
              <h2 className="mt-2 font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                Order Timeline
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={ordersRefreshing}
              className="rounded-lg border border-[#22222E] bg-[#14141E] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00] disabled:opacity-50"
            >
              {ordersRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {recentOrders.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[680px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <th className="px-3 py-3">Order</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const normalizedStatus = getNormalizedStatus(order.status);
                    const currentStatus = statusTheme[normalizedStatus] || {
                      label: order.status || 'Unknown',
                      text: 'text-zinc-300',
                      surface: 'border-[#222230] bg-[#14141E]',
                    };

                    return (
                      <tr key={order.id} className="border-t border-[#1C1C26] text-sm text-zinc-300">
                        <td className="px-3 py-4 font-semibold text-white">{order.order_number}</td>
                        <td className="px-3 py-4 text-zinc-500">{formatOrderDate(order.created_at)}</td>
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${currentStatus.surface} ${currentStatus.text}`}
                          >
                            {currentStatus.label}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-semibold text-white">
                          {currencyFormatter.format(Number(order.total_amount || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              No orders yet. Start shopping to build your timeline.
            </p>
          )}
        </article>
      </div>
    </section>
  );
};

export default UserDashboardPage;
