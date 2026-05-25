
"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChefHat, 
  ArrowLeft,
  CheckCircle2,
  Package,
  CreditCard,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Loader2,
  Phone,
  User as UserIcon,
  ShoppingCart,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import UserNav from '@/components/UserNav';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import confetti from 'canvas-confetti';

export default function CheckoutPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, loading: authLoading, logout } = useAuth();
  const { items, totalPrice, clearCart, totalQuantity, isLoading: cartLoading } = useCart();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Online'>('COD');
  
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (authLoading || cartLoading) return;

    if (!user) {
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    if (items.length === 0 && !isOrdered) {
      router.push('/menu');
      return;
    }
    
    if (user && !deliveryDetails.name) {
      setDeliveryDetails(prev => ({
        ...prev,
        name: user.displayName || '',
      }));
    }
  }, [user, authLoading, cartLoading, items.length, isOrdered, router, deliveryDetails.name]);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!deliveryDetails.name || !deliveryDetails.phone || !deliveryDetails.address) {
      toast.error("Please fill in all delivery details.");
      return;
    }

    if (paymentMethod === 'Online') {
      const params = new URLSearchParams({
        name: deliveryDetails.name,
        phone: deliveryDetails.phone,
        address: deliveryDetails.address
      });
      router.push(`/payment?${params.toString()}`);
      return;
    }

    setIsProcessing(true);
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
      paymentMethod: paymentMethod,
      paymentStatus: 'Cash on Delivery',
      deliveryDetails: deliveryDetails,
      createdAt: serverTimestamp(),
      isCancelled: false,
      refundInitiated: false,
      refundCompleted: false
    };

    setDoc(orderRef, orderData)
      .then(() => {
        // Create Order Notification
        const notifData = {
          userId: user.uid,
          message: `Your order #${orderRef.id.slice(0, 8).toUpperCase()} has been placed successfully!`,
          type: 'order',
          read: false,
          createdAt: serverTimestamp()
        };
        addDoc(collection(db, 'notifications'), notifData).catch(async (notifError) => {
          const permissionError = new FirestorePermissionError({
            path: 'notifications',
            operation: 'create',
            requestResourceData: notifData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

        setIsOrdered(true);
        clearCart();
        
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E55C0A', '#FF9933', '#FFFFFF']
        });

        toast.success("Order Placed Successfully!");
      })
      .catch(async (error: any) => {
        const permissionError = new FirestorePermissionError({
          path: 'orders',
          operation: 'create',
          requestResourceData: orderData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  if (isOrdered) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-headline font-black text-foreground">Order Confirmed!</h1>
            <p className="text-muted-foreground font-medium">Your delicious meal is being prepared with love. You'll receive updates on your order shortly.</p>
          </div>
          <div className="pt-8 flex flex-col gap-4">
            <Link href="/dashboard">
              <Button className="w-full h-14 rounded-2xl bg-primary text-lg font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform text-white">
                Track My Order
              </Button>
            </Link>
            <Link href="/menu">
              <Button variant="ghost" className="font-bold">Order Something Else</Button>
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
          <p className="font-bold text-muted-foreground">Validating your basket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] animate-in fade-in duration-500">
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <Link href="/cart" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <span className="font-headline text-2xl font-black tracking-tight hidden md:block text-foreground">Bhartiya Swad</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/cart">
              <Button variant="ghost" className="font-bold gap-2 rounded-xl hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Back to Cart
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          <div className="flex-1 space-y-8">
            <h1 className="text-5xl font-headline font-black tracking-tight">Checkout</h1>
            
            <form onSubmit={handlePlaceOrder} className="space-y-8">
              <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white transition-all hover:shadow-md">
                <CardHeader className="bg-muted/30 p-8 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl font-headline font-black text-foreground">
                    <MapPin className="w-6 h-6 text-primary" /> Delivery Logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="name" 
                          placeholder="Receiver's name" 
                          className="pl-10 h-12 rounded-xl focus:ring-primary/20 transition-all"
                          value={deliveryDetails.name}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, name: e.target.value})}
                          required
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          placeholder="+91 00000 00000" 
                          className="pl-10 h-12 rounded-xl focus:ring-primary/20 transition-all"
                          value={deliveryDetails.phone}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, phone: e.target.value})}
                          required
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Delivery Address</Label>
                    <textarea 
                      id="address" 
                      placeholder="Flat/House No., Building, Street, Area..." 
                      className="w-full min-h-[100px] p-4 bg-background border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                      value={deliveryDetails.address}
                      onChange={(e) => setDeliveryDetails({...deliveryDetails, address: e.target.value})}
                      required
                      disabled={isProcessing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white transition-all hover:shadow-md">
                <CardHeader className="bg-muted/30 p-8 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl font-headline font-black text-foreground">
                    <CreditCard className="w-6 h-6 text-primary" /> Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <RadioGroup 
                    defaultValue="COD" 
                    onValueChange={(val) => setPaymentMethod(val as any)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    disabled={isProcessing}
                  >
                    <div className="transition-transform hover:scale-[1.02]">
                      <RadioGroupItem value="COD" id="cod" className="peer sr-only" />
                      <Label
                        htmlFor="cod"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-6 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                      >
                        <Package className="mb-3 h-6 w-6 text-primary" />
                        <span className="font-black">Cash on Delivery</span>
                      </Label>
                    </div>
                    <div className="transition-transform hover:scale-[1.02]">
                      <RadioGroupItem value="Online" id="online" className="peer sr-only" />
                      <Label
                        htmlFor="online"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-6 hover:bg-primary/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                      >
                        <CreditCard className="mb-3 h-6 w-6 text-primary" />
                        <span className="font-black">Online Payment</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </form>
          </div>

          <div className="w-full lg:w-[450px] space-y-6">
            <Card className="rounded-[2.5rem] border shadow-2xl overflow-hidden bg-white sticky top-32 transition-all hover:shadow-primary/5">
              <CardHeader className="bg-primary p-8 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-headline font-black">Order Summary</CardTitle>
                  <ShoppingCart className="w-6 h-6 text-white/40" />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <ScrollArea className="max-h-[300px] pr-4">
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center gap-4 transition-all hover:translate-x-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0 border shadow-sm transition-transform hover:scale-110">
                            <img src={item.imageURL} alt={item.name} className="object-cover w-full h-full" />
                          </div>
                          <div>
                            <p className="font-bold text-sm line-clamp-1">{item.name}</p>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-black text-sm text-primary">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-bold">Items Subtotal</span>
                    <span className="font-black">₹{totalPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-bold">Delivery & Packaging</span>
                    <span className="font-black">₹49</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-bold">Platform Surcharge</span>
                    <span className="font-black">₹5</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-dashed">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Amount</span>
                      <span className="text-4xl font-headline font-black text-primary">₹{totalPrice + 54}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || !deliveryDetails.address || !deliveryDetails.phone}
                  className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white text-xl font-black shadow-xl shadow-primary/20 group relative overflow-hidden transition-all active:scale-95 text-white"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" /> <span>Processing...</span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      {paymentMethod === 'Online' ? 'Pay Now' : 'Place Order'} <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-muted-foreground pt-4">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">100% Secure Transaction</span>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-accent/5 rounded-[2rem] border border-accent/10 flex items-start gap-4 animate-in slide-in-from-right-4 duration-700">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <ChefHat className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-black text-accent text-sm uppercase tracking-widest">Hygiene Promise</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">Your order will be prepared following the highest safety standards.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
