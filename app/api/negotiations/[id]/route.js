import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id } = await params; // This is the Category User ID

    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM negotiations WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        // Return default structure if no negotiation exists yet
        return NextResponse.json({
          id: id,
          status: 'pending',
          cc_present: [],
          category_representatives: []
        });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch negotiation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
