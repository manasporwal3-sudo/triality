
"use client"

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckCircle2, 
  MessageSquare, 
  ShoppingBag, 
  Info, 
  Trash2, 
  Filter,
  Check,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/lib/contexts/auth-context';
import { collection, query, limit, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminNotificationsPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const isAuthorized = user?.isAdmin && user.email === 'pqr@admin.com';

  const notificationsQuery = useMemoFirebase(() => {
    if (!isAuthorized) return null;
    return query(
      collection(db, 'notifications_admin'),
      limit(100)
    );
  }, [db, isAuthorized]);

  const { data: rawNotifications, isLoading } = useCollection(notificationsQuery);

  const notifications = useMemo(() => {
    if (!rawNotifications) return [];
    let list = [...rawNotifications].sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    if (filter === 'unread') {
      list = list.filter(n => !n.read);
    }

    return list;
  }, [rawNotifications, filter]);

  const unreadCount = useMemo(() => {
    return rawNotifications?.filter(n => !n.read).length || 0;
  }, [rawNotifications]);

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      try {
        await updateDoc(doc(db, 'notifications_admin', n.id), { read: true });
      } catch (e) {
        console.error("Update error", e);
      }
    }

    // Intelligent redirection based on type
    if (n.type === 'support') {
      router.push('/admin/tickets');
    } else if (n.type === 'order') {
      router.push('/admin/orders');
    }
  };

  const markAllAsRead = async () => {
    if (!rawNotifications || unreadCount === 0) return;
    const batch = writeBatch(db);
    rawNotifications.forEach(n => {
      if (!n.read) {
        batch.update(doc(db, 'notifications_admin', n.id), { read: true });
      }
    });
    try {
      await batch.commit();
      toast.success("All alerts caught up!");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications_admin', id));
      toast.success("Alert dismissed");
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-headline font-black mb-2 flex items-center gap-3 text-foreground">
            <Bell className="w-10 h-10 text-primary" />
            Alert Center
          </h1>
          <p className="text-muted-foreground font-medium">Manage and audit system-wide notifications.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {unreadCount > 0 && (
            <Button 
              onClick={markAllAsRead}
              variant="outline"
              className="rounded-xl font-bold border-primary text-primary hover:bg-primary hover:text-white transition-all h-11"
            >
              <Check className="w-4 h-4 mr-2" /> Mark All as Read
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <Tabs defaultValue="all" className="w-full max-w-md" onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="bg-muted/50 p-1 rounded-2xl h-12 grid grid-cols-2">
            <TabsTrigger value="all" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              All Notifications ({rawNotifications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-bold">Syncing alerts...</p>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <Card 
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "group relative p-6 rounded-[2rem] cursor-pointer transition-all border border-border/40 hover:shadow-xl hover:-translate-y-1 overflow-hidden",
                  !n.read ? "bg-white border-primary/20 shadow-md ring-1 ring-primary/5" : "bg-muted/10 opacity-80"
                )}
              >
                {!n.read && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary" />
                )}
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-110",
                    n.type === 'support' ? "bg-orange-100 text-orange-600" : 
                    n.type === 'order' ? "bg-green-100 text-green-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {n.type === 'support' ? <MessageSquare className="w-7 h-7" /> : 
                     n.type === 'order' ? <ShoppingBag className="w-7 h-7" /> :
                     <Info className="w-7 h-7" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className={cn(
                        "text-lg leading-tight", 
                        !n.read ? "font-black text-foreground" : "font-bold text-muted-foreground"
                      )}>
                        {n.message}
                      </p>
                      {!n.read && (
                        <Badge className="bg-primary text-white border-none rounded-full px-2 text-[8px] font-black h-4 uppercase animate-pulse">New</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xs text-muted-foreground font-bold flex items-center gap-2">
                        {n.createdAt ? format(n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt), 'MMMM dd, yyyy • p') : 'Just now'}
                      </p>
                      {n.type && (
                        <Badge variant="outline" className="rounded-full text-[9px] uppercase font-black px-2 border-muted-foreground/20 text-muted-foreground">
                          {n.type} Alert
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      onClick={(e) => deleteNotification(e, n.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="py-40 text-center flex flex-col items-center justify-center opacity-30 animate-in zoom-in duration-500 bg-white rounded-[3rem] border-2 border-dashed">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Bell className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-headline font-black text-foreground">No alerts found</h3>
              <p className="text-sm font-medium mt-2">The system is currently quiet. Check back later!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
