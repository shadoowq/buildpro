'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildSupplierNotifications, notifIconMap, timeAgo, notifHref, NotifItem } from '../lib/notifications';
import NotificationAlertBar from './NotificationAlertBar';

type Lang = 'ar' | 'en';

interface SupplierNavProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  userName: string;
  active: string;
}

const NAV_LINKS = [
  { labelAr: 'لوحة التحكم',    labelEn: 'Dashboard',         href: '/supplier-dashboard' },
  { labelAr: 'الطلبات المتاحة', labelEn: 'Available Requests', href: '/supplier-requests'  },
  { labelAr: 'عروضي',          labelEn: 'My Quotes',          href: '/my-quotes'          },
  { labelAr: 'التقارير',       labelEn: 'Reports',            href: '/supplier-reports'   },
  { labelAr: 'سلة المهملات',   labelEn: 'Trash',              href: '/supplier-trash'     },
];

export default function SupplierNav({ lang, setLang, userName, active }: SupplierNavProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState('');
  const bellRef = useRef<HTMLDivElement>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const fetchNotifs = () => {
      const userData = localStorage.getItem('currentUser');
      if (!userData) return;
      const user = JSON.parse(userData);
      setUserEmail(user.email);

      const seen: string[] = JSON.parse(localStorage.getItem(`notifSeen_${user.email}`) || '[]');
      setSeenIds(new Set(seen));

      const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
      const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
      const allRatings = JSON.parse(localStorage.getItem('ratings') || '[]');
      const allLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
      setNotifs(buildSupplierNotifications(allQuotes, allLogs, allRequests, allRatings, user.email, { limit: 10 }));
    };

    fetchNotifs();
    const onStorage = () => fetchNotifs();
    window.addEventListener('storage', onStorage);
    const interval = setInterval(fetchNotifs, 8000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifs.filter(n => n.unread && !seenIds.has(n.id)).length;

  const openBell = () => { setBellOpen(prev => !prev); };

  const markSeen = (id: string) => {
    if (seenIds.has(id)) return;
    const userData = localStorage.getItem('currentUser');
    if (!userData) return;
    const user = JSON.parse(userData);
    const updated = new Set([...seenIds, id]);
    setSeenIds(updated);
    localStorage.setItem(`notifSeen_${user.email}`, JSON.stringify([...updated]));
  };

  const handleLogout = () => { localStorage.removeItem('currentUser'); router.push('/login'); };

  return (
    <>
      {userEmail && <NotificationAlertBar notifs={notifs} lang={lang} storageKey={`notifAlerted_${userEmail}`} />}
      <nav className="bg-white border-b border-[#E8DFD3] px-4 md:px-7 flex items-center justify-between h-14 sticky top-0 z-30" dir={dir}>

        {/* logo */}
        <Link href="/supplier-dashboard" className="text-[17px] font-bold text-[#C0603E] shrink-0">
          Build<span className="text-[#8A7B6C]">Pro</span>
        </Link>

        {/* desktop links */}
        <div className="hidden md:flex gap-1">
          {NAV_LINKS.map(item => (
            <Link key={item.href} href={item.href}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${active === item.href ? 'bg-[#F3EAE0] text-[#C0603E] font-semibold' : 'text-stone-600 hover:bg-[#F7F2EC] hover:text-[#C0603E]'}`}>
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* lang toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-stone-100 rounded-xl p-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[#C0603E] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="18" height="13" alt={l} className="rounded-sm" />
                <span className="hidden lg:inline">{l.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={openBell}
              className="relative w-9 h-9 rounded-lg border border-[#E8DFD3] flex items-center justify-center hover:bg-[#F7F2EC] transition-colors">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className={`absolute top-11 ${lang === 'ar' ? 'left-0' : 'right-0'} w-80 bg-white border border-[#E8DFD3] rounded-2xl shadow-xl z-50 overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1EAE0]">
                  <span className="text-sm font-bold text-stone-900">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                  <Link href="/notifications" onClick={() => setBellOpen(false)}
                    className="text-[10px] text-[#8A7B6C] font-semibold hover:underline">
                    {lang === 'ar' ? 'عرض الكل' : 'View all'}
                  </Link>
                </div>

                {notifs.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-2xl mb-2">🔔</p>
                    <p className="text-xs text-stone-400">{lang === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#FAF7F2]">
                    {notifs.map(n => {
                      const isNew = n.unread && !seenIds.has(n.id);
                      const icon = notifIconMap[n.type];
                      return (
                        <Link key={n.id} href={notifHref(n, 'supplier')} onClick={() => { markSeen(n.id); setBellOpen(false); }}
                          className={`flex items-start gap-2.5 px-4 py-3 hover:bg-[#FAF7F2] transition-colors ${isNew ? 'bg-[#F3EAE0]/40' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg ${icon.bg} flex items-center justify-center text-sm shrink-0 mt-0.5`}>
                            {icon.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-stone-700 leading-relaxed">{lang === 'ar' ? n.textAr : n.textEn}</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(n.timestamp, lang)}</p>
                          </div>
                          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#8A7B6C] shrink-0 mt-1.5" />}
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
            className="w-9 h-9 rounded-lg bg-[#C0603E] flex items-center justify-center text-white text-xs font-bold hover:bg-[#9C4C31] transition-colors">
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
            className="md:hidden w-9 h-9 rounded-lg border border-[#E8DFD3] flex flex-col items-center justify-center gap-1 hover:bg-[#F7F2EC] transition-colors">
            <span className={`block w-4 h-0.5 bg-stone-600 transition-all origin-center ${menuOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
            <span className={`block w-4 h-0.5 bg-stone-600 transition-all ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block w-4 h-0.5 bg-stone-600 transition-all origin-center ${menuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
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
                  className={`text-sm px-4 py-3 rounded-xl font-medium transition-colors ${active === item.href ? 'bg-[#F3EAE0] text-[#C0603E] font-semibold' : 'text-stone-700 hover:bg-[#F7F2EC]'}`}>
                  {lang === 'ar' ? item.labelAr : item.labelEn}
                </Link>
              ))}
              <div className="h-px bg-[#F1EAE0] my-1" />
              <Link href="/profile" onClick={() => setMenuOpen(false)}
                className="text-sm px-4 py-3 rounded-xl font-medium text-stone-700 hover:bg-[#F7F2EC] transition-colors">
                {lang === 'ar' ? '👤 الملف الشخصي' : '👤 Profile'}
              </Link>
              {/* lang toggle in drawer */}
              <div className="flex gap-1 px-4 py-2">
                {(['ar', 'en'] as Lang[]).map(l => (
                  <button key={l} onClick={() => { setLang(l); setMenuOpen(false); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${lang === l ? 'bg-[#F3EAE0] text-[#C0603E] border-[#C0603E]/20' : 'border-[#E8DFD3] text-stone-400'}`}>
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
