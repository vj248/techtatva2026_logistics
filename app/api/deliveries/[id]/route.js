import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    if (!['CC', 'OC'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM deliveries WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
    try {
        const token = request.cookies.get('session_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const payload = await verifyJWT(token);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
        const { role } = payload;
        if (!['CC', 'OC'].includes(role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    
        const { id } = await params;
        const body = await request.json();
        const { invoice_id, mapping_id, quantity } = body;

        // Dynamic update query builder
        const updates = [];
        const values = [];
        let counter = 1;

        if (invoice_id) { updates.push(`invoice_id = $${counter++}`); values.push(invoice_id); }
        if (mapping_id) { updates.push(`mapping_id = $${counter++}`); values.push(mapping_id); }
        if (quantity) { 
            if (quantity <= 0) return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
            updates.push(`quantity = $${counter++}`); 
            values.push(quantity); 
        }

        if (updates.length === 0) {
             return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
    
        const client = await pool.connect();
        try {
          const query = `UPDATE deliveries SET ${updates.join(', ')} WHERE id = $${counter} RETURNING *`;
          const result = await client.query(query, values);
          
          if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
          }

          return NextResponse.json(result.rows[0]);
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error updating delivery:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = payload;
    // Only CC can delete
    if (role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM deliveries WHERE id = $1 RETURNING id', [id]);
      
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Delivery deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting delivery:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
