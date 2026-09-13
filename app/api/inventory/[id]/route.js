import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// PUT: Update item
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
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
      // Check for conflict: Does another item exist with same name/unit but different ID?
      const conflictCheck = await client.query(
        'SELECT id FROM inventory WHERE LOWER(item_name) = LOWER($1) AND LOWER(unit) = LOWER($2) AND id != $3',
        [cleanName, cleanUnit, id]
      );

      if (conflictCheck.rows.length > 0) {
        return NextResponse.json({ 
          error: `Conflict: Item "${cleanName}" with unit "${cleanUnit}" already exists (ID: ${conflictCheck.rows[0].id}).` 
        }, { status: 409 });
      }

      const result = await client.query(
        'UPDATE inventory SET item_name = $1, quantity = $2, unit = $3, type = $4, location = $5, description = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
        [cleanName, quantity, cleanUnit, cleanType, cleanLocation, cleanDesc, id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete item
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only CC, OC allowed to write
    const writeRoles = ['CC', 'OC'];
    if (!writeRoles.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM inventory WHERE id = $1 RETURNING id', [id]);
      
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Item deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
