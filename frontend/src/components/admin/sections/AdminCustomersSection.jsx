import React, { useEffect, useMemo, useState } from 'react';

import { getAdminCustomerById, getAdminCustomers } from '../../../services/api/admin.js';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const formatDate = (value) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const AdminCustomersSection = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await getAdminCustomers({ search: searchTerm || undefined });
      setCustomers(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to load customers.');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchCustomers();
  };

  const openCustomerDetail = async (identity) => {
    setSelectedCustomer(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await getAdminCustomerById(identity);
      setSelectedCustomer(response?.data || null);
    } catch (error) {
      setDetailError(error?.response?.data?.message || 'Unable to load customer details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeCustomerDetail = () => {
    setSelectedCustomer(null);
    setDetailError('');
  };

  const summaryCards = useMemo(() => {
    const registered = customers.filter((c) => c.customerType === 'registered').length;
    const guest = customers.filter((c) => c.customerType === 'guest').length;
    return [
      { label: 'Total Customers', value: customers.length },
      { label: 'Registered', value: registered },
      { label: 'Guest', value: guest },
    ];
  }, [customers]);

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tighter">
            Customers
          </h2>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2">
            {customers.length} people have interacted with the store
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            type="text"
            placeholder="Search name, email, phone"
            className="w-64 max-w-full border border-white/15 bg-[#1a1a1a] px-4 py-3 text-[10px] uppercase tracking-widest text-white outline-none focus:border-[var(--theme-accent)]"
          />
          <button
            type="submit"
            className="bg-[var(--theme-accent)] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--theme-accent-hover)]"
          >
            Search
          </button>
        </form>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-[#111] border border-white/5 p-6">
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2 font-bold">{card.label}</p>
            <p className="text-4xl font-display font-black tracking-tighter text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {errorMessage && (
        <p className="mb-4 text-[11px] uppercase tracking-widest text-red-400">{errorMessage}</p>
      )}

      <div className="bg-[#111] border border-white/5 overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm text-white/85">
          <thead className="bg-black/35 text-[10px] uppercase tracking-[0.18em] text-white/45">
            <tr>
              <th className="px-4 py-4 text-left">Customer</th>
              <th className="px-4 py-4 text-left">Type</th>
              <th className="px-4 py-4 text-left">Email</th>
              <th className="px-4 py-4 text-left">Phone</th>
              <th className="px-4 py-4 text-left">Orders</th>
              <th className="px-4 py-4 text-left">Spent</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-white/60">
                  Loading customers...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-white/60">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.identity} className="border-t border-white/5">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{customer.name}</p>
                    {customer.registeredAt && (
                      <p className="text-[10px] tracking-widest text-white/45">
                        Joined {formatDate(customer.registeredAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
                        customer.customerType === 'registered'
                          ? 'bg-[#123742] text-[#74def3]'
                          : 'bg-[#3f1e1e] text-[#ff9f9f]'
                      }`}
                    >
                      {customer.customerType}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-white/65">{customer.email || '--'}</td>
                  <td className="px-4 py-4 text-white/65">{customer.phone || '--'}</td>
                  <td className="px-4 py-4 text-white/65">{customer.totalOrders}</td>
                  <td className="px-4 py-4 text-white/65">
                    {currencyFormatter.format(customer.totalSpent)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openCustomerDetail(customer.identity)}
                      className="bg-[#1f1f1f] border border-white/20 px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-[var(--theme-accent)]"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(detailLoading || selectedCustomer) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 px-4 py-8">
          <div className="w-full max-w-3xl border border-white/15 bg-[#111] p-6">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-accent)]">
                  Customer Detail
                </p>
                <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-white">
                  {selectedCustomer ? selectedCustomer.name : 'Loading...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCustomerDetail}
                className="text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className="py-10 text-center text-white/60">Loading customer details...</p>
            ) : selectedCustomer ? (
              <div className="mt-5 space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[11px] uppercase tracking-[0.14em] text-white/65">
                  <p>
                    Email: <span className="text-white">{selectedCustomer.email || '--'}</span>
                  </p>
                  <p>
                    Phone: <span className="text-white">{selectedCustomer.phone || '--'}</span>
                  </p>
                  <p>
                    Role: <span className="text-white">{selectedCustomer.role || 'customer'}</span>
                  </p>
                  <p>
                    Joined: <span className="text-white">{formatDate(selectedCustomer.createdAt)}</span>
                  </p>
                </div>

                {selectedCustomer.profile && (
                  <div className="grid gap-2 sm:grid-cols-3 text-[11px] uppercase tracking-[0.14em] text-white/65">
                    <p>
                      Reward Points: <span className="text-white">{selectedCustomer.profile.rewardPoints ?? '--'}</span>
                    </p>
                    <p>
                      Tier: <span className="text-white">{selectedCustomer.profile.tierStatus || '--'}</span>
                    </p>
                  </div>
                )}

                {selectedCustomer.orders && (
                  <div>
                    <h4 className="font-display text-sm font-bold uppercase tracking-widest text-white/70 mb-3">
                      Orders ({selectedCustomer.orders.total})
                    </h4>
                    {selectedCustomer.orders.recent.length > 0 ? (
                      <div className="overflow-x-auto border border-white/10">
                        <table className="min-w-[600px] w-full text-[11px]">
                          <thead className="bg-black/35 text-[9px] uppercase tracking-[0.16em] text-white/45">
                            <tr>
                              <th className="px-4 py-3 text-left">Order #</th>
                              <th className="px-4 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-left">Status</th>
                              <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCustomer.orders.recent.map((order) => (
                              <tr key={order.id} className="border-t border-white/5">
                                <td className="px-4 py-3 text-white/92">{order.orderNumber}</td>
                                <td className="px-4 py-3 text-white/65">{formatDate(order.createdAt)}</td>
                                <td className="px-4 py-3 text-white/65">{order.status}</td>
                                <td className="px-4 py-3 text-right text-white">
                                  {currencyFormatter.format(order.totalAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[11px] uppercase tracking-widest text-white/45">
                        No orders placed yet.
                      </p>
                    )}
                  </div>
                )}

                {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                  <div>
                    <h4 className="font-display text-sm font-bold uppercase tracking-widest text-white/70 mb-3">
                      Addresses
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedCustomer.addresses.map((address) => (
                        <div
                          key={address.id}
                          className="border border-white/10 bg-black/25 p-3 text-[11px] text-white/70"
                        >
                          <p>
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p>
                            {address.city}, {address.state} {address.postalCode}
                          </p>
                          <p>{address.country}</p>
                          {address.isDefault && (
                            <span className="text-[9px] font-bold uppercase text-[var(--theme-accent)]">
                              Default
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-10 text-center text-white/60">No customer data.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomersSection;
