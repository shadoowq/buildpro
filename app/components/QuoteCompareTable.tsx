'use client';

import StatusBadge from './StatusBadge';
import { getEffectiveQuoteStatus, quoteValidityDaysLeft, isQuoteExpired, formatDay, displayVal, QuoteLineItem, Lang } from '../lib/requestHelpers';
import { getCategory, isTilesCategory } from '../lib/materialCategories';
import { resolveOther } from '../lib/materialOptions';

export interface CompareQuote {
  id: number;
  supplierCompany: string;
  supplierName: string;
  totalPrice: number;
  deliveryDays: number;
  description?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
  validUntil?: string;
  paymentTerms?: string;
  lineItems?: QuoteLineItem[];
}

const T = {
  supplier: { ar: 'المورد', en: 'Supplier' },
  price: { ar: 'السعر', en: 'Price' },
  delivery: { ar: 'مدة التوريد', en: 'Delivery' },
  payTerms: { ar: 'شروط الدفع', en: 'Payment Terms' },
  validity: { ar: 'الصلاحية', en: 'Validity' },
  expiredShort: { ar: 'منتهي', en: 'Expired' },
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
  itemMatrixTitle: { ar: 'مقارنة أسعار البنود (سعر الوحدة قبل الضريبة)', en: 'Line-item unit prices (before tax)' },
  item: { ar: 'البند', en: 'Item' },
  lowestCell: { ar: 'الأقل', en: 'Lowest' },
};
function t(key: keyof typeof T, lang: Lang) { return T[key][lang]; }

/* Line items are matched across quotes by what they describe (not by row index —
   suppliers may add or drop rows): tiles by type+size, other categories by
   category + the offered type field. */
function lineItemKey(li: QuoteLineItem): string {
  if (!isTilesCategory(li.category)) return `c|${li.category}|${li.fields?.type || ''}`;
  return `t|${resolveOther(li.type, li.typeOther)}|${resolveOther(li.size, li.sizeOther)}`;
}

function lineItemLabel(li: QuoteLineItem, lang: Lang): string {
  if (!isTilesCategory(li.category)) {
    const cat = getCategory(li.category);
    const catLabel = cat ? `${cat.icon} ${lang === 'ar' ? cat.labelAr : cat.labelEn}` : (li.category || '—');
    return li.fields?.type ? `${catLabel} — ${displayVal(li.fields.type, lang)}` : catLabel;
  }
  const type = displayVal(resolveOther(li.type, li.typeOther), lang);
  const size = resolveOther(li.size, li.sizeOther);
  return size ? `${type} — ${size}` : type;
}

