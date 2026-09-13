import DashboardLayout from '@/components/DashboardLayout';
import AccountManagementClient from './client-page';

export const metadata = {
  title: "Accounts",
};

export default function AccountManagementPage() {
  return (
    <DashboardLayout>
      <AccountManagementClient />
    </DashboardLayout>
  );
}
