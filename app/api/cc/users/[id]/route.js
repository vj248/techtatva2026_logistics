import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// PUT: Update user details (name, email, role, status)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent editing self via this route (though frontend should also prevent it)
    if (id === payload.id) {
      return NextResponse.json({ error: 'Cannot edit your own account from here' }, { status: 403 });
    }

    const body = await request.json();
    const name = body.name?.trim();
    const email = body.email?.trim();
    const rawRole = body.role;
    const status = body.status;

    // Basic validation
    if (!email || !rawRole || !status) {
      return NextResponse.json({ error: 'Email, role, and status are required' }, { status: 400 });
    }

    // Normalize Role
    const roleMap = {
      'oc': 'OC',
      'cc': 'CC',
      'sc': 'SC',
      'category': 'Category'
    };
    const role = roleMap[rawRole.toLowerCase()];

    const validRoles = ['OC', 'CC', 'SC', 'Category'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if email is taken by another user
      const check = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (check.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      const result = await client.query(
        'UPDATE users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5 RETURNING id, email, name, role, status',
        [name || 'User', email, role, status, id]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      await client.query('COMMIT');
      return NextResponse.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
