
import type {Metadata} from 'next';
import './globals.css';
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/lib/contexts/cart-context';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { FirebaseClientProvider } from '@/firebase';
import PushNotificationManager from '@/components/PushNotificationManager';

export const metadata: Metadata = {
  title: 'Bhartiya Swad – Taste of India at Your Doorstep',
  description: 'A modern 3D food ordering platform experience.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground" suppressHydrationWarning>
        <FirebaseClientProvider>
          <AuthProvider>
            <CartProvider>
              <PushNotificationManager />
              <Toaster position="top-right" reverseOrder={false} />
              {children}
              <ShadcnToaster />
            </CartProvider>
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
