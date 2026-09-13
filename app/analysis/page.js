import { getUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import AnalysisClient from './client-page';

export const metadata = {
  title: "Analysis",
};

export default async function AnalysisPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Allow CC, OC, SC
  if (!['CC', 'OC', 'SC'].includes(user.role)) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 md:py-10 px-4">
        <AnalysisClient />
      </div>
    </DashboardLayout>
  );
}
