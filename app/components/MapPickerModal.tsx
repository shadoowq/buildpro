'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useEscapeKey } from './useEscapeKey';

type Lang = 'ar' | 'en';
type Coords = { lat: number; lng: number };

const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full rounded-xl bg-stone-100 animate-pulse" />,
});

const MT = {
  title: { ar: 'حدد موقع المشروع على الخريطة', en: 'Pin the project location on the map' },
  hint: { ar: 'اضغط على الخريطة أو اسحب العلامة لتحديد الموقع بدقة', en: 'Click the map or drag the marker to set the exact location' },
  confirm: { ar: 'تأكيد الموقع', en: 'Confirm location' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
};
function mt(key: keyof typeof MT, lang: Lang): string { return MT[key][lang]; }

export default function MapPickerModal({ lang, initial, onConfirm, onCancel }: {
  lang: Lang;
  initial: Coords | null;
  onConfirm: (coords: Coords) => void;
  onCancel: () => void;
}) {
  const [coords, setCoords] = useState<Coords | null>(initial);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  useEscapeKey(onCancel);

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full" dir={dir} role="dialog" aria-modal="true">
        <h2 className="text-base font-bold text-stone-900 mb-1">{mt('title', lang)}</h2>
        <p className="text-stone-500 text-xs mb-4">{mt('hint', lang)}</p>
        <LeafletMapInner value={coords} onChange={setCoords} />
        {coords && (
          <p className="text-xs text-stone-400 mt-2 font-mono" dir="ltr">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={() => coords && onConfirm(coords)} disabled={!coords}
            className="flex-1 bg-[var(--brand)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--on-brand)] font-bold py-2.5 rounded-xl text-sm transition-colors">
            {mt('confirm', lang)}
          </button>
          <button onClick={onCancel}
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-2.5 rounded-xl text-sm transition-colors">
            {mt('cancel', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
