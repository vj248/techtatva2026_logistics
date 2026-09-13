import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only CC allowed to update status and negotiated
    if (payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, negotiated, remarks } = body;

    // Validate status
    const validStatuses = ['under review', 'approved', 'not approved'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate negotiated
    if (negotiated !== undefined && negotiated !== null) {
        if (isNaN(negotiated) || Number(negotiated) < 0) {
             return NextResponse.json({ error: 'Negotiated quantity must be a non-negative number' }, { status: 400 });
        }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(status);
    }
    if (negotiated !== undefined) {
        fields.push(`negotiated = $${idx++}`);
        values.push(negotiated);
    }
    if (remarks !== undefined) {
        fields.push(`remarks = $${idx++}`);
        values.push(remarks ? remarks.trim() : null);
    }
    
    if (fields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    
    const client = await pool.connect();
    try {
      // Check negotiation status
      const negotiationCheck = await client.query(
        `SELECT n.status 
         FROM demands d
         JOIN negotiations n ON d.user_id = n.id
         WHERE d.id = $1`,
        [id]
      );

      if (negotiationCheck.rows.length > 0 && negotiationCheck.rows[0].status === 'done') {
        return NextResponse.json({ error: 'Negotiation is locked for this category' }, { status: 403 });
      }

      const result = await client.query(
        `
        UPDATE demands
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${idx}
        RETURNING *
        `,
        values
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Demand not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update demand status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
