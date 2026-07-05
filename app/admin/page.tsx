'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getRequestDisplayName } from '@/app/lib/requestHelpers';
import { timeAgo } from '@/app/lib/notifications';
import { getCurrentUser, getLanguage, setLanguage, getUsers, getRequests, getQuotes, getActivityLogs } from '@/app/lib/store';

type Lang = 'ar' | 'en';

const T = {
  title:       { ar: 'لوحة تحكم BuildPro',       en: 'BuildPro Control Panel' },
  subtitle:    { ar: 'نظرة شاملة على المنصة بالكامل', en: 'A complete overview of the platform' },
  users:       { ar: 'المستخدمون',                en: 'Users' },
  contractors: { ar: 'مقاول',                     en: 'Contractors' },
  suppliers:   { ar: 'مورد',                      en: 'Suppliers' },
  suspended:   { ar: 'معلّق',                     en: 'Suspended' },
  requests:    { ar: 'طلبات التسعير',             en: 'Pricing Requests' },
  open:        { ar: 'مفتوح',                     en: 'Open' },
  closed:      { ar: 'مغلق',                      en: 'Closed' },
  quotes:      { ar: 'عروض الأسعار',              en: 'Quotes' },
  pending:     { ar: 'معلّق',                     en: 'Pending' },
  accepted:    { ar: 'مقبول',                     en: 'Accepted' },
  dealsValue:  { ar: 'قيمة الصفقات المقبولة',     en: 'Accepted Deals Value' },
  sar:         { ar: 'ر.س',                       en: 'SAR' },
  storage:     { ar: 'مساحة التخزين المستخدمة',   en: 'Storage Used' },
  ofQuota:     { ar: 'من ~5MB المتاحة',           en: 'of the ~5MB quota' },
  activity:    { ar: 'آخر النشاطات على المنصة',   en: 'Latest Platform Activity' },
  noActivity:  { ar: 'لا يوجد نشاط بعد',          en: 'No activity yet' },
  manage:      { ar: 'إدارة سريعة',               en: 'Quick Management' },
  manageUsers: { ar: 'إدارة المستخدمين',          en: 'Manage Users' },
  manageUsersSub: { ar: 'توثيق، تعليق، إعادة تعيين كلمات المرور، حذف', en: 'Verify, suspend, reset passwords, delete' },
  manageReqs:  { ar: 'إدارة الطلبات',             en: 'Manage Requests' },
  manageReqsSub: { ar: 'فتح وإغلاق وحذف طلبات التسعير', en: 'Open, close, and delete pricing requests' },
  manageQuotes:{ ar: 'إدارة العروض',              en: 'Manage Quotes' },
  manageQuotesSub: { ar: 'مراجعة وإزالة عروض الأسعار', en: 'Review and remove quotes' },
  manageData:  { ar: 'البيانات والنسخ الاحتياطي', en: 'Data & Backup' },
  manageDataSub: { ar: 'تصدير، استيراد، بيانات تجريبية، مسح', en: 'Export, import, demo data, wipe' },
};
const tx = (k: keyof typeof T, lang: Lang) => T[k][lang];

