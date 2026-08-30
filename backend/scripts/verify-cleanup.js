import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const connStr = process.env.DATABASE_URL || '';
const isLocalhost = connStr.includes('localhost') || connStr.includes('127.0.0.1');
const isSslDisabled = connStr.includes('sslmode=disable');

const pool = new pg.Pool({
  connectionString: connStr,
  ssl: (isLocalhost || isSslDisabled) ? false : { rejectUnauthorized: false },
});

try {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE slug LIKE 'e2e-%') AS e2e_products,
      (SELECT COUNT(*) FROM offers WHERE name LIKE 'E2E %') AS e2e_offers,
      (SELECT COUNT(*) FROM carts WHERE session_id LIKE 'e2e-%') AS e2e_carts,
      (SELECT COUNT(*) FROM order_items WHERE product_name LIKE 'E2E%') AS e2e_order_items,
      (SELECT COUNT(*) FROM users WHERE email LIKE 'e2e-cust-%') AS e2e_users
  `);
  console.log('Cleanup verification:', JSON.stringify(rows[0]));
  const allZero = Object.values(rows[0]).every((v) => Number(v) === 0);
  console.log(allZero ? 'ALL TEST DATA CLEANED UP.' : 'WARNING: leftover test data!');
} catch (error) {
  console.error('Verification failed:', error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}