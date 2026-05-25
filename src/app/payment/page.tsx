
"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChefHat, 
  ArrowLeft,
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Calendar,
  KeyRound,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import UserNav from '@/components/UserNav';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import confetti from 'canvas-confetti';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { toast } = useToast();
  const { user, loading: authLoading, logout } = useAuth();
  const { items, totalPrice, clearCart, isLoading: cartLoading } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Delivery details from query params
  const deliveryInfo = {
    name: searchParams.get('name') || '',
    phone: searchParams.get('phone') || '',
    address: searchParams.get('address') || ''
  };

  useEffect(() => {
    if (authLoading || cartLoading) return;

    if (!user) {
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    if (items.length === 0 && !isSuccess) {
      router.push('/menu');
    }
  }, [user, authLoading, cartLoading, items.length, isSuccess, router]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsProcessing(true);
    
    try {
      // Simulate secure payment processing handshake
      await new Promise(resolve => setTimeout(resolve, 2000));

      const orderRef = doc(collection(db, 'orders'));
      const orderData = {
        orderId: orderRef.id,
        userId: user.uid,
        userEmail: user.email,
        items: items.map(item => ({
          dishId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageURL: item.imageURL
        })),
        totalAmount: totalPrice + 54, // Items + Fees
        status: 'placed',
        paymentMethod: 'Online',
        paymentStatus: 'Paid',
        deliveryDetails: deliveryInfo,
        createdAt: serverTimestamp()
      };

      await setDoc(orderRef, orderData);

      // Create Order Notification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        message: `Payment successful! Your order #${orderRef.id.slice(0, 8).toUpperCase()} is now being processed.`,
        type: 'order',
        read: false,
        createdAt: serverTimestamp()
      });

      setIsSuccess(true);
      clearCart();

      // Celebration Confetti
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#E55C0A', '#FF9933', '#FFFFFF']
      });

      toast({
        title: "Payment Successful!",
        description: "Your order has been placed and is being prepared."
      });
    } catch (error: any) {
      console.error("Payment Handshake Error:", error);
      
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'orders',
          operation: 'create',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: "We couldn't process your transaction. No funds were charged."
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-headline font-black text-foreground">Payment Received!</h1>
            <p className="text-muted-foreground font-medium">Your order has been placed successfully. You can track its progress in your dashboard.</p>
          </div>
          <div className="pt-8 flex flex-col gap-4">
            <Link href="/dashboard">
              <Button className="w-full h-14 rounded-2xl bg-primary text-lg font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform text-white">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-bold text-muted-foreground">Securing payment connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] animate-in fade-in duration-500">
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/checkout" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-110">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <span className="font-headline text-2xl font-black tracking-tight hidden md:block text-foreground">Bhartiya Swad</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/checkout">
              <Button variant="ghost" className="font-bold gap-2 rounded-xl transition-all text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Back to Checkout
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-headline font-black">Secure Payment</h1>
            <p className="text-muted-foreground">Complete your transaction to place your order</p>
          </div>

          <Card className="rounded-[2.5rem] border shadow-2xl overflow-hidden bg-white transition-all hover:shadow-primary/5">
            <CardHeader className="bg-primary p-8 text-white text-center">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Amount to Pay</p>
                <h2 className="text-4xl font-headline font-black">₹{totalPrice + 54}</h2>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <form onSubmit={handlePayment} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Card Number</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input 
                        id="cardNumber" 
                        placeholder="0000 0000 0000 0000" 
                        className="pl-10 h-12 rounded-xl transition-all focus:ring-primary/20"
                        required
                        maxLength={19}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Expiry Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <Input 
                          id="expiry" 
                          placeholder="MM/YY" 
                          className="pl-10 h-12 rounded-xl transition-all focus:ring-primary/20"
                          required
                          maxLength={5}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">CVV</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <Input 
                          id="cvv" 
                          type="password"
                          placeholder="***" 
                          className="pl-10 h-12 rounded-xl transition-all focus:ring-primary/20"
                          required
                          maxLength={3}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white text-xl font-black shadow-xl shadow-primary/20 group relative overflow-hidden transition-all active:scale-95"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-white" /> <span>Verifying Bank Gateway...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2 text-white">
                        <Lock className="w-5 h-5" /> Pay Now
                      </span>
                    )}
                  </Button>
                </div>
              </form>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">PCI-DSS Compliant Encryption</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-headline font-bold text-muted-foreground">Securing gateway connection...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
