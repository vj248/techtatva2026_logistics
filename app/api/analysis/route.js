import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow CC and SC to view analysis
    if (payload.role !== 'CC' && payload.role !== 'SC') {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      const query = `
        SELECT 
            i.id,
            i.item_name,
            i.type,
            i.unit,
            i.quantity as total_inventory,
            COALESCE(dem.mapped_qty, 0) as total_demand,
            COALESCE(dem.delivered_qty, 0) as total_delivered,
            (i.quantity - (COALESCE(dem.mapped_qty, 0) - COALESCE(dem.delivered_qty, 0))) as surplus_deficit
        FROM inventory i
        LEFT JOIN (
            SELECT 
                m.inventory_id,
                SUM(m.quantity) as mapped_qty,
                SUM(COALESCE(d.qty, 0)) as delivered_qty
            FROM mappings m
            LEFT JOIN (
                SELECT mapping_id, SUM(quantity) as qty
                FROM deliveries
                GROUP BY mapping_id
            ) d ON m.id = d.mapping_id
            GROUP BY m.inventory_id
        ) dem ON i.id = dem.inventory_id
        ORDER BY i.item_name ASC;
      `;
      
      const result = await client.query(query);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
