import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  return await verifyJWT(token);
}

export default async function DashboardLayout({ children }) {
  // We still fetch user here if needed for children, or we can remove it if not used.
  // But the layout structure is now handled by RootLayout.
  // This component now just provides the container.
  
  return (
    <main className="container mx-auto py-6 px-4">
      {children}
    </main>
  );
}
