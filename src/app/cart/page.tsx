
"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingCart, 
  ChefHat, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Info,
  LogOut,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import UserNav from '@/components/UserNav';
import { cn } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { items, updateQuantity, removeFromCart, totalPrice, totalQuantity, isLoading: cartLoading } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login?callbackUrl=/cart');
    }
  }, [user, authLoading, mounted, router]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary" />
          <p className="font-headline font-bold text-muted-foreground">Synchronizing your basket...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const DELIVERY_FEE = items.length > 0 ? 49 : 0;
  const PLATFORM_FEE = items.length > 0 ? 5 : 0;
  const grandTotal = totalPrice + DELIVERY_FEE + PLATFORM_FEE;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-20">
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <span className="font-headline text-2xl font-black tracking-tight hidden md:block">Bhartiya Swad</span>
          </Link>
          <div className="flex items-center gap-4">
             <Link href="/menu">
              <Button variant="ghost" className="font-bold gap-2 rounded-xl text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Back to Menu
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-headline font-black text-foreground flex items-center gap-4">
                <ShoppingCart className="w-10 h-10 text-primary" />
                Your Basket
                <Badge className="bg-primary/10 text-primary border-none rounded-full px-4 ml-2 text-white">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                </Badge>
              </h1>
            </div>

            {items.length === 0 ? (
              <Card className="border-dashed border-2 bg-muted/5 rounded-[3rem] p-20 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                  <h2 className="text-2xl font-headline font-black">Your basket is empty</h2>
                  <p className="text-muted-foreground font-medium">Looks like you haven't added anything to your cart yet. Explore our delicious menu to get started!</p>
                  <Link href="/menu">
                    <Button className="h-14 px-10 rounded-2xl bg-primary text-lg font-black shadow-xl shadow-primary/20 text-white">
                      Browse Menu
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <Card key={item.id} className="border shadow-sm rounded-[2.5rem] overflow-hidden bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-full sm:w-32 h-32 rounded-3xl overflow-hidden bg-muted relative shrink-0">
                          <img 
                            src={item.imageURL || `https://picsum.photos/seed/${item.id}/400/300`} 
                            alt={item.name} 
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h3 className="text-xl font-headline font-black text-foreground">{item.name}</h3>
                          <p className="text-primary font-black text-lg mt-1">₹{item.price}</p>
                          <div className="flex items-center justify-center sm:justify-start gap-4 mt-4">
                            <div className="flex items-center gap-4 bg-muted/30 p-1 rounded-2xl border">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl hover:bg-white"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="font-black w-4 text-center">{item.quantity}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl hover:bg-white"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-2xl"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Subtotal</p>
                          <p className="text-2xl font-headline font-black text-foreground">₹{item.price * item.quantity}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="w-full lg:w-[400px]">
              <Card className="sticky top-32 border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                <div className="bg-primary p-8 text-white">
                  <h3 className="text-2xl font-headline font-black">Order Summary</h3>
                  <p className="text-white/70 text-sm font-bold mt-1">Complete your order details</p>
                </div>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-bold">Item Total</span>
                      <span className="font-black">₹{totalPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-bold">Delivery Fee</span>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="font-black text-green-600">₹{DELIVERY_FEE}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-bold">Platform Fee</span>
                      <span className="font-black">₹{PLATFORM_FEE}</span>
                    </div>
                  </div>
                  
                  <Separator className="bg-muted" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Grand Total</span>
                      <span className="text-3xl font-headline font-black text-primary">₹{grandTotal}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-none rounded-full px-3 py-1 font-bold text-[10px]">
                      SAVED ₹20
                    </Badge>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="bg-accent/5 rounded-2xl p-4 border border-accent/10 flex items-start gap-3">
                      <Truck className="w-5 h-5 text-accent mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-accent">Free Delivery Applied</p>
                        <p className="text-[10px] text-muted-foreground font-medium">On your first order of the day!</p>
                      </div>
                    </div>

                    <Link href="/checkout" className="block w-full">
                      <Button className="w-full h-16 rounded-[2rem] bg-primary text-xl font-black shadow-xl shadow-primary/20 group overflow-hidden relative text-white">
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          Checkout <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </Button>
                    </Link>

                    <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Secure Checkout Guaranteed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 bg-white border-t z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Payable</span>
              <span className="text-2xl font-headline font-black text-primary">₹{grandTotal}</span>
            </div>
            <Link href="/checkout" className="flex-1">
              <Button className="w-full h-14 rounded-2xl bg-primary font-black text-lg text-white">
                Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
