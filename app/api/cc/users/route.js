import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, verifyJWT } from '@/lib/auth';

// GET: List all users except the requester
export async function GET(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, name, role, status, created_at FROM users ORDER BY created_at DESC'
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const email = body.email?.trim();
    const password = body.password;
    const rawRole = body.role;
    const name = body.name?.trim();

    if (!email || !password || !rawRole) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 });
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

    const hashedPassword = await hashPassword(password);
    const userName = name || 'User';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if email exists
      const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (check.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      const result = await client.query(
        'INSERT INTO users (email, password, name, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, status',
        [email, hashedPassword, userName, role, 'active']
      );
      
      await client.query('COMMIT');
      return NextResponse.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
