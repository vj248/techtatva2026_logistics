import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// POST: Bulk Delete
export async function POST(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only CC, OC allowed to write
    const writeRoles = ['CC', 'OC'];
    if (!writeRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Use ANY($1) for array parameter
      const result = await client.query('DELETE FROM inventory WHERE id = ANY($1::int[]) RETURNING id', [ids]);
      
      return NextResponse.json({ message: `Deleted ${result.rowCount} items` });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Bulk delete inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
