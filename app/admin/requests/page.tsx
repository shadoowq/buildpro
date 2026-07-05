'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { useToast } from '@/app/components/Toast';
import { getRequestDisplayName, formatDay, softDeleteRequest, appendActivityLog } from '@/app/lib/requestHelpers';
import { getCityName } from '@/app/lib/translations';

type Lang = 'ar' | 'en';
type StatusFilter = 'all' | 'open' | 'closed';

const T = {
  title:    { ar: 'إدارة الطلبات', en: 'Request Management' },
  search:   { ar: 'ابحث باسم المشروع أو المقاول أو المدينة...', en: 'Search by project, contractor, or city...' },
  all:      { ar: 'الكل', en: 'All' },
  open:     { ar: 'مفتوح', en: 'Open' },
  closed:   { ar: 'مغلق', en: 'Closed' },
  project:  { ar: 'المشروع', en: 'Project' },
  contractor: { ar: 'المقاول', en: 'Contractor' },
  city:     { ar: 'المدينة', en: 'City' },
  quotesCol:{ ar: 'العروض', en: 'Quotes' },
  deadline: { ar: 'الموعد', en: 'Deadline' },
  status:   { ar: 'الحالة', en: 'Status' },
  actions:  { ar: 'إجراءات', en: 'Actions' },
  closeBtn: { ar: 'إغلاق', en: 'Close' },
  reopenBtn:{ ar: 'إعادة فتح', en: 'Reopen' },
  deleteBtn:{ ar: 'حذف', en: 'Delete' },
  noReqs:   { ar: 'لا توجد طلبات مطابقة', en: 'No matching requests' },
  confirmDelete: { ar: 'حذف هذا الطلب؟ سينتقل لسلة المهملات ويمكن استعادته خلال 30 يومًا.', en: 'Delete this request? It moves to trash and can be restored within 30 days.' },
  deletedToast: { ar: 'تم نقل الطلب لسلة المهملات', en: 'Request moved to trash' },
  closedToast:  { ar: 'تم إغلاق الطلب', en: 'Request closed' },
  reopenedToast:{ ar: 'تمت إعادة فتح الطلب', en: 'Request reopened' },
};
const tx = (k: keyof typeof T, lang: Lang) => T[k][lang];

export default function AdminRequestsPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [lang, setLang] = useState<Lang>('ar');
  const [requests, setRequests] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.userType !== 'admin') { router.push('/login'); return; }
    setLang((localStorage.getItem('language') as Lang) || 'ar');
    try { setRequests(JSON.parse(localStorage.getItem('requests') || '[]')); } catch {}
    try { setQuotes(JSON.parse(localStorage.getItem('quotes') || '[]')); } catch {}
    try { setUsers(JSON.parse(localStorage.getItem('users') || '[]')); } catch {}
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  const contractorOf = (email: string) => users.find(u => u.email === email)?.company || email;
  const quotesCount = (id: number) => quotes.filter(q => q.requestId === id).length;

  const toggleStatus = (r: any) => {
    const newStatus = r.status === 'open' ? 'closed' : 'open';
    const updated = requests.map(x => x.id === r.id ? { ...x, status: newStatus } : x);
    setRequests(updated);
    localStorage.setItem('requests', JSON.stringify(updated));
    appendActivityLog(r.id,
      newStatus === 'closed' ? 'قامت إدارة المنصة بإغلاق الطلب' : 'قامت إدارة المنصة بإعادة فتح الطلب',
      newStatus === 'closed' ? 'Platform admin closed the request' : 'Platform admin reopened the request');
    showToast(tx(newStatus === 'closed' ? 'closedToast' : 'reopenedToast', lang));
  };

  const handleDelete = async (r: any) => {
    if (!(await confirmDialog(tx('confirmDelete', lang), { confirmText: tx('deleteBtn', lang), danger: true }))) return;
    const remaining = softDeleteRequest(r.id);
    setRequests(remaining);
    showToast(tx('deletedToast', lang));
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || getRequestDisplayName(r, lang).toLowerCase().includes(q)
      || contractorOf(r.contractorId).toLowerCase().includes(q)
      || getCityName(r.location, lang).toLowerCase().includes(q);
    const matchFilter = filter === 'all' || r.status === filter;
    return matchSearch && matchFilter;
  });

  const btn = 'text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors';

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <AdminSidebar lang={lang} setLang={handleLangChange} active="/admin/requests" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="text-white text-xl font-bold mb-1">{tx('title', lang)}</h1>
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 w-72 mb-1">
            <span className="text-white/40 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={tx('search', lang)}
              className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-white/40 text-white" />
          </div>
        </div>
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {([['all', tx('all', lang)], ['open', tx('open', lang)], ['closed', tx('closed', lang)]] as [StatusFilter, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${filter === v ? 'text-white border-[var(--brand)]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
              {l} ({v === 'all' ? requests.length : requests.filter(r => r.status === v).length})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-7 py-6">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 820 }}>
            <thead>
              <tr className="bg-[var(--bg-soft)] border-b border-[var(--line-soft)]">
                {['#', tx('project', lang), tx('contractor', lang), tx('city', lang), tx('quotesCol', lang), tx('deadline', lang), tx('status', lang), tx('actions', lang)].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-semibold text-stone-500 whitespace-nowrap text-start">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-stone-400 py-12">📭 {tx('noReqs', lang)}</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-[var(--line-soft)] last:border-0">
                  <td className="px-4 py-3 font-mono text-[var(--sec)] font-bold">{String(r.id).slice(-6)}</td>
                  <td className="px-4 py-3 font-bold text-stone-900 whitespace-nowrap">{getRequestDisplayName(r, lang)}</td>
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{contractorOf(r.contractorId)}</td>
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{getCityName(r.location, lang)}</td>
                  <td className="px-4 py-3 text-stone-600 font-semibold">{quotesCount(r.id)}</td>
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDay(r.deadline, lang)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.status === 'open'
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{tx('open', lang)}</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">{tx('closed', lang)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleStatus(r)} className={`${btn} ${r.status === 'open' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>
                        {r.status === 'open' ? tx('closeBtn', lang) : tx('reopenBtn', lang)}
                      </button>
                      <button onClick={() => handleDelete(r)} className={`${btn} bg-red-50 text-red-600 border border-red-100 hover:bg-red-100`}>
                        {tx('deleteBtn', lang)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
