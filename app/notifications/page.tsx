'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import { buildNotifications, notifIconMap, timeAgo, NotifItem } from '../lib/notifications';

type Lang = 'ar' | 'en';

const T = {
  title:        { ar: 'الإشعارات',          en: 'Notifications'        },
  subtitle:     { ar: 'كل التحديثات على طلباتك وعروضك', en: 'All updates on your requests and quotes' },
  markAllRead:  { ar: 'تحديد الكل كمقروء',  en: 'Mark all as read'      },
  noNotifs:     { ar: 'لا توجد إشعارات بعد', en: 'No notifications yet' },
  noNotifsSub:  { ar: 'ستظهر هنا أي تحديثات على طلباتك', en: 'Updates on your requests will show up here' },
};

function t(key: keyof typeof T, lang: Lang): string {
  return T[key][lang];
}

export default function NotificationsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    let user: any;
    try { user = JSON.parse(userData); } catch { router.push('/login'); return; }
    if (user.userType === 'supplier') { router.push('/supplier-requests'); return; }
    setUserEmail(user.email || '');
    if (user.name) setUserName(user.name);

    try { setRequests((JSON.parse(localStorage.getItem('requests') || '[]')).filter((r: any) => r.contractorId === user.email)); } catch {}
    try { setQuotes(JSON.parse(localStorage.getItem('quotes') || '[]')); } catch {}
    try { setActivityLogs(JSON.parse(localStorage.getItem('activityLogs') || '[]')); } catch {}
    try { setSeenIds(new Set(JSON.parse(localStorage.getItem(`notifSeen_${user.email}`) || '[]'))); } catch {}

    const savedLang = localStorage.getItem('language') as Lang;
    if (savedLang) setLang(savedLang);
    const onStorage = (e: StorageEvent) => { if (e.key === 'language' && e.newValue) setLang(e.newValue as Lang); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  const notifs: NotifItem[] = buildNotifications(quotes, activityLogs, requests.map(r => r.id), { includeLogs: true });

  const markAllRead = () => {
    const updated = new Set([...seenIds, ...notifs.map(n => n.id)]);
    setSeenIds(updated);
    if (userEmail) localStorage.setItem(`notifSeen_${userEmail}`, JSON.stringify([...updated]));
  };

  const markRead = (id: string) => {
    if (seenIds.has(id)) return;
    const updated = new Set([...seenIds, id]);
    setSeenIds(updated);
    if (userEmail) localStorage.setItem(`notifSeen_${userEmail}`, JSON.stringify([...updated]));
  };

  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>
      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/notifications" />

      <div className="bg-[#C0603E] px-4 md:px-7 pt-6 pb-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-bold mb-1">{t('title', lang)}</h1>
            <p className="text-white/50 text-xs">{t('subtitle', lang)}</p>
          </div>
          {notifs.length > 0 && (
            <button onClick={markAllRead}
              className="bg-[#8A7B6C] hover:bg-[#6F6255] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
              {t('markAllRead', lang)}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-7 py-6 max-w-2xl mx-auto">
        <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="text-3xl mb-3">🔔</span>
              <p className="text-sm font-bold text-stone-700">{t('noNotifs', lang)}</p>
              <p className="text-xs text-stone-400 mt-1">{t('noNotifsSub', lang)}</p>
            </div>
          ) : (
            notifs.map(n => {
              const icon = notifIconMap[n.type];
              const isNew = !seenIds.has(n.id);
              return (
                <Link key={n.id} href={`/my-requests?reqId=${n.requestId}`} onClick={() => markRead(n.id)}
                  className={`flex gap-3 px-5 py-4 border-b border-[#FAF7F2] last:border-0 hover:bg-[#FFFDF9] transition-colors ${isNew ? 'bg-[#F3EAE0]/40' : ''}`}>
                  <div className={`w-9 h-9 rounded-lg ${icon.bg} flex items-center justify-center text-base ${icon.color} shrink-0`}>
                    {icon.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 leading-relaxed">{lang === 'ar' ? n.textAr : n.textEn}</p>
                    <p className="text-[11px] text-stone-400 mt-1">{timeAgo(n.timestamp, lang)}</p>
                  </div>
                  {isNew && <span className="w-2 h-2 rounded-full bg-[#8A7B6C] shrink-0 mt-1.5" />}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
