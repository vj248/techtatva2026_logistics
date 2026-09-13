import { Pool } from 'pg';

const isNeonDB = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('neon');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires SSL connections - enable SSL for Neon or production
  ssl: isNeonDB || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

export default pool;