
"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Database, 
  LogOut,
  ChefHat,
  ChevronRight,
  Bell,
  User as UserIcon,
  ShoppingBag,
  Store,
  Menu,
  Sparkles,
  Settings,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import UserNav from '@/components/UserNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      // Airtight check: If the user is not authenticated or the email is NOT the authorized admin, kick them out.
      if (!user || !user.isAdmin || user.email !== 'pqr@admin.com') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bhartiya_swad_admin');
        }
        router.push('/login?callbackUrl=/admin/dashboard');
      }
    }
  }, [user, loading, router, mounted]);

  const handleLogout = () => {
    logout();
  };

  if (!mounted || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
        <p className="font-bold text-muted-foreground text-sm font-headline">Verifying Admin Privileges...</p>
      </div>
    </div>
  );
  
  if (!user || !user.isAdmin || user.email !== 'pqr@admin.com') return null;

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Alert Center', href: '/admin/notifications', icon: Bell },
    { name: 'Sales Intelligence', href: '/admin/sales', icon: BarChart3 },
    { name: 'Customer Insights', href: '/admin/customers', icon: Users },
    { name: 'Support Tickets', href: '/admin/tickets', icon: MessageSquare },
    { name: 'Partner Network', href: '/admin/restaurants', icon: Store },
    { name: 'Order Management', href: '/admin/orders', icon: ShoppingBag },
    { name: 'AI Recommendations', href: '/admin/recommendations', icon: Sparkles },
    { name: 'Mega Repository', href: '/admin/database', icon: Database },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-background selection:bg-primary selection:text-white">
      <aside className="w-72 bg-white border-r hidden md:flex flex-col sticky top-0 h-screen shadow-sm z-30">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ChefHat className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-lg font-black leading-tight text-foreground">Bhartiya Swad</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-accent">Admin Hub</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-12 rounded-xl px-4 transition-all group",
                    isActive 
                      ? "bg-primary text-white font-bold shadow-md hover:bg-primary hover:text-white" 
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 mr-3 transition-colors", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                  <span className="text-sm">{item.name}</span>
                  {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t mt-auto">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:bg-destructive/5 rounded-xl h-12 px-4 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="text-sm font-bold">Sign Out</span>
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b sticky top-0 z-20 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6 flex-1">
            <div className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <AdminNotificationBell />
            
            <div className="flex items-center gap-3 pl-6 border-l ml-4">
              <UserNav />
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 md:p-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
