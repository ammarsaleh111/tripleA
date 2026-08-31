import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const tables = [
  'users', 'user_profiles', 'addresses', 'categories', 'products',
  'product_variants', 'product_images', 'offers', 'bundle_offer_products',
  'carts', 'cart_items', 'orders', 'order_items', 'reviews', 'contact_messages',
];

for (const t of tables) {
  const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
  console.log(`${t} = ${r.rows[0].c}`);
}

const admin = await pool.query(
  `SELECT id, email, password_hash, first_name, last_name, role
   FROM users WHERE id = 1`,
);
console.log('ADMIN USER:', JSON.stringify(admin.rows[0], null, 2));

const profile = await pool.query('SELECT * FROM user_profiles WHERE user_id = 1');
console.log('ADMIN PROFILE:', JSON.stringify(profile.rows[0], null, 2));

const customers = await pool.query("SELECT id, email, role FROM users WHERE role = 'customer'");
console.log('REMAINING CUSTOMERS:', JSON.stringify(customers.rows));

const seq = await pool.query("SELECT last_value, is_called FROM users_id_seq");
console.log('USERS SEQUENCE:', JSON.stringify(seq.rows[0]));

await pool.end();
