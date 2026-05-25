
"use client"
import { normalizeOrder } from '@/lib/normalizeOrder';
import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Clock,
  Utensils,
  Trophy,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, computeOrderStatus, STATUS_LABELS } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/lib/contexts/auth-context';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';

export default function AdminDashboardPage() {
  const db = useFirestore();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const isAuthorized = user?.isAdmin && user.email === 'pqr@admin.com';

  const ordersQuery = useMemoFirebase(() => {
    if (!isAuthorized || !currentTime) return null;
    const thirtyDaysAgo = subDays(startOfDay(currentTime), 30);
    return query(
      collection(db, 'orders'), 
      where('createdAt', '>=', thirtyDaysAgo),
      orderBy('createdAt', 'desc'),
      limit(1000)
    );
  }, [db, isAuthorized, currentTime ? format(startOfDay(currentTime), 'yyyy-MM-dd') : null]);
  const { data: orders } = useCollection(ordersQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!isAuthorized) return null;
    return collection(db, 'users');
  }, [db, isAuthorized]);
  const { data: users } = useCollection(usersQuery);

  const validOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .map(normalizeOrder)
      .filter(o => o && o.userId && o.totalAmount > 0);
  }, [orders]);

  const insights = useMemo(() => {
    if (validOrders.length === 0) return { peakHour: 'N/A', topDishes: [], topUsers: [] };

    // 1. Peak Hour Calculation
    const hourCounts: Record<number, number> = {};
    validOrders.forEach(o => {
      if (!o.createdAt) return;
      const date = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakHourFormatted = peakHour ? format(new Date().setHours(Number(peakHour)), 'p') : 'N/A';

    // 2. Top Selling Dishes
    const dishPerformance: Record<string, { name: string; qty: number; revenue: number }> = {};
    validOrders.forEach(order => {
      if (order.isCancelled) return; // Don't count revenue for cancelled orders
      order.items?.forEach((item: any) => {
        const id = item.dishId || item.name;
        if (!dishPerformance[id]) {
          dishPerformance[id] = { name: item.name, qty: 0, revenue: 0 };
        }
        dishPerformance[id].qty += Number(item.quantity) || 0;
        dishPerformance[id].revenue += (Number(item.quantity) || 0) * (Number(item.price) || 0);
      });
    });
    const topDishes = Object.values(dishPerformance)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 3. Most Active Users
    const userOrderCounts: Record<string, number> = {};
    validOrders.forEach(o => {
      userOrderCounts[o.userId] = (userOrderCounts[o.userId] || 0) + 1;
    });
    const topUsers = Object.entries(userOrderCounts)
      .map(([uid, count]) => {
        const u = users?.find(user => user.uid === uid || user.id === uid);
        return {
          name: u?.displayName || u?.name || 'Guest User',
          email: u?.email || 'N/A',
          orders: count
        };
      })
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    return { peakHour: peakHourFormatted, topDishes, topUsers };
  }, [validOrders, users]);

  const stats = useMemo(() => {
    const totalOrdersCount = validOrders.length;
    const totalRevenue = validOrders.reduce((acc, o) => acc + (o.isCancelled ? 0 : (o.totalAmount || 0)), 0);
    
    // TRACK CANCELLED VS ACTIVE ORDERS
    const cancelledOrdersCount = validOrders.filter(o => o.isCancelled).length;
    const activeOrdersCount = totalOrdersCount - cancelledOrdersCount;
    
    return [
      { label: 'Revenue (30d)', value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', trend: '+12%', isUp: true },
      { label: 'Active Orders', value: activeOrdersCount.toLocaleString(), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-600/10', trend: `${totalOrdersCount} Total`, isUp: true },
      { label: 'Cancellations', value: cancelledOrdersCount.toLocaleString(), icon: XCircle, color: 'text-red-600', bg: 'bg-red-600/10', trend: 'Audit', isUp: false },
      { label: 'Peak Traffic', value: insights.peakHour, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-600/10', trend: 'Live', isUp: true },
    ];
  }, [validOrders, insights.peakHour]);

  const dailyChartData = useMemo(() => {
    if (!currentTime) return [];
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(currentTime, 6 - i);
      const dayLabel = format(date, 'MMM dd');
      const revenue = validOrders
        .filter(o => {
          if (!o.createdAt || o.isCancelled) return false;
          const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
          return isSameDay(orderDate, date);
        })
        .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
      return { name: dayLabel, revenue };
    });
  }, [validOrders, currentTime]);

  if (!isAuthorized) {
    return <div className="p-12 text-center font-bold text-muted-foreground">Unauthorized Access</div>;
  }

  if (!currentTime) return null;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-headline font-black mb-2 text-foreground tracking-tight">Overview</h1>
          <p className="text-muted-foreground font-medium">Real-time performance metrics derived from order data.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm flex items-center gap-3 border font-bold text-sm">
          <Calendar className="w-4 h-4 text-primary" />
          <span>{format(currentTime, 'MMMM dd, yyyy')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm rounded-[2rem] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white group p-2">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300 shadow-sm", stat.bg, stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest",
                  stat.isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {stat.trend}
                </div>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
              <h3 className="text-3xl font-black mt-2 tracking-tight text-foreground">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 border shadow-sm rounded-[2.5rem] p-8 md:p-12 bg-white h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-headline font-black text-foreground">Revenue Trends</h3>
              <p className="text-sm text-muted-foreground mt-1">Real-time daily revenue calculation (excluding cancellations).</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-none rounded-full px-4 py-1.5 font-bold uppercase tracking-widest text-[10px]">Live Data</Badge>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.5)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={5} dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 10, shadow: '0 0 20px hsl(var(--primary)/0.5)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Users Card */}
        <Card className="border shadow-sm rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
          <CardHeader className="p-8 border-b bg-muted/10">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <CardTitle className="text-xl font-headline font-black">Top Customers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <Table>
              <TableBody>
                {insights.topUsers.map((cust, i) => (
                  <TableRow key={i} className="hover:bg-muted/5 transition-colors border-b last:border-none">
                    <TableCell className="pl-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{cust.name}</span>
                        <span className="text-[10px] text-muted-foreground">{cust.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Badge className="bg-primary/10 text-primary border-none font-black">{cust.orders} Orders</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {insights.topUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-20 text-muted-foreground italic text-sm">No activity recorded yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="p-10 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-headline font-black text-foreground">Menu Performance</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Top selling items by quantity sold.</p>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="font-black px-10 h-16 uppercase tracking-widest text-[10px]">Dish Name</TableHead>
                <TableHead className="font-black h-16 uppercase tracking-widest text-[10px] text-center">Units Sold</TableHead>
                <TableHead className="font-black h-16 uppercase tracking-widest text-[10px] text-right pr-10">Est. Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.topDishes.map((dish, i) => (
                <TableRow key={i} className="hover:bg-muted/5 transition-colors border-b last:border-none">
                  <TableCell className="px-10 py-6">
                    <span className="font-black text-foreground">{dish.name}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-muted-foreground">{dish.qty.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <span className="font-black text-primary text-lg">₹{dish.revenue.toLocaleString()}</span>
                  </TableCell>
                </TableRow>
              ))}
              {insights.topDishes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-20 text-muted-foreground font-bold italic opacity-40">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    Waiting for sales data...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
