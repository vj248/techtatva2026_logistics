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

    const { name, email } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // If email is provided and different from current, check permissions and uniqueness
      let newEmail = payload.email;
      if (email && email !== payload.email) {
        if (payload.role !== 'CC') {
          return NextResponse.json({ error: 'Only CC can change their email' }, { status: 403 });
        }

        // Check if email is taken
        const check = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, payload.id]);
        if (check.rows.length > 0) {
          return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
        }
        newEmail = email;
      }

      await client.query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, newEmail, payload.id]);
      
      // Create a new token with the updated details
      const newToken = await signJWT({ 
        ...payload,
        name: name,
        email: newEmail
      });

      const response = NextResponse.json({ success: true, message: 'Profile updated successfully' });
      
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
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
