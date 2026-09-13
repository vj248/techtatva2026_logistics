import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create Mappings Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS mappings (
            id SERIAL PRIMARY KEY,
            demand_id INTEGER NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
            inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create Trigger (check if exists first, or drop and recreate)
      await client.query(`
        DROP TRIGGER IF EXISTS update_mappings_modtime ON mappings;
      `);
      
      await client.query(`
        CREATE TRIGGER update_mappings_modtime
        BEFORE UPDATE ON mappings
        FOR EACH ROW
        EXECUTE PROCEDURE update_modified_column();
      `);

      await client.query('COMMIT');
      
      return NextResponse.json({ message: 'Mappings table created successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
