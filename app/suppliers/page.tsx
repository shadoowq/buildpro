'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import { getCurrentUser, getLanguage, setLanguage, getRequests, getQuotes, getUsers, getRatings, getUserShadow } from '../lib/store';

type Lang = 'ar' | 'en';

interface Quote {
  id: number;
  requestId: number;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  totalPrice: number;
  deliveryDays: number;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
  createdAt: string;
}

interface Rating {
  id: number;
  requestId: number;
  supplierId: string;
  supplierCompany: string;
  rating: number;
  comment: string;
}

interface SupplierCard {
  email: string;
  name: string;
  company: string;
  city: string;
  phone: string;
  initials: string;
  avgRating: number;
  ratingCount: number;
  quoteCount: number;
  acceptedCount: number;
  lastActivity: string;
  quotes: Quote[];
}

const T = {
  title:       { ar: 'الموردون',             en: 'Suppliers'            },
  subtitle:    { ar: 'الموردون الذين تعاملوا مع طلباتك', en: 'Suppliers who quoted your requests' },
  total:       { ar: 'إجمالي الموردين',      en: 'Total Suppliers'      },
  avgRating:   { ar: 'متوسط التقييم',        en: 'Avg. Rating'          },
  totalQuotes: { ar: 'إجمالي العروض',        en: 'Total Quotes'         },
  accepted:    { ar: 'عروض مقبولة',          en: 'Accepted Quotes'      },
  search:      { ar: 'ابحث بالاسم أو الشركة...', en: 'Search by name or company...' },
  allCities:   { ar: 'كل المدن',             en: 'All Cities'           },
  sortByQ:     { ar: 'الأكثر عروضاً',        en: 'Most Quotes'          },
  sortByR:     { ar: 'الأعلى تقييماً',       en: 'Highest Rated'        },
  sortByD:     { ar: 'الأحدث',               en: 'Most Recent'          },
  quotes:      { ar: 'عروض',                 en: 'quotes'               },
  accepted2:   { ar: 'مقبول',                en: 'accepted'             },
  noData:      { ar: '—',                    en: '—'                    },
  history:     { ar: 'تاريخ التعاملات',      en: 'Quote History'        },
  close:       { ar: 'إغلاق',                en: 'Close'                },
  reqLabel:    { ar: 'طلب',                  en: 'Request'              },
  price:       { ar: 'السعر',                en: 'Price'                },
  delivery:    { ar: 'التوريد',              en: 'Delivery'             },
  days:        { ar: 'يوم',                  en: 'days'                 },
  sar:         { ar: 'ر.س',                  en: 'SAR'                  },
  status:      { ar: 'الحالة',               en: 'Status'               },
  date:        { ar: 'التاريخ',              en: 'Date'                 },
  pending:     { ar: 'انتظار',               en: 'Pending'              },
  rejectedL:   { ar: 'مرفوض',               en: 'Rejected'             },
  revisionL:   { ar: 'طلب تعديل',            en: 'Revision'             },
  noSuppliers: { ar: 'لا يوجد موردون بعد',   en: 'No suppliers yet'     },
  noSuppSub:   { ar: 'عندما يرسل موردون عروض على طلباتك ستظهر هنا', en: 'Suppliers who quote your requests will appear here' },
  noResults:   { ar: 'لا توجد نتائج',        en: 'No results found'     },
  phone:       { ar: 'الهاتف:',              en: 'Phone:'               },
  email:       { ar: 'البريد الإلكتروني:',   en: 'Email:'               },
  city:        { ar: 'المدينة:',             en: 'City:'                },
  noContact:   { ar: 'غير متوفر',            en: 'N/A'                  },
};

