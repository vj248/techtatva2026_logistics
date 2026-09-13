import DashboardLayout from '@/components/DashboardLayout';
import DemandsClient from './client-page';
import { getUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';

export const metadata = {
  title: "Demands",
};

export default async function DemandsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  let isNegotiationLocked = false;

  if (user.role === 'Category') {
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT status FROM negotiations WHERE id = $1',
        [user.id]
      );
      if (res.rows.length > 0 && res.rows[0].status === 'done') {
        isNegotiationLocked = true;
      }
    } catch (error) {
      console.error('Error checking negotiation status:', error);
    } finally {
      client.release();
    }
  }
  else{
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT id FROM negotiations WHERE status = $1',
        ['done']
      );
      const users = await client.query(
        'SELECT id FROM users WHERE role = $1',
        ['Category']
      );
      if (res.rows.length === users.rows.length) {
        isNegotiationLocked = true;
      }
    } catch (error) {
      console.error('Error checking negotiation status:', error);
    } finally {
      client.release();
    }
  }

  return (
    <DashboardLayout>
      <DemandsClient user={user} isNegotiationLocked={isNegotiationLocked} />
    </DashboardLayout>
  );
}
