import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Tables wiped completely (demo/sales data). Kept: products, product_variants,
// product_images, categories and the admin account.
const tablesToTruncate = [
  'order_items',
  'orders',
  'cart_items',
  'carts',
  'reviews',
  'contact_messages',
  'bundle_offer_products',
  'offers',
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const countOf = async (client, table) => {
  const result = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return result.rows[0].c;
};

const main = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const before = {};
    for (const table of tablesToTruncate) {
      before[table] = await countOf(client, table);
    }

    const deletedRows = { ...before };

    // 1. Wipe demo/sales tables (orders, carts, reviews, messages, offers).
    //    TRUNCATE resets the identity sequences so new orders start at 1.
    const tableList = tablesToTruncate.map((t) => `"${t}"`).join(', ');
    await client.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);

    // 2. Remove every user EXCEPT admins (demo customers), with their
    //    profiles and addresses. The admin account is preserved.
    const removeResult = await client.query(`
      WITH doomed AS (
        SELECT id FROM users WHERE role <> 'admin'
      )
      SELECT
        (SELECT COUNT(*)::int FROM doomed) AS users,
        (SELECT COUNT(*)::int FROM user_profiles WHERE user_id IN (SELECT id FROM doomed)) AS profiles,
        (SELECT COUNT(*)::int FROM addresses WHERE user_id IN (SELECT id FROM doomed)) AS addresses
    `);
    await client.query(`
      DELETE FROM addresses
      WHERE user_id IN (SELECT id FROM users WHERE role <> 'admin')
    `);
    await client.query(`
      DELETE FROM user_profiles
      WHERE user_id IN (SELECT id FROM users WHERE role <> 'admin')
    `);
    const usersResult = await client.query(`
      DELETE FROM users WHERE role <> 'admin'
    `);
    deletedRows['addresses (customers)'] = removeResult.rows[0].addresses;
    deletedRows['user_profiles (customers)'] = removeResult.rows[0].profiles;
    deletedRows['users (customers)'] = usersResult.rowCount;

    await client.query('COMMIT');

    console.log('────────── Removed ──────────');
    for (const [table, count] of Object.entries(deletedRows)) {
      console.log(`  ${table.padEnd(28)} ${count} rows`);
    }

    const adminUsers = await countOf(client, 'users');
    const kept = {};
    for (const table of ['products', 'product_variants', 'product_images', 'categories', 'offers']) {
      kept[table] = await countOf(client, table);
    }
    console.log('────────── Kept ─────────────');
    for (const [table, count] of Object.entries(kept)) {
      console.log(`  ${table.padEnd(28)} ${count} rows`);
    }
    console.log(`  users (admin accounts)       ${adminUsers} rows`);

    if (adminUsers < 1) {
      console.warn('⚠ No admin account found! Create one with: npm run create-admin');
    }
    console.log('Clean complete. Schema preserved — dashboard is ready for the brand owner.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Clean failed (rolled back):', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error('Unexpected error during clean:', error.message);
  process.exit(1);
});