export default function AdminDashboard() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const currentUser = getCurrentUser<any>() || {};
    if (currentUser.userType !== 'admin') { router.push('/login'); return; }
    setLang(getLanguage());

    setUsers(getUsers());
    setRequests(getRequests());
    setQuotes(getQuotes());
    setLogs(getActivityLogs());

    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      bytes += k.length + (localStorage.getItem(k)?.length || 0);
    }
    setStorageBytes(bytes * 2); // UTF-16: two bytes per char
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  const contractors = users.filter(u => u.userType === 'contractor');
  const suppliers = users.filter(u => u.userType === 'supplier');
  const suspendedCount = users.filter(u => u.suspended).length;
  const openReqs = requests.filter(r => r.status === 'open').length;
  const pendingQ = quotes.filter(q => q.status === 'pending').length;
  const acceptedQ = quotes.filter(q => q.status === 'accepted');
  const dealsValue = acceptedQ.reduce((s, q) => s + (Number(q.totalPrice) || 0), 0);
  const storagePct = Math.min(100, Math.round((storageBytes / (5 * 1024 * 1024)) * 100));
  const reqName = (id: number) => getRequestDisplayName(requests.find(r => r.id === id), lang, id);

  const recentLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

  const statCards = [
    { icon: '👥', val: users.length, label: tx('users', lang), sub: `${contractors.length} ${tx('contractors', lang)} · ${suppliers.length} ${tx('suppliers', lang)}${suspendedCount ? ` · ${suspendedCount} ${tx('suspended', lang)}` : ''}` },
    { icon: '📋', val: requests.length, label: tx('requests', lang), sub: `${openReqs} ${tx('open', lang)} · ${requests.length - openReqs} ${tx('closed', lang)}` },
    { icon: '📄', val: quotes.length, label: tx('quotes', lang), sub: `${pendingQ} ${tx('pending', lang)} · ${acceptedQ.length} ${tx('accepted', lang)}` },
    { icon: '💰', val: dealsValue.toLocaleString(), label: tx('dealsValue', lang), sub: tx('sar', lang) },
  ];

  const quickLinks = [
    { href: '/admin/users', icon: '👥', title: tx('manageUsers', lang), sub: tx('manageUsersSub', lang) },
    { href: '/admin/requests', icon: '📋', title: tx('manageReqs', lang), sub: tx('manageReqsSub', lang) },
    { href: '/admin/quotes', icon: '📄', title: tx('manageQuotes', lang), sub: tx('manageQuotesSub', lang) },
    { href: '/admin/data', icon: '💾', title: tx('manageData', lang), sub: tx('manageDataSub', lang) },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <AdminSidebar lang={lang} setLang={handleLangChange} active="/admin" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-6">
        <h1 className="text-white text-xl font-bold mb-1">{tx('title', lang)}</h1>
        <p className="text-white/60 text-xs">{tx('subtitle', lang)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
            <div className="w-9 h-9 bg-[var(--tint)] rounded-lg flex items-center justify-center text-base mb-3">{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-xs text-stone-500 mt-1">{s.label}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 px-4 md:px-7 pb-8">
        {/* activity */}
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
            <span className="text-sm font-bold text-stone-900">{tx('activity', lang)}</span>
          </div>
          {recentLogs.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-sm">📭 {tx('noActivity', lang)}</div>
          ) : (
            recentLogs.map(l => (
              <div key={l.id} className="px-5 py-3 border-b border-[var(--line-soft)] last:border-0 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-stone-700">{lang === 'ar' ? l.action : (l.actionEn || l.action)}</p>
                  <p className="text-[11px] text-[var(--sec)] mt-0.5">«{reqName(l.requestId)}»</p>
                </div>
                <span className="text-[11px] text-stone-400 shrink-0">{timeAgo(l.timestamp, lang)}</span>
              </div>
            ))
          )}
        </div>

        {/* side column */}
        <div className="flex flex-col gap-3.5">
          <div className="bg-white border border-[var(--line)] rounded-xl p-4">
            <p className="text-xs font-bold text-stone-900 mb-2">{tx('storage', lang)}</p>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-1.5">
              <div className={`h-2 rounded-full ${storagePct >= 80 ? 'bg-red-500' : storagePct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(storagePct, 2)}%` }} />
            </div>
            <p className="text-[11px] text-stone-500" dir="ltr" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              {(storageBytes / 1024).toFixed(0)} KB <span className="text-stone-400">({storagePct}% {tx('ofQuota', lang)})</span>
            </p>
          </div>

          <div className="bg-white border border-[var(--line)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--line-soft)]">
              <span className="text-xs font-bold text-stone-900">{tx('manage', lang)}</span>
            </div>
            {quickLinks.map(q => (
              <Link key={q.href} href={q.href} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line-soft)] last:border-0 hover:bg-[var(--bg-soft)] transition-colors">
                <span className="w-8 h-8 bg-[var(--tint)] rounded-lg flex items-center justify-center text-sm shrink-0">{q.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-stone-800">{q.title}</span>
                  <span className="block text-[11px] text-stone-400 truncate">{q.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
