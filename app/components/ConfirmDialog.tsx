'use client';

import { createContext, useContext, useState } from 'react';
import { useEscapeKey } from './useEscapeKey';

type Dir = 'rtl' | 'ltr';

interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmState {
  message: string;
  options?: ConfirmOptions;
  dir: Dir;
  resolve: (value: boolean) => void;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ConfirmState[]>([]);
  const state = queue[0] || null;

  const confirmDialog: ConfirmFn = (message, options) => {
    const lang = (typeof window !== 'undefined' ? localStorage.getItem('language') : 'ar') as 'ar' | 'en' | null;
    const dir: Dir = lang === 'en' ? 'ltr' : 'rtl';
    return new Promise<boolean>(resolve => {
      setQueue(prev => [...prev, { message, options, dir, resolve }]);
    });
  };

  const handle = (result: boolean) => {
    state?.resolve(result);
    setQueue(prev => prev.slice(1));
  };

  useEscapeKey(() => { if (state) handle(false); });

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4" onClick={() => handle(false)}>
          <div dir={state.dir} role="dialog" aria-modal="true" className="bg-white rounded-2xl p-6 max-w-sm w-full font-cairo" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-stone-700 mb-5 text-center leading-relaxed">{state.message}</p>
            <div className="flex gap-3">
              <button onClick={() => handle(false)}
                className="flex-1 bg-stone-100 text-stone-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-stone-200 transition-colors">
                {state.options?.cancelText || (state.dir === 'rtl' ? 'إلغاء' : 'Cancel')}
              </button>
              <button onClick={() => handle(true)}
                className={`flex-1 font-semibold py-2.5 rounded-xl text-sm text-white transition-colors ${state.options?.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--sec)] hover:bg-[var(--sec-hover)]'}`}>
                {state.options?.confirmText || (state.dir === 'rtl' ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
