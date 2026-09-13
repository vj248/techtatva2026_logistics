import { getUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import MappingClient from './client-page';

export const metadata = {
  title: "Mapping",
};

export default async function MappingPage() {
  const user = await getUser();
  // Role check is also handled by middleware, but good to have double check
  if (!user) {
    redirect('/login');
  }
  
  if (user.role !== 'CC' && user.role !== 'OC') {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 md:py-10 px-4">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Mapping</h1>
        <p className="text-muted-foreground mb-8">Select a category to view and map their demands.</p>
        <MappingClient />
      </div>
    </DashboardLayout>
  );
}
