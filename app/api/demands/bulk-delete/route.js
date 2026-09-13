import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// POST: Bulk Delete Demands
export async function POST(request) {
  const client = await pool.connect();

  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'Category') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check negotiation status
    const negotiationCheck = await client.query(
      `SELECT status FROM negotiations WHERE id = $1`,
      [payload.id]
    );

    if (negotiationCheck.rows.length > 0 && negotiationCheck.rows[0].status === 'done') {
      return NextResponse.json({ error: 'Negotiation is locked' }, { status: 403 });
    }

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `
      DELETE FROM demands
      WHERE id = ANY($1::int[])
        AND user_id = $2
      RETURNING id
      `,
      [ids, payload.id]
    );

    await client.query('COMMIT');

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'No demands found' }, { status: 404 });
    }

    return NextResponse.json({
      message: `Deleted ${result.rowCount} demands`,
      deletedIds: result.rows.map(r => r.id)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk delete demands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
