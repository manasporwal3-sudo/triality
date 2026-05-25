"use client"

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Undo2, ChefHat, AlertCircle, Clock, CreditCard, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] animate-in fade-in duration-500">
      {/* Simple Header */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <ChefHat className="text-white w-5 h-5" />
            </div>
            <span className="font-headline text-xl font-black text-foreground">Bhartiya Swad</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="font-bold gap-2 rounded-xl">
              <ChevronLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary shadow-inner">
              <Undo2 className="w-8 h-8" />
            </div>
            <h1 className="text-5xl font-headline font-black tracking-tight text-foreground">Cancellation & Refund Policy</h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] font-black">Commitment to Quality & Satisfaction</p>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white p-10 md:p-16 space-y-12 leading-relaxed">
            
            {/* Section 1: Cancellation Policy */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-headline font-black text-foreground uppercase tracking-tight">1. Cancellation Policy</h2>
              </div>
              <div className="space-y-4 text-muted-foreground font-medium">
                <p>
                  Once an order is placed and confirmed, it cannot be cancelled as a general rule.
                </p>
                <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl text-orange-900 flex gap-4">
                  <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold leading-relaxed">
                    However, cancellation requests may be accepted <span className="underline underline-offset-4 decoration-2">only before the order reaches the "Out for Delivery" stage</span>. Once the order is marked as "Out for Delivery" or "Delivered", cancellation will not be allowed under any circumstances.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Refund Eligibility */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <Undo2 className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-headline font-black text-foreground uppercase tracking-tight">2. Refund Eligibility</h2>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground font-bold">Refunds are applicable only under the following conditions:</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="p-4 bg-muted/20 rounded-2xl text-sm font-medium border border-transparent hover:border-primary/10 transition-colors">Order successfully cancelled before "Out for Delivery" stage (Online Payments only).</li>
                  <li className="p-4 bg-muted/20 rounded-2xl text-sm font-medium border border-transparent hover:border-primary/10 transition-colors">Order cancelled by Bhartiya Swad due to unforeseen circumstances.</li>
                  <li className="p-4 bg-muted/20 rounded-2xl text-sm font-medium border border-transparent hover:border-primary/10 transition-colors">Delivered items are significantly different from what was ordered.</li>
                  <li className="p-4 bg-muted/20 rounded-2xl text-sm font-medium border border-transparent hover:border-primary/10 transition-colors">Packaging was tampered with or damaged at the time of delivery.</li>
                </ul>
                <div className="mt-6 space-y-2 border-l-4 border-primary pl-6">
                  <p className="text-sm text-foreground font-black"><span className="text-primary mr-2">●</span> Refunds are only applicable for prepaid (online payment) orders.</p>
                  <p className="text-sm text-muted-foreground font-bold"><span className="text-muted-foreground mr-2">●</span> For Cash on Delivery (COD) orders, no refund is applicable if the order is cancelled before delivery, as no payment has been made.</p>
                </div>
              </div>
            </section>

            {/* Section 3: Refund Process */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-headline font-black text-foreground uppercase tracking-tight">3. Refund Process</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <p className="text-xs font-black text-primary uppercase tracking-widest">Online Payments</p>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    Eligible refunds will be processed to the <span className="text-foreground font-bold">original payment method within 5–7 business days</span>.
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Cash on Delivery (COD)</p>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    No refund is applicable for pre-delivery cancellations. Verified post-delivery issues may be refunded as <span className="text-foreground font-bold">platform credits or bank transfer</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4: Feedback */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-headline font-black text-foreground uppercase tracking-tight">4. Concerns & Feedback</h2>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground font-medium">
                  Once the order is Out for Delivery or Delivered, cancellation and refund requests will not be accepted. 
                  However, we value your experience. If you face any issues related to food quality, taste, packaging, or delivery:
                </p>
                <div className="bg-primary/5 p-8 rounded-[2rem] border border-dashed border-primary/20 text-center">
                  <p className="text-sm font-black text-primary italic leading-relaxed">
                    "You are encouraged to share your genuine rating, feedback, or concerns through the dish rating system available in your order tracking."
                  </p>
                </div>
              </div>
            </section>

            {/* Final Note */}
            <section className="pt-12 border-t border-dashed">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center mb-4">Final Note</p>
              <p className="text-xs text-muted-foreground font-bold text-center leading-relaxed max-w-2xl mx-auto italic">
                Bhartiya Swad reserves the right to approve or deny any cancellation or refund request based on verification and internal policies.
              </p>
            </section>
          </Card>
        </div>
      </main>
    </div>
  );
}
