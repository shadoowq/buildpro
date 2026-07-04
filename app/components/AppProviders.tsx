'use client';

import { useEffect } from 'react';
import { ToastProvider } from './Toast';
import { ConfirmProvider } from './ConfirmDialog';
import { migrateLegacyPasswords } from '../lib/auth';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => { migrateLegacyPasswords(); }, []);
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
