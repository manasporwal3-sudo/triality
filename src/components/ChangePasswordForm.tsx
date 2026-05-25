"use client"

import React, { useState } from 'react';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword 
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Loader2, Lock, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordForm() {
  const auth = useFirebaseAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("The new password and confirmation do not match.");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Your new password must be at least 6 characters long.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      toast.error("User session expired. Please login again.");
      return;
    }

    setLoading(true);
    const updateToast = toast.loading("Verifying and updating credentials...");

    try {
      const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, formData.newPassword);

      toast.success("Security Updated Successfully!", { id: updateToast });

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error("Password Update Error:", error);
      
      let message = "Password update failed. Please try again.";
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Incorrect current password. Verification failed.";
      } else if (error.code === 'auth/requires-recent-login') {
        message = "For security, please log out and log back in before changing your password.";
      } else if (error.code === 'auth/weak-password') {
        message = "The new password is too weak. Try adding symbols or numbers.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many failed attempts. Try again in a few minutes.";
      }

      toast.error(message, { id: updateToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
      <CardHeader className="bg-muted/20 p-8 border-b">
        <CardTitle className="text-xl font-headline font-black flex items-center gap-3 text-foreground">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Update Security Credentials
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="currentPassword"
                  name="currentPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Verify existing password" 
                  className="pl-10 pr-10 h-12 rounded-xl border-muted focus-visible:ring-primary/20"
                  value={formData.currentPassword}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters" 
                    className="pl-10 pr-10 h-12 rounded-xl border-muted focus-visible:ring-primary/20"
                    value={formData.newPassword}
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
                <Label htmlFor="confirmPassword" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat new password" 
                    className="pl-10 pr-10 h-12 rounded-xl border-muted focus-visible:ring-primary/20"
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
                <Loader2 className="w-5 h-5 animate-spin" /> <span>Securing...</span>
              </div>
            ) : (
              "Securely Update Password"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="bg-muted/10 p-6 border-t border-dashed">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
          <p className="text-[10px] text-muted-foreground font-bold italic leading-relaxed">
            Note: For your security, this action requires re-authentication. Your session will be refreshed upon successful update.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
