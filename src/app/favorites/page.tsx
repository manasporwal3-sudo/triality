
"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  ChefHat, 
  ArrowLeft,
  Loader2,
  Utensils,
  ChevronRight,
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import NotificationBell from '@/components/NotificationBell';
import UserNav from '@/components/UserNav';
import FoodCard from '@/components/FoodCard';
import { collection, query, where } from 'firebase/firestore';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user's favorites
  // We removed the orderBy clause to avoid the need for a composite index
  const favoritesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid)
    );
  }, [db, user?.uid]);

  const { data: rawFavorites, isLoading: favsLoading } = useCollection(favoritesQuery);

  // Perform sorting on the client side to bypass Firestore index requirements
  const favorites = useMemo(() => {
    if (!rawFavorites) return [];
    return [...rawFavorites].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });
  }, [rawFavorites]);

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login?callbackUrl=/favorites');
    }
  }, [user, loading, router, mounted]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin text-primary" />
          <p className="font-headline font-bold text-muted-foreground">Opening your vault...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <span className="font-headline text-2xl font-black tracking-tight text-foreground">Bhartiya Swad</span>
          </Link>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dashboard">
              <Button variant="ghost" className="font-bold gap-2 rounded-xl text-muted-foreground hover:text-primary transition-all">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="animate-in slide-in-from-left-4 duration-700">
            <h1 className="text-5xl font-headline font-black tracking-tight flex items-center gap-4">
              <Heart className="w-12 h-12 text-primary fill-primary" />
              Your Favorites
            </h1>
            <p className="text-muted-foreground font-medium mt-1">A curated collection of your most-loved flavors.</p>
          </div>
          {favorites && favorites.length > 0 && (
            <Badge className="bg-primary/10 text-primary border-none rounded-full px-6 h-10 flex items-center font-black uppercase tracking-widest text-[10px]">
              {favorites.length} {favorites.length === 1 ? 'DISH' : 'DISHES'} SAVED
            </Badge>
          )}
        </div>

        {favsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-square bg-muted rounded-[2.5rem]" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {favorites.map((fav) => (
              <FoodCard 
                key={fav.id} 
                food={{
                  id: fav.dishId,
                  name: fav.name,
                  price: fav.price,
                  category: fav.category,
                  rating: fav.rating,
                  imageURL: fav.image,
                  isVeg: fav.isVeg
                }} 
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-muted/5 rounded-[3rem] p-24 text-center animate-in zoom-in duration-500">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Heart className="w-10 h-10 text-muted-foreground/20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-headline font-black text-foreground">No favorites yet ❤️</h3>
                <p className="text-muted-foreground font-medium">Explore our menu and save the dishes that win your heart!</p>
              </div>
              <Link href="/menu">
                <Button className="h-14 px-10 rounded-2xl bg-primary text-lg font-black shadow-xl shadow-primary/20 hover:scale-105 transition-all text-white">
                  Explore Menu
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </main>

      <footer className="bg-white border-t py-12 px-8 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <ChefHat className="text-primary w-8 h-8" />
            <span className="font-headline text-xl font-black text-foreground">Bhartiya Swad</span>
          </div>
          <p className="text-sm text-muted-foreground font-bold italic opacity-60 text-center md:text-left">© 2025 Bhartiya Swad. Curating authentic tastes for you.</p>
          <div className="flex gap-6">
            <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
            <Link href="/menu" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Full Menu</Link>
            <Link href="/contact" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
