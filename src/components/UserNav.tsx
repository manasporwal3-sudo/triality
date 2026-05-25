
"use client"

import React from 'react';
import Link from 'next/link';
import { 
  User, 
  LogOut, 
  ShoppingBag, 
  LayoutDashboard, 
  MessageSquare, 
  Settings,
  Heart,
  ChevronDown
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/auth-context';
import { cn } from '@/lib/utils';

export default function UserNav() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-auto flex items-center gap-3 pl-1 pr-3 rounded-full hover:bg-primary/5 transition-all group">
          <Avatar className="h-8 w-8 border-2 border-primary/10 shadow-sm transition-transform group-hover:scale-110">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} />
            <AvatarFallback><User /></AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left hidden sm:flex">
            <span className="text-xs font-black leading-none">{user.displayName || 'Account'}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              {user.isAdmin ? 'Admin' : 'Customer'}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 rounded-[1.5rem] p-2 shadow-2xl border-none" align="right" forceMount>
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-black leading-none">{user.displayName}</p>
            <p className="text-[10px] font-bold text-muted-foreground truncate italic">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-muted/50" />
        
        <div className="p-1 space-y-1">
          {user.isAdmin ? (
            <>
              <Link href="/admin/dashboard">
                <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer group focus:bg-primary focus:text-white transition-all font-bold">
                  <LayoutDashboard className="mr-3 h-4 w-4 text-muted-foreground group-focus:text-white" />
                  Admin Hub
                </DropdownMenuItem>
              </Link>
              <Link href="/admin/settings">
                <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer group focus:bg-primary focus:text-white transition-all font-bold">
                  <Settings className="mr-3 h-4 w-4 text-muted-foreground group-focus:text-white" />
                  System Settings
                </DropdownMenuItem>
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard">
                <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer group focus:bg-primary focus:text-white transition-all font-bold">
                  <LayoutDashboard className="mr-3 h-4 w-4 text-muted-foreground group-focus:text-white" />
                  Dashboard
                </DropdownMenuItem>
              </Link>
              <Link href="/orders">
                <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer group focus:bg-primary focus:text-white transition-all font-bold">
                  <ShoppingBag className="mr-3 h-4 w-4 text-muted-foreground group-focus:text-white" />
                  My Orders
                </DropdownMenuItem>
              </Link>
              <Link href="/favorites">
                <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer group focus:bg-primary focus:text-white transition-all font-bold">
                  <Heart className="mr-3 h-4 w-4 text-muted-foreground group-focus:text-white" />
                  Favorites
                </DropdownMenuItem>
              </Link>
            </>
          )}
          
          <Link href="/contact">
            <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer group focus:bg-primary focus:text-white transition-all font-bold">
              <MessageSquare className="mr-3 h-4 w-4 text-muted-foreground group-focus:text-white" />
              Help & Support
            </DropdownMenuItem>
          </Link>
        </div>

        <DropdownMenuSeparator className="bg-muted/50" />
        
        <div className="p-1">
          <DropdownMenuItem 
            onClick={() => logout()}
            className="rounded-xl h-11 px-3 cursor-pointer group focus:bg-destructive focus:text-white transition-all font-bold text-destructive"
          >
            <LogOut className="mr-3 h-4 w-4 group-focus:text-white" />
            Sign Out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
