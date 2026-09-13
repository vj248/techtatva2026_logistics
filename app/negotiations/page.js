import DashboardLayout from '@/components/DashboardLayout';
import NegotiationsClient from './client-page';
import { getUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

export const metadata = {
  title: "Negotiations",
};

export default async function NegotiationsPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'CC') {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <NegotiationsClient user={user} />
    </DashboardLayout>
  );
}
