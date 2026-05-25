"use client"

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, FileText, ChefHat } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] animate-in fade-in duration-500">
      {/* Simple Header */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b px-6 py-4">
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
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <FileText className="w-8 h-8" />
            </div>
            <h1 className="text-5xl font-headline font-black tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Last Updated: October 2023</p>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white p-10 md:p-16 space-y-10 leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using the Bhartiya Swad application, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">2. Account Responsibility</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">3. Orders and Pricing</h2>
              <p className="text-muted-foreground">
                All orders placed through our App are subject to availability and acceptance. We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion. Prices for our products are subject to change without notice.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">4. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Bhartiya Swad and its affiliates will not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
              </p>
            </section>

            <section className="space-y-4 pt-8 border-t border-dashed">
              <h2 className="text-2xl font-headline font-black text-foreground">5. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms shall be governed by and construed in accordance with the laws of Bharat, without regard to its conflict of law provisions.
              </p>
            </section>
          </Card>
        </div>
      </main>
    </div>
  );
}