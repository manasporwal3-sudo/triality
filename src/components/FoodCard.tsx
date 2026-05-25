
"use client"

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Star, ShoppingCart, Leaf, Beef, Plus, Heart, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface FoodCardProps {
  food: {
    id: string;
    name: string;
    price: number;
    category: string;
    rating: number;
    imageURL?: string;
    image?: string;
    trending?: boolean;
    description?: string;
    isVeg?: boolean;
    totalOrders?: number;
  };
}

export default function FoodCard({ food }: FoodCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  // Check if this dish is favorited by the user
  const favDocId = user ? `${user.uid}_${food.id}` : null;
  const favRef = useMemoFirebase(() => {
    if (!favDocId) return null;
    return doc(db, 'favorites', favDocId);
  }, [db, favDocId]);

  const { data: favoriteData } = useDoc(favRef);
  const isFavorite = !!favoriteData;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.success("Log in to save your favorites!", { icon: '❤️' });
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!favRef) return;

    if (isFavorite) {
      // Remove from favorites
      deleteDoc(favRef).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: favRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      toast.success("Removed from favorites", { icon: '🤍' });
    } else {
      // Add to favorites
      const favData = {
        userId: user.uid,
        dishId: food.id,
        name: food.name,
        price: food.price,
        image: food.imageURL || food.image || `https://picsum.photos/seed/${food.id}/800/600`,
        category: food.category,
        rating: food.rating,
        isVeg: food.isVeg ?? false,
        createdAt: serverTimestamp()
      };

      setDoc(favRef, favData).catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: favRef.path,
          operation: 'create',
          requestResourceData: favData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      toast.success("Added to favorites", { icon: '❤️' });
    }
  };

  const handleOrderNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      localStorage.setItem("pendingCartItem", JSON.stringify(food));
      toast.success("Log in to add this to your cart!", { icon: '👋' });
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    setIsAdding(true);
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 300);

    try {
      await addToCart({ ...food, imageURL: food.imageURL || food.image });
      toast.success(`${food.name} added to cart!`);
    } catch (err) {
      toast.error("Failed to add item to cart");
    } finally {
      setIsAdding(false);
    }
  };

  const displayImage = food.imageURL || food.image || `https://picsum.photos/seed/${food.id}/800/600`;

  return (
    <div className="group h-full perspective-1000 animate-in fade-in duration-500">
      <Card className="relative h-full flex flex-col overflow-hidden transition-all duration-500 bg-white border border-border/40 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-3 hover:scale-[1.01] rounded-[2.5rem] group cursor-pointer">
        {/* Image Container */}
        <div className="relative w-full aspect-[1/1] overflow-hidden bg-muted m-3 rounded-[2rem] shadow-inner group">
          <Image
            src={displayImage}
            alt={food.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            data-ai-hint={food.category}
          />
          
          {/* Badges Overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
              {food.totalOrders && food.totalOrders > 50 && (
                <Badge className="bg-accent text-white border-none px-4 py-1 font-black text-[9px] uppercase tracking-widest shadow-lg animate-pulse backdrop-blur-md">
                  Bestseller
                </Badge>
              )}
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center border-2 backdrop-blur-md shadow-lg transition-transform hover:scale-110 pointer-events-auto",
                food.isVeg ? "bg-white/90 border-green-600 text-green-600" : "bg-white/90 border-red-600 text-red-600"
              )}>
                {food.isVeg ? <Leaf className="w-4 h-4" /> : <Beef className="w-4 h-4" />}
              </div>
            </div>
            
            <div className="flex flex-col gap-2 pointer-events-auto">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleToggleFavorite}
                className={cn(
                  "w-8 h-8 rounded-xl backdrop-blur-md transition-all shadow-lg active:scale-90",
                  isFavorite ? "bg-primary text-white" : "bg-white/90 text-muted-foreground hover:text-accent"
                )}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
              </Button>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl border border-white/40 flex items-center gap-1.5 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 group-hover:fill-white group-hover:text-white" />
            <span className="text-sm font-black text-foreground group-hover:text-white">{food.rating}</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-7 pb-7 flex-1 flex flex-col">
          <div className="mb-4">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1.5 opacity-80">
              {food.category?.replace('_', ' ')}
            </p>
            <h3 className="font-headline text-xl font-black leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {food.name}
            </h3>
            {food.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 font-medium leading-relaxed opacity-70">
                {food.description}
              </p>
            )}
          </div>
          
          <div className="mt-auto pt-5 border-t border-dashed border-muted flex items-center justify-between gap-5">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 opacity-60">Price</span>
              <span className="text-3xl font-headline font-black text-foreground tracking-tighter">₹{food.price}</span>
            </div>
            <Button 
              onClick={handleOrderNow}
              disabled={isAdding}
              className={cn(
                "flex-1 rounded-2xl h-14 bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-xl shadow-primary/10 transition-all active:scale-[0.95] group overflow-hidden",
                isBouncing && "animate-bounce-subtle"
              )}
            >
              {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
