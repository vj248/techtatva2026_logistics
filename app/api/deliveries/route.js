import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    if (!['CC', 'OC'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    const client = await pool.connect();
    try {
      if (categoryId) {
        // Return aggregated delivery quantities per mapping for the specific category's demands
        const result = await client.query(`
          SELECT d.mapping_id, COALESCE(SUM(d.quantity), 0) as delivered_qty
          FROM deliveries d
          JOIN mappings m ON d.mapping_id = m.id
          JOIN demands dem ON m.demand_id = dem.id
          WHERE dem.user_id = $1
          GROUP BY d.mapping_id
        `, [categoryId]);
        
        // Transform to simplified object map or return array
        return NextResponse.json(result.rows);
      }

      const result = await client.query(`
        SELECT d.*
        FROM deliveries d
        ORDER BY d.created_at DESC
      `);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    if (!['CC', 'OC'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { invoice_id, mapping_id, quantity, returnable } = body;

    if (!invoice_id || !mapping_id || !quantity) {
        return NextResponse.json({ error: 'Invoice ID, Mapping ID and Quantity are required' }, { status: 400 });
    }

    if (quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO deliveries (invoice_id, mapping_id, quantity, returnable) VALUES ($1, $2, $3, $4) RETURNING *',
        [invoice_id, mapping_id, quantity, returnable || false]
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating delivery:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
