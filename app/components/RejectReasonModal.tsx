'use client';

import { useState } from 'react';
import { useEscapeKey } from './useEscapeKey';
import { OTHER_VALUE, resolveOther, REJECTION_REASON_OPTIONS } from '../lib/materialOptions';

type Lang = 'ar' | 'en';

const RT = {
  title:    { ar: 'رفض العرض',                      en: 'Reject Quote' },
  hint:     { ar: 'سبب الرفض (اختياري)',              en: 'Reason for rejection (optional)' },
  select:   { ar: 'اختر...',                          en: 'Select...' },
  other:    { ar: 'أخرى (اكتب يدويًا)',                en: 'Other (type manually)' },
  specify:  { ar: 'حدد...',                           en: 'Specify...' },
  confirm:  { ar: 'تأكيد الرفض',                      en: 'Confirm Rejection' },
  cancel:   { ar: 'إلغاء',                            en: 'Cancel' },
};
function rt(key: keyof typeof RT, lang: Lang): string { return RT[key][lang]; }

export default function RejectReasonModal({ lang, onConfirm, onCancel }: {
  lang: Lang;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  useEscapeKey(onCancel);

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full" dir={dir} role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-stone-900 text-center mb-5">{rt('title', lang)}</h2>
        <label className="block text-sm font-semibold text-stone-700 mb-2">{rt('hint', lang)}</label>
        <select value={reason} onChange={e => setReason(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 bg-white outline-none focus:border-[var(--sec)] mb-2">
          <option value="">{rt('select', lang)}</option>
          {REJECTION_REASON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          <option value={OTHER_VALUE}>{rt('other', lang)}</option>
        </select>
        {reason === OTHER_VALUE && (
          <textarea value={reasonOther} onChange={e => setReasonOther(e.target.value)}
            placeholder={rt('specify', lang)} rows={2}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 bg-white outline-none focus:border-[var(--sec)] resize-none mb-2" />
        )}
        <div className="flex gap-3 mt-3">
          <button onClick={() => onConfirm(resolveOther(reason, reasonOther))}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            {rt('confirm', lang)}
          </button>
          <button onClick={onCancel}
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-2.5 rounded-xl text-sm transition-colors">
            {rt('cancel', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
