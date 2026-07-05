'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import SupplierNav from '../components/SupplierNav';
import { buildNotifications, buildSupplierNotifications, notifIconMap, timeAgo, notifHref, NotifItem } from '../lib/notifications';
import {
  getCurrentUser, getLanguage, setLanguage,
  getRequests, getQuotes, getRatings, getActivityLogs, getRequestQuestions,
  getNotifSeenIds, setNotifSeenIds,
} from '../lib/store';

type Lang = 'ar' | 'en';

const T = {
  title:        { ar: 'الإشعارات',          en: 'Notifications'        },
  subtitle:     { ar: 'كل التحديثات على طلباتك وعروضك', en: 'All updates on your requests and quotes' },
  subtitleSupp: { ar: 'كل التحديثات على عروضك ودعواتك', en: 'All updates on your quotes and invitations' },
  markAllRead:  { ar: 'تحديد الكل كمقروء',  en: 'Mark all as read'      },
  noNotifs:     { ar: 'لا توجد إشعارات بعد', en: 'No notifications yet' },
  noNotifsSub:  { ar: 'ستظهر هنا أي تحديثات على طلباتك', en: 'Updates on your requests will show up here' },
  noNotifsSubSupp: { ar: 'ستظهر هنا أي تحديثات على عروضك ودعواتك', en: 'Updates on your quotes and invitations will show up here' },
  noFilterResults: { ar: 'لا توجد إشعارات في هذا التصنيف', en: 'No notifications in this category' },
  filterAll:      { ar: 'الكل',        en: 'All'      },
  filterUnread:   { ar: 'غير مقروء',   en: 'Unread'   },
  filterQuotes:   { ar: 'العروض',      en: 'Quotes'   },
  filterRequests: { ar: 'الطلبات',     en: 'Requests' },
  filterInvites:  { ar: 'الدعوات',     en: 'Invites'  },
};

type FilterTab = 'all' | 'unread' | 'quotes' | 'requests';
type SupplierFilterTab = 'all' | 'unread' | 'quotes' | 'invites';
const quoteNotifTypes: NotifItem['type'][] = ['quote', 'accepted', 'rejected', 'revision'];

function t(key: keyof typeof T, lang: Lang): string {
  return T[key][lang];
}

