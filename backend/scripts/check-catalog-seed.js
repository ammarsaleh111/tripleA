import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position");
console.log('products columns:', cols.rows.map((r) => r.column_name).join(', '));
const c = await pool.query('SELECT count(*)::int AS n FROM products');
console.log('total products:', c.rows[0].n);
const d = await pool.query('SELECT name, count(*)::int AS n FROM products GROUP BY name HAVING count(*) > 1');
console.log('duplicate names:', d.rows.length ? d.rows : 'none');
const seeded = await pool.query("SELECT name, base_price FROM products WHERE slug IN ('kevin-levrone-gold-creatine-300g','qp-premium-protein-900g','whey-protein-concentrate-950g') ORDER BY name");
console.log('spot check:', seeded.rows);
await pool.end();
