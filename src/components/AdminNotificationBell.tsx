
"use client"

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, ShoppingBag, X, Volume2, VolumeX, MessageSquare, ChevronRight } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/lib/contexts/auth-context';
import { collection, query, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminNotificationBell() {
  const { user } = useAuth();
  const db = useFirestore();
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const lastProcessedId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  const isAuthorized = user?.isAdmin && user.email === 'pqr@admin.com';

  const notificationsQuery = useMemoFirebase(() => {
    if (!isAuthorized) return null;
    return query(
      collection(db, 'notifications_admin'),
      limit(50)
    );
  }, [db, isAuthorized]);

  const { data: rawNotifications } = useCollection(notificationsQuery);

  useEffect(() => {
    const stored = localStorage.getItem('bhartiya_swad_admin_notifications_sound');
    if (stored !== null) {
      setSoundEnabled(stored === 'true');
    }
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('bhartiya_swad_admin_notifications_sound', String(newState));
    toast.success(newState ? "Notification sounds enabled" : "Notification sounds muted");
  };

  const notifications = useMemo(() => {
    if (!rawNotifications) return [];
    return [...rawNotifications].sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [rawNotifications]);

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    const latest = notifications[0];
    if (isFirstLoad.current) {
      lastProcessedId.current = latest.id;
      isFirstLoad.current = false;
      return;
    }
    if (latest.id !== lastProcessedId.current && !latest.read) {
      lastProcessedId.current = latest.id;
      if (soundEnabled) {
        const audio = new Audio('/sounds/ding.mp3');
        audio.play().catch(() => {});
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  }, [notifications, soundEnabled]);

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.read).length || 0;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications_admin', id), { read: true });
    } catch (error) {
      console.error("Failed to update notification", error);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications || unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        batch.update(doc(db, 'notifications_admin', n.id), { read: true });
      }
    });
    try {
      await batch.commit();
      toast.success("System alerts cleared.");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  if (!isAuthorized) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-muted-foreground hover:text-primary transition-all active:scale-90"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-5 h-5 bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in shadow-sm">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[400px] p-0 border-l shadow-2xl flex flex-col rounded-l-[2.5rem]">
        <div className="bg-primary p-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <SheetHeader className="text-left space-y-0">
                <SheetTitle className="font-headline font-black text-2xl tracking-tight text-white">System Alerts</SheetTitle>
                <SheetDescription className="text-[10px] font-bold opacity-70 uppercase tracking-widest text-white/80">
                  Real-time management dashboard
                </SheetDescription>
              </SheetHeader>
            </div>
            
            <div className="flex items-center gap-2 pr-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSound}
                className="text-white hover:bg-white/20 rounded-full h-10 w-10 shrink-0"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <div className="mt-6 flex justify-start">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-white hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-tighter"
              >
                Mark all as read
              </Button>
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {notifications && notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={cn(
                    "flex items-start gap-4 p-5 rounded-[1.5rem] cursor-pointer transition-all border group relative",
                    !n.read 
                      ? "bg-primary/[0.03] border-primary/10 shadow-sm hover:bg-primary/[0.06]" 
                      : "bg-white border-muted hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                    n.type === 'support' ? "bg-orange-100 text-orange-600" : 
                    n.type === 'order' ? "bg-green-100 text-green-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {n.type === 'support' ? <MessageSquare className="w-6 h-6" /> : 
                     n.type === 'order' ? <ShoppingBag className="w-6 h-6" /> :
                     <Info className="w-6 h-6" />}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <p className={cn(
                      "text-sm leading-relaxed", 
                      !n.read ? "font-black text-foreground" : "font-medium text-muted-foreground"
                    )}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-2">
                      {n.createdAt ? format(n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt), 'MMM dd, p') : 'Just now'}
                    </p>
                  </div>

                  {!n.read && (
                    <div className="absolute top-5 right-5">
                      <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm bg-primary shadow-primary/50" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-32 text-center flex flex-col items-center justify-center opacity-30 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Bell className="w-10 h-10" />
                </div>
                <p className="font-black text-xl italic">No system alerts 🔔</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-muted/10 border-t border-dashed">
          <Link href="/admin/notifications" onClick={() => setOpen(false)}>
            <Button className="w-full h-12 rounded-2xl font-black bg-primary group hover:scale-[1.02] transition-all shadow-xl shadow-primary/10">
              View All Alerts Center <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
