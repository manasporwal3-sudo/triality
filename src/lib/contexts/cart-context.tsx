
"use client"

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, increment, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import toast from 'react-hot-toast';

export interface CartItem {
  id: string; // This will be the dishId
  name: string;
  price: number;
  quantity: number;
  imageURL?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (food: any) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalQuantity: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();

  // Memoize the cart collection reference
  const cartQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'cart');
  }, [db, user?.uid]);

  // Real-time subscription to the user's cart
  const { data: cartData, isLoading } = useCollection<CartItem>(cartQuery);

  const items = useMemo(() => cartData || [], [cartData]);

  const addToCart = (food: any) => {
    if (!user) return;

    const cartItemRef = doc(db, 'users', user.uid, 'cart', food.id);
    
    // Non-blocking write to Firestore
    setDoc(cartItemRef, {
      name: food.name,
      price: food.price,
      imageURL: food.imageURL || food.image,
      quantity: increment(1),
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: cartItemRef.path,
        operation: 'write',
        requestResourceData: food
      }));
    });
  };

  // Handle deferred add-to-cart after login
  useEffect(() => {
    const processPendingItem = async () => {
      if (user && typeof window !== 'undefined') {
        const pendingItem = localStorage.getItem("pendingCartItem");
        if (pendingItem) {
          try {
            const item = JSON.parse(pendingItem);
            addToCart(item);
            localStorage.removeItem("pendingCartItem");
            toast.success(`Welcome back! ${item.name} added to your basket.`, {
              icon: '🍱',
              duration: 4000
            });
          } catch (e) {
            console.error("Error processing pending cart item", e);
            localStorage.removeItem("pendingCartItem");
          }
        }
      }
    };

    processPendingItem();
  }, [user]);

  const updateQuantity = (id: string, delta: number) => {
    if (!user) return;

    const cartItemRef = doc(db, 'users', user.uid, 'cart', id);
    const currentItem = items.find(i => i.id === id);

    if (currentItem && currentItem.quantity + delta <= 0) {
      removeFromCart(id);
      return;
    }

    updateDoc(cartItemRef, {
      quantity: increment(delta),
      updatedAt: new Date().toISOString()
    }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: cartItemRef.path,
        operation: 'update'
      }));
    });
  };

  const removeFromCart = (id: string) => {
    if (!user) return;

    const cartItemRef = doc(db, 'users', user.uid, 'cart', id);
    deleteDoc(cartItemRef).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: cartItemRef.path,
        operation: 'delete'
      }));
    });
  };

  const clearCart = async () => {
    if (!user || items.length === 0) return;
    
    // Batch delete would be better, but for simplicity and non-blocking:
    items.forEach(item => {
      removeFromCart(item.id);
    });
  };

  const totalPrice = useMemo(() => 
    items.reduce((acc, item) => acc + (item.price * item.quantity), 0), 
  [items]);

  const totalQuantity = useMemo(() => 
    items.reduce((acc, item) => acc + item.quantity, 0), 
  [items]);

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      totalPrice, 
      totalQuantity,
      isLoading 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
