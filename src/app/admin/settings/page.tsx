
"use client"

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-headline font-black mb-2 flex items-center gap-3">
          <SettingsIcon className="w-10 h-10 text-primary" />
          System Settings
        </h1>
        <p className="text-muted-foreground font-medium">Manage your administrative access and system-level security.</p>
      </div>

      <div className="max-w-2xl">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
