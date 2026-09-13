import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  return await verifyJWT(token);
}
