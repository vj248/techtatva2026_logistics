'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Navigation Loading State
  const [isNavigating, setIsNavigating] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  // Confirmation Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const dashboardLink = user ? '/dashboard' : '/login';
  
  const navLinks = [
    { href: dashboardLink, label: 'Dashboard' },
    ...(user?.role === 'CC' ? [{ href: '/account-management', label: 'Accounts' }] : []),
    ...(user?.role !== 'Category' ? [{ href: '/inventory', label: 'Inventory' }] : []),
    { href: '/demands', label: 'Demands' },
    ...(user?.role === 'CC' ? [{ href: '/negotiations', label: 'Negotiations' }] : []),
    ...(['CC', 'OC'].includes(user?.role) ? [{ href: '/mapping', label: 'Mapping' }] : []),
    ...(['CC', 'OC'].includes(user?.role) ? [{ href: '/deliveries', label: 'Deliveries' }] : []),
    ...(['CC', 'OC'].includes(user?.role) ? [{ href: '/invoices', label: 'Invoices' }] : []),
    ...(['CC', 'SC'].includes(user?.role) ? [{ href: '/analysis', label: 'Analysis' }] : []),
    { href: '/contact', label: 'Contact' },
  ];

  useEffect(() => {
    setIsNavigating(false);
    setOptimisticPath(pathname);
  }, [pathname]);

  if (pathname === '/login') return null;

  const handleNavClick = (href) => {
    if (href !== pathname) {
      setIsNavigating(true);
      setOptimisticPath(href);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const initiateUpdateProfile = (e) => {
    e.preventDefault();
    // If email changed and user is CC, show confirmation
    if (user?.role === 'CC' && newEmail !== user.email) {
      setIsConfirmOpen(true);
    } else {
      // Just update name or no changes
      handleUpdateProfile();
    }
  };

  const handleUpdateProfile = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName,
          email: user?.role === 'CC' ? newEmail : undefined 
        }),
      });
      
      if (res.ok) {
        setIsProfileSheetOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile failed', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="border-b bg-background relative">
      {isNavigating && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-primary/10 overflow-hidden">
          <div className="h-full bg-primary w-full animate-progress" />
        </div>
      )}
      <div className="flex h-16 items-center px-4 container mx-auto">
        {/* Mobile Menu Trigger */}
        <div className="lg:hidden mr-2">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Link href={dashboardLink} onClick={() => handleNavClick(dashboardLink)}>
                    Logistics TechTatva
                  </Link>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Mobile navigation menu
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col space-y-4 mt-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      if (isNavigating && optimisticPath === link.href) {
                        e.preventDefault();
                      } else {
                        handleNavClick(link.href);
                      }
                    }}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      optimisticPath === link.href ? "text-primary font-bold" : "text-muted-foreground",
                      isNavigating && optimisticPath === link.href && "opacity-70 cursor-wait"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Logo */}
        <div className="lg:hidden font-bold text-lg mr-auto">
           <Link href={dashboardLink} onClick={() => handleNavClick(dashboardLink)}>Logistics TechTatva</Link>
        </div>

        {/* Desktop Logo */}
        <div className="mr-4 hidden lg:flex">
          <Link href={dashboardLink} onClick={() => handleNavClick(dashboardLink)} className="mr-6 flex items-center space-x-2 font-bold text-xl">
            Logistics TechTatva
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  if (isNavigating && optimisticPath === link.href) {
                    e.preventDefault();
                  } else {
                    handleNavClick(link.href);
                  }
                }}
                className={cn(
                  "transition-colors hover:text-foreground/80 flex items-center",
                  optimisticPath === link.href ? "text-foreground font-bold" : "text-foreground/60",
                  isNavigating && optimisticPath === link.href && "opacity-70 cursor-wait"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Right Side: Profile */}
        <div className="ml-auto flex items-center space-x-4">
          <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground uppercase mt-1">
                      {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <SheetTrigger asChild>
                  <DropdownMenuItem>
                    Edit Profile
                  </DropdownMenuItem>
                </SheetTrigger>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Edit Profile</SheetTitle>
                <SheetDescription>
                  Update your profile details below. Click save when you&apos;re done.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={initiateUpdateProfile} className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Display Name
                  </Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your public display name.
                  </p>
                </div>

                {user?.role === 'CC' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be used as your login credentials.
                    </p>
                  </div>
                )}
                
                <SheetFooter className="flex-col sm:flex-row gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsProfileSheetOpen(false)}>
                    Cancel
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Email Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your email address to <strong>{newEmail}</strong>? 
              This will update your login credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateProfile} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
