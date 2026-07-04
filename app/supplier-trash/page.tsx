'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SupplierNav from '../components/SupplierNav';
import { displayVal, restoreQuote, permanentlyDeleteQuote, purgeExpiredTrash, Quote } from '../lib/requestHelpers';
import { getCityName } from '../lib/translations';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

type Lang = 'ar' | 'en';

interface Request {
  id: number; contractorId: string; projectName?: string;
  materials?: any[]; location: string; deadline: string;
}

const RETENTION_DAYS = 30;

function t(ar: string, en: string, lang: Lang) { return lang === 'ar' ? ar : en; }

export default function SupplierTrash() {
  const router = useRouter();
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [lang, setLang] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [items, setItems] = useState<Quote[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'supplier') { router.push('/dashboard'); return; }
    setUser(parsedUser);
    if (parsedUser.name) setUserName(parsedUser.name);

    purgeExpiredTrash(RETENTION_DAYS);
    const allDeleted: Quote[] = JSON.parse(localStorage.getItem('deletedQuotes') || '[]');
    const mine = allDeleted.filter(q => q.supplierId === parsedUser.email);
    setItems(mine.sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()));

    setRequests(JSON.parse(localStorage.getItem('requests') || '[]'));

    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const getRequest = (id: number) => requests.find(r => r.id === id) || null;

  const getReqName = (quote: Quote) => {
    const req = getRequest(quote.requestId);
    if (!req) return `#${quote.requestId}`;
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.map((tp: any) => displayVal(tp, lang)).join(' — ');
    }
    return `#${quote.requestId}`;
  };

  const daysLeft = (deletedAt?: string) => {
    if (!deletedAt) return RETENTION_DAYS;
    const elapsed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000);
    return Math.max(0, RETENTION_DAYS - elapsed);
  };

  const handleRestore = (id: number) => {
    restoreQuote(id);
    setItems(prev => prev.filter(q => q.id !== id));
    showToast(t('تم استرجاع العرض', 'Quote restored', lang));
  };

  const handlePermanentDelete = async (id: number) => {
    if (!(await confirmDialog(
      t('هذا الإجراء نهائي ولا يمكن التراجع عنه. هل تريد حذف العرض نهائيًا؟', 'This is permanent and cannot be undone. Delete this quote forever?', lang),
      { confirmText: t('حذف نهائي', 'Delete Forever', lang), danger: true }
    ))) return;
    permanentlyDeleteQuote(id);
    setItems(prev => prev.filter(q => q.id !== id));
    showToast(t('تم الحذف النهائي', 'Deleted permanently', lang));
  };

  const filtered = items.filter(q => {
    if (!search) return true;
    const s = search.toLowerCase();
    const req = getRequest(q.requestId);
    return getReqName(q).toLowerCase().includes(s) || (req?.location || '').toLowerCase().includes(s) || (q.quoteNumber || '').toLowerCase().includes(s);
  });

  if (!user) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="text-stone-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>

      <SupplierNav lang={lang} setLang={handleLangChange} userName={userName} active="/supplier-trash" />

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-5">
        <h1 className="text-white text-xl font-bold mb-1">{t('سلة المهملات', 'Trash', lang)}</h1>
        <p className="text-white/70 text-xs">
          {t(`العروض المسحوبة تُحذف نهائيًا بعد ${RETENTION_DAYS} يومًا`, `Withdrawn quotes are permanently removed after ${RETENTION_DAYS} days`, lang)}
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-3 px-4 md:px-7 py-5 max-w-xs">
        <div className="bg-white border border-[var(--line)] rounded-xl p-4">
          <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center text-base mb-3">🗑</div>
          <div className="text-2xl font-bold text-stone-900">{items.length}</div>
          <div className="text-xs text-stone-500 mt-1">{t('عرض في السلة', 'Quotes in trash', lang)}</div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 md:px-7 pb-10">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line-soft)] flex-wrap gap-2">
            <span className="text-sm font-bold text-stone-900">{t('العروض المسحوبة', 'Withdrawn Quotes', lang)}</span>
            <div className="flex items-center gap-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-3 py-1.5 w-56">
              <span className="text-stone-300 text-sm">🔍</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('ابحث...', 'Search...', lang)}
                className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-stone-300 text-stone-700" />
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-3xl mb-4">🗑</div>
              <h3 className="text-stone-700 font-bold text-base mb-1">
                {search ? t('لا توجد نتائج', 'No results found', lang) : t('السلة فارغة', 'Trash is Empty', lang)}
              </h3>
              <p className="text-stone-500 text-sm mb-5">
                {t('ستظهر هنا العروض التي تسحبها', 'Quotes you withdraw will appear here', lang)}
              </p>
              <Link href="/my-quotes"
                className="bg-[var(--brand)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
                {t('← عروضي', '← My Quotes', lang)}
              </Link>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="divide-y divide-[var(--line-soft)]">
              {filtered.map(q => {
                const left = daysLeft(q.deletedAt);
                const req = getRequest(q.requestId);
                return (
                  <div key={q.id} className="px-5 py-4 hover:bg-[var(--bg-soft)] transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5">
                          🗑
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[13px] font-bold text-stone-900 truncate">{getReqName(q)}</span>
                            {q.quoteNumber && <span className="text-[11px] font-mono font-semibold text-[var(--sec)] bg-[var(--tint)] px-1.5 py-0.5 rounded">{q.quoteNumber}</span>}
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${left <= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                              {t(`${left} يوم متبقي`, `${left}d left`, lang)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-xs text-stone-500">
                            <span>{Number(q.totalPrice).toLocaleString()} {t('ر.س', 'SAR', lang)}</span>
                            <span>{t('مدة التوريد:', 'Delivery:', lang)} {q.deliveryDays} {t('يوم', 'days', lang)}</span>
                            {req?.location && <span className="flex items-center gap-1">📍 {getCityName(req.location, lang)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleRestore(q.id)}
                          className="text-xs font-semibold px-4 py-2 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
                          {t('استرجاع', 'Restore', lang)}
                        </button>
                        <button onClick={() => handlePermanentDelete(q.id)}
                          className="text-xs font-semibold px-3 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
                          {t('حذف نهائي', 'Delete Forever', lang)}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
