import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, verifyJWT } from '@/lib/auth';

export async function POST(request) {
  const client = await pool.connect();

  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'CC') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { users } = await request.json();

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'No users provided' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    const roleMap = {
      oc: 'OC',
      cc: 'CC',
      sc: 'SC',
      category: 'Category'
    };

    const validUsers = [];
    const emails = [];

    for (const user of users) {
      const email = user.email?.trim();
      const password = user.password;
      const rawRole = user.role;
      const name = user.name?.trim();

      if (!email || !rawRole) {
        results.failed++;
        results.errors.push({
          email: email || 'Unknown',
          error: 'Missing email or role'
        });
        continue;
      }

      const role = roleMap[rawRole.toString().toLowerCase()];
      if (!role) {
        results.failed++;
        results.errors.push({
          email,
          error: `Invalid role: ${rawRole}`
        });
        continue;
      }

      validUsers.push({
        email,
        password: password || 'password123',
        name: name || 'User',
        role
      });

      emails.push(email);
    }

    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT email FROM users WHERE email = ANY($1)',
      [emails]
    );

    const existingEmails = new Set(existingResult.rows.map(row => row.email));

    const finalUsers = [];

    for (const user of validUsers) {
      if (existingEmails.has(user.email)) {
        results.failed++;
        results.errors.push({
          email: user.email,
          error: 'Email already exists'
        });
      } else {
        finalUsers.push(user);
      }
    }

    const hashedPasswords = await Promise.all(
      finalUsers.map(user => hashPassword(user.password))
    );

    if (finalUsers.length > 0) {
      await client.query(
        `
        INSERT INTO users (email, password, name, role, status)
        SELECT * FROM UNNEST(
          $1::text[],
          $2::text[],
          $3::text[],
          $4::text[],
          $5::text[]
        )
        `,
        [
          finalUsers.map(user => user.email),
          hashedPasswords,
          finalUsers.map(user => user.name),
          finalUsers.map(user => user.role),
          finalUsers.map(() => 'active')
        ]
      );

      results.success += finalUsers.length;
    }

    await client.query('COMMIT');
    return NextResponse.json(results);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk create error:', error);

    return NextResponse.json(
      { error: 'Internal server error during bulk processing' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
