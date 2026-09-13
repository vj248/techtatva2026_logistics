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

    // Check Role Access (CC, OC, SC allowed)
    const allowedRoles = ['CC', 'OC', 'SC'];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM inventory ORDER BY updated_at DESC');
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add new item
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

    const { item_name, quantity, unit, type, location, description } = await request.json();

    // Validation
    if (!item_name || quantity === undefined || !unit) {
      return NextResponse.json({ error: 'Item name, quantity, and unit are required' }, { status: 400 });
    }

    if (quantity < 0) {
      return NextResponse.json({ error: 'Quantity must be non-negative' }, { status: 400 });
    }

    // Sanitize
    const cleanName = item_name.trim();
    const cleanUnit = unit.trim();
    const cleanType = type ? type.trim() : null;
    const cleanLocation = location ? location.trim() : null;
    const cleanDesc = description ? description.trim() : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Additive Quantity based on name AND unit
      const check = await client.query(
        'SELECT id, quantity, type, location, description FROM inventory WHERE LOWER(item_name) = LOWER($1) AND LOWER(unit) = LOWER($2)', 
        [cleanName, cleanUnit]
      );
      
      let resultItem;

      if (check.rows.length > 0) {
        // Update existing item
        const existingItem = check.rows[0];
        const newQuantity = existingItem.quantity + parseInt(quantity);
        
        const newType = cleanType !== null ? cleanType : existingItem.type;
        const newLocation = cleanLocation !== null ? cleanLocation : existingItem.location;
        const newDescription = cleanDesc !== null ? cleanDesc : existingItem.description;
        
        const updateResult = await client.query(
          'UPDATE inventory SET quantity = $1, type = $3, location = $4, description = $5, updated_at = NOW() WHERE id = $2 RETURNING *',
          [newQuantity, existingItem.id, newType, newLocation, newDescription]
        );
        resultItem = updateResult.rows[0];
      } else {
        // Create new item
        const result = await client.query(
          'INSERT INTO inventory (item_name, quantity, unit, type, location, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [cleanName, quantity, cleanUnit, cleanType, cleanLocation, cleanDesc]
        );
        resultItem = result.rows[0];
      }

      await client.query('COMMIT');
      return NextResponse.json(resultItem);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Add inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
