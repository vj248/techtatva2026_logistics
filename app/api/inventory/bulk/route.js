import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  const client = await pool.connect();

  try {
    // AUTH
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const writeRoles = ['CC', 'OC'];
    if (!writeRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // INPUT
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // NORMALIZE DATA
    const merged = new Map();

    for (const item of items) {
      const { item_name, quantity, unit, type, location, description } = item;

      if (!item_name || quantity === undefined || !unit || isNaN(Number(quantity))) {
        throw new Error(`Invalid data for item: ${item_name || 'Unknown'} (Quantity must be a number)`);
      }

      // Key is item_name + unit
      const key = `${item_name.toLowerCase()}|${unit.toLowerCase()}`;

      if (!merged.has(key)) {
        merged.set(key, {
          item_name,
          quantity: Number(quantity),
          unit,
          type: type || null,
          location: location || null,
          description: description || null
        });
      } else {
        merged.get(key).quantity += Number(quantity);
      }
    }

    const normalizedItems = [...merged.values()];

    await client.query('BEGIN');

    // FETCH EXISTING ITEMS
    const names = normalizedItems.map(i => i.item_name.toLowerCase());
    const units = normalizedItems.map(i => i.unit.toLowerCase());

    // Fetch items that match both name and unit
    const existingResult = await client.query(
      `
      SELECT id, item_name, unit, quantity
      FROM inventory
      WHERE (LOWER(item_name), LOWER(unit)) IN (
        SELECT * FROM UNNEST($1::text[], $2::text[])
      )
      `,
      [names, units]
    );

    const existingMap = new Map();
    for (const row of existingResult.rows) {
      const key = `${row.item_name.toLowerCase()}|${row.unit.toLowerCase()}`;
      existingMap.set(key, row);
    }

    // SPLIT UPDATES AND INSERTS
    const updates = [];
    const inserts = [];

    for (const item of normalizedItems) {
      const key = `${item.item_name.toLowerCase()}|${item.unit.toLowerCase()}`;

      if (existingMap.has(key)) {
        const existing = existingMap.get(key);
        updates.push({
          id: existing.id,
          quantity: existing.quantity + item.quantity
        });
      } else {
        inserts.push(item);
      }
    }

    // BULK UPDATE
    if (updates.length > 0) {
      await client.query(
        `
        UPDATE inventory
        SET quantity = v.quantity,
            updated_at = NOW()
        FROM (
          SELECT UNNEST($1::int[]) AS id,
                 UNNEST($2::int[])  AS quantity
        ) v
        WHERE inventory.id = v.id
        `,
        [
          updates.map(u => u.id),
          updates.map(u => u.quantity)
        ]
      );
    }

    // BULK INSERT
    if (inserts.length > 0) {
      // BULK INSERT
      await client.query(
        `
        INSERT INTO inventory (item_name, quantity, unit, type, location, description)
        SELECT * FROM UNNEST(
          $1::text[],
          $2::int[],
          $3::text[],
          $4::text[],
          $5::text[],
          $6::text[]
        )
        `,
        [
          inserts.map(i => i.item_name),
          inserts.map(i => i.quantity),
          inserts.map(i => i.unit),
          inserts.map(i => i.type),
          inserts.map(i => i.location),
          inserts.map(i => i.description)
        ]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Bulk import successful',
      created: inserts.length,
      updated: updates.length,
      total: normalizedItems.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk import error:', error);

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
