'use client';

import { useState } from 'react';
import { useEscapeKey } from './useEscapeKey';

type Lang = 'ar' | 'en';

const RT = {
  rateSupplier: { ar: 'قيّم المورد', en: 'Rate Supplier' },
  rateExp: { ar: 'كيف كانت تجربتك مع', en: 'How was your experience with' },
  rateComments: { ar: 'ملاحظات (اختياري)', en: 'Comments (Optional)' },
  rateWrite: { ar: 'اكتب تجربتك مع المورد...', en: 'Write your experience...' },
  submitRating: { ar: 'إرسال التقييم', en: 'Submit Rating' },
  skip: { ar: 'تخطي', en: 'Skip' },
  poor: { ar: 'سيء', en: 'Poor' },
  fair: { ar: 'مقبول', en: 'Fair' },
  good: { ar: 'جيد', en: 'Good' },
  vgood: { ar: 'جيد جداً', en: 'Very Good' },
  excellent: { ar: 'ممتاز', en: 'Excellent' },
};
function rt(key: keyof typeof RT, lang: Lang): string { return RT[key][lang]; }

export default function RatingModal({ lang, supplierCompany, onSubmit, onSkip }: {
  lang: Lang;
  supplierCompany: string;
  onSubmit: (stars: number, comment: string) => void;
  onSkip: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  useEscapeKey(onSkip);

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full" dir={dir} role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-stone-900 text-center mb-1">{rt('rateSupplier', lang)}</h2>
        <p className="text-stone-500 text-sm text-center mb-5">{rt('rateExp', lang)} <strong>{supplierCompany}</strong>؟</p>
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map(star => (
            <span key={star} onClick={() => setStars(star)}
              className={`text-4xl cursor-pointer transition-colors ${star <= stars ? 'text-amber-400' : 'text-stone-200'}`}>★</span>
          ))}
        </div>
        <p className="text-center text-xs text-stone-400 mb-5">
          {stars === 1 ? rt('poor', lang) : stars === 2 ? rt('fair', lang) : stars === 3 ? rt('good', lang) : stars === 4 ? rt('vgood', lang) : stars === 5 ? rt('excellent', lang) : ''}
        </p>
        <label className="block text-sm font-semibold text-stone-700 mb-2">{rt('rateComments', lang)}</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder={rt('rateWrite', lang)} rows={3}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 bg-white outline-none focus:border-[var(--sec)] resize-none mb-4" />
        <div className="flex gap-3">
          <button onClick={() => stars > 0 && onSubmit(stars, comment)} disabled={stars === 0}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            {rt('submitRating', lang)}
          </button>
          <button onClick={onSkip}
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-2.5 rounded-xl text-sm transition-colors">
            {rt('skip', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
