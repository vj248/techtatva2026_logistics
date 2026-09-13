import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow CC and SC to view analysis
    if (payload.role !== 'CC' && payload.role !== 'SC') {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    const client = await pool.connect();
    try {
      // 1. Fetch Item Details
      const itemQuery = `
        SELECT id, item_name, unit, quantity, location, description
        FROM inventory 
        WHERE id = $1
      `;
      const itemRes = await client.query(itemQuery, [id]);
      const item = itemRes.rows[0] || null;

      // 2. Fetch Mapped Demands (Approved only)
      const demandsQuery = `
        SELECT 
            u.name as category_name,
            d.quantity as original_demand_quantity,
            d.reason as demand_reason,
            d.status as demand_status,
            m.quantity as mapped_quantity,
            d.id as demand_id,
            (SELECT COALESCE(SUM(quantity), 0) FROM deliveries WHERE mapping_id = m.id) as delivered_quantity
        FROM mappings m
        JOIN demands d ON m.demand_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE m.inventory_id = $1
      `;
      const demandsRes = await client.query(demandsQuery, [id]);

      return NextResponse.json({
        item,
        demands: demandsRes.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching analysis detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
