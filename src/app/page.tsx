
"use client"

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChefHat, Utensils, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroBackground from '@/components/HeroBackground';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col selection:bg-primary selection:text-white">
      <HeroBackground />
      
      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-3 group cursor-pointer animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-xl shadow-primary/20 transition-transform group-hover:scale-110">
            <ChefHat className="text-white w-6 h-6" />
          </div>
          <span className="font-headline text-xl font-black tracking-tight text-foreground">Bhartiya Swad</span>
        </div>
        
        <nav className="flex gap-4 md:gap-8 items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Link href="/menu" className="hidden sm:block text-sm font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
            <Utensils className="w-4 h-4" /> Explore Menu
          </Link>
          <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
            Login
          </Link>
          <Link href="/signup">
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 font-black px-8 rounded-2xl h-12 transition-all hover:scale-105 active:scale-95">
              Sign Up
            </Button>
          </Link>
        </nav>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-start justify-center px-6 md:px-20 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl space-y-10">
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-xs font-black uppercase tracking-widest border border-primary/5">
              <Sparkles className="w-3 h-3" />
              Now Serving Nationwide
            </div>
            <h1 className="text-6xl md:text-8xl font-headline font-black text-foreground leading-[1.05] tracking-tighter">
              Taste of <span className="text-gradient-saffron italic">India</span> <br />
              at Your <span className="relative">
                Doorstep
                <span className="absolute bottom-2 left-0 w-full h-3 bg-primary/20 -z-10 rounded-full" />
              </span>
            </h1>
          </div>
          
          <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed font-medium max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Bhartiya Swad brings you the most authentic flavors from the <span className="text-foreground font-bold">streets of Mumbai</span> to the <span className="text-foreground font-bold">heart of Delhi</span>. Freshly prepared and delivered with love.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start pt-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Link href="/menu" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-xl rounded-3xl shadow-2xl shadow-primary/30 bg-gradient-to-br from-primary to-[#FF9933] hover:brightness-110 group font-black transition-all hover:scale-105 active:scale-95 text-white border-none">
                Start Your Order 
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            <Link href="/menu" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 text-xl rounded-3xl bg-white/40 backdrop-blur-md shadow-lg font-black hover:bg-white transition-all hover:scale-105 active:scale-95 border-2 border-primary/10">
                View Menu
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full p-10 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-primary/5 bg-white/20 backdrop-blur-sm">
        <div className="flex items-center gap-3 opacity-60">
          <ChefHat className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-[0.3em]">Bhartiya Swad</span>
        </div>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
          © 2025 Bhartiya Swad. All rights reserved.
        </p>
        <div className="flex gap-8">
          <Link href="/contact" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Contact Us</Link>
          <Link href="/privacy-policy" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms-and-conditions" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Terms</Link>
          <Link href="/refund-policy" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link>
        </div>
      </footer>
    </div>
  );
}
