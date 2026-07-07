'use client';

import { useEffect, useState } from 'react';
import { IconHardHat, IconDownload, IconShare, IconX } from './Icon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'bp-a2hs-dismissed-at';
const DISMISS_DAYS = 14;

export default function AddToHomeScreen({ lang }: { lang: 'ar' | 'en' }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    if (ios) { setVisible(true); return; }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // Chrome doesn't always fire beforeinstallprompt (engagement heuristics, a prior
    // dismissal it remembers, or a browser like Firefox that has no such event at all) —
    // fall back to manual add-via-browser-menu instructions rather than showing nothing.
    const fallbackTimer = window.setTimeout(() => setVisible(true), 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40">
      <div className="bg-[var(--chrome)] border border-white/10 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--brand)]/15 flex items-center justify-center text-[var(--chrome-active-ink)]">
          <IconHardHat className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold mb-0.5">
            {lang === 'ar' ? 'ثبّت BuildPro على شاشتك الرئيسية' : 'Install BuildPro on your home screen'}
          </p>
          {isIOS ? (
            <p className="text-white/60 text-xs leading-relaxed">
              {lang === 'ar'
                ? <>اضغط على أيقونة المشاركة <IconShare className="w-3.5 h-3.5 inline align-[-2px] mx-0.5" /> بالأسفل، ثم اختر "إضافة إلى الشاشة الرئيسية".</>
                : <>Tap the Share icon <IconShare className="w-3.5 h-3.5 inline align-[-2px] mx-0.5" /> below, then choose "Add to Home Screen".</>}
            </p>
          ) : deferredPrompt ? (
            <>
              <p className="text-white/60 text-xs leading-relaxed mb-2">
                {lang === 'ar' ? 'وصول أسرع من غير ما تفتح المتصفح — يشتغل زي أي تطبيق عادي.' : 'Faster access without opening the browser — works just like a regular app.'}
              </p>
              <button onClick={install}
                className="inline-flex items-center gap-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--on-brand)] font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">
                <IconDownload className="w-3.5 h-3.5" /> {lang === 'ar' ? 'تثبيت الآن' : 'Install Now'}
              </button>
            </>
          ) : (
            <p className="text-white/60 text-xs leading-relaxed">
              {lang === 'ar'
                ? 'افتح قائمة المتصفح (⋮ أعلى يمين) وابحث عن "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية". غير متاحة؟ جرّب من Chrome أو Edge.'
                : 'Open your browser menu (⋮ top-right) and look for "Install App" or "Add to Home Screen". Not there? Try Chrome or Edge.'}
            </p>
          )}
        </div>
        <button onClick={dismiss} aria-label={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
          className="shrink-0 text-white/40 hover:text-white/80 transition-colors p-1">
          <IconX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
