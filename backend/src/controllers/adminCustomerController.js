import { getDatabase } from '../config/db.js';

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// GET /api/admin/customers/:id
// Full detail for ONE registered customer. Never exposes password hashes.
export const getAdminCustomerById = async (request, response, next) => {
  try {
    const customerId = Number(request.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      throw createHttpError(400, 'Customer id must be a valid positive integer.');
    }

    const db = getDatabase();

    const [users] = await db.query(
      `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.created_at,
        up.phone_number,
        up.reward_points,
        up.tier_status
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [customerId],
    );

    if (!users.length) {
      throw createHttpError(404, 'Customer not found.');
    }

    const user = users[0];

    const [orderStatsRows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS lifetime_value,
        MAX(created_at) AS last_order_at
      FROM orders
      WHERE user_id = ?
      `,
      [customerId],
    );

    const [addresses] = await db.query(
      `
      SELECT id, address_line_1, address_line_2, city, state, postal_code, country, is_default
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, id ASC
      `,
      [customerId],
    );

    const [recentOrders] = await db.query(
      `
      SELECT id, order_number, status, total_amount, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [customerId],
    );

    return response.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone_number || null,
        role: user.role,
        createdAt: user.created_at,
        profile: {
          rewardPoints: user.reward_points === null || user.reward_points === undefined ? null : Number(user.reward_points),
          tierStatus: user.tier_status || null,
        },
        orders: {
          total: Number(orderStatsRows[0]?.total_orders || 0),
          lifetimeValue: Number(orderStatsRows[0]?.lifetime_value || 0),
          lastOrderAt: orderStatsRows[0]?.last_order_at || null,
          recent: recentOrders.map((order) => ({
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
            totalAmount: Number(order.total_amount || 0),
            createdAt: order.created_at,
          })),
        },
        addresses: addresses.map((address) => ({
          id: address.id,
          addressLine1: address.address_line_1,
          addressLine2: address.address_line_2,
          city: address.city,
          state: address.state,
          postalCode: address.postal_code,
          country: address.country,
          isDefault: Boolean(address.is_default),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/admin/customers
// One row per PERSON who interacted with the store (registered account OR a
// purchase). Registered users are unique by user id; guests are grouped by
// normalized email, then by normalized phone — never merged across identifiers.
// All aggregation happens in SQL (no N+1).
export const getAdminCustomers = async (request, response, next) => {
  try {
    const db = getDatabase();
    const search = String(request.query.search || '').trim();

    // Registered users: one row per user, aggregated in SQL.
    const [registeredRows] = await db.query(
      `
      SELECT
        u.id::text AS identity,
        'registered' AS customer_type,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.email,
        COALESCE(up.phone_number, '') AS phone,
        u.role,
        u.created_at AS registered_at,
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
        MAX(o.created_at) AS last_order_at,
        MAX(u.updated_at) AS last_activity_at
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id, u.first_name, u.last_name, u.email, up.phone_number, u.role, u.created_at, u.updated_at
      `,
    );

    // Guest orders: grouped by normalized email when present, otherwise by
    // normalized phone. Orders missing BOTH stay individual (unidentifiable).
    const [guestRows] = await db.query(
      `
      WITH guest_orders AS (
        SELECT
          o.id,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          o.total_amount,
          o.status,
          o.created_at,
          CASE
            WHEN NULLIF(TRIM(o.customer_email), '') IS NOT NULL THEN 'email:' || LOWER(TRIM(o.customer_email))
            WHEN NULLIF(TRIM(o.customer_phone), '') IS NOT NULL THEN 'phone:' || REGEXP_REPLACE(TRIM(o.customer_phone), '[^0-9+]', '', 'g')
            ELSE 'order:' || o.id::text
          END AS guest_key
        FROM orders o
        WHERE o.user_id IS NULL
      )
      SELECT
        guest_key AS identity,
        'guest' AS customer_type,
        MAX(customer_name) AS full_name,
        MAX(NULLIF(TRIM(customer_email), '')) AS email,
        MAX(NULLIF(TRIM(customer_phone), '')) AS phone,
        COUNT(*) AS total_orders,
        COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS total_spent,
        MAX(created_at) AS last_order_at,
        MAX(created_at) AS last_activity_at
      FROM guest_orders
      GROUP BY guest_key
      `,
    );

    const customers = [];

    for (const row of registeredRows || []) {
      customers.push({
        identity: `user-${row.identity}`,
        customerType: 'registered',
        name: String(row.full_name || '').trim() || 'Unnamed',
        email: row.email || null,
        phone: row.phone || null,
        role: row.role,
        registeredAt: row.registered_at,
        totalOrders: Number(row.total_orders || 0),
        totalSpent: Number(row.total_spent || 0),
        lastOrderAt: row.last_order_at,
        lastActivityAt: row.last_activity_at,
      });
    }

    for (const row of guestRows || []) {
      customers.push({
        identity: row.identity,
        customerType: 'guest',
        name: String(row.full_name || '').trim() || 'Guest Checkout',
        email: row.email || null,
        phone: row.phone || null,
        role: null,
        registeredAt: null,
        totalOrders: Number(row.total_orders || 0),
        totalSpent: Number(row.total_spent || 0),
        lastOrderAt: row.last_order_at,
        lastActivityAt: row.last_activity_at,
      });
    }

    let filtered = customers;
    if (search) {
      const token = search.toLowerCase();
      filtered = customers.filter((customer) =>
        [customer.name, customer.email, customer.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(token)),
      );
    }

    filtered.sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));

    const registeredCount = filtered.filter((c) => c.customerType === 'registered').length;
    const guestCount = filtered.filter((c) => c.customerType === 'guest').length;

    return response.status(200).json({
      success: true,
      data: filtered,
      meta: {
        totalCount: filtered.length,
        registeredCount,
        guestCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};