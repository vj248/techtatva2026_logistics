import { getUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import DeliveryClient from './client-page';

export const metadata = {
  title: "Deliveries",
};

export default async function DeliveryPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // Only CC and OC can access delivery page
  if (!['CC', 'OC'].includes(user.role)) {
    redirect('/dashboard');
  }

  return <DeliveryClient user={user} />;
}
