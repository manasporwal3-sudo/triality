
"use client"

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, ShoppingBag, X, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/lib/contexts/auth-context';
import { collection, query, where, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
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

export default function NotificationBell() {
  const { user } = useAuth();
  const db = useFirestore();
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Refs for tracking new notifications
  const lastProcessedId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  // Firestore query for user notifications
  const notificationsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(50)
    );
  }, [db, user?.uid]);

  const { data: rawNotifications } = useCollection(notificationsQuery);

  // Load sound preference
  useEffect(() => {
    const stored = localStorage.getItem('bhartiya_swad_notifications_sound');
    if (stored !== null) {
      setSoundEnabled(stored === 'true');
    }
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('bhartiya_swad_notifications_sound', String(newState));
    toast.success(newState ? "Notification sounds enabled" : "Notification sounds muted", {
      icon: newState ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />,
      duration: 1500
    });
  };

  // Client-side sorting
  const notifications = useMemo(() => {
    if (!rawNotifications) return [];
    return [...rawNotifications].sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [rawNotifications]);

  // Handle Sound and Vibration feedback for NEW notifications
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
        audio.play().catch(err => {
          if (err.name !== 'NotAllowedError') {
            console.warn("Notification audio failed:", err);
          }
        });
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
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications || unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      }
    });
    try {
      await batch.commit();
      toast.success("All notifications caught up!");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  if (!user) return null;

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
      <SheetContent 
        className="w-full sm:max-w-[400px] p-0 border-l shadow-2xl flex flex-col rounded-l-[2.5rem]"
      >
        {/* Header Section */}
        <div className="bg-primary p-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <SheetHeader className="text-left space-y-0">
                <SheetTitle className="font-headline font-black text-2xl tracking-tight text-white">Notifications</SheetTitle>
                <SheetDescription className="text-[10px] font-bold opacity-70 uppercase tracking-widest text-white/80">
                  Stay updated with your cravings
                </SheetDescription>
              </SheetHeader>
            </div>
            
            <div className="flex items-center gap-2 pr-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSound}
                className="text-white hover:bg-white/20 rounded-full h-10 w-10 shrink-0"
                title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
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
        
        {/* Notifications List */}
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
                      : "bg-white border-muted hover:bg-muted/30",
                    n.type === 'ai' && !n.read && "border-accent/30 bg-accent/[0.02]"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                    n.type === 'order' ? "bg-green-100 text-green-600" : 
                    n.type === 'ai' ? "bg-orange-100 text-orange-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {n.type === 'order' ? <ShoppingBag className="w-6 h-6" /> : 
                     n.type === 'ai' ? <Sparkles className="w-6 h-6" /> :
                     <Info className="w-6 h-6" />}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm leading-relaxed", 
                        !n.read ? "font-black text-foreground" : "font-medium text-muted-foreground"
                      )}>
                        {n.message}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-2">
                        <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                        {n.createdAt ? format(n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt), 'MMM dd, p') : 'Just now'}
                      </p>
                      {n.type === 'ai' && (
                        <Badge className="bg-orange-100 text-orange-700 border-none text-[8px] font-black h-4 px-1.5 uppercase">✨ AI Suggestion</Badge>
                      )}
                    </div>
                  </div>

                  {!n.read && (
                    <div className="absolute top-5 right-5">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full animate-pulse shadow-sm",
                        n.type === 'ai' ? "bg-accent shadow-accent/50" : "bg-primary shadow-primary/50"
                      )} />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-32 text-center flex flex-col items-center justify-center opacity-30 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Bell className="w-10 h-10" />
                </div>
                <p className="font-black text-xl italic">No notifications yet 🔔</p>
                <p className="text-sm font-medium max-w-[200px] mt-2">We'll let you know when something delicious happens!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-muted/10 border-t border-dashed text-center">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-50">
            End of updates
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