function t(key: keyof typeof T, lang: Lang): string {
  return (T[key] as any)[lang];
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
      {(['ar', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[var(--brand-strong)] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
          <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="20" height="14" alt={l} className="rounded-sm" />
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status, lang }: { status: string; lang: Lang }) {
  const map: Record<string, { cls: string; label: { ar: string; en: string } }> = {
    pending:  { cls: 'bg-orange-50 text-orange-700 border-orange-200',   label: { ar: 'انتظار', en: 'Pending' } },
    accepted: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: { ar: 'مقبول',  en: 'Accepted' } },
    rejected: { cls: 'bg-red-50 text-red-600 border-red-200',            label: { ar: 'مرفوض',  en: 'Rejected' } },
    revision: { cls: 'bg-amber-50 text-amber-700 border-amber-200',       label: { ar: 'تعديل',  en: 'Revision' } },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label[lang]}
    </span>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return <span className="text-stone-300 text-xs">—</span>;
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [userName, setUserName] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierCard[]>([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'quotes' | 'rating' | 'date'>('quotes');
  const [selected, setSelected] = useState<SupplierCard | null>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    setLang(getLanguage());

    const user = getCurrentUser<any>();
    if (!user) { router.push('/login'); return; }
    if (user.userType !== 'contractor') { router.push('/dashboard'); return; }
    if (user.name) setUserName(user.name);

    buildSupplierList(user.email);
  }, [router]);

  const buildSupplierList = (contractorEmail: string) => {
    const allRequests = getRequests();
    const myRequests = allRequests.filter((r: any) => r.contractorId === contractorEmail);
    const myReqIds = new Set(myRequests.map((r: any) => r.id));

    const allQuotes: Quote[] = getQuotes<Quote>();
    const myQuotes = allQuotes.filter(q => myReqIds.has(q.requestId));

    const allUsers: any[] = getUsers();
    const allRatings: Rating[] = getRatings<Rating>();

    const supplierMap: Record<string, SupplierCard> = {};

    myQuotes.forEach(q => {
      if (!supplierMap[q.supplierId]) {
        const userData = getUserShadow<any>(q.supplierId) || allUsers.find((u: any) => u.email === q.supplierId);

        const displayName = userData?.company || userData?.name || q.supplierCompany;
        supplierMap[q.supplierId] = {
          email:         q.supplierId,
          name:          userData?.name || q.supplierName,
          company:       userData?.company || q.supplierCompany,
          city:          userData?.city || userData?.location || '',
          phone:         userData?.phone || '',
          initials:      displayName.slice(0, 2).toUpperCase(),
          avgRating:     0,
          ratingCount:   0,
          quoteCount:    0,
          acceptedCount: 0,
          lastActivity:  q.createdAt,
          quotes:        [],
        };
      }
      const s = supplierMap[q.supplierId];
      s.quoteCount++;
      if (q.status === 'accepted') s.acceptedCount++;
      if (new Date(q.createdAt) > new Date(s.lastActivity)) s.lastActivity = q.createdAt;
      s.quotes.push(q);
    });

    // compute ratings
    Object.values(supplierMap).forEach(s => {
      const suppRatings = allRatings.filter(r => r.supplierId === s.email);
      if (suppRatings.length > 0) {
        s.avgRating = suppRatings.reduce((acc, r) => acc + r.rating, 0) / suppRatings.length;
        s.ratingCount = suppRatings.length;
      }
    });

    setSuppliers(Object.values(supplierMap));
  };

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  const filtered = suppliers
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.company.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchCity = !cityFilter || s.city === cityFilter;
      return matchSearch && matchCity;
    })
    .sort((a, b) => {
      if (sortBy === 'quotes')  return b.quoteCount - a.quoteCount;
      if (sortBy === 'rating')  return b.avgRating - a.avgRating || b.ratingCount - a.ratingCount;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

  const availableCities = [...new Set(suppliers.map(s => s.city).filter(Boolean))];
  const totalQuotes    = suppliers.reduce((s, x) => s + x.quoteCount, 0);
  const totalAccepted  = suppliers.reduce((s, x) => s + x.acceptedCount, 0);
  const avgRatingAll   = suppliers.filter(s => s.ratingCount > 0).length > 0
    ? suppliers.filter(s => s.ratingCount > 0).reduce((s, x) => s + x.avgRating, 0) / suppliers.filter(s => s.ratingCount > 0).length
    : 0;

  const stats = [
    { icon: '🏢', bg: 'bg-[var(--tint)]',  val: suppliers.length,                label: t('total', lang)       },
    { icon: '⭐', bg: 'bg-amber-50',   val: avgRatingAll > 0 ? avgRatingAll.toFixed(1) : '—', label: t('avgRating', lang)  },
    { icon: '📥', bg: 'bg-stone-100',  val: totalQuotes,                      label: t('totalQuotes', lang) },
    { icon: '✅', bg: 'bg-emerald-50', val: totalAccepted,                    label: t('accepted', lang)    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>

      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/suppliers" />

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-7 pt-6 pb-6">
        <h1 className="text-white text-xl font-bold mb-1">{t('title', lang)}</h1>
        <p className="text-white/50 text-xs">{t('subtitle', lang)}</p>
      </div>

      {/* STATS */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-7 pb-10">

        {/* FILTER BAR */}
        <div className="bg-white border border-[var(--line)] rounded-2xl px-5 py-3.5 mb-5 flex items-center gap-3 flex-wrap">
          {/* search */}
          <div className="flex items-center gap-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-3 py-1.5 w-60">
            <span className="text-stone-300 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('search', lang)}
              className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-stone-300 text-stone-700" />
          </div>
          {/* city */}
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            className="text-xs font-semibold border border-[var(--line)] rounded-lg px-3 py-2 bg-white text-stone-700 outline-none cursor-pointer">
            <option value="">{t('allCities', lang)}</option>
            {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* sort */}
          <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 mr-auto">
            {([['quotes', t('sortByQ', lang)], ['rating', t('sortByR', lang)], ['date', t('sortByD', lang)]] as ['quotes' | 'rating' | 'date', string][]).map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${sortBy === val ? 'bg-white text-[var(--brand-strong)] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* SUPPLIERS GRID */}
        {suppliers.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">🏢</span>
            <p className="text-stone-900 font-bold text-base">{t('noSuppliers', lang)}</p>
            <p className="text-stone-400 text-sm max-w-xs">{t('noSuppSub', lang)}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-10 text-center">
            <p className="text-stone-400 text-sm">{t('noResults', lang)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(s => (
              <div key={s.email}
                className="bg-white border border-[var(--line)] rounded-2xl p-5 hover:shadow-md hover:border-[var(--sec)]/30 transition-all cursor-pointer group"
                onClick={() => setSelected(s)}>
                {/* header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--tint)] border border-[var(--line)] flex items-center justify-center text-[14px] font-bold text-[var(--brand-strong)] shrink-0 group-hover:bg-[var(--tint-hover)] transition-colors">
                    {s.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{s.company}</p>
                    <p className="text-[11px] text-stone-400 truncate">{s.name}</p>
                    {s.city && <p className="text-[10px] text-stone-400 mt-0.5">📍 {s.city}</p>}
                  </div>
                </div>

                {/* rating */}
                <div className="flex items-center gap-2 mb-3">
                  <StarRating rating={s.avgRating} count={s.ratingCount} />
                  {s.ratingCount > 0 && (
                    <span className="text-[10px] text-stone-400">({s.avgRating.toFixed(1)})</span>
                  )}
                </div>

                {/* stats */}
                <div className="flex gap-3 border-t border-[var(--line-soft)] pt-3">
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold text-stone-900">{s.quoteCount}</p>
                    <p className="text-[10px] text-stone-400">{t('quotes', lang)}</p>
                  </div>
                  <div className="w-px bg-[var(--line-soft)]" />
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold text-emerald-600">{s.acceptedCount}</p>
                    <p className="text-[10px] text-stone-400">{t('accepted2', lang)}</p>
                  </div>
                  <div className="w-px bg-[var(--line-soft)]" />
                  <div className="flex-1 text-center">
                    <p className="text-[11px] font-semibold text-stone-600">
                      {s.quoteCount > 0 ? Math.round((s.acceptedCount / s.quoteCount) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-stone-400">{lang === 'ar' ? 'قبول' : 'rate'}</p>
                  </div>
                </div>

                {/* last activity */}
                <p className="text-[10px] text-stone-300 mt-3">
                  {lang === 'ar' ? 'آخر نشاط:' : 'Last:'} {new Date(s.lastActivity).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir} onClick={e => e.stopPropagation()}>

            {/* modal header */}
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--tint)] border border-[var(--line)] flex items-center justify-center text-[14px] font-bold text-[var(--brand-strong)]">
                  {selected.initials}
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">{selected.company}</h2>
                  <p className="text-xs text-stone-400">{selected.name}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-100 text-lg">✕</button>
            </div>

            <div className="p-5 space-y-5">

              {/* contact info */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('city', lang),  val: selected.city  || t('noContact', lang), icon: '📍' },
                  { label: t('phone', lang), val: selected.phone || t('noContact', lang), icon: '📞' },
                  { label: t('email', lang), val: selected.email, icon: '✉' },
                ].map((item, i) => (
                  <div key={i} className="bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl p-3">
                    <p className="text-[10px] text-stone-400 mb-1">{item.label}</p>
                    <p className="text-xs font-semibold text-stone-700 truncate">{item.icon} {item.val}</p>
                  </div>
                ))}
              </div>

              {/* rating summary */}
              {selected.ratingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="text-3xl font-bold text-amber-500">{selected.avgRating.toFixed(1)}</div>
                  <div>
                    <StarRating rating={selected.avgRating} count={selected.ratingCount} />
                    <p className="text-[10px] text-stone-500 mt-0.5">{lang === 'ar' ? `بناءً على ${selected.ratingCount} تقييم` : `Based on ${selected.ratingCount} rating(s)`}</p>
                  </div>
                </div>
              )}

              {/* quote history table */}
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-3">{t('history', lang)}</h3>
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--brand)] text-white">
                        {[t('reqLabel', lang), t('price', lang), t('delivery', lang), t('status', lang), t('date', lang)].map(h => (
                          <th key={h} className={`px-4 py-2.5 font-semibold ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...selected.quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((q, i) => (
                        <tr key={q.id} className={`border-b border-stone-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[var(--bg-soft)]'}`}>
                          <td className="px-4 py-2.5 font-semibold text-[var(--sec)]">#{q.requestId}</td>
                          <td className="px-4 py-2.5 font-bold text-stone-900">{Number(q.totalPrice).toLocaleString()} {t('sar', lang)}</td>
                          <td className="px-4 py-2.5 text-stone-600">{q.deliveryDays} {t('days', lang)}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={q.status} lang={lang} /></td>
                          <td className="px-4 py-2.5 text-stone-400">{new Date(q.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-stone-100">
              <button onClick={() => setSelected(null)}
                className="w-full bg-stone-100 text-stone-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-stone-200 transition-colors">
                {t('close', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
