'use client';

import StatusBadge from './StatusBadge';

type Lang = 'ar' | 'en';

export interface CompareQuote {
  id: number;
  supplierCompany: string;
  supplierName: string;
  totalPrice: number;
  deliveryDays: number;
  description?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
}

const T = {
  supplier: { ar: 'المورد', en: 'Supplier' },
  price: { ar: 'السعر', en: 'Price' },
  delivery: { ar: 'مدة التوريد', en: 'Delivery' },
  notes: { ar: 'ملاحظات', en: 'Notes' },
  status: { ar: 'الحالة', en: 'Status' },
  action: { ar: 'إجراء', en: 'Action' },
  diffFromMin: { ar: 'الفرق عن الأرخص', en: 'Diff from Min' },
  cheapest: { ar: 'الأرخص', en: 'Cheapest' },
  fastest: { ar: 'الأسرع', en: 'Fastest' },
  sar: { ar: 'ر.س', en: 'SAR' },
  days: { ar: 'يوم', en: 'days' },
  accept: { ar: 'قبول', en: 'Accept' },
  reject: { ar: 'رفض', en: 'Reject' },
  undo: { ar: 'إلغاء القرار', en: 'Undo' },
  print: { ar: 'طباعة', en: 'Print' },
  revision: { ar: 'طلب تعديل', en: 'Revision' },
  revisionPlaceholder: { ar: 'مثال: أريد سعر أقل أو توريد أسرع...', en: 'Ex: Need lower price or faster delivery...' },
  submitRevision: { ar: 'إرسال', en: 'Send' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
};
function t(key: keyof typeof T, lang: Lang) { return T[key][lang]; }

export default function QuoteCompareTable({
  quotes, lang, variant = 'actions', onAccept, onReject, onUndo, printHrefBase,
  revisionQuoteId, revisionNote, setRevisionQuoteId, setRevisionNote, onRevisionSubmit,
}: {
  quotes: CompareQuote[];
  lang: Lang;
  variant?: 'actions' | 'readonly';
  onAccept?: (id: number) => void;
  onReject?: (id: number) => void;
  onUndo?: (id: number) => void;
  printHrefBase?: string;
  revisionQuoteId?: number | null;
  revisionNote?: string;
  setRevisionQuoteId?: (id: number | null) => void;
  setRevisionNote?: (note: string) => void;
  onRevisionSubmit?: (id: number) => void;
}) {
  if (quotes.length === 0) return null;
  const cheapestId = quotes.reduce((a, b) => (a.totalPrice < b.totalPrice ? a : b)).id;
  const fastestId = quotes.reduce((a, b) => (a.deliveryDays < b.deliveryDays ? a : b)).id;
  const cheapestPrice = quotes.find(q => q.id === cheapestId)!.totalPrice;

  const headers = variant === 'readonly'
    ? ['#', t('supplier', lang), t('price', lang), t('delivery', lang), t('diffFromMin', lang), t('status', lang), t('notes', lang)]
    : [t('supplier', lang), t('price', lang), t('delivery', lang), t('notes', lang), t('status', lang), t('action', lang)];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#C0603E] text-white">
            {headers.map(h => (
              <th key={h} className={`px-4 py-2.5 font-semibold whitespace-nowrap ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quotes.map((q, i) => {
            const isCheapest = q.id === cheapestId;
            const isFastest = q.id === fastestId;
            const diff = Number(q.totalPrice) - Number(cheapestPrice);
            const diffPct = cheapestPrice > 0 ? Math.round((diff / cheapestPrice) * 100) : 0;
            const rowCls = `border-b border-stone-100 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAF7F2]'} ${isCheapest ? '!bg-emerald-50/50' : ''}`;
            return (
              <tr key={q.id} className={rowCls}>
                {variant === 'readonly' && <td className="px-4 py-3 text-center font-bold text-[#C0603E]">{i + 1}</td>}
                <td className="px-4 py-3">
                  <p className="font-bold text-stone-900">{q.supplierCompany}</p>
                  <p className="text-stone-400 text-[10px]">{q.supplierName}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${isCheapest ? 'text-emerald-600' : 'text-stone-900'}`}>
                    {Number(q.totalPrice).toLocaleString()} {t('sar', lang)}
                  </span>
                  {isCheapest && <span className="block text-[9px] text-emerald-600 font-semibold">{t('cheapest', lang)}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${isFastest ? 'text-[#C0603E]' : 'text-stone-700'}`}>
                    {q.deliveryDays} {t('days', lang)}
                  </span>
                  {isFastest && <span className="block text-[9px] text-[#C0603E] font-semibold">{t('fastest', lang)}</span>}
                </td>
                {variant === 'readonly' && (
                  <td className="px-4 py-3">
                    {diff === 0 ? <span className="text-emerald-600 font-bold">—</span>
                      : <span className="text-red-600 font-bold">+{diff.toLocaleString()} ({diffPct}%)</span>}
                  </td>
                )}
                <td className="px-4 py-3"><StatusBadge status={q.status} lang={lang} /></td>
                <td className="px-4 py-3 text-stone-500 max-w-[140px] truncate">{q.description || '—'}</td>
                {variant === 'actions' && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {q.status === 'pending' ? (
                        <>
                          <button onClick={() => onAccept?.(q.id)}
                            className="text-[10px] font-semibold px-2 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors">
                            {t('accept', lang)}
                          </button>
                          {onRevisionSubmit && (
                            <button onClick={() => setRevisionQuoteId?.(q.id)}
                              className="text-[10px] font-semibold px-2 py-1 bg-amber-400 text-white rounded-md hover:bg-amber-500 transition-colors">
                              {t('revision', lang)}
                            </button>
                          )}
                          <button onClick={() => onReject?.(q.id)}
                            className="text-[10px] font-semibold px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                            {t('reject', lang)}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => onUndo?.(q.id)}
                          className="text-[10px] font-semibold px-2 py-1 bg-stone-100 text-stone-600 rounded-md hover:bg-stone-200 transition-colors">
                          {t('undo', lang)}
                        </button>
                      )}
                      {printHrefBase && (
                        <a href={`${printHrefBase}${q.id}?autoprint=1`} target="_blank" rel="noopener noreferrer" title={t('print', lang)}
                          className="text-stone-300 hover:text-stone-500 text-xs px-1.5 transition-colors">
                          🖨
                        </a>
                      )}
                    </div>
                    {revisionQuoteId === q.id && (
                      <div className="mt-2 w-48">
                        <textarea value={revisionNote} onChange={e => setRevisionNote?.(e.target.value)}
                          placeholder={t('revisionPlaceholder', lang)} rows={2}
                          className="w-full border border-amber-200 rounded-md px-2 py-1 text-[10px] text-stone-700 bg-white outline-none resize-none" />
                        <div className="flex gap-1 mt-1">
                          <button onClick={() => onRevisionSubmit?.(q.id)}
                            className="flex-1 bg-amber-400 text-white text-[10px] font-semibold py-1 rounded-md hover:bg-amber-500">
                            {t('submitRevision', lang)}
                          </button>
                          <button onClick={() => { setRevisionQuoteId?.(null); setRevisionNote?.(''); }}
                            className="flex-1 bg-stone-100 text-stone-600 text-[10px] font-semibold py-1 rounded-md hover:bg-stone-200">
                            {t('cancel', lang)}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
