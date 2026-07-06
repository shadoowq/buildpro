'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buildNotifications, notifIconMap, timeAgo, notifHref, NotifItem } from '../lib/notifications';
import { purgeExpiredTrash } from '../lib/requestHelpers';
import NotificationAlertBar from './NotificationAlertBar';
import {
  getCurrentUser, logout,
  getRequests, getQuotes, getActivityLogs,
  getDeletedRequests, getDeletedDrafts,
  getNotifSeenIds, setNotifSeenIds,
} from '../lib/store';

type Lang = 'ar' | 'en';

interface ContractorNavProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  userName: string;
  active: string;
}

const NAV_LINKS = [
  { icon: '🏠', labelAr: 'لوحة التحكم',  labelEn: 'Dashboard',   href: '/dashboard'   },
  { icon: '📁', labelAr: 'المشاريع',     labelEn: 'Projects',     href: '/projects'    },
  { icon: '📋', labelAr: 'طلباتي',       labelEn: 'My Requests',  href: '/my-requests' },
  { icon: '📄', labelAr: 'عروض الأسعار', labelEn: 'Quotes',       href: '/my-quotes'   },
  { icon: '🏢', labelAr: 'الموردون',     labelEn: 'Suppliers',    href: '/suppliers'   },
  { icon: '📝', labelAr: 'المسودات',     labelEn: 'Drafts',       href: '/drafts'      },
  { icon: '📊', labelAr: 'التقارير',     labelEn: 'Reports',      href: '/reports'     },
];

