'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Lang = 'ar' | 'en';

interface ContractorNavProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  userName: string;
  active: string;
}

interface NotifItem {
  id: string;
  type: 'quote' | 'accepted' | 'rejected' | 'revision';
  textAr: string;
  textEn: string;
  time: Date;
  unread: boolean;
}

const NAV_LINKS = [
  { labelAr: 'لوحة التحكم',  labelEn: 'Dashboard',   href: '/dashboard'   },
  { labelAr: 'طلباتي',       labelEn: 'My Requests',  href: '/my-requests' },
  { labelAr: 'عروض الأسعار', labelEn: 'Quotes',       href: '/my-quotes'   },
  { labelAr: 'الموردون',     labelEn: 'Suppliers',    href: '/suppliers'   },
  { labelAr: 'المسودات',     labelEn: 'Drafts',       href: '/drafts'      },
  { labelAr: 'التقارير',     labelEn: 'Reports',      href: '/reports'     },
];

function timeAgo(date: Date, lang: Lang): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return lang === 'ar' ? 'الآن'       : 'Just now';
  if (m < 60) return lang === 'ar' ? `${m}د`      : `${m}m`;
  if (h < 24) return lang === 'ar' ? `${h}س`      : `${h}h`;
  return             lang === 'ar' ? `${d} يوم`   : `${d}d`;
}

export default function ContractorNav({ lang, setLang, userName, active }: ContractorNavProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) return;
    const user = JSON.parse(userData);

    const seen: string[] = JSON.parse(localStorage.getItem(`notifSeen_${user.email}`) || '[]');
    setSeenIds(new Set(seen));

    const allReqs = (JSON.parse(localStorage.getItem('requests') || '[]') as any[])
      .filter(r => r.contractorId === user.email);
    const reqIds = new Set(allReqs.map(r => r.id));

    const items: NotifItem[] = (JSON.parse(localStorage.getItem('quotes') || '[]') as any[])
      .filter(q => reqIds.has(q.requestId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(q => {
        const type: NotifItem['type'] =
          q.status === 'accepted' ? 'accepted'
          : q.status === 'rejected' ? 'rejected'
          : q.status === 'revision' ? 'revision'
          : 'quote';
        return {
          id:      `q-${q.id}`,
          type,
          textAr:  type === 'quote'    ? `${q.supplierCompany} أرسل عرض على طلب #${q.requestId}`
                 : type === 'accepted' ? `تم قبول عرض ${q.supplierCompany} بسعر ${Number(q.totalPrice).toLocaleString()} ر.س`
                 : type === 'rejected' ? `تم رفض عرض ${q.supplierCompany}`
                 :                      `طلب تعديل على عرض ${q.supplierCompany}`,
          textEn:  type === 'quote'    ? `${q.supplierCompany} quoted request #${q.requestId}`
                 : type === 'accepted' ? `Accepted ${q.supplierCompany} at ${Number(q.totalPrice).toLocaleString()} SAR`
                 : type === 'rejected' ? `Rejected quote from ${q.supplierCompany}`
                 :                      `Revision requested on ${q.supplierCompany}`,
          time:    new Date(q.createdAt),
          unread:  q.status === 'pending',
        };
      });
    setNotifs(items);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifs.filter(n => n.unread && !seenIds.has(n.id)).length;

  const openBell = () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next && unreadCount > 0) {
      const userData = localStorage.getItem('currentUser');
      if (!userData) return;
      const user = JSON.parse(userData);
      const updated = new Set([...seenIds, ...notifs.map(n => n.id)]);
      setSeenIds(updated);
      localStorage.setItem(`notifSeen_${user.email}`, JSON.stringify([...updated]));
    }
  };

  const handleLogout = () => { localStorage.removeItem('currentUser'); router.push('/login'); };

  const typeIcon = { quote: '📄', accepted: '✅', rejected: '❌', revision: '✏' };
  const typeBg   = { quote: 'bg-blue-50', accepted: 'bg-emerald-50', rejected: 'bg-red-50', revision: 'bg-amber-50' };

  return (
    <>
      <nav className="bg-white border-b border-[#E2EAF2] px-4 md:px-7 flex items-center justify-between h-14 sticky top-0 z-30" dir={dir}>

        {/* logo */}
        <Link href="/dashboard" className="text-[17px] font-bold text-[#0F4C75] shrink-0">
          Build<span className="text-[#1B9AAA]">Pro</span>
        </Link>

        {/* desktop links */}
        <div className="hidden md:flex gap-1">
          {NAV_LINKS.map(item => (
            <Link key={item.href} href={item.href}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${active === item.href ? 'bg-[#EBF5FF] text-[#0F4C75] font-semibold' : 'text-slate-600 hover:bg-[#F0F4F8] hover:text-[#0F4C75]'}`}>
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* lang toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="18" height="13" alt={l} className="rounded-sm" />
                <span className="hidden lg:inline">{l.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={openBell}
              className="relative w-9 h-9 rounded-lg border border-[#E2EAF2] flex items-center justify-center hover:bg-[#F0F4F8] transition-colors">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className={`absolute top-11 ${lang === 'ar' ? 'left-0' : 'right-0'} w-80 bg-white border border-[#E2EAF2] rounded-2xl shadow-xl z-50 overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
                  <span className="text-sm font-bold text-slate-900">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                  <Link href="/my-quotes" onClick={() => setBellOpen(false)}
                    className="text-[10px] text-[#1B9AAA] font-semibold hover:underline">
                    {lang === 'ar' ? 'عرض الكل' : 'View all'}
                  </Link>
                </div>

                {notifs.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-2xl mb-2">🔔</p>
                    <p className="text-xs text-slate-400">{lang === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F8FAFC]">
                    {notifs.map(n => {
                      const isNew = n.unread && !seenIds.has(n.id);
                      return (
                        <Link key={n.id} href="/my-quotes" onClick={() => setBellOpen(false)}
                          className={`flex items-start gap-2.5 px-4 py-3 hover:bg-[#F8FAFC] transition-colors ${isNew ? 'bg-blue-50/40' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg ${typeBg[n.type]} flex items-center justify-center text-sm shrink-0 mt-0.5`}>
                            {typeIcon[n.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-700 leading-relaxed">{lang === 'ar' ? n.textAr : n.textEn}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.time, lang)}</p>
                          </div>
                          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#1B9AAA] shrink-0 mt-1.5" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* avatar */}
          <Link href="/profile"
            className="w-9 h-9 rounded-lg bg-[#0F4C75] flex items-center justify-center text-white text-xs font-bold hover:bg-[#0D3F63] transition-colors">
            {userName.charAt(0) || 'م'}
          </Link>

          {/* logout (desktop) */}
          <button onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {lang === 'ar' ? 'خروج' : 'Logout'}
          </button>

          {/* hamburger */}
          <button onClick={() => setMenuOpen(p => !p)}
            className="md:hidden w-9 h-9 rounded-lg border border-[#E2EAF2] flex flex-col items-center justify-center gap-1 hover:bg-[#F0F4F8] transition-colors">
            <span className={`block w-4 h-0.5 bg-slate-600 transition-all origin-center ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
            <span className={`block w-4 h-0.5 bg-slate-600 transition-all ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block w-4 h-0.5 bg-slate-600 transition-all origin-center ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
          </button>
        </div>
      </nav>

      {/* mobile drawer overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div
            className={`absolute top-14 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-64 bg-white h-[calc(100vh-56px)] shadow-xl overflow-y-auto`}
            onClick={e => e.stopPropagation()}
            dir={dir}>
            <div className="flex flex-col p-3 gap-1">
              {NAV_LINKS.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className={`text-sm px-4 py-3 rounded-xl font-medium transition-colors ${active === item.href ? 'bg-[#EBF5FF] text-[#0F4C75] font-semibold' : 'text-slate-700 hover:bg-[#F0F4F8]'}`}>
                  {lang === 'ar' ? item.labelAr : item.labelEn}
                </Link>
              ))}
              <div className="h-px bg-[#F1F5F9] my-1" />
              <Link href="/profile" onClick={() => setMenuOpen(false)}
                className="text-sm px-4 py-3 rounded-xl font-medium text-slate-700 hover:bg-[#F0F4F8] transition-colors">
                {lang === 'ar' ? '👤 الملف الشخصي' : '👤 Profile'}
              </Link>
              {/* lang toggle in drawer */}
              <div className="flex gap-1 px-4 py-2">
                {(['ar', 'en'] as Lang[]).map(l => (
                  <button key={l} onClick={() => { setLang(l); setMenuOpen(false); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${lang === l ? 'bg-[#EBF5FF] text-[#0F4C75] border-[#0F4C75]/20' : 'border-[#E2EAF2] text-slate-400'}`}>
                    <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="18" height="13" alt={l} className="rounded-sm" />
                    {l.toUpperCase()}
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
