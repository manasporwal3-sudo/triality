"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChefHat, Mail, Lock, User, Phone, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth as useFirebaseService, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const router = useRouter();
  const auth = useFirebaseService();
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const signupToast = toast.loading("Creating your account...");
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: formData.fullName
      });

      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        uid: user.uid,
        email: formData.email,
        name: formData.fullName,
        displayName: formData.fullName,
        phone: formData.phone,
        role: 'user',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });

      toast.success("Account created! Welcome to Bhartiya Swad.", { id: signupToast });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Signup Error:", error);
      let message = "An unexpected error occurred during registration.";
      if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Please log in instead.";
      } else if (error.code === 'auth/invalid-email') {
        message = "The email address is not valid.";
      } else if (error.code === 'auth/weak-password') {
        message = "The password is too weak.";
      }
      toast.error(message, { id: signupToast });
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden" suppressHydrationWarning>
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="grid grid-cols-12 gap-4 h-full w-full rotate-12 scale-150">
          {Array.from({ length: 48 }).map((_, i) => (
            <ChefHat key={i} className="w-12 h-12" />
          ))}
        </div>
      </div>

      <Card className="w-full max-w-lg shadow-2xl relative z-10 border-none rounded-[2.5rem] overflow-hidden bg-white animate-in zoom-in-95 duration-500">
        <CardHeader className="bg-primary text-white p-10 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md transition-transform hover:rotate-6">
            <ChefHat className="w-12 h-12 text-white" />
          </div>
          <CardTitle className="text-4xl font-headline font-black tracking-tight">Join Bhartiya Swad</CardTitle>
          <p className="text-white/80 mt-2 font-medium">Authentic Indian flavors are just a click away</p>
        </CardHeader>
        
        <CardContent className="p-10">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="fullName"
                      name="fullName"
                      placeholder="E.g. Arjun Sharma" 
                      className="pl-10 h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 00000 00000" 
                      className="pl-10 h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com" 
                    className="pl-10 h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full h-14 bg-primary hover:bg-primary/90 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 group"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" /> <span>Provisioning Account...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="p-10 pt-0 text-center justify-center border-t border-dashed mt-4">
          <p className="text-sm text-muted-foreground font-medium mt-6">
            Already have an account? <Link href="/login" className="text-primary font-black hover:underline underline-offset-4">Login</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
