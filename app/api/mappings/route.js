import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || (payload.role !== 'CC' && payload.role !== 'OC')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const demandId = searchParams.get('demand_id');
    const categoryId = searchParams.get('category_id');

    const client = await pool.connect();
    try {
      if (demandId) {
        const result = await client.query(`
          SELECT m.*, i.item_name, i.unit, i.quantity as inventory_total
          FROM mappings m
          JOIN inventory i ON m.inventory_id = i.id
          WHERE m.demand_id = $1
        `, [demandId]);
        return NextResponse.json(result.rows);
      } else if (categoryId) {
        const result = await client.query(`
          SELECT m.*, i.item_name, i.unit, i.quantity as inventory_total, i.description
          FROM mappings m
          JOIN inventory i ON m.inventory_id = i.id
          JOIN demands d ON m.demand_id = d.id
          WHERE d.user_id = $1
        `, [categoryId]);
        return NextResponse.json(result.rows);
      } else {
         return NextResponse.json([]);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch mappings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || (payload.role !== 'CC' && payload.role !== 'OC')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { demandId, mappings } = body; // mappings = [{ inventory_id, quantity }]

    if (!demandId) {
       return NextResponse.json({ error: 'Missing demand ID' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing mappings for this demand (to simplify updates - full replace)
      // Or we can be smarter. But full replace is easier for "edit" mode.
      await client.query('DELETE FROM mappings WHERE demand_id = $1', [demandId]);

      if (mappings && mappings.length > 0) {
        for (const m of mappings) {
           if (m.quantity <= 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
           }
           await client.query(
             'INSERT INTO mappings (demand_id, inventory_id, quantity) VALUES ($1, $2, $3)',
             [demandId, m.inventory_id, m.quantity]
           );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Mappings saved' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Save mappings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