export default function ContractorNav({ lang, setLang, userName, active }: ContractorNavProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [trashCount, setTrashCount] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const bellRef = useRef<HTMLDivElement>(null);
  const bellSideRef = useRef<HTMLDivElement>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const fetchNotifs = () => {
      const user = getCurrentUser<any>();
      if (!user) return;
      setUserEmail(user.email);

      setSeenIds(new Set(getNotifSeenIds(user.email)));

      const allReqs = getRequests().filter(r => r.contractorId === user.email);

      const allQuotes = getQuotes();
      const allLogs   = getActivityLogs();
      setNotifs(buildNotifications(allQuotes, allLogs, allReqs, { limit: 10 }));

      purgeExpiredTrash();
      const deletedRequests = getDeletedRequests().filter(r => r.contractorId === user.email);
      const deletedDrafts = getDeletedDrafts().filter((d: any) => d.contractorId === user.email);
      setTrashCount(deletedRequests.length + deletedDrafts.length);
    };

    fetchNotifs();
    const onStorage = () => fetchNotifs();
    window.addEventListener('storage', onStorage);
    const interval = setInterval(fetchNotifs, 8000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const inMobile = bellRef.current?.contains(e.target as Node);
      const inSide = bellSideRef.current?.contains(e.target as Node);
      if (!inMobile && !inSide) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = notifs.filter(n => n.unread && !seenIds.has(n.id)).length;

  const openBell = () => { setBellOpen(prev => !prev); };

  const markSeen = (id: string) => {
    if (seenIds.has(id)) return;
    const user = getCurrentUser<any>();
    if (!user) return;
    const updated = new Set([...seenIds, id]);
    setSeenIds(updated);
    setNotifSeenIds(user.email, [...updated]);
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  /* shared bell dropdown panel — rendered from the sidebar (desktop) or the top bar (mobile) */
  const bellPanel = (positionCls: string) => bellOpen && (
    <div className={`${positionCls} w-80 bg-white border border-[var(--line)] rounded-2xl shadow-xl z-50 overflow-hidden`} dir={dir}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line-soft)]">
        <span className="text-sm font-bold text-stone-900">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
        <Link href="/notifications" onClick={() => setBellOpen(false)}
          className="text-[10px] text-[var(--sec)] font-semibold hover:underline">
          {lang === 'ar' ? 'عرض الكل' : 'View all'}
        </Link>
      </div>
      {notifs.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-2xl mb-2">🔔</p>
          <p className="text-xs text-stone-400">{lang === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-[var(--line-soft)]">
          {notifs.map(n => {
            const isNew = n.unread && !seenIds.has(n.id);
            const icon = notifIconMap[n.type];
            return (
              <Link key={n.id} href={notifHref(n)} onClick={() => { markSeen(n.id); setBellOpen(false); }}
                className={`flex items-start gap-2.5 px-4 py-3 hover:bg-[var(--bg-soft)] transition-colors ${isNew ? 'bg-[var(--tint)]/40' : ''}`}>
                <div className={`w-8 h-8 rounded-lg ${icon.bg} flex items-center justify-center text-sm shrink-0 mt-0.5`}>
                  {icon.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-stone-700 leading-relaxed">{lang === 'ar' ? n.textAr : n.textEn}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(n.timestamp, lang)}</p>
                </div>
                {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[var(--sec)] shrink-0 mt-1.5" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      {userEmail && <NotificationAlertBar notifs={notifs} lang={lang} storageKey={`notifAlerted_${userEmail}`} />}

      {/* ── DESKTOP SIDEBAR (graphite) ── */}
      <aside className="hidden md:flex fixed top-0 bottom-0 start-0 w-[190px] z-40 flex-col bg-[var(--chrome)] px-3 py-5" dir={dir}>
        <Link href="/dashboard" className="text-lg font-bold text-[var(--brand)] px-2 pb-5 shrink-0">
          Build<span className="text-white/85">Pro</span>
        </Link>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {NAV_LINKS.map(item => (
            <Link key={item.href} href={item.href}
              className={`text-[13px] px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2.5 ${active === item.href ? 'bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] font-bold' : 'text-[var(--chrome-ink2)] hover:text-white hover:bg-white/5'}`}>
              <span className="text-sm">{item.icon}</span>
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
          <Link href="/trash"
            className={`text-[13px] px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2.5 ${active === '/trash' ? 'bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] font-bold' : 'text-[var(--chrome-ink2)] hover:text-white hover:bg-white/5'}`}>
            <span className="text-sm">🗑</span>
            {lang === 'ar' ? 'سلة المهملات' : 'Trash'}
            {trashCount > 0 && (
              <span className="ms-auto min-w-[18px] h-[18px] bg-white/15 text-white/80 rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                {trashCount > 9 ? '9+' : trashCount}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-auto flex flex-col gap-1.5 pt-4 border-t border-[var(--chrome-line)]">
          {/* bell */}
          <div className="relative" ref={bellSideRef}>
            <button onClick={openBell}
              className="w-full flex items-center gap-2.5 text-[13px] font-medium text-[var(--chrome-ink2)] hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition-colors">
              <span className="text-sm">🔔</span>
              {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              {unreadCount > 0 && (
                <span className="ms-auto min-w-[18px] h-[18px] bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {bellPanel('absolute bottom-0 start-[calc(100%+14px)]')}
          </div>

          {/* language */}
          <div className="flex gap-1 px-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${lang === l ? 'bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)]' : 'text-[var(--chrome-ink2)] hover:text-white hover:bg-white/5'}`}>
                {l === 'ar' ? 'العربية' : 'EN'}
              </button>
            ))}
          </div>

          {/* profile + logout */}
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0 rounded-lg hover:bg-white/5 px-1.5 py-1.5 transition-colors">
              <span className="w-7 h-7 rounded-lg bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center text-[11px] font-bold shrink-0">
                {userName.charAt(0) || 'م'}
              </span>
              <span className="text-[11.5px] text-white/75 font-semibold truncate">{userName}</span>
            </Link>
            <button onClick={handleLogout} title={lang === 'ar' ? 'خروج' : 'Logout'}
              className="w-7 h-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center transition-colors shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <nav className="md:hidden bg-white border-b border-[var(--line)] px-4 flex items-center justify-between h-14 sticky top-0 z-30" dir={dir}>

        {/* logo */}
        <Link href="/dashboard" className="text-[17px] font-bold text-[var(--brand-strong)] shrink-0">
          Build<span className="text-[var(--sec)]">Pro</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* lang toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-stone-100 rounded-xl p-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[var(--brand-strong)] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="18" height="13" alt={l} className="rounded-sm" />
                <span className="hidden lg:inline">{l.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={openBell}
              className="relative w-9 h-9 rounded-lg border border-[var(--line)] flex items-center justify-center hover:bg-[var(--bg)] transition-colors">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {bellPanel(`absolute top-11 ${lang === 'ar' ? 'left-0' : 'right-0'}`)}
          </div>

          {/* trash */}
          <Link href="/trash"
            className="relative w-9 h-9 rounded-lg border border-[var(--line)] flex items-center justify-center hover:bg-[var(--bg)] transition-colors">
            🗑
            {trashCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-stone-400 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 border-2 border-white">
                {trashCount > 9 ? '9+' : trashCount}
              </span>
            )}
          </Link>

          {/* avatar */}
          <Link href="/profile"
            className="w-9 h-9 rounded-lg bg-[var(--brand)] flex items-center justify-center text-white text-xs font-bold hover:bg-[var(--brand-hover)] transition-colors">
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
            className="md:hidden w-9 h-9 rounded-lg border border-[var(--line)] flex flex-col items-center justify-center gap-1 hover:bg-[var(--bg)] transition-colors">
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
                  className={`text-sm px-4 py-3 rounded-xl font-medium transition-colors ${active === item.href ? 'bg-[var(--tint)] text-[var(--brand-strong)] font-semibold' : 'text-stone-700 hover:bg-[var(--bg)]'}`}>
                  {lang === 'ar' ? item.labelAr : item.labelEn}
                </Link>
              ))}
              <div className="h-px bg-[var(--line-soft)] my-1" />
              <Link href="/profile" onClick={() => setMenuOpen(false)}
                className="text-sm px-4 py-3 rounded-xl font-medium text-stone-700 hover:bg-[var(--bg)] transition-colors">
                {lang === 'ar' ? '👤 الملف الشخصي' : '👤 Profile'}
              </Link>
              {/* lang toggle in drawer */}
              <div className="flex gap-1 px-4 py-2">
                {(['ar', 'en'] as Lang[]).map(l => (
                  <button key={l} onClick={() => { setLang(l); setMenuOpen(false); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${lang === l ? 'bg-[var(--tint)] text-[var(--brand-strong)] border-[var(--brand-strong)]/20' : 'border-[var(--line)] text-stone-400'}`}>
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
