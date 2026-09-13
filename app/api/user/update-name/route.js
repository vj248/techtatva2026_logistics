import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyJWT, signJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('UPDATE users SET name = $1 WHERE id = $2', [name, payload.id]);
      
      // Create a new token with the updated name
      const newToken = await signJWT({ 
        ...payload,
        name: name 
      });

      const response = NextResponse.json({ success: true, message: 'Name updated successfully' });
      
      // Update the cookie with the new token
      response.cookies.set('session_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update name error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
