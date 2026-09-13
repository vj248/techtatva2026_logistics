import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, verifyJWT } from '@/lib/auth';

// PUT: Reset user password
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent editing self via this route
    if (id === payload.id) {
      return NextResponse.json({ error: 'Cannot reset your own password from here' }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET password = $1 WHERE id = $2 RETURNING id',
        [hashedPassword, id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      return NextResponse.json({ message: 'Password updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
