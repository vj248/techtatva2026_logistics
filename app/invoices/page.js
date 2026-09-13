import { cookies } from 'next/headers';
import ClientPage from './client-page';
import { verifyJWT } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    redirect('/login');
  }

  const user = await verifyJWT(token);
  if (!user || !['CC', 'OC'].includes(user.role)) {
    redirect('/dashboard');
  }

  return <ClientPage user={user} />;
}
