'use client';

import { createContext, useContext, useState } from 'react';

type ToastType = 'success' | 'error';
type Dir = 'rtl' | 'ltr';

interface ToastItem { id: number; message: string; type: ToastType; dir: Dir }

const ToastContext = createContext<((message: string, type?: ToastType) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const lang = (typeof window !== 'undefined' ? localStorage.getItem('language') : 'ar') as 'ar' | 'en' | null;
    const dir: Dir = lang === 'en' ? 'ltr' : 'rtl';
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, dir }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} dir={t.dir} className="font-cairo"
            style={{
              background: t.type === 'success' ? '#059669' : '#DC2626',
              color: '#fff', padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              boxShadow: '0 8px 20px rgba(0,0,0,0.18)', minWidth: 260, maxWidth: 420,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              pointerEvents: 'auto',
            }}>
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: '20px', flexShrink: 0 }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
