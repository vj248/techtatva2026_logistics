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

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name, email FROM users WHERE role = 'Category' ORDER BY name ASC"
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
