'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ContractorNav from '../../components/ContractorNav';
import SupplierNav from '../../components/SupplierNav';
import { useEscapeKey } from '../../components/useEscapeKey';
import { displayVal } from '../../lib/requestHelpers';
import { specialtyLabel } from '../../lib/materialCategories';
import { getCityName } from '../../lib/translations';
import { ratingsOfSupplier, Rating } from '../../lib/marketplace';
import { getCurrentUser, getLanguage, setLanguage, getUsers, getRatings } from '../../lib/store';

type Lang = 'ar' | 'en';

const T = {
  back:        { ar: '← رجوع',                  en: '← Back' },
  notFound:    { ar: 'لم يتم العثور على هذا المورد', en: 'Supplier not found' },
  verified:    { ar: 'موثّق',                    en: 'Verified' },
  specialties: { ar: 'التخصصات',                 en: 'Specialties' },
  coverage:    { ar: 'مدن التغطية',               en: 'Coverage Cities' },
  bio:         { ar: 'نبذة',                     en: 'About' },
  noBio:       { ar: 'لم يضف المورد نبذة بعد',     en: 'No bio added yet' },
  certifications: { ar: 'الشهادات والاعتمادات',   en: 'Certifications' },
  gallery:     { ar: 'معرض الأعمال',              en: 'Work Gallery' },
  noGallery:   { ar: 'لا توجد صور بعد',           en: 'No photos yet' },
  ratings:     { ar: 'التقييمات',                 en: 'Ratings' },
  noRatings:   { ar: 'لا توجد تقييمات بعد',       en: 'No ratings yet' },
  reviews:     { ar: (n: number) => `${n} تقييم`, en: (n: number) => `${n} review${n === 1 ? '' : 's'}` },
  close:       { ar: 'إغلاق',                    en: 'Close' },
};
function tx(key: keyof typeof T, lang: Lang, n?: number): string {
  const v = T[key] as any;
  return typeof v === 'function' ? v(n ?? 0) : v[lang];
}

export default function SupplierPublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const email = decodeURIComponent(String(params.email || ''));

  const [lang, setLang] = useState<Lang>('ar');
  const [viewer, setViewer] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEscapeKey(() => { if (lightbox) setLightbox(null); });
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    setLang(getLanguage());

    const viewerUser = getCurrentUser<any>();
    if (!viewerUser) { router.push('/login'); return; }
    setViewer(viewerUser);

    const users = getUsers();
    const found = users.find((u: any) => u.email === email && u.userType === 'supplier');
    setSupplier(found || null);

    setRatings(getRatings());

    setReady(true);
  }, [email, router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  if (!ready || !viewer) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-400 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const nav = viewer.userType === 'contractor'
    ? <ContractorNav lang={lang} setLang={handleLangChange} userName={viewer.name || ''} active="" />
    : <SupplierNav lang={lang} setLang={handleLangChange} userName={viewer.name || ''} active="" />;

  if (!supplier) return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      {nav}
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="text-4xl">📭</span>
        <p className="text-stone-900 font-bold">{tx('notFound', lang)}</p>
        <button onClick={() => router.back()} className="text-sm text-[var(--sec)] font-semibold hover:underline">{tx('back', lang)}</button>
      </div>
    </div>
  );

  const myRatings = ratingsOfSupplier(ratings, email);
  const avgRating = myRatings.length > 0 ? myRatings.reduce((s, r) => s + r.rating, 0) / myRatings.length : 0;
  const specialties: string[] = supplier.specialties || [];
  const coverageCities: string[] = supplier.coverageCities || [];
  const gallery: string[] = supplier.gallery || [];
  const certifications: string[] = supplier.certifications || [];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      {nav}

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-6">
        <button onClick={() => router.back()} className="text-white/60 hover:text-white text-xs mb-3">{tx('back', lang)}</button>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand)] flex items-center justify-center text-2xl font-bold shrink-0" style={{ color: 'var(--on-brand, #231B06)' }}>
            {(supplier.company || supplier.name || '؟').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white text-xl font-bold">{supplier.company}</h1>
              {supplier.verified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  ✓ {tx('verified', lang)}
                </span>
              )}
            </div>
            <p className="text-white/60 text-xs mt-1">{supplier.name}</p>
            {myRatings.length > 0 && (
              <p className="text-amber-300 text-xs mt-1 flex items-center gap-1.5">
                <span>{'★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating))}</span>
                <span className="text-white/50">({avgRating.toFixed(1)} · {tx('reviews', lang, myRatings.length)})</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-7 py-6 max-w-3xl space-y-4">

        {/* SPECIALTIES + COVERAGE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-stone-900 mb-3">{tx('specialties', lang)}</h2>
            {specialties.length === 0 ? (
              <p className="text-xs text-stone-400">—</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {specialties.map(s => (
                  <span key={s} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--tint)] text-[var(--brand-strong)]">{specialtyLabel(s, lang) || displayVal(s, lang)}</span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-stone-900 mb-3">{tx('coverage', lang)}</h2>
            {coverageCities.length === 0 ? (
              <p className="text-xs text-stone-400">—</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {coverageCities.map(c => (
                  <span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 text-stone-600">📍 {getCityName(c, lang)}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BIO */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-stone-900 mb-2">{tx('bio', lang)}</h2>
          <p className="text-sm text-stone-600 leading-relaxed">{supplier.bio?.trim() || tx('noBio', lang)}</p>
        </div>

        {/* CERTIFICATIONS */}
        {certifications.length > 0 && (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-stone-900 mb-3">{tx('certifications', lang)}</h2>
            <div className="flex flex-wrap gap-2">
              {certifications.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🏅 {c}</span>
              ))}
            </div>
          </div>
        )}

        {/* GALLERY */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-stone-900 mb-3">{tx('gallery', lang)}</h2>
          {gallery.length === 0 ? (
            <p className="text-xs text-stone-400">{tx('noGallery', lang)}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {gallery.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setLightbox(img)}
                  className="w-24 h-24 object-cover rounded-xl border border-[var(--line)] cursor-zoom-in" />
              ))}
            </div>
          )}
        </div>

        {/* RATINGS */}
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
            <h2 className="text-sm font-bold text-stone-900">{tx('ratings', lang)}</h2>
          </div>
          {myRatings.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-2xl mb-2 block">⭐</span>
              <p className="text-xs text-stone-400">{tx('noRatings', lang)}</p>
            </div>
          ) : (
            [...myRatings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(r => (
              <div key={r.id} className="px-5 py-3 border-b border-[var(--line-soft)] last:border-0">
                <span className="text-amber-400 text-sm">{'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</span>
                {r.comment && <p className="text-xs text-stone-600 mt-1">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center cursor-zoom-out" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} aria-label={tx('close', lang)}
            className="absolute top-5 start-5 bg-red-500 text-white px-4 py-2 rounded-lg font-bold">✕</button>
        </div>
      )}
    </div>
  );
}
