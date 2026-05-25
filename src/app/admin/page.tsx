
"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-xl"></div>
        <p className="font-bold text-muted-foreground">Entering Management Console...</p>
      </div>
    </div>
  );
}
