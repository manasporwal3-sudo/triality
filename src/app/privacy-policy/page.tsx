"use client"

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck, ChefHat } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
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
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-5xl font-headline font-black tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Effective Date: October 2023</p>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white p-10 md:p-16 space-y-10 leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground">
                At Bhartiya Swad, we respect your privacy and are committed to protecting it through our compliance with this policy. 
                This policy describes the types of information we may collect from you or that you may provide when you visit our 
                website or mobile application and our practices for collecting, using, maintaining, protecting, and disclosing that information.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">2. Data We Collect</h2>
              <p className="text-muted-foreground">We collect several types of information from and about users of our App, including:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Personal Data:</strong> Name, email address, telephone number, and delivery address.</li>
                <li><strong>Order History:</strong> Information about the meals you have ordered and your preferences.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, and operating system.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">We use information that we collect about you or that you provide to us:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>To provide, maintain, and improve our services.</li>
                <li>To process and deliver your orders efficiently.</li>
                <li>To manage your account and provide customer support.</li>
                <li>To notify you about changes to our App or any products or services we offer.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-headline font-black text-foreground">4. Data Protection</h2>
              <p className="text-muted-foreground">
                We have implemented measures designed to secure your personal information from accidental loss and from unauthorized 
                access, use, alteration, and disclosure. All information you provide to us is stored on our secure servers 
                protected by industry-standard firewalls.
              </p>
            </section>

            <section className="space-y-4 pt-8 border-t border-dashed">
              <h2 className="text-2xl font-headline font-black text-foreground">5. Contact Information</h2>
              <p className="text-muted-foreground">
                To ask questions or comment about this privacy policy and our privacy practices, contact us at:
              </p>
              <div className="bg-muted/30 p-6 rounded-2xl">
                <p className="font-bold text-foreground">Bhartiya Swad Support</p>
                <p className="text-sm text-primary font-black">support@bhartiyaswad.com</p>
              </div>
            </section>
          </Card>
        </div>
      </main>
    </div>
  );
}