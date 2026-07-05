'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/lib/store';

type Lang = 'ar' | 'en';

const NAV_LINKS = [
  { icon: '🏠', labelAr: 'لوحة التحكم',        labelEn: 'Dashboard', href: '/admin'          },
  { icon: '👥', labelAr: 'المستخدمون',          labelEn: 'Users',     href: '/admin/users'    },
  { icon: '📋', labelAr: 'الطلبات',            labelEn: 'Requests',  href: '/admin/requests' },
  { icon: '📄', labelAr: 'العروض',             labelEn: 'Quotes',    href: '/admin/quotes'   },
  { icon: '💾', labelAr: 'البيانات والنسخ',     labelEn: 'Data',      href: '/admin/data'     },
];

export default function AdminSidebar({ lang, setLang, active }: { lang: Lang; setLang: (l: Lang) => void; active: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleLogout = () => { logout(); router.push('/login'); };

  const linkCls = (href: string) =>
    `text-[13px] px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2.5 ${active === href ? 'bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] font-bold' : 'text-[var(--chrome-ink2)] hover:text-white hover:bg-white/5'}`;

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex fixed top-0 bottom-0 start-0 w-[190px] z-40 flex-col bg-[var(--chrome)] px-3 py-5" dir={dir}>
        <Link href="/admin" className="px-2 pb-5 shrink-0 flex items-center gap-2">
          <span className="text-lg font-bold text-[var(--brand)]">Build<span className="text-white/85">Pro</span></span>
          <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Admin</span>
        </Link>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {NAV_LINKS.map(item => (
            <Link key={item.href} href={item.href} className={linkCls(item.href)}>
              <span className="text-sm">{item.icon}</span>
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-1.5 pt-4 border-t border-[var(--chrome-line)]">
          <div className="flex gap-1 px-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${lang === l ? 'bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)]' : 'text-[var(--chrome-ink2)] hover:text-white hover:bg-white/5'}`}>
                {l === 'ar' ? 'العربية' : 'EN'}
              </button>
            ))}
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 text-[13px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {lang === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <nav className="md:hidden bg-white border-b border-[var(--line)] px-4 flex items-center justify-between h-14 sticky top-0 z-30" dir={dir}>
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-[17px] font-bold text-[var(--brand-strong)]">Build<span className="text-[var(--sec)]">Pro</span></span>
          <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Admin</span>
        </Link>
        <button onClick={() => setMenuOpen(p => !p)}
          className="w-9 h-9 rounded-lg border border-[var(--line)] flex flex-col items-center justify-center gap-1 hover:bg-[var(--bg)] transition-colors">
          <span className={`block w-4 h-0.5 bg-stone-600 transition-all origin-center ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
          <span className={`block w-4 h-0.5 bg-stone-600 transition-all ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block w-4 h-0.5 bg-stone-600 transition-all origin-center ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
        </button>
      </nav>

      {/* mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className={`absolute top-14 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-64 bg-white h-[calc(100vh-56px)] shadow-xl overflow-y-auto`}
            onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex flex-col p-3 gap-1">
              {NAV_LINKS.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className={`text-sm px-4 py-3 rounded-xl font-medium transition-colors ${active === item.href ? 'bg-[var(--tint)] text-[var(--brand-strong)] font-semibold' : 'text-stone-700 hover:bg-[var(--bg)]'}`}>
                  {item.icon} {lang === 'ar' ? item.labelAr : item.labelEn}
                </Link>
              ))}
              <div className="h-px bg-[var(--line-soft)] my-1" />
              <div className="flex gap-1 px-4 py-2">
                {(['ar', 'en'] as Lang[]).map(l => (
                  <button key={l} onClick={() => { setLang(l); setMenuOpen(false); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${lang === l ? 'bg-[var(--tint)] text-[var(--brand-strong)] border-[var(--brand-strong)]/20' : 'border-[var(--line)] text-stone-500'}`}>
                    {l === 'ar' ? 'العربية' : 'EN'}
                  </button>
                ))}
              </div>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="text-sm px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors text-right">
                {lang === 'ar' ? '🚪 تسجيل خروج' : '🚪 Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
