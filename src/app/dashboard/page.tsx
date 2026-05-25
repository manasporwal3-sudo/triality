
"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  ChefHat, 
  Sparkles, 
  LogOut,
  Utensils,
  Loader2,
  Flame,
  Bell,
  User as UserIcon,
  Star,
  ChevronRight,
  Home,
  Heart,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Lock,
  ArrowRight,
  Zap,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCart } from '@/lib/contexts/cart-context';
import FoodCard from '@/components/FoodCard';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import NotificationBell from '@/components/NotificationBell';
import { personalizedFoodRecommendations } from '@/ai/flows/personalized-food-recommendations-flow';
import { smartNotifications } from '@/ai/flows/smart-notifications-flow';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';
import UserNav from '@/components/UserNav';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { items, removeFromCart, updateQuantity, totalPrice, totalQuantity } = useCart();
  const db = useFirestore();

  const [mounted, setMounted] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [hasAttemptedRecs, setHasAttemptedRecs] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Protect route
  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router, mounted]);

  const dishesQuery = useMemoFirebase(() => {
    return query(collection(db, 'dishes'), limit(100));
  }, [db]);
  const { data: allDishes } = useCollection(dishesQuery);

  const trendingQuery = useMemoFirebase(() => {
    return query(collection(db, 'dishes'), orderBy('totalOrders', 'desc'), limit(4));
  }, [db]);
  const { data: trendingDishes } = useCollection(trendingQuery);

  const topRatedQuery = useMemoFirebase(() => {
    return query(collection(db, 'dishes'), orderBy('rating', 'desc'), limit(4));
  }, [db]);
  const { data: topRatedDishes } = useCollection(topRatedQuery);

  // Smart AI Notifications Trigger
  useEffect(() => {
    const triggerSmartNotification = async () => {
      if (!user?.uid || !allDishes || allDishes.length === 0) return;

      try {
        const lastDay = new Date();
        lastDay.setHours(lastDay.getHours() - 24);
        
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          limit(20)
        );
        
        const existingSnap = await getDocs(q);
        const hasRecentAINotif = existingSnap.docs.some(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          return data.type === 'ai' && createdAt >= lastDay;
        });

        if (hasRecentAINotif) return;

        const orderRef = collection(db, 'orders');
        const historyQ = query(orderRef, where('userId', '==', user.uid), limit(10));
        const orderSnap = await getDocs(historyQ);
        
        const history: { name: string; category?: string }[] = [];
        orderSnap.forEach((doc) => {
          doc.data().items?.forEach((item: any) => {
            if (item.name) history.push({ name: item.name });
          });
        });

        if (history.length === 0) return;

        const result = await smartNotifications({
          userFoodHistory: history,
          userName: user.displayName || 'Friend'
        });

        if (result.message) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.uid,
            message: result.message,
            type: 'ai',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.warn("Smart notification failed:", e);
      }
    };

    if (mounted && user && allDishes) {
      triggerSmartNotification();
    }
  }, [user?.uid, allDishes, mounted]);

  const getPersonalizedRecommendations = async () => {
    if (!user?.uid || !allDishes || allDishes.length === 0) {
      toast.error("Add items to your history to get suggestions!");
      return;
    }
    
    setLoadingRecs(true);
    try {
      const orderRef = collection(db, 'orders');
      const q = query(orderRef, where('userId', '==', user.uid), limit(15));
      const orderSnap = await getDocs(q);
      
      const history: { name: string; category?: string }[] = [];
      orderSnap.forEach((orderDoc) => {
        const orderData = orderDoc.data();
        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach((item: any) => {
            if (item.name) {
              history.push({
                name: item.name,
                category: allDishes.find(f => f.id === item.dishId || f.name === item.name)?.category
              });
            }
          });
        }
      });

      if (history.length === 0) {
        setHasAttemptedRecs(true);
        setRecommendations([]);
        setLoadingRecs(false);
        return;
      }

      const uniqueHistory = Array.from(new Set(history.map(h => h.name)))
        .map(name => history.find(h => h.name === name)!);

      const result = await personalizedFoodRecommendations({
        userFoodHistory: uniqueHistory,
        availableFoods: allDishes.map(f => ({
          id: f.id,
          name: f.name,
          price: f.price,
          category: f.category,
          rating: f.rating,
          imageURL: f.image || f.imageURL
        }))
      });
      
      setRecommendations(result.recommendations || []);
      setHasAttemptedRecs(true);
      if (result.recommendations?.length > 0) {
        toast.success("We found some new favorites for you!");
      }
    } catch (e) {
      console.warn("AI recommendations unavailable:", e);
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (mounted && allDishes && allDishes.length > 0 && user && !hasAttemptedRecs) {
      getPersonalizedRecommendations();
    }
  }, [user?.uid, allDishes, mounted]);

  // Loading state
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary" />
          <p className="font-headline font-bold text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // Guard
  if (!user) return null;

  const sidebarLinks = [
    { name: 'Dashboard', href: '/dashboard', active: true, icon: Home },
    { name: 'Full Menu', href: '/menu', active: false, icon: Utensils },
    { name: 'My Orders', href: '/orders', active: false, icon: ShoppingBag },
    { name: 'Favorites', href: '/favorites', active: false, icon: Heart },
    { name: 'Support', href: '/contact', active: false, icon: MessageSquare },
    { name: 'Security', href: '#security', active: false, icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] animate-in fade-in duration-500">
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <span className="font-headline text-2xl font-black tracking-tight hidden md:block text-foreground">Bhartiya Swad</span>
          </Link>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="relative p-2 rounded-full hover:bg-primary/5 group transition-all active:scale-90">
                  <ShoppingCart className="w-6 h-6 group-hover:text-primary transition-colors" />
                  {totalQuantity > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
                      {totalQuantity}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col rounded-l-[2.5rem] border-none shadow-2xl">
                <SheetHeader className="pb-6 border-b">
                  <SheetTitle className="text-2xl font-headline font-black flex items-center gap-3">
                    <ShoppingCart className="w-8 h-8 text-primary" /> 
                    Your Basket
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1 py-8">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 py-20 animate-in fade-in">
                      <Utensils className="w-20 h-20 mb-6" />
                      <p className="font-black text-xl italic text-center">Your basket is waiting <br/>to be filled!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-center p-4 bg-muted/20 rounded-2xl border border-transparent hover:border-primary/10 transition-all group hover:bg-white hover:shadow-sm">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white relative border shadow-sm transition-transform group-hover:scale-105">
                            <img src={item.imageURL || ''} alt={item.name} className="object-cover w-full h-full" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm">{item.name}</h4>
                            <p className="text-primary font-black text-lg">₹{item.price}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 rounded-full border-primary/20 hover:bg-primary hover:text-white transition-colors"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-black">{item.quantity}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7 rounded-full border-primary/20 hover:bg-primary hover:text-white transition-colors"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => {
                            removeFromCart(item.id);
                            toast.success("Removed from basket");
                          }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {items.length > 0 && (
                  <SheetFooter className="pt-8 border-t flex-col sm:flex-col gap-6">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Payable</span>
                        <span className="text-3xl font-headline font-black text-primary">₹{totalPrice}</span>
                      </div>
                    </div>
                    <Link href="/cart" className="w-full">
                      <Button className="w-full h-16 bg-primary text-xl font-black rounded-3xl shadow-xl shadow-primary/20 group overflow-hidden active:scale-95 transition-all">
                        <span className="relative z-10 flex items-center justify-center gap-2 text-white">View Cart <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                      </Button>
                    </Link>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3 pl-4 border-l">
              <UserNav />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        <aside className="w-64 hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)] py-8 pr-8 animate-in slide-in-from-left-4 duration-700">
          <nav className="space-y-2">
            {sidebarLinks.map((link) => (
              <Link key={link.name} href={link.href}>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start h-12 rounded-2xl px-6 font-bold transition-all gap-3",
                    link.active ? "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary hover:text-white" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.name}
                </Button>
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto p-6 bg-accent/5 rounded-[2rem] border border-accent/10 relative overflow-hidden group transition-all hover:bg-accent/10">
            <div className="relative z-10">
              <p className="font-headline font-black text-accent text-lg mb-2">Get 20% OFF</p>
              <p className="text-xs text-muted-foreground font-medium mb-4">On your first order above ₹500</p>
              <Button size="sm" className="bg-accent text-white font-black rounded-xl hover:scale-105 transition-transform active:scale-95">REDEEM NOW</Button>
            </div>
            <Sparkles className="absolute -bottom-2 -right-2 w-20 h-20 text-accent/10 rotate-12 group-hover:scale-125 transition-transform duration-2000" />
          </div>

          <Button 
            variant="ghost" 
            className="mt-8 w-full justify-start h-12 rounded-2xl px-6 font-bold text-destructive hover:bg-destructive/5 gap-3 transition-colors"
            onClick={() => {
              logout();
              toast.success("Logged out");
            }}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </Button>
        </aside>

        <main className="flex-1 p-8 md:p-12 space-y-24 min-w-0">
          <section className="relative rounded-[3rem] overflow-hidden bg-primary/10 border border-primary/5 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 group animate-in zoom-in duration-1000">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float-slow -z-10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl animate-drift-slow -z-10" />
            
            <div className="relative z-10 space-y-6 max-w-lg">
              <Badge className="bg-primary text-white border-none rounded-full px-4 py-1.5 font-black uppercase tracking-widest text-[10px] animate-pulse">Premium Experience</Badge>
              <h1 className="text-5xl md:text-6xl font-headline font-black text-foreground leading-[1.1] tracking-tight">
                Authentic <span className="text-primary italic">Indian</span><br/>Delights.
              </h1>
              <p className="text-lg text-muted-foreground font-medium">From spicy street food to royal thalis, we bring the heart of Bharat to your door.</p>
              <div className="flex gap-4">
                <Link href="/menu">
                  <Button className="h-16 px-10 rounded-2xl bg-primary text-lg font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-white border-none">Explore Full Menu</Button>
                </Link>
              </div>
            </div>
            <div className="relative flex-1 flex justify-center">
              <div className="w-72 h-72 md:w-96 md:h-96 bg-white rounded-full shadow-2xl border-8 border-white overflow-hidden animate-float">
                <img 
                  src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80" 
                  alt="Delicious Indian Food" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-2000" 
                />
              </div>
              <div className="absolute top-0 right-0 bg-white p-4 rounded-3xl shadow-xl border flex items-center gap-3 animate-bounce">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Flame className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground">Order Now</p>
                  <p className="font-black text-foreground text-sm">Fastest Delivery</p>
                </div>
              </div>
            </div>
          </section>

          {/* AI Recommendations Section */}
          <section className="bg-muted/30 p-12 md:p-16 rounded-[4rem] border border-primary/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-60 animate-float-slow"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl opacity-20 animate-drift-slow"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-[10px] font-black uppercase tracking-widest border border-primary/5">
                  <Zap className="w-3 h-3 fill-primary" />
                  AI-Powered Recommendations
                </div>
                <h2 className="text-4xl font-headline font-black text-foreground flex items-center gap-4">
                  Smart Menu Curator
                </h2>
                <p className="text-muted-foreground font-medium max-w-lg">
                  Our neural network analyzes your unique flavor profile to suggest your next favorite dish.
                </p>
              </div>
              
              <Button 
                onClick={getPersonalizedRecommendations}
                disabled={loadingRecs}
                className="h-16 px-8 rounded-2xl bg-white hover:bg-muted/50 text-foreground border-2 border-primary/10 font-black text-lg shadow-xl transition-all active:scale-95 group"
              >
                {loadingRecs ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <span className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    ✨ Get AI Suggestions
                  </span>
                )}
              </Button>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {loadingRecs ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="aspect-square bg-muted/50 rounded-[2.5rem]"></div>
                    <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                    <div className="h-4 bg-muted/50 rounded w-1/2"></div>
                  </div>
                ))
              ) : recommendations.length > 0 ? (
                recommendations.map((dish, i) => (
                  <div key={dish.id} className="animate-in fade-in zoom-in duration-700" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="relative group">
                      <FoodCard food={dish} />
                      <div className="absolute -top-3 -right-3 pointer-events-none">
                        <Badge className="bg-primary text-white border-4 border-[#FDFCFB] rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-tighter shadow-lg">
                          98% Match
                        </Badge>
                      </div>
                      <div className="mt-4 px-2">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest italic">
                          Recommended for you based on history
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center gap-6 opacity-50 bg-white/30 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-primary/10">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner">
                    <Utensils className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-xl text-foreground">Order something to unlock AI recommendations</p>
                    <p className="text-sm font-medium">Your palate profile is currently being built as you explore our menu.</p>
                  </div>
                  <Link href="/menu">
                    <Button variant="outline" className="rounded-xl font-bold border-primary text-primary">Browse the Menu</Button>
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-10">
            <div className="flex items-center justify-between">
              <div className="animate-in slide-in-from-left-4 duration-700">
                <h2 className="text-4xl font-headline font-black flex items-center gap-4 text-foreground">
                  <ShoppingBag className="w-10 h-10 text-primary" /> 
                  Your Journey
                </h2>
                <p className="text-muted-foreground font-medium mt-1">Quick access to your activity and favorites.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <Link href="/orders" className="group block">
                <Card className="p-8 h-full bg-white border border-primary/5 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 rounded-[2.5rem] flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-headline font-black text-foreground">My Orders</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      Track your live orders or browse through your history.
                    </p>
                  </div>
                  <Button variant="ghost" className="mt-auto font-black text-primary group-hover:translate-x-2 transition-transform">
                    View History <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </Card>
              </Link>

              <Link href="/menu" className="group block">
                <Card className="p-8 h-full bg-white border border-primary/5 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 rounded-[2.5rem] flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-500 shadow-inner">
                    <Utensils className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-headline font-black text-foreground">Full Menu</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      Explore delicacies curated for you.
                    </p>
                  </div>
                  <Button variant="ghost" className="mt-auto font-black text-accent group-hover:translate-x-2 transition-transform">
                    Explore Now <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </Card>
              </Link>

              <Link href="/favorites" className="group block">
                <Card className="p-8 h-full bg-white border border-primary/5 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 rounded-[2.5rem] flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-pink-100 flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-all duration-500 shadow-inner">
                    <Heart className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-headline font-black text-foreground">Favorites</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      Re-order dishes that won your heart.
                    </p>
                  </div>
                  <Button variant="ghost" className="mt-auto font-black text-pink-600 group-hover:translate-x-2 transition-transform">
                    See Favorites <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </Card>
              </Link>
            </div>
          </section>

          {trendingDishes && trendingDishes.length > 0 && (
            <section className="space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-headline font-black flex items-center gap-4 text-foreground">
                    <Flame className="w-10 h-10 text-accent animate-pulse" /> 
                    Hot & Trending
                  </h2>
                  <p className="text-muted-foreground font-medium mt-1">Our community's current favorites this week.</p>
                </div>
                <Link href="/menu">
                  <Button variant="ghost" className="rounded-xl font-bold text-primary group hover:bg-primary/5">
                    See All <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {trendingDishes.map((dish, i) => (
                  <div key={dish.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                    <FoodCard food={{...dish, imageURL: dish.image}} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {topRatedDishes && topRatedDishes.length > 0 && (
            <section className="space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-headline font-black flex items-center gap-4 text-foreground">
                    <Star className="w-10 h-10 text-yellow-500 fill-current" /> 
                    User Choice
                  </h2>
                  <p className="text-muted-foreground font-medium mt-1">Exquisite dishes rated 4.5+ by our connoisseurs.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {topRatedDishes.map((dish, i) => (
                  <div key={dish.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                    <FoodCard food={{...dish, imageURL: dish.image}} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="security" className="space-y-10 scroll-mt-24">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-headline font-black flex items-center gap-4 text-foreground">
                  <Lock className="w-10 h-10 text-primary" /> 
                  Account Security
                </h2>
                <p className="text-muted-foreground font-medium mt-1">Manage your access and keep your profile secure.</p>
              </div>
            </div>
            <div className="max-w-2xl mx-auto w-full transition-all hover:scale-[1.01]">
              <ChangePasswordForm />
            </div>
          </section>

          <section className="text-center py-20 border-t border-dashed">
            <h3 className="text-3xl font-headline font-black mb-6 text-foreground">Didn't find what you like?</h3>
            <Link href="/menu">
              <Button size="lg" variant="outline" className="h-16 px-12 rounded-2xl border-2 font-black text-lg hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 group">
                Browse Full Catalog <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </section>
        </main>
      </div>

      <footer className="bg-white border-t py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <ChefHat className="text-primary w-8 h-8" />
            <span className="font-headline text-xl font-black text-foreground">Bhartiya Swad</span>
          </div>
          <p className="text-sm text-muted-foreground font-bold italic opacity-60 text-center md:text-left">© 2025 Bhartiya Swad. Delivering authentic taste across Bharat.</p>
          <div className="flex gap-6">
            <Link href="/contact" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            <Link href="/privacy-policy" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms-and-conditions" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Terms</Link>
            <Link href="/refund-policy" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
