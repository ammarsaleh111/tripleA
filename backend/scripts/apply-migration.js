import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-file-name>');
  process.exit(1);
}

const connStr = process.env.DATABASE_URL || '';
const isLocalhost = connStr.includes('localhost') || connStr.includes('127.0.0.1');
const isSslDisabled = connStr.includes('sslmode=disable');

const pool = new pg.Pool({
  connectionString: connStr,
  ssl: (isLocalhost || isSslDisabled) ? false : { rejectUnauthorized: false },
});

try {
  const sql = await fs.readFile(path.resolve(__dirname, '../sql/migrations', migrationFile), 'utf8');
  await pool.query(sql);
  console.log(`Migration ${migrationFile} applied successfully.`);
} catch (error) {
  console.error(`Migration ${migrationFile} failed:`, error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}