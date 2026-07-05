'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { useToast } from '@/app/components/Toast';
import { getRequestDisplayName, formatDate, withdrawQuote, getEffectiveQuoteStatus } from '@/app/lib/requestHelpers';
import { getCurrentUser, getLanguage, setLanguage, getQuotes, getRequests } from '@/app/lib/store';

type Lang = 'ar' | 'en';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'revision';

const T = {
  title:    { ar: 'إدارة العروض', en: 'Quote Management' },
  search:   { ar: 'ابحث برقم العرض أو المورد أو المشروع...', en: 'Search by quote #, supplier, or project...' },
  all:      { ar: 'الكل', en: 'All' },
  pending:  { ar: 'معلّق', en: 'Pending' },
  accepted: { ar: 'مقبول', en: 'Accepted' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  revision: { ar: 'طلب تعديل', en: 'Revision' },
  expired:  { ar: 'منتهي', en: 'Expired' },
  quoteNo:  { ar: 'رقم العرض', en: 'Quote #' },
  supplier: { ar: 'المورد', en: 'Supplier' },
  project:  { ar: 'المشروع', en: 'Project' },
  price:    { ar: 'السعر', en: 'Price' },
  submitted:{ ar: 'التقديم', en: 'Submitted' },
  status:   { ar: 'الحالة', en: 'Status' },
  actions:  { ar: 'إجراءات', en: 'Actions' },
  view:     { ar: 'عرض', en: 'View' },
  removeBtn:{ ar: 'إزالة', en: 'Remove' },
  noQuotes: { ar: 'لا توجد عروض مطابقة', en: 'No matching quotes' },
  sar:      { ar: 'ر.س', en: 'SAR' },
  confirmRemove: { ar: 'إزالة هذا العرض؟ سينتقل لسلة مهملات المورد ويمكن استعادته خلال 30 يومًا.', en: "Remove this quote? It moves to the supplier's trash and can be restored within 30 days." },
  removedToast: { ar: 'تم نقل العرض لسلة المهملات', en: 'Quote moved to trash' },
};
const tx = (k: keyof typeof T, lang: Lang) => T[k][lang];

const statusStyles: Record<string, string> = {
  pending:  'bg-orange-50 text-orange-700 border-orange-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  revision: 'bg-amber-50 text-amber-700 border-amber-200',
  expired:  'bg-stone-100 text-stone-500 border-stone-200',
};

export default function AdminQuotesPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [lang, setLang] = useState<Lang>('ar');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const currentUser = getCurrentUser<any>() || {};
    if (currentUser.userType !== 'admin') { router.push('/login'); return; }
    setLang(getLanguage());
    setQuotes(getQuotes());
    setRequests(getRequests());
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  const projectOf = (id: number) => getRequestDisplayName(requests.find(r => r.id === id), lang, id);

  const handleRemove = async (q: any) => {
    if (!(await confirmDialog(tx('confirmRemove', lang), { confirmText: tx('removeBtn', lang), danger: true }))) return;
    const { quotes: updated } = withdrawQuote(q.id);
    setQuotes(updated);
    showToast(tx('removedToast', lang));
  };

  const filtered = quotes.filter(q => {
    const s = search.toLowerCase();
    const matchSearch = !search
      || (q.quoteNumber || '').toLowerCase().includes(s)
      || (q.supplierCompany || '').toLowerCase().includes(s)
      || projectOf(q.requestId).toLowerCase().includes(s);
    const matchFilter = filter === 'all' || q.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <AdminSidebar lang={lang} setLang={handleLangChange} active="/admin/quotes" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="text-white text-xl font-bold mb-1">{tx('title', lang)}</h1>
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 w-72 mb-1">
            <span className="text-white/40 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={tx('search', lang)}
              className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-white/40 text-white" />
          </div>
        </div>
        <div className="flex gap-0 mt-4 border-t border-white/10 overflow-x-auto">
          {(['all', 'pending', 'accepted', 'rejected', 'revision'] as StatusFilter[]).map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo whitespace-nowrap ${filter === v ? 'text-white border-[var(--brand)]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
              {tx(v === 'all' ? 'all' : v, lang)} ({v === 'all' ? quotes.length : quotes.filter(q => q.status === v).length})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-7 py-6">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 860 }}>
            <thead>
              <tr className="bg-[var(--bg-soft)] border-b border-[var(--line-soft)]">
                {[tx('quoteNo', lang), tx('supplier', lang), tx('project', lang), tx('price', lang), tx('submitted', lang), tx('status', lang), tx('actions', lang)].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-semibold text-stone-500 whitespace-nowrap text-start">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-stone-400 py-12">📭 {tx('noQuotes', lang)}</td></tr>
              ) : filtered.map(q => {
                const eff = getEffectiveQuoteStatus(q);
                return (
                  <tr key={q.id} className="border-b border-[var(--line-soft)] last:border-0">
                    <td className="px-4 py-3 font-mono text-[var(--sec)] font-bold whitespace-nowrap">{q.quoteNumber || `#${q.id}`}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-stone-900">{q.supplierCompany}</p>
                      <p className="text-[11px] text-stone-400">{q.supplierName}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{projectOf(q.requestId)}</td>
                    <td className="px-4 py-3 font-bold text-stone-900 whitespace-nowrap">{Number(q.totalPrice).toLocaleString()} <span className="font-normal text-stone-400">{tx('sar', lang)}</span></td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(q.createdAt, lang)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyles[eff] || statusStyles.pending}`}>
                        {tx(eff as keyof typeof T, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <a href={`/print/quote/${q.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--tint)] text-[var(--brand-strong)] border border-[var(--line)] hover:bg-[var(--tint-hover)] transition-colors">
                          👁 {tx('view', lang)}
                        </a>
                        <button onClick={() => handleRemove(q)}
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors">
                          {tx('removeBtn', lang)}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
