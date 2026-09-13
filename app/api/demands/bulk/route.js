import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  const client = await pool.connect();

  try {
    // AUTH
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    // INPUT
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // MERGE REQUEST PAYLOAD
    const merged = new Map();

    for (const item of items) {
      const { item_name, quantity, unit, reason } = item;

      if (!item_name || quantity === undefined || !unit || isNaN(quantity) || Number(quantity) <= 0) {
        throw new Error(`Invalid item: ${item_name || 'Unknown'} (Quantity must be positive)`);
      }

      const key = `${item_name.toLowerCase()}|${unit.toLowerCase()}`;

      if (!merged.has(key)) {
        merged.set(key, {
          item_name: item_name.trim(),
          unit: unit.trim().toLowerCase(),
          quantity: Number(quantity),
          reason: reason ? reason.trim() : null
        });
      } else {
        merged.get(key).quantity += Number(quantity);
      }
    }

    const normalized = [...merged.values()];

    await client.query('BEGIN');

    // FETCH EXISTING DEMANDS IN ONE QUERY
    const names = normalized.map(i => i.item_name.toLowerCase());
    const units = normalized.map(i => i.unit.toLowerCase());

    const existing = await client.query(
      `
      SELECT id, item_name, unit, quantity, reason
      FROM demands
      WHERE user_id = $1
        AND (LOWER(item_name), LOWER(unit)) IN (
          SELECT * FROM UNNEST($2::text[], $3::text[])
        )
      FOR UPDATE
      `,
      [payload.id, names, units]
    );

    const existingMap = new Map();
    for (const r of existing.rows) {
      const key = `${r.item_name.toLowerCase()}|${r.unit.toLowerCase()}`;
      existingMap.set(key, r);
    }

    // SPLIT UPDATES & INSERTS
    const updates = [];
    const inserts = [];

    for (const item of normalized) {
      const key = `${item.item_name.toLowerCase()}|${item.unit.toLowerCase()}`;

      if (existingMap.has(key)) {
        const ex = existingMap.get(key);
        updates.push({
          id: ex.id,
          quantity: ex.quantity + item.quantity,
          reason: item.reason ?? ex.reason
        });
      } else {
        inserts.push(item);
      }
    }

    // BULK UPDATE (single query)
    if (updates.length > 0) {
      await client.query(
        `
        UPDATE demands
        SET
          quantity = v.quantity,
          reason = v.reason,
          status = 'under review',
          updated_at = NOW()
        FROM (
          SELECT
            UNNEST($1::int[]) AS id,
            UNNEST($2::int[])  AS quantity,
            UNNEST($3::text[]) AS reason
        ) v
        WHERE demands.id = v.id
        `,
        [
          updates.map(u => u.id),
          updates.map(u => u.quantity),
          updates.map(u => u.reason)
        ]
      );
    }

    // BULK INSERT (single query)
    if (inserts.length > 0) {
      await client.query(
        `
        INSERT INTO demands (user_id, item_name, quantity, unit, reason, status)
        SELECT user_id, item_name, quantity, unit, reason, status
        FROM UNNEST(
          $1::uuid[],
          $2::text[],
          $3::int[],
          $4::text[],
          $5::text[],
          $6::text[]
        ) WITH ORDINALITY AS t(user_id, item_name, quantity, unit, reason, status, ord)
        ORDER BY t.ord
        `,
        [
          Array(inserts.length).fill(payload.id),
          inserts.map(i => i.item_name),
          inserts.map(i => i.quantity),
          inserts.map(i => i.unit),
          inserts.map(i => i.reason),
          Array(inserts.length).fill('under review')
        ]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Bulk demands processed',
      created: inserts.length,
      updated: updates.length,
      total: normalized.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk demand error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
