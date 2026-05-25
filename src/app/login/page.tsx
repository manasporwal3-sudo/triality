"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChefHat, Mail, Lock, Shield, ArrowRight, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth as useFirebaseService, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useFirebaseService();
  const db = useFirestore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
          router.push('/admin/dashboard');
        } else {
          const lastPage = localStorage.getItem('bhartiya_swad_last_page');
          router.push(callbackUrl || lastPage || '/dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, [auth, router, callbackUrl]);

  const handleLogin = async (role: 'user' | 'admin') => {
    if (!email || !email.trim()) {
      toast.error("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (role === 'user' && !acceptedTerms) {
      toast.error("Please accept Terms & Conditions to continue");
      return;
    }

    setLoading(true);
    const loginToastId = toast.loading(role === 'admin' ? "Authenticating Admin..." : "Signing you in...");
    
    try {
      let userCredential;

      if (role === 'admin') {
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          if (email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            toast.error("Access denied. Unauthorized administrator account.", { id: loginToastId });
            setLoading(false);
            return;
          }
        } catch (err: any) {
          const isBootstrapAccount = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
          const canAttemptCreation = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential';
          
          if (isBootstrapAccount && canAttemptCreation) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                throw err;
              }
              throw createErr;
            }
          } else {
            throw err;
          }
        }

        if (typeof window !== 'undefined') localStorage.setItem('bhartiya_swad_admin', 'true');

        await setDoc(doc(db, 'admin_roles', userCredential.user.uid), {
          email: userCredential.user.email,
          role: 'admin',
          updatedAt: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: 'System Administrator',
          displayName: 'System Administrator',
          role: 'admin',
          lastLogin: serverTimestamp()
        }, { merge: true });
        
        toast.success("Admin Access Granted", { id: loginToastId });
        router.push('/admin/dashboard');

      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, 'users', userCredential.user.uid);
        
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            id: userCredential.user.uid,
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName || email.split('@')[0],
            displayName: userCredential.user.displayName || email.split('@')[0],
            role: 'user',
            totalOrders: 0,
            totalSpent: 0,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          });
        } else {
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        }

        toast.success("Welcome back!", { id: loginToastId });
        const lastPage = localStorage.getItem('bhartiya_swad_last_page');
        router.push(callbackUrl || lastPage || '/dashboard');
      }
    } catch (error: any) {
      setLoading(false);
      let message = "Invalid email or password.";
      if (error.code === 'auth/too-many-requests') {
        message = "Too many failed attempts. Try again later.";
      }
      toast.error(message, { id: loginToastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl relative z-10 border-none rounded-[2.5rem] overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="bg-primary text-white p-10 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md transition-transform hover:scale-110">
          <ChefHat className="w-12 h-12 text-white" />
        </div>
        <CardTitle className="text-4xl font-headline font-black tracking-tight">Welcome Back</CardTitle>
        <p className="text-white/80 mt-2 font-medium">Log in to savor authentic flavors</p>
      </CardHeader>
      <CardContent className="p-10">
        <Tabs defaultValue="user" className="w-full">
          <TabsList className="grid grid-cols-2 mb-8 p-1 bg-muted rounded-2xl h-12">
            <TabsTrigger value="user" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">User</TabsTrigger>
            <TabsTrigger value="admin" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Admin</TabsTrigger>
          </TabsList>
          
          <TabsContent value="user" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    placeholder="name@example.com" 
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    className="pl-12 pr-12 h-14 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-3 mt-4 px-1 animate-in fade-in slide-in-from-left-2 duration-500">
                <Checkbox 
                  id="terms" 
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="mt-0.5 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-[11px] font-bold text-muted-foreground cursor-pointer select-none leading-relaxed"
                  >
                    I agree to the <Link href="/terms-and-conditions" className="text-primary hover:underline underline-offset-4">Terms & Conditions</Link> and <Link href="/privacy-policy" className="text-primary hover:underline underline-offset-4">Privacy Policy</Link>
                  </label>
                </div>
              </div>

              <Button 
                className="w-full h-14 bg-primary hover:bg-primary/90 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleLogin('user')}
                disabled={loading || !acceptedTerms}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> <span>Verifying...</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <div className="bg-foreground border border-accent/30 p-5 rounded-2xl flex items-start gap-4 mb-2 shadow-sm animate-pulse">
              <Shield className="w-6 h-6 text-accent mt-0.5" />
              <p className="text-xs text-white font-black leading-relaxed">
                Management console is restricted. Please use your authorized system credentials to proceed.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    placeholder="admin@bhartiyaswad.com" 
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    className="pl-12 pr-12 h-14 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <Button 
                className="w-full h-14 bg-accent hover:bg-accent/90 rounded-2xl font-black text-lg shadow-xl shadow-accent/20 transition-all active:scale-95"
                onClick={() => handleLogin('admin')}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
                  </div>
                ) : "System Login"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="p-10 pt-0 text-center justify-center border-t border-dashed mt-4">
        <p className="text-sm text-muted-foreground font-medium mt-6">
          New to the taste? <Link href="/signup" className="text-primary font-black hover:underline underline-offset-4">Create an Account</Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden" suppressHydrationWarning>
      <div className="absolute top-8 left-8 z-50">
        <Link href="/">
          <Button variant="ghost" className="font-bold gap-2 rounded-xl hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
      </div>

      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="grid grid-cols-12 gap-4 h-full w-full rotate-12 scale-150">
          {Array.from({ length: 48 }).map((_, i) => (
            <ChefHat key={i} className="w-12 h-12" />
          ))}
        </div>
      </div>

      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-primary font-black text-lg font-headline">Bhartiya Swad...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