/** Cross-supplier unit-price matrix, shown when at least two quotes carry line items. */
function LineItemMatrix({ quotes, lang }: { quotes: CompareQuote[]; lang: Lang }) {
  const withItems = quotes.filter(q => q.lineItems?.length);
  if (withItems.length < 2) return null;

  const rows: { key: string; label: string }[] = [];
  const cell = new Map<string, QuoteLineItem>(); // `${key}|${quoteId}` -> item
  withItems.forEach(q => {
    q.lineItems!.forEach(li => {
      const key = lineItemKey(li);
      if (!rows.some(r => r.key === key)) rows.push({ key, label: lineItemLabel(li, lang) });
      const cellKey = `${key}|${q.id}`;
      if (!cell.has(cellKey)) cell.set(cellKey, li);
    });
  });

  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-stone-700 mb-2">⚖ {t('itemMatrixTitle', lang)}</p>
      <div className="overflow-x-auto border border-[var(--line)] rounded-xl">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-soft)]">
              <th className={`px-4 py-2 font-semibold text-stone-600 whitespace-nowrap ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t('item', lang)}</th>
              {withItems.map(q => (
                <th key={q.id} className="px-4 py-2 font-semibold text-stone-600 whitespace-nowrap text-center">{q.supplierCompany}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const prices = withItems
                .map(q => cell.get(`${row.key}|${q.id}`))
                .filter((li): li is QuoteLineItem => !!li && Number(li.unitPrice) > 0)
                .map(li => Number(li.unitPrice));
              const min = prices.length > 1 ? Math.min(...prices) : null;
              return (
                <tr key={row.key} className="border-t border-[var(--line-soft)]">
                  <td className="px-4 py-2 text-stone-700 font-semibold whitespace-nowrap">{row.label}</td>
                  {withItems.map(q => {
                    const li = cell.get(`${row.key}|${q.id}`);
                    if (!li || !(Number(li.unitPrice) > 0)) return <td key={q.id} className="px-4 py-2 text-center text-stone-300">—</td>;
                    const isMin = min !== null && Number(li.unitPrice) === min;
                    return (
                      <td key={q.id} className={`px-4 py-2 text-center whitespace-nowrap ${isMin ? 'bg-emerald-50/60' : ''}`}>
                        <span className={`font-bold ${isMin ? 'text-emerald-600' : 'text-stone-800'}`}>{Number(li.unitPrice).toLocaleString()}</span>
                        <span className="text-stone-400"> / {displayVal(resolveOther(li.unit, li.unitOther), lang)}</span>
                        {isMin && <span className="block text-[9px] text-emerald-600 font-semibold">{t('lowestCell', lang)}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    ? ['#', t('supplier', lang), t('price', lang), t('delivery', lang), t('diffFromMin', lang), t('payTerms', lang), t('validity', lang), t('status', lang), t('notes', lang)]
    : [t('supplier', lang), t('price', lang), t('delivery', lang), t('payTerms', lang), t('validity', lang), t('status', lang), t('notes', lang), t('action', lang)];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[var(--brand)] text-white">
            {headers.map(h => (
              <th key={h} className={`px-4 py-2.5 font-semibold whitespace-nowrap ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quotes.map((q, i) => {
            const effectiveStatus = getEffectiveQuoteStatus(q);
            const isCheapest = q.id === cheapestId;
            const isFastest = q.id === fastestId;
            const diff = Number(q.totalPrice) - Number(cheapestPrice);
            const diffPct = cheapestPrice > 0 ? Math.round((diff / cheapestPrice) * 100) : 0;
            const daysLeft = quoteValidityDaysLeft(q);
            const expired = isQuoteExpired(q);
            const rowCls = `border-b border-stone-100 ${i % 2 === 0 ? 'bg-white' : 'bg-[var(--bg-soft)]'} ${isCheapest ? '!bg-emerald-50/50' : ''}`;
            return (
              <tr key={q.id} className={rowCls}>
                {variant === 'readonly' && <td className="px-4 py-3 text-center font-bold text-[var(--brand-strong)]">{i + 1}</td>}
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
                  <span className={`font-semibold ${isFastest ? 'text-[var(--brand-strong)]' : 'text-stone-700'}`}>
                    {q.deliveryDays} {t('days', lang)}
                  </span>
                  {isFastest && <span className="block text-[9px] text-[var(--brand-strong)] font-semibold">{t('fastest', lang)}</span>}
                </td>
                {variant === 'readonly' && (
                  <td className="px-4 py-3">
                    {diff === 0 ? <span className="text-emerald-600 font-bold">—</span>
                      : <span className="text-red-600 font-bold">+{diff.toLocaleString()} ({diffPct}%)</span>}
                  </td>
                )}
                <td className="px-4 py-3 text-stone-600 max-w-[130px] truncate">{q.paymentTerms || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {!q.validUntil ? <span className="text-stone-300">—</span>
                    : expired ? <span className="text-red-600 font-bold">✕ {t('expiredShort', lang)}</span>
                    : (
                      <span className="text-stone-600">
                        {formatDay(q.validUntil, lang)}
                        {daysLeft !== null && daysLeft <= 3 && <span className="block text-[9px] text-orange-600 font-semibold">⏳ {daysLeft} {t('days', lang)}</span>}
                      </span>
                    )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={effectiveStatus} lang={lang} /></td>
                <td className="px-4 py-3 text-stone-500 max-w-[140px] truncate">{q.description || '—'}</td>
                {variant === 'actions' && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {effectiveStatus === 'expired' ? (
                        <span className="text-[10px] text-stone-400">—</span>
                      ) : q.status === 'pending' ? (
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
      <LineItemMatrix quotes={quotes} lang={lang} />
    </div>
  );
}
