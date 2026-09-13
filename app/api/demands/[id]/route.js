import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// PUT: Update demand
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

    // Only Categories allowed to update
    if (payload.role !== 'Category') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { item_name, quantity, unit, reason } = await request.json();

    if (!item_name || quantity === undefined || !unit) {
      return NextResponse.json(
        { error: 'Item name, quantity, and unit are required' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be positive' },
        { status: 400 }
      );
    }

    const cleanName = item_name.trim();
    const cleanUnit = unit.trim().toLowerCase();
    const cleanReason = reason ? reason.trim() : null;
    const newStatus = 'under review';

    const client = await pool.connect();
    try {
      // Check negotiation status
      const negotiationCheck = await client.query(
        `SELECT status FROM negotiations WHERE id = $1`,
        [payload.id]
      );

      if (negotiationCheck.rows.length > 0 && negotiationCheck.rows[0].status === 'done') {
        return NextResponse.json({ error: 'Negotiation is locked' }, { status: 403 });
      }

      // Fetch existing demand to compare
      const existingResult = await client.query(
        'SELECT * FROM demands WHERE id = $1 AND user_id = $2',
        [id, payload.id]
      );

      if (existingResult.rows.length === 0) {
        return NextResponse.json({ error: 'Demand not found' }, { status: 404 });
      }

      const existing = existingResult.rows[0];
      
      // Normalize existing reason for comparison
      const existingReason = existing.reason ? existing.reason.trim() : null;

      if (
        existing.item_name === cleanName &&
        existing.quantity === quantity &&
        existing.unit === cleanUnit &&
        existingReason === cleanReason
      ) {
        // No changes, return existing without updating status
        return NextResponse.json(existing);
      }

      // Check for same user + item + unit with different id
      const conflictCheck = await client.query(
        `
        SELECT id
        FROM demands
        WHERE LOWER(item_name) = LOWER($1)
          AND LOWER(unit) = LOWER($2)
          AND user_id = $3
          AND id != $4
        `,
        [cleanName, cleanUnit, payload.id, id]
      );

      if (conflictCheck.rows.length > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Item "${cleanName}" with unit "${cleanUnit}" already exists (ID: ${conflictCheck.rows[0].id}).`
          },
          { status: 409 }
        );
      }

      const result = await client.query(
        `
        UPDATE demands
        SET item_name = $1,
            quantity = $2,
            unit = $3,
            reason = $4,
            status = $5,
            updated_at = NOW()
        WHERE id = $6
          AND user_id = $7
        RETURNING *
        `,
        [cleanName, quantity, cleanUnit, cleanReason, newStatus, id, payload.id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Demand not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update demand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// DELETE: Delete demand
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'Category') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      // Check negotiation status
      const negotiationCheck = await client.query(
        `SELECT status FROM negotiations WHERE id = $1`,
        [payload.id]
      );

      if (negotiationCheck.rows.length > 0 && negotiationCheck.rows[0].status === 'done') {
        return NextResponse.json({ error: 'Negotiation is locked' }, { status: 403 });
      }

      const result = await client.query(
        `
        DELETE FROM demands
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [id, payload.id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Demand not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Demand deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete demand error:', error);
    return NextResponse.json({ error: 'Demand server error' }, { status: 500 });
  }
}