/* ══════════════════════ CONTRACTOR VIEW ══════════════════════ */
function ContractorNotifications({ lang, setLang, userName, userEmail }: { lang: Lang; setLang: (l: Lang) => void; userName: string; userEmail: string }) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterTab>('all');

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    setRequests(getRequests().filter((r: any) => r.contractorId === userEmail));
    setQuotes(getQuotes());
    setActivityLogs(getActivityLogs());
    setQuestions(getRequestQuestions());
    setSeenIds(new Set(getNotifSeenIds(userEmail)));
  }, [userEmail]);

  const notifs: NotifItem[] = buildNotifications(quotes, activityLogs, requests, { includeLogs: true, allQuestions: questions });

  const filteredNotifs = notifs.filter(n => {
    if (filter === 'unread') return n.unread && !seenIds.has(n.id);
    if (filter === 'quotes') return quoteNotifTypes.includes(n.type);
    if (filter === 'requests') return !quoteNotifTypes.includes(n.type);
    return true;
  });

  const unreadCount = notifs.filter(n => n.unread && !seenIds.has(n.id)).length;
  const quotesCount = notifs.filter(n => quoteNotifTypes.includes(n.type)).length;
  const requestsCount = notifs.length - quotesCount;

  const markAllRead = () => {
    const updated = new Set([...seenIds, ...notifs.map(n => n.id)]);
    setSeenIds(updated);
    if (userEmail) setNotifSeenIds(userEmail, [...updated]);
  };

  const markRead = (id: string) => {
    if (seenIds.has(id)) return;
    const updated = new Set([...seenIds, id]);
    setSeenIds(updated);
    if (userEmail) setNotifSeenIds(userEmail, [...updated]);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <ContractorNav lang={lang} setLang={setLang} userName={userName} active="/notifications" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-bold mb-1">{t('title', lang)}</h1>
            <p className="text-white/70 text-xs">{t('subtitle', lang)}</p>
          </div>
          {notifs.length > 0 && (
            <button onClick={markAllRead}
              className="bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
              {t('markAllRead', lang)}
            </button>
          )}
        </div>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {([
            ['all', t('filterAll', lang), notifs.length],
            ['unread', t('filterUnread', lang), unreadCount],
            ['quotes', t('filterQuotes', lang), quotesCount],
            ['requests', t('filterRequests', lang), requestsCount],
          ] as [FilterTab, string, number][]).map(([val, label, count]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${
                filter === val ? 'text-white border-[var(--sec)]' : 'text-white/60 border-transparent hover:text-white/70'
              }`}>
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-7 py-6 max-w-2xl mx-auto">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
          {filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="text-3xl mb-3">🔔</span>
              <p className="text-sm font-bold text-stone-700">{notifs.length === 0 ? t('noNotifs', lang) : t('noFilterResults', lang)}</p>
              {notifs.length === 0 && <p className="text-xs text-stone-500 mt-1">{t('noNotifsSub', lang)}</p>}
            </div>
          ) : (
            filteredNotifs.map(n => {
              const icon = notifIconMap[n.type];
              const isNew = n.unread && !seenIds.has(n.id);
              return (
                <Link key={n.id} href={notifHref(n)} onClick={() => markRead(n.id)}
                  className={`flex gap-3 px-5 py-4 border-b border-[var(--line-soft)] last:border-0 hover:bg-[var(--bg-soft)] transition-colors ${isNew ? 'bg-[var(--tint)]/40' : ''}`}>
                  <div className={`w-9 h-9 rounded-lg ${icon.bg} flex items-center justify-center text-base ${icon.color} shrink-0`}>
                    {icon.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 leading-relaxed">{lang === 'ar' ? n.textAr : n.textEn}</p>
                    <p className="text-xs text-stone-500 mt-1">{timeAgo(n.timestamp, lang)}</p>
                  </div>
                  {isNew && <span className="w-2 h-2 rounded-full bg-[var(--sec)] shrink-0 mt-1.5" />}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ SUPPLIER VIEW ══════════════════════ */
function SupplierNotifications({ lang, setLang, userName, userEmail }: { lang: Lang; setLang: (l: Lang) => void; userName: string; userEmail: string }) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [supplier, setSupplier] = useState<any>({ email: userEmail });
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<SupplierFilterTab>('all');

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    setQuotes(getQuotes());
    setRequests(getRequests());
    setRatings(getRatings());
    setActivityLogs(getActivityLogs());
    setQuestions(getRequestQuestions());
    setSeenIds(new Set(getNotifSeenIds(userEmail)));
    const cu = getCurrentUser<any>();
    if (cu) setSupplier(cu);
  }, [userEmail]);

  const notifs: NotifItem[] = buildSupplierNotifications(quotes, activityLogs, requests, ratings, supplier, { allQuestions: questions });

  const filteredNotifs = notifs.filter(n => {
    if (filter === 'unread') return n.unread && !seenIds.has(n.id);
    if (filter === 'quotes') return quoteNotifTypes.includes(n.type);
    if (filter === 'invites') return n.type === 'invite' || n.type === 'rated';
    return true;
  });

  const unreadCount = notifs.filter(n => n.unread && !seenIds.has(n.id)).length;
  const quotesCount = notifs.filter(n => quoteNotifTypes.includes(n.type)).length;
  const invitesCount = notifs.filter(n => n.type === 'invite' || n.type === 'rated').length;

  const markAllRead = () => {
    const updated = new Set([...seenIds, ...notifs.map(n => n.id)]);
    setSeenIds(updated);
    if (userEmail) setNotifSeenIds(userEmail, [...updated]);
  };

  const markRead = (id: string) => {
    if (seenIds.has(id)) return;
    const updated = new Set([...seenIds, id]);
    setSeenIds(updated);
    if (userEmail) setNotifSeenIds(userEmail, [...updated]);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <SupplierNav lang={lang} setLang={setLang} userName={userName} active="/notifications" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-bold mb-1">{t('title', lang)}</h1>
            <p className="text-white/70 text-xs">{t('subtitleSupp', lang)}</p>
          </div>
          {notifs.length > 0 && (
            <button onClick={markAllRead}
              className="bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
              {t('markAllRead', lang)}
            </button>
          )}
        </div>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {([
            ['all', t('filterAll', lang), notifs.length],
            ['unread', t('filterUnread', lang), unreadCount],
            ['quotes', t('filterQuotes', lang), quotesCount],
            ['invites', t('filterInvites', lang), invitesCount],
          ] as [SupplierFilterTab, string, number][]).map(([val, label, count]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${
                filter === val ? 'text-white border-[var(--sec)]' : 'text-white/60 border-transparent hover:text-white/70'
              }`}>
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-7 py-6 max-w-2xl mx-auto">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
          {filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="text-3xl mb-3">🔔</span>
              <p className="text-sm font-bold text-stone-700">{notifs.length === 0 ? t('noNotifs', lang) : t('noFilterResults', lang)}</p>
              {notifs.length === 0 && <p className="text-xs text-stone-500 mt-1">{t('noNotifsSubSupp', lang)}</p>}
            </div>
          ) : (
            filteredNotifs.map(n => {
              const icon = notifIconMap[n.type];
              const isNew = n.unread && !seenIds.has(n.id);
              return (
                <Link key={n.id} href={notifHref(n, 'supplier')} onClick={() => markRead(n.id)}
                  className={`flex gap-3 px-5 py-4 border-b border-[var(--line-soft)] last:border-0 hover:bg-[var(--bg-soft)] transition-colors ${isNew ? 'bg-[var(--tint)]/40' : ''}`}>
                  <div className={`w-9 h-9 rounded-lg ${icon.bg} flex items-center justify-center text-base ${icon.color} shrink-0`}>
                    {icon.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 leading-relaxed">{lang === 'ar' ? n.textAr : n.textEn}</p>
                    <p className="text-xs text-stone-500 mt-1">{timeAgo(n.timestamp, lang)}</p>
                  </div>
                  {isNew && <span className="w-2 h-2 rounded-full bg-[var(--sec)] shrink-0 mt-1.5" />}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ ROOT ══════════════════════ */
export default function NotificationsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [userType, setUserType] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    setLang(getLanguage());
    const user = getCurrentUser<any>();
    if (!user) { router.push('/login'); return; }
    setUserType(user.userType);
    setUserEmail(user.email || '');
    if (user.name) setUserName(user.name);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  if (!userType) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-500 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  if (userType === 'supplier') return <SupplierNotifications lang={lang} setLang={handleLangChange} userName={userName} userEmail={userEmail} />;
  return <ContractorNotifications lang={lang} setLang={handleLangChange} userName={userName} userEmail={userEmail} />;
}
