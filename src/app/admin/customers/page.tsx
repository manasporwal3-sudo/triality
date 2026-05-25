
"use client"

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/lib/contexts/auth-context';
import { collection } from 'firebase/firestore';
import { normalizeOrder } from '@/lib/normalizeOrder';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function AdminCustomersPage() {
  const db = useFirestore();
  const { user } = useAuth();

  const isAuthorized = user?.isAdmin && user.email === 'pqr@admin.com';

  const usersQuery = useMemoFirebase(() => {
    if (!isAuthorized) return null;
    return collection(db, 'users');
  }, [db, isAuthorized]);
  const { data: users } = useCollection(usersQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!isAuthorized) return null;
    return collection(db, 'orders');
  }, [db, isAuthorized]);
  const { data: orders } = useCollection(ordersQuery);

  // Normalize and filter orders for accurate spending insights derived from transactions
  const validOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .map(normalizeOrder)
      .filter(o => o && o.userId && o.totalAmount > 0);
  }, [orders]);

  const customerData = useMemo(() => {
    if (!users || !validOrders) return [];

    return users.map(u => {
      // Filter orders strictly belonging to this user
      const userOrders = validOrders.filter(o => o.userId === u.uid || o.userId === u.id);
      
      // Calculate real-time spending from the orders collection
      const totalSpent = userOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
      
      return {
        name: u.displayName || u.name || 'Anonymous',
        orders: userOrders.length,
        spent: totalSpent,
        email: u.email,
        id: u.uid || u.id
      };
    })
    .filter(cust => cust.orders > 0)
    .sort((a, b) => b.spent - a.spent);
  }, [users, validOrders]);

  const chartData = customerData.slice(0, 10);

  if (!isAuthorized) {
    return <div className="p-12 text-center font-bold text-muted-foreground">Unauthorized Access</div>;
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-headline font-black mb-2">Customer Intelligence</h1>
        <p className="text-muted-foreground">Real-time loyalty and spending analysis derived from transaction history.</p>
      </div>

      <Card className="border shadow-sm rounded-3xl p-8 bg-white">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-xl font-headline font-bold">Spending Leaders</CardTitle>
        </CardHeader>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.5)', radius: 8 }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="border shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="p-8 border-b">
          <CardTitle className="text-xl font-headline font-bold">Customer Loyalty Hub</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold p-6">Customer</TableHead>
              <TableHead className="font-bold">Contact</TableHead>
              <TableHead className="font-bold text-center">Orders</TableHead>
              <TableHead className="font-bold text-right">Total Spent</TableHead>
              <TableHead className="font-bold text-center pr-6">Segment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerData.map((cust) => (
              <TableRow key={cust.id} className="hover:bg-muted/5 transition-colors">
                <TableCell className="p-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-muted">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${cust.id}`} />
                      <AvatarFallback>{cust.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-bold">{cust.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{cust.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{cust.email}</TableCell>
                <TableCell className="font-bold text-center">{cust.orders}</TableCell>
                <TableCell className="font-bold text-primary text-right">₹{cust.spent.toLocaleString()}</TableCell>
                <TableCell className="text-center pr-6">
                  {cust.orders >= 20 ? (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 rounded-full px-3 py-1 font-bold">Gold</Badge>
                  ) : cust.orders >= 10 ? (
                    <Badge className="bg-slate-400 hover:bg-slate-500 rounded-full px-3 py-1 font-bold">Silver</Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full">Regular</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {customerData.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-bold italic opacity-40">
                  Waiting for verified customer data...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
