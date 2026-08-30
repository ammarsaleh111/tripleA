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
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_name IN ('cart_items', 'order_items', 'offers', 'bundle_offer_products')
    ORDER BY table_name, ordinal_position
  `);
  console.log(JSON.stringify(rows, null, 2));

  const { rows: constraints } = await pool.query(`
    SELECT conname, conrelid::regclass AS table_name, confdeltype
    FROM pg_constraint
    WHERE conname LIKE 'FK_%offer%' OR conname LIKE 'CK_offers%' OR conname LIKE 'CK_cart%'
    ORDER BY conname
  `);
  console.log(JSON.stringify(constraints, null, 2));
} catch (error) {
  console.error('Check failed:', error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}