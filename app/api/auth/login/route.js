import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, signJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Fetch user first
      const result = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      const user = result.rows[0];

      if (!user) {
        // User not found
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      if (user.status !== 'active') {
        return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
      }

      // Check rate limit
      const limitResult = await client.query('SELECT * FROM login_rate_limits WHERE user_id = $1', [user.id]);
      const limitData = limitResult.rows[0];

      if (limitData && limitData.lockout_until && new Date(limitData.lockout_until) > new Date()) {
        const waitMinutes = Math.ceil((new Date(limitData.lockout_until) - new Date()) / 60000);
        return NextResponse.json({ error: `Account locked. Try again in ${waitMinutes} minutes.` }, { status: 429 });
      }

      // Verify Password
      const isValid = await verifyPassword(password, user.password);

      if (!isValid) {
        // Handle failed attempt
        const currentFailed = (limitData?.failed_attempts || 0) + 1;
        let lockoutUntil = null;
        
        if (currentFailed >= 5) {
          lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }

        await client.query(`
          INSERT INTO login_rate_limits (user_id, failed_attempts, lockout_until)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id) 
          DO UPDATE SET failed_attempts = $2, lockout_until = $3
        `, [user.id, currentFailed, lockoutUntil]);

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Success - Reset rate limit
      await client.query(`
        INSERT INTO login_rate_limits (user_id, failed_attempts, lockout_until)
        VALUES ($1, 0, NULL)
        ON CONFLICT (user_id) 
        DO UPDATE SET failed_attempts = 0, lockout_until = NULL
      `, [user.id]);

      // Generate JWT
      const token = await signJWT({ 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.name 
      });

      const response = NextResponse.json({ 
        success: true, 
        role: user.role,
        message: 'Login successful' 
      });

      // Set HTTP-only cookie
      response.cookies.set('session_token', token, {
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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
