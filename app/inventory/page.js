import DashboardLayout from '@/components/DashboardLayout';
import InventoryClient from './client-page';
import { getUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

export const metadata = {
  title: "Inventory",
};

export default async function InventoryPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  if (user.role === 'Category') {
    redirect('/');
  }

  return (
    <DashboardLayout>
      <InventoryClient user={user} />
    </DashboardLayout>
  );
}
