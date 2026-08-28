import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('Missing required environment variable: DATABASE_URL');
  process.exit(1);
}

console.warn('DESTRUCTIVE RESET: application data will be permanently deleted.');
console.warn('The existing admin user with ID 1 and its profile will be preserved.');

const connectionString = process.env.DATABASE_URL;
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const isSslDisabled = connectionString.includes('sslmode=disable');
const pool = new Pool({
  connectionString,
  ssl: (isLocalhost || isSslDisabled) ? false : { rejectUnauthorized: false },
});

const readAdminSnapshot = async (client) => {
  const userResult = await client.query(
    `SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at
     FROM users
     WHERE id = 1 AND role = 'admin'
     FOR UPDATE`,
  );

  if (userResult.rows.length !== 1) {
    throw new Error('Refusing reset: the expected admin user with ID 1 was not found.');
  }

  const profileResult = await client.query(
    'SELECT * FROM user_profiles WHERE user_id = 1',
  );

  if (profileResult.rows.length !== 1) {
    throw new Error('Refusing reset: the expected admin profile for user ID 1 was not found.');
  }

  return {
    user: userResult.rows[0],
    profile: profileResult.rows[0],
  };
};

const snapshotsMatch = (before, after) => (
  JSON.stringify(before.user) === JSON.stringify(after.user)
  && JSON.stringify(before.profile) === JSON.stringify(after.profile)
);

const verifyCleanState = async (client) => {
  const expectedZeroes = {
    user_profiles: 'SELECT COUNT(*)::int AS count FROM user_profiles WHERE user_id <> 1',
    customers: "SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'",
    addresses: 'SELECT COUNT(*)::int AS count FROM addresses WHERE user_id IS DISTINCT FROM 1',
    categories: 'SELECT COUNT(*)::int AS count FROM categories',
    products: 'SELECT COUNT(*)::int AS count FROM products',
    product_variants: 'SELECT COUNT(*)::int AS count FROM product_variants',
    product_images: 'SELECT COUNT(*)::int AS count FROM product_images',
    carts: 'SELECT COUNT(*)::int AS count FROM carts WHERE user_id IS DISTINCT FROM 1',
    cart_items: `SELECT COUNT(*)::int AS count
                 FROM cart_items ci
                 JOIN carts c ON c.id = ci.cart_id
                 WHERE c.user_id IS DISTINCT FROM 1`,
    orders: 'SELECT COUNT(*)::int AS count FROM orders',
    order_items: 'SELECT COUNT(*)::int AS count FROM order_items',
    reviews: 'SELECT COUNT(*)::int AS count FROM reviews',
    contact_messages: 'SELECT COUNT(*)::int AS count FROM contact_messages',
  };

  for (const [name, query] of Object.entries(expectedZeroes)) {
    const result = await client.query(query);
    if (result.rows[0].count !== 0) {
      throw new Error(`Reset verification failed: ${name} still contains ${result.rows[0].count} row(s).`);
    }
  }
};

const resetDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const adminBefore = await readAdminSnapshot(client);

    await client.query('DELETE FROM reviews');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query(`
      DELETE FROM cart_items
      WHERE cart_id IN (
        SELECT id FROM carts WHERE user_id IS DISTINCT FROM 1
      )
    `);
    await client.query('DELETE FROM carts WHERE user_id IS DISTINCT FROM 1');
    await client.query('DELETE FROM contact_messages');
    await client.query('DELETE FROM addresses WHERE user_id IS DISTINCT FROM 1');
    await client.query('DELETE FROM product_images');
    await client.query('DELETE FROM product_variants');
    await client.query('DELETE FROM products');

    while (true) {
      const result = await client.query('DELETE FROM categories WHERE parent_id IS NOT NULL');
      if (result.rowCount === 0) break;
    }
    await client.query('DELETE FROM categories');

    await client.query('DELETE FROM user_profiles WHERE user_id <> 1');
    await client.query("DELETE FROM users WHERE role = 'customer'");

    const adminAfter = await readAdminSnapshot(client);
    if (!snapshotsMatch(adminBefore, adminAfter)) {
      throw new Error('Reset verification failed: the admin user or profile changed.');
    }

    await verifyCleanState(client);
    await client.query('COMMIT');
    console.log('Database reset verified and committed. Schema preserved.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Database reset rolled back: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

resetDatabase().catch(async (error) => {
  console.error(`Unexpected reset failure: ${error.message}`);
  await pool.end();
  process.exit(1);
});