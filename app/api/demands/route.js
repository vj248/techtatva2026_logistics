import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// GET: List inventory items
export async function GET(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await pool.connect();
    try {
      // Category can view only their demands
      if(payload.role === 'Category'){
        const result = await client.query(
          'SELECT * FROM demands WHERE user_id = $1 ORDER BY updated_at DESC',
          [payload.id]
        );
        return NextResponse.json(result.rows);
      }
      // CC, OC, SC can view all demands
      else if(payload.role === 'CC' || payload.role === 'OC' || payload.role === 'SC'){ 
        const result = await client.query(`
          SELECT d.*, u.name as category_name, u.id as category_id 
          FROM demands d 
          LEFT JOIN users u ON d.user_id = u.id 
          ORDER BY d.updated_at DESC
        `);
        return NextResponse.json(result.rows);
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch demand error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add new demand
export async function POST(request) {
  const client = await pool.connect();

  try {
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

    // Check negotiation status
    const negotiationCheck = await client.query(
      `SELECT status FROM negotiations WHERE id = $1`,
      [payload.id]
    );

    if (negotiationCheck.rows.length > 0 && negotiationCheck.rows[0].status === 'done') {
      return NextResponse.json({ error: 'Negotiation is locked' }, { status: 403 });
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

    await client.query('BEGIN');

    // Check if demand already exists for same user + item + unit
    const check = await client.query(
      `
      SELECT id, quantity, reason
      FROM demands
      WHERE LOWER(item_name) = LOWER($1)
        AND LOWER(unit) = LOWER($2)
        AND user_id = $3
      FOR UPDATE
      `,
      [cleanName, cleanUnit, payload.id]
    );

    let resultItem;

    // Updating existing demand
    if (check.rows.length > 0) {
      const existing = check.rows[0];
      const newQuantity = existing.quantity + parseInt(quantity, 10);
      const newReason = cleanReason !== null ? cleanReason : existing.reason;
      const newStatus = 'under review';
      const updateResult = await client.query(
        `
        UPDATE demands
        SET quantity = $1,
            reason = $2,
            status = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
        `,
        [newQuantity, newReason, newStatus ,existing.id]
      );

      resultItem = updateResult.rows[0];
    }
    // Creating new demand 
    else {
      const insertResult = await client.query(
        `
        INSERT INTO demands (user_id, item_name, quantity, unit, reason)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [payload.id, cleanName, quantity, cleanUnit, cleanReason]
      );

      resultItem = insertResult.rows[0];
    }

    await client.query('COMMIT');
    return NextResponse.json(resultItem, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add demand error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
