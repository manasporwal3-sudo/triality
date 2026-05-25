
"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

import {
  ChefHat,
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Utensils,
  Loader2,
  XCircle,
  AlertCircle,
  Star,
  Send
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/contexts/auth-context"
import NotificationBell from "@/components/NotificationBell"
import UserNav from "@/components/UserNav"
import { cn, computeOrderStatus, STATUS_LABELS } from "@/lib/utils"
import { normalizeOrder } from "@/lib/normalizeOrder"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import toast from "react-hot-toast"

const TRACKING_STEPS = [
  { id: "placed", label: "Order Placed", icon: Clock, color: "bg-blue-500" },
  { id: "preparing", label: "Preparing Food", icon: Utensils, color: "bg-orange-500" },
  { id: "out_for_delivery", label: "Out for Delivery", icon: Truck, color: "bg-indigo-500" },
  { id: "delivered", label: "Delivered", icon: CheckCircle2, color: "bg-green-500" }
]

export default function OrderTrackingPage() {
  const params = useParams()
  const orderId = params?.orderId as string

  const db = useFirestore()
  const { user, loading: authLoading } = useAuth()
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  // Rating states
  const [taste, setTaste] = useState(0);
  const [packaging, setPackaging] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const orderRef = useMemoFirebase(() => {
    if (!orderId) return null
    return doc(db, "orders", orderId)
  }, [db, orderId])

  const { data: rawOrder, isLoading: orderLoading, error } = useDoc(orderRef)

  const order = useMemo(() => normalizeOrder(rawOrder), [rawOrder]);

  // AUTO-REFUND LOGIC
  useEffect(() => {
    const processAutoRefund = async () => {
      if (!order || !order.isCancelled || order.refundCompleted || !order.refundInitiatedAt || !currentTime) return;
      
      const refundTime = order.refundInitiatedAt.toDate ? order.refundInitiatedAt.toDate() : new Date(order.refundInitiatedAt);
      const diffInMs = currentTime.getTime() - refundTime.getTime();
      
      if (diffInMs > 5 * 60 * 1000) {
        const docRef = doc(db, "orders", order.id);
        updateDoc(docRef, {
          paymentStatus: "refunded",
          refundCompleted: true
        }).catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { paymentStatus: "refunded", refundCompleted: true }
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      }
    };
    
    processAutoRefund();
  }, [order, currentTime, db]);

  const handleCancel = () => {
    if (!order) return;

    const statusKey = computeOrderStatus(order.createdAt);
    
    if (statusKey === "out_for_delivery" || statusKey === "delivered") {
      alert("Cancellation not allowed after order is out for delivery");
      return;
    }

    const confirmCancel = window.confirm("Are you sure you want to cancel this order? This action cannot be undone.");
    if (!confirmCancel) return;

    const cancelData = {
      status: "cancelled",
      isCancelled: true,
      cancelledAt: serverTimestamp(),
      refundInitiated: order.paymentMethod?.toLowerCase() === 'online',
      refundInitiatedAt: order.paymentMethod?.toLowerCase() === 'online' ? serverTimestamp() : null
    };

    const docRef = doc(db, "orders", order.id);
    updateDoc(docRef, cancelData)
      .then(() => {
        toast.success("Order cancelled successfully.");
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: cancelData
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSubmitRating = () => {
    if (!taste || !packaging || !delivery) {
      toast.error("Please provide ratings for all factors.");
      return;
    }

    setIsSubmittingRating(true);
    const ratingData = {
      isRated: true,
      ratings: {
        taste: Number(taste),
        packaging: Number(packaging),
        delivery: Number(delivery)
      },
      reviewText: review,
      ratedAt: serverTimestamp()
    };

    const docRef = doc(db, "orders", order.id);
    updateDoc(docRef, ratingData)
      .then(() => {
        toast.success("Thank you for your feedback!");
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: ratingData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmittingRating(false);
      });
  };

  if (authLoading || orderLoading || !currentTime) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-headline font-bold text-muted-foreground">Connecting to tracking stream...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-[#FDFCFB]">
        <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
          <Package className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-headline font-black mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't locate the details for this order reference.</p>
        <Link href="/dashboard">
          <Button className="rounded-2xl h-12 px-8 font-bold bg-primary text-white">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  if (order.userId !== user?.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] font-headline font-bold text-xl">
        Unauthorized Access
      </div>
    )
  }

  const displayOrderId = order.orderId || orderId || "Unknown"
  const totalAmount = order.totalAmount ?? 0
  
  const statusKey = order.isCancelled ? 'cancelled' : computeOrderStatus(order.createdAt);
  const currentStepIndex = TRACKING_STEPS.findIndex(step => step.id === statusKey)

  const canCancel = !order.isCancelled && statusKey !== 'out_for_delivery' && statusKey !== 'delivered';
  const showRatingUI = statusKey === 'delivered' && !order.isRated;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-20">
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <ChefHat className="text-white w-6 h-6" />
            </div>
            <span className="font-headline text-2xl font-black hidden md:block">Bhartiya Swad</span>
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dashboard">
              <Button variant="ghost" className="font-bold gap-2 rounded-xl text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-5xl font-headline font-black tracking-tight">Track Your Meal</h1>
            <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-[10px] font-black">
              Order ID: #{String(displayOrderId).slice(0, 16).toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {canCancel && (
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                className="rounded-full px-6 font-black h-10 shadow-lg shadow-destructive/20 gap-2 active:scale-95 transition-all text-white"
              >
                <XCircle className="w-4 h-4" /> Cancel Order
              </Button>
            )}
            <Badge className={cn(
              "rounded-full px-6 py-2 font-black text-sm uppercase border-none shadow-sm",
              order.isCancelled ? "bg-red-600" : (TRACKING_STEPS[currentStepIndex]?.color || "bg-primary"),
              "text-white"
            )}>
              {order.isCancelled ? "Order Cancelled" : STATUS_LABELS[statusKey]}
            </Badge>
          </div>
        </div>

        {order.isCancelled ? (
          <Card className="border-red-100 bg-red-50/30 shadow-sm rounded-[3rem] overflow-hidden animate-in zoom-in duration-500">
            <CardContent className="p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <XCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-headline font-black text-red-900">This order was cancelled</h2>
                <p className="text-red-700 font-medium">We're sorry this meal didn't work out. Feel free to explore our menu for other options.</p>
              </div>
              
              {(order.paymentMethod?.toLowerCase() === 'online' || order.paymentStatus === 'Paid') && (
                <div className="p-6 bg-white border border-red-100 rounded-3xl max-w-lg mx-auto shadow-sm">
                  {order.paymentStatus === 'refunded' ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center justify-center gap-3 text-green-700 font-black">
                        <CheckCircle2 className="w-6 h-6" />
                        Payment Refunded ✅
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Verified transaction complete</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3 text-green-600 font-bold">
                        <AlertCircle className="w-5 h-5" />
                        Refund Process Initiated
                      </div>
                      <p className="text-sm text-green-600 font-semibold leading-relaxed">
                        Refund will be initiated. It will be processed within 2–3 working days.
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium italic">
                        Your bank normally updates the statement within 48-72 hours.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border shadow-xl rounded-[3rem] overflow-hidden bg-white">
            <CardContent className="p-10 md:p-16">
              <div className="relative flex flex-col md:flex-row justify-between items-center gap-12 md:gap-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 hidden md:block" />
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 hidden md:block transition-all duration-1000" 
                  style={{ width: `${(currentStepIndex / (TRACKING_STEPS.length - 1)) * 100}%` }}
                />

                {TRACKING_STEPS.map((step, index) => {
                  const Icon = step.icon
                  const isCompleted = index < currentStepIndex
                  const isActive = index === currentStepIndex

                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center group w-full md:w-auto">
                      <div
                        className={cn(
                          "w-20 h-20 flex items-center justify-center rounded-[2rem] transition-all duration-500 border-4",
                          isCompleted ? "bg-green-500 border-green-100 text-white shadow-lg shadow-green-200" :
                          isActive ? `${step.color} border-white text-white shadow-2xl scale-110 ring-4 ring-primary/10` :
                          "bg-white border-muted text-muted-foreground grayscale opacity-40"
                        )}
                      >
                        {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <Icon className="w-8 h-8" />}
                      </div>
                      <div className="mt-6 text-center">
                        <p className={cn(
                          "font-headline font-black text-sm uppercase tracking-wider",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </p>
                        {isActive && <p className="text-[10px] text-primary font-black mt-1 animate-pulse">LIVE UPDATING</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {showRatingUI && (
          <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-primary p-8 text-white text-center">
              <h2 className="text-3xl font-headline font-black">How was your meal?</h2>
              <p className="text-white/70 font-bold mt-1">Your feedback helps us improve our authentic flavors.</p>
            </div>
            <CardContent className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center gap-4 p-6 bg-muted/20 rounded-[2rem] border border-transparent hover:border-primary/10 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <p className="font-black text-xs uppercase tracking-widest text-muted-foreground">Taste</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        onClick={() => setTaste(s)}
                        className={cn("w-6 h-6 cursor-pointer transition-all", s <= taste ? "fill-yellow-400 text-yellow-400 scale-110" : "text-muted-foreground/30")}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 p-6 bg-muted/20 rounded-[2rem] border border-transparent hover:border-primary/10 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="font-black text-xs uppercase tracking-widest text-muted-foreground">Packaging</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        onClick={() => setPackaging(s)}
                        className={cn("w-6 h-6 cursor-pointer transition-all", s <= packaging ? "fill-yellow-400 text-yellow-400 scale-110" : "text-muted-foreground/30")}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 p-6 bg-muted/20 rounded-[2rem] border border-transparent hover:border-primary/10 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <Truck className="w-6 h-6" />
                  </div>
                  <p className="font-black text-xs uppercase tracking-widest text-muted-foreground">Delivery</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        onClick={() => setDelivery(s)}
                        className={cn("w-6 h-6 cursor-pointer transition-all", s <= delivery ? "fill-yellow-400 text-yellow-400 scale-110" : "text-muted-foreground/30")}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-black text-xs uppercase tracking-widest text-muted-foreground ml-2">Any additional comments?</p>
                <Textarea 
                  placeholder="Tell us more about your experience..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="min-h-[120px] rounded-[2rem] p-6 border-none bg-muted/30 focus-visible:ring-primary/20 text-lg transition-all"
                />
              </div>

              <Button 
                onClick={handleSubmitRating}
                disabled={isSubmittingRating || !taste || !packaging || !delivery}
                className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-xl shadow-primary/20 group active:scale-95 transition-all"
              >
                {isSubmittingRating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" /> <span>Publishing Feedback...</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    Submit Experience <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {order.isRated && (
          <Card className="border-none shadow-sm rounded-[2.5rem] bg-green-50 overflow-hidden animate-in fade-in duration-1000">
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-headline font-black text-green-900">Feedback Recorded</h3>
                  <p className="text-green-700 font-medium">Thank you for helping us serve you better! ⭐</p>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm px-6 py-3 rounded-2xl border border-green-100 flex gap-4">
                <div className="text-center">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Score</p>
                  <p className="font-headline font-black text-green-700 text-lg">
                    {((order.ratings.taste + order.ratings.packaging + order.ratings.delivery) / 3).toFixed(1)}
                  </p>
                </div>
                <div className="w-px bg-green-100" />
                <div className="text-center">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Points</p>
                  <p className="font-headline font-black text-green-700 text-lg">+10</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-8 bg-muted/20 border-b">
              <CardTitle className="text-xl font-headline font-black">Order Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center group hover:bg-muted/5 p-2 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted border shadow-sm">
                        <img
                          src={item.imageURL || `https://picsum.photos/seed/${index}/200`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          alt={item.name}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-lg leading-tight">{item.name}</p>
                        <p className="text-sm text-muted-foreground font-black uppercase tracking-widest mt-1">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-headline font-black text-xl text-primary">
                      ₹{item.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>
              <Separator className="my-8 border-dashed" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Collection</p>
                  <p className="text-xs text-muted-foreground italic">Inclusive of taxes and delivery partner fees</p>
                </div>
                <p className="text-4xl font-headline font-black text-primary">₹{totalAmount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-[2.5rem] bg-white overflow-hidden h-fit">
            <CardHeader className="p-8 bg-primary text-white border-b">
              <CardTitle className="text-xl font-headline font-black">Support Info</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Delivery Partner</p>
                    <p className="font-bold text-foreground">
                      {order.isCancelled ? 'Not applicable' : 'Assigned & Navigating'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Est. Delivery</p>
                    <p className="font-bold text-foreground">
                      {order.isCancelled ? 'N/A' : '25-35 Minutes'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl shadow-black/10">
                <p className="text-xs text-slate-100 font-bold leading-relaxed italic text-center">
                  "Your meal is being tracked in real-time using our standardized audit stream."
                </p>
              </div>
              
              <Link href="/contact" className="block w-full">
                <Button variant="outline" className="w-full h-12 rounded-2xl font-black border-primary text-primary hover:bg-primary hover:text-white transition-all">
                  Contact Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
