'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Lang = 'ar' | 'en';

export default function HelpTooltip({ lang, textAr, textEn }: { lang: Lang; textAr: string; textEn: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const show = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    setOpen(true);
  };
  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => hide();
    const onDocClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) hide();
    };
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('click', onDocClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('click', onDocClick);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={e => { e.stopPropagation(); show(); }}
        aria-label={lang === 'ar' ? 'مساعدة' : 'Help'}
        className="w-[18px] h-[18px] rounded-full bg-white border-2 border-[#C0603E] text-[#C0603E] text-[11px] font-bold inline-flex items-center justify-center hover:bg-[#C0603E] hover:text-white transition-colors cursor-help shrink-0 align-middle shadow-sm"
      >
        ؟
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
          className="w-56 max-w-[80vw] rounded-lg bg-stone-800 text-white text-[11px] leading-relaxed px-3 py-2 shadow-xl pointer-events-none"
        >
          {lang === 'ar' ? textAr : textEn}
        </div>,
        document.body
      )}
    </>
  );
}
