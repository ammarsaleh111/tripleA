import pg from 'pg';

const { Pool } = pg;

let pool;
let poolInitializationPromise;

const isPlaceholderUrl = (url) => {
  if (!url) return true;
  const str = String(url).toLowerCase().trim();
  return (
    str.includes('your_postgres_connection_string_here') ||
    str.includes('your_connection_string') ||
    str.includes('user:password@host')
  );
};

const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || isPlaceholderUrl(connectionString)) {
    throw new Error(
      'DATABASE_URL in backend/.env is set to placeholder "your_postgres_connection_string_here". Please update backend/.env with your actual Neon PostgreSQL connection string.'
    );
  }

  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const isSslDisabled = connectionString.includes('sslmode=disable');

  return {
    connectionString,
    ssl: (isLocalhost || isSslDisabled) ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
};

// Converts `?` placeholders (your old MSSQL-style query text) into
// Postgres-style $1, $2, $3...
const replacePlaceholders = (queryText) => {
  let index = 0;
  return String(queryText).replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
};

const executeQuery = async (target, queryText, params = []) => {
  const normalizedQuery = replacePlaceholders(queryText);
  const result = await target.query(normalizedQuery, params);
  const rows = result.rows || [];

  const response = {
    affectedRows: result.rowCount || 0,
  };

  let payload = rows;
  const statementType = String(queryText).trim().split(/\s+/, 1)[0]?.toUpperCase();

  // If the query used RETURNING id, surface it the same way your
  // old MSSQL insertId shape did.
  const firstRow = rows[0];
  const hasInsertIdRow =
    rows.length >= 1 && firstRow && Object.prototype.hasOwnProperty.call(firstRow, 'id');

  if (hasInsertIdRow && queryText.trim().toUpperCase().startsWith('INSERT')) {
    response.insertId = firstRow.id;
    payload = {
      insertId: firstRow.id,
      affectedRows: response.affectedRows,
    };
  } else if (!rows.length && statementType !== 'SELECT' && Number.isFinite(response.affectedRows)) {
    payload = {
      affectedRows: response.affectedRows,
    };
  }

  return [payload, response];
};

const createTransactionalClient = (client) => ({
  query: (queryText, params) => executeQuery(client, queryText, params),
  beginTransaction: () => client.query('BEGIN'),
  commit: () => client.query('COMMIT'),
  rollback: () => client.query('ROLLBACK'),
  release: async () => client.release(),
});

const createDatabaseClient = (target) => ({
  query: (queryText, params) => executeQuery(target, queryText, params),
  getConnection: async () => {
    const client = await pool.connect();
    return createTransactionalClient(client);
  },
});

export const connectDatabase = async () => {
  if (pool) {
    return createDatabaseClient(pool);
  }

  if (poolInitializationPromise) {
    return poolInitializationPromise;
  }

  poolInitializationPromise = (async () => {
    try {
      pool = new Pool(getDatabaseConfig());

      pool.on('error', (err) => {
        console.error('Unexpected error on idle Postgres client', err);
      });

      const client = await pool.connect();
      await client.query('SELECT 1 AS ok');
      client.release();

      console.log('Database connection established.');
      return createDatabaseClient(pool);
    } catch (error) {
      const message = `Database connection failed: ${error?.message || error}`;
      console.error(message);
      console.error(error);
      pool = undefined;
      throw new Error(message);
    } finally {
      poolInitializationPromise = undefined;
    }
  })();

  return poolInitializationPromise;
};

export const getDatabase = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }

  return createDatabaseClient(pool);
};
