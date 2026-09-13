import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import Countdown from '@/components/Countdown';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Package, LifeBuoy, Scale, ClipboardList, Cable, TrendingUp, Truck, FileText } from 'lucide-react';
import { getUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';

export const metadata = {
  title: "Dashboard",
};

export default async function Dashboard() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.role; // 'CC', 'OC', 'SC', 'Category'

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Countdown />
        </div>
        <p className="mt-4 mb-8 text-muted-foreground">Welcome, {user.name || 'User'}.</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Account Management - Only for CC */}
          {role === 'CC' && (
            <Link href="/account-management">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Account Management
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Manage Users</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create, edit, and manage user accounts and roles.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Inventory - For CC, OC, SC */}
          {['CC', 'OC', 'SC'].includes(role) && (
            <Link href="/inventory">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Live Inventory
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Inventory</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    View and manage inventory items.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {/* Demands - For All users */}
          {/* <Link href="/demands"> */}
          <Link href="/demands">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  My Demands
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Demands</div>
                <p className="text-xs text-muted-foreground mt-1">
                  View and manage item demands.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Negotiations - Only for CC */}
          {role === 'CC' && (
            <Link href="/negotiations">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Negotiations
                  </CardTitle>
                  <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Negotiations</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage category negotiations.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {/* Mapping - Only for CC & OC */}
          {['CC', 'OC'].includes(role) && (
            <Link href="/mapping">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Mapping
                  </CardTitle>
                  <Cable className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Mapping</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Map demands and inventory.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Deliveries - Only for CC & OC */}
          {['CC', 'OC'].includes(role) && (
            <Link href="/deliveries">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Deliveries
                  </CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Deliveries</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage delivery batches.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Invoices - Only for CC & OC */}
          {['CC', 'OC'].includes(role) && (
            <Link href="/invoices">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Invoices
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Invoices</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    View and track invoices.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Procurement Analysis - For CC and SC */}
          {['CC', 'SC'].includes(role) && (
            <Link href="/analysis">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Procurement Analysis
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Analysis</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analyze surpluses and deficits.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {/* Contact - For All Users */}
          <Link href="/contact">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Need Help?
                </CardTitle>
                <LifeBuoy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Contact</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Get in touch with the team.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
