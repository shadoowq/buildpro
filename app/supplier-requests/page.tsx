'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SupplierNav from '../components/SupplierNav';
import { displayVal, getDeadlineUrgency, formatDay, readQuoteDraft } from '../lib/requestHelpers';
import { getSupplierVisibleRequests, isRequestMatchedToSupplier } from '../lib/marketplace';
import { MATERIAL_OPTIONS } from '../lib/materialOptions';
import { getCityName } from '../lib/translations';
import { useToast } from '../components/Toast';
import { getCurrentUser, getLanguage, setLanguage as persistLanguage, getRequests, getQuotes } from '../lib/store';

type Lang = 'ar' | 'en';
type FilterTab = 'all' | 'notQuoted' | 'quoted' | 'urgent';
type ViewMode = 'cards' | 'table';
type SortBy = 'newest' | 'deadline';

interface Request {
  id: number;
  contractorId: string;
  projectName?: string;
  materials?: any[];
  ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  location: string;
  deadline: string;
  budget: number;
  description: string;
  status: 'open' | 'closed' | 'completed';
  createdAt: string;
  selectedSuppliers: string[];
}

const T = {
  title:        { ar: 'الطلبات المتاحة لك',   en: 'Requests Available to You' },
  search:       { ar: 'ابحث بالرقم أو المدينة أو المادة أو الوصف...', en: 'Search by ID, city, material, or description...' },
  filterAll:    { ar: 'الكل',                 en: 'All'        },
  filterNotQ:   { ar: 'لم يُقدَّم عرض',        en: 'Not Quoted' },
  filterQ:      { ar: 'تم التقديم',           en: 'Quoted'     },
  filterUrgent: { ar: 'عاجل',                 en: 'Urgent'     },
  statAvail:    { ar: 'طلبات متاحة',          en: 'Available Requests' },
  statNotQ:     { ar: 'بدون عرض',             en: 'Not Quoted' },
  statUrgent:   { ar: 'عاجلة (48 ساعة)',      en: 'Urgent (48h)' },
  statQ:        { ar: 'تم تقديم عرض',         en: 'Quoted'     },
  noRequests:   { ar: 'لا توجد طلبات مطابقة', en: 'No matching requests' },
  location:     { ar: 'الموقع:',             en: 'Location:'  },
  deadline:     { ar: 'الموعد:',             en: 'Deadline:'  },
  submitQuote:  { ar: 'تقديم عرض سعر',       en: 'Submit Quote' },
  continueDraft:{ ar: 'متابعة العرض (مسودة محفوظة)', en: 'Continue Quote (Draft Saved)' },
  quoteSubmitted:{ ar: '✓ تم تقديم عرض السعر', en: '✓ Quote Submitted' },
  needsRevision: { ar: '✏ مطلوب تعديل عرضك — عدّل الآن', en: '✏ Revision requested — edit now' },
  deadlinePassed:{ ar: 'انتهى الموعد', en: 'Deadline passed' },
  viewQuote:    { ar: 'عرض التفاصيل',        en: 'View Details' },
  viewTable:    { ar: 'جدول',                en: 'Table'        },
  viewCards:    { ar: 'كروت',                en: 'Cards'        },
  sortLabel:    { ar: 'الترتيب:',            en: 'Sort:'        },
  sortNewest:   { ar: 'الأحدث',              en: 'Newest'       },
  sortDeadline: { ar: 'الأقرب ميعادًا',       en: 'Soonest Deadline' },
  allCities:    { ar: 'كل المدن',            en: 'All cities'   },
  allMaterials: { ar: 'كل المواد',           en: 'All materials' },
  matched:      { ar: 'مطابقة',              en: 'Matched' },
  matchedNote:  { ar: 'ظهر لك هذا الطلب تلقائيًا لأنه يطابق تخصصك ومدنك — لم يخترك المقاول يدويًا', en: "This request appeared automatically because it matches your specialty and cities — the contractor didn't hand-pick you" },
  preview:      { ar: 'معاينة سريعة',        en: 'Quick Preview' },
  reqId:        { ar: 'رقم الطلب',           en: 'Request #'    },
  name:         { ar: 'الاسم',               en: 'Name'         },
  materials:    { ar: 'المواد',              en: 'Materials'    },
  action:       { ar: 'إجراء',              en: 'Action'        },
  previewTitle: { ar: 'معاينة الطلب',        en: 'Request Preview' },
  close:        { ar: 'إغلاق',              en: 'Close'         },
  reqMaterials: { ar: 'المواد المطلوبة',     en: 'Required Materials' },
  description:  { ar: 'الوصف',              en: 'Description'   },
  material:     { ar: 'نوع المادة',          en: 'Material'      },
  usage:        { ar: 'الاستخدام',           en: 'Usage'         },
  size:         { ar: 'المقاس',              en: 'Size'          },
  thickness:    { ar: 'السماكة',             en: 'Thickness'     },
  finish:       { ar: 'الفنش',               en: 'Finish'        },
  color:        { ar: 'اللون',               en: 'Color'         },
  qty:          { ar: 'الكمية',              en: 'Qty'           },
  targetPrice:  { ar: 'السعر المستهدف',      en: 'Target Price'  },
  origin:       { ar: 'الصناعة',             en: 'Origin'        },
  deliveryDate: { ar: 'تاريخ التوريد',       en: 'Delivery Date' },
  note:         { ar: 'وصف البند',           en: 'Note'          },
  images:       { ar: 'الصور',               en: 'Images'        },
  noValue:      { ar: '—',                   en: '—'             },
};

function tStr(key: keyof typeof T, lang: Lang): string {
  return T[key][lang];
}

function ReqIdParamReader({ onFound }: { onFound: (id: number) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const reqId = searchParams.get('reqId');
    if (reqId) onFound(Number(reqId));
  }, [searchParams, onFound]);
  return null;
}

export default function SupplierRequests() {
  const [language, setLanguage] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [allQuotes, setAllQuotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [previewRequest, setPreviewRequest] = useState<Request | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const router = useRouter();
  const showToast = useToast();
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const parsedUser = getCurrentUser<any>();
    if (!parsedUser) { router.push('/login'); return; }
    if (parsedUser.userType !== 'supplier') { router.push('/dashboard'); return; }
    setUser(parsedUser);

    const allRequests = getRequests<Request>();
    setRequests(getSupplierVisibleRequests(allRequests, parsedUser));
    setAllQuotes(getQuotes());

    setLanguage(getLanguage());
  }, [router]);

  useEffect(() => {
    if (pendingReqId === null) return;
    const el = document.getElementById(`avail-req-${pendingReqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[var(--brand)]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--brand)]'), 2000);
    }
    setPendingReqId(null);
  }, [pendingReqId, requests]);

  const hasQuoted = (requestId: number) => allQuotes.some((q: any) => q.requestId === requestId && q.supplierId === user?.email);
  const myQuoteFor = (requestId: number) => allQuotes.find((q: any) => q.requestId === requestId && q.supplierId === user?.email);
  const hasDraft = (requestId: number) => {
    if (typeof window === 'undefined' || !user?.email) return false;
    return !!readQuoteDraft(user.email, requestId);
  };

  const getReqName = (r: Request) => {
    if (r.projectName?.trim()) return r.projectName.trim();
    if (r.materials?.length) {
      const types = [...new Set(r.materials.map((m: any) => m.type || m.typePending).filter(Boolean))] as string[];
      if (types.length) return types.map(tp => displayVal(tp, language)).join(' — ');
    }
    return `#${String(r.id).slice(-4)}`;
  };

  const getReqMaterialLines = (r: Request): string[] => {
    if (r.materials?.length) {
      return r.materials
        .filter((m: any) => m.type || m.typePending)
        .map((m: any) => `${displayVal(m.type || m.typePending, language)}: ${m.quantity ?? 0} ${displayVal(m.unit, language) !== '—' ? displayVal(m.unit, language) : 'm²'}`);
    }
    const lines: string[] = [];
    if (r.ceramic > 0) lines.push(`${language === 'ar' ? 'سيراميك' : 'Ceramic'}: ${r.ceramic} m²`);
    if (r.porcelain > 0) lines.push(`${language === 'ar' ? 'بورسلان' : 'Porcelain'}: ${r.porcelain} m²`);
    if (r.marble > 0) lines.push(`${language === 'ar' ? 'رخام' : 'Marble'}: ${r.marble} m²`);
    if (r.granite > 0) lines.push(`${language === 'ar' ? 'جرانيت' : 'Granite'}: ${r.granite} m²`);
    if (r.terrazzo > 0) lines.push(`${language === 'ar' ? 'تيرازو' : 'Terrazzo'}: ${r.terrazzo} m²`);
    return lines;
  };

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-500 text-sm">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const openRequests = requests.filter(r => r.status === 'open');
  const urgentIds = new Set(openRequests.filter(r => {
    const u = getDeadlineUrgency(r.deadline, false);
    return u === 'soon' || u === 'overdue';
  }).map(r => r.id));

  /* material types present on a request — covers both the materials[] shape and legacy flat fields */
  const requestMaterialTypes = (r: Request): string[] => {
    if (r.materials?.length) return r.materials.map((m: any) => m.type || m.typePending).filter(Boolean);
    const legacy: [number, string][] = [[r.ceramic, 'سيراميك'], [r.porcelain, 'بورسلان'], [r.marble, 'رخام'], [r.granite, 'جرانيت'], [r.terrazzo, 'تيرازو']];
    return legacy.filter(([qty]) => qty > 0).map(([, type]) => type);
  };

  const cityOptions = [...new Set(openRequests.map(r => r.location).filter(Boolean))];

  const filtered = openRequests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || String(r.id).includes(search)
      || getCityName(r.location, language).toLowerCase().includes(q)
      || getReqName(r).toLowerCase().includes(q)
      || (r.description || '').toLowerCase().includes(q);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'notQuoted' ? !hasQuoted(r.id) :
      filter === 'quoted' ? hasQuoted(r.id) :
      urgentIds.has(r.id);
    const matchCity = !cityFilter || r.location === cityFilter;
    const matchMaterial = !materialFilter || requestMaterialTypes(r).includes(materialFilter);
    return matchSearch && matchFilter && matchCity && matchMaterial;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'deadline') {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return da - db;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = [
    { icon: '📋', bg: 'bg-[var(--tint)]', val: openRequests.length, label: tStr('statAvail', language) },
    { icon: '📨', bg: 'bg-orange-50', val: openRequests.filter(r => !hasQuoted(r.id)).length, label: tStr('statNotQ', language) },
    { icon: '⏱', bg: 'bg-amber-50', val: urgentIds.size, label: tStr('statUrgent', language) },
    { icon: '✅', bg: 'bg-emerald-50', val: openRequests.filter(r => hasQuoted(r.id)).length, label: tStr('statQ', language) },
  ];

  const renderQuoteAction = (request: Request, compact?: boolean) => {
    const myQuote = myQuoteFor(request.id);
    if (myQuote?.status === 'revision') {
      return (
        <Link href={`/supplier-requests/quote/${request.id}?editQuoteId=${myQuote.id}`} onClick={e => e.stopPropagation()}
          className={`${compact ? '' : 'w-full'} py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors text-center block`}>
          {tStr('needsRevision', language)}
        </Link>
      );
    }
    const quoted = hasQuoted(request.id);
    if (quoted) {
      return (
        <div className="flex gap-2">
          <div className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-center font-bold text-xs">
            {tStr('quoteSubmitted', language)}
          </div>
          {myQuoteFor(request.id) && (
            <a href={`/print/quote/${myQuoteFor(request.id).id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="py-2.5 px-3 bg-white text-[var(--brand-strong)] border border-[var(--brand-strong)] rounded-xl font-bold text-xs hover:bg-[var(--bg-soft)] transition-colors text-center">
              {tStr('viewQuote', language)}
            </a>
          )}
        </div>
      );
    }
    if (hasDraft(request.id)) {
      return (
        <Link href={`/supplier-requests/quote/${request.id}`} onClick={e => e.stopPropagation()}
          className={`${compact ? '' : 'w-full'} py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors text-center block`}>
          📝 {tStr('continueDraft', language)}
        </Link>
      );
    }
    return (
      <Link href={`/supplier-requests/quote/${request.id}`} onClick={e => e.stopPropagation()}
        className={`${compact ? '' : 'w-full'} py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-xl font-bold text-xs transition-colors text-center block`}>
        {tStr('submitQuote', language)}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <SupplierNav lang={language} setLang={l => { setLanguage(l); persistLanguage(l); }} userName={user.name || ''} active="/supplier-requests" />

      <Suspense fallback={null}>
        <ReqIdParamReader onFound={setPendingReqId} />
      </Suspense>

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-white/70 text-xs mb-1">
              {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1">{tStr('title', language)}</h1>
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 w-64 mb-1">
            <span className="text-white/60 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tStr('search', language)}
              className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-white/40 text-white" />
          </div>
        </div>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {([
            ['all', tStr('filterAll', language)],
            ['notQuoted', tStr('filterNotQ', language)],
            ['quoted', tStr('filterQ', language)],
            ['urgent', tStr('filterUrgent', language)],
          ] as [FilterTab, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${filter === val ? 'text-white border-[var(--sec)]' : 'text-white/60 border-transparent hover:text-white/70'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-xs text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* TOOLBAR: sort + filters + view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 md:px-7 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-stone-500 font-semibold">{tStr('sortLabel', language)}</span>
          <div className="flex items-center gap-1 bg-white border border-[var(--line)] rounded-lg p-0.5">
            {([['newest', tStr('sortNewest', language)], ['deadline', tStr('sortDeadline', language)]] as [SortBy, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${sortBy === v ? 'bg-[var(--sec)] text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            className={`text-xs border rounded-lg px-2.5 py-1.5 bg-white outline-none font-cairo ${cityFilter ? 'border-[var(--brand-strong)] text-[var(--brand-strong)] font-semibold' : 'border-[var(--line)] text-stone-600'}`}>
            <option value="">📍 {tStr('allCities', language)}</option>
            {cityOptions.map(c => <option key={c} value={c}>{getCityName(c, language)}</option>)}
          </select>
          <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}
            className={`text-xs border rounded-lg px-2.5 py-1.5 bg-white outline-none font-cairo ${materialFilter ? 'border-[var(--brand-strong)] text-[var(--brand-strong)] font-semibold' : 'border-[var(--line)] text-stone-600'}`}>
            <option value="">🧱 {tStr('allMaterials', language)}</option>
            {MATERIAL_OPTIONS.types.map(m => <option key={m} value={m}>{displayVal(m, language)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-white border border-[var(--line)] rounded-xl p-1">
          {([
            { mode: 'cards' as ViewMode, icon: '⊞', label: tStr('viewCards', language) },
            { mode: 'table' as ViewMode, icon: '☰', label: tStr('viewTable', language) },
          ]).map(v => (
            <button key={v.mode} onClick={() => setViewMode(v.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === v.mode ? 'bg-[var(--tint)] text-[var(--brand-strong)]' : 'text-stone-500 hover:text-stone-600'}`}>
              <span className="text-sm">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-7 pb-10">
        {sorted.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-stone-900 font-bold text-base">{tStr('noRequests', language)}</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 760 }}>
              <thead>
                <tr className="bg-[var(--bg-soft)] border-b border-[var(--line-soft)]">
                  {['#', tStr('name', language), tStr('materials', language), tStr('location', language), tStr('deadline', language), tStr('action', language)].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-xs font-semibold text-stone-500 whitespace-nowrap text-start">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(request => {
                  const urgency = getDeadlineUrgency(request.deadline, false);
                  return (
                    <tr key={request.id} id={`avail-req-${request.id}`}
                      className="border-b border-[var(--line-soft)] last:border-0 hover:bg-[var(--bg-soft)] cursor-pointer transition-colors"
                      onClick={() => setPreviewRequest(request)}>
                      <td className="px-4 py-3 font-semibold text-[var(--brand-strong)]">
                        {urgency === 'overdue' ? '🔴' : urgency === 'soon' ? '🟠' : '🟢'} {String(request.id).slice(-6)}
                      </td>
                      <td className="px-4 py-3 font-bold text-stone-900 whitespace-nowrap">
                        {getReqName(request)}
                        {!request.selectedSuppliers?.includes(user.email) && (
                          <span className="ms-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--tint)] text-[var(--brand-strong)]" title={tStr('matchedNote', language)}>🎯</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-500 max-w-[220px] truncate">{getReqMaterialLines(request).join(' · ') || tStr('noValue', language)}</td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">📍 {getCityName(request.location, language)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'soon' ? 'text-amber-600 font-semibold' : 'text-stone-600'}>
                          {formatDay(request.deadline, language)}{urgency === 'overdue' ? ` — ${tStr('deadlinePassed', language)}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="min-w-[140px]">{renderQuoteAction(request, true)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {sorted.map(request => {
              const urgency = getDeadlineUrgency(request.deadline, false);
              return (
                <div key={request.id} id={`avail-req-${request.id}`}
                  className="bg-white border border-[var(--line)] rounded-2xl p-5 transition-shadow cursor-pointer hover:shadow-md"
                  onClick={() => setPreviewRequest(request)}>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{getReqName(request)}</span>
                      {!request.selectedSuppliers?.includes(user.email) && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--tint)] text-[var(--brand-strong)]" title={tStr('matchedNote', language)}>🎯 {tStr('matched', language)}</span>
                      )}
                    </h3>
                    <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${urgency === 'overdue' ? 'bg-red-50 text-red-700 border border-red-200' : urgency === 'soon' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {urgency === 'overdue' ? '🔴' : urgency === 'soon' ? '🟠' : '🟢'} {String(request.id).slice(-6)}
                    </span>
                  </div>

                  <p className="text-xs text-stone-500 mb-1"><span className="font-semibold text-stone-600">{tStr('location', language)}</span> {getCityName(request.location, language)}</p>
                  <p className="text-xs text-stone-500 mb-3">
                    <span className="font-semibold text-stone-600">{tStr('deadline', language)}</span>{' '}
                    <span className={urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'soon' ? 'text-amber-600 font-semibold' : ''}>
                      {formatDay(request.deadline, language)}{urgency === 'overdue' ? ` — ${tStr('deadlinePassed', language)}` : ''}
                    </span>
                  </p>

                  <div className="bg-[var(--bg-soft)] rounded-lg p-3 mb-3">
                    {getReqMaterialLines(request).map((line, i) => (
                      <p key={i} className="text-xs text-stone-700 my-0.5">• {line}</p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <button onClick={e => { e.stopPropagation(); setPreviewRequest(request); }}
                      className="text-xs font-semibold text-[var(--sec)] hover:underline">
                      👁 {tStr('preview', language)}
                    </button>
                  </div>

                  {renderQuoteAction(request)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK PREVIEW MODAL */}
      {previewRequest && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={() => setPreviewRequest(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" dir={dir} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-100 flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-stone-900">{tStr('previewTitle', language)}</h2>
                <span className="text-[var(--sec)] font-bold text-sm">{getReqName(previewRequest)}</span>
                <span className="text-stone-500 text-sm">📍 {getCityName(previewRequest.location, language)}</span>
                {previewRequest.deadline && <span className="text-stone-500 text-sm">⏱ {formatDay(previewRequest.deadline, language)}</span>}
              </div>
              <button onClick={() => setPreviewRequest(null)} aria-label={tStr('close', language)}
                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-100 text-lg">✕</button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-3">{tStr('reqMaterials', language)}</h3>
                {previewRequest.materials && previewRequest.materials.length > 0 ? (
                  <div className="overflow-x-auto border border-stone-200 rounded-xl">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['#', tStr('material', language), tStr('usage', language), tStr('size', language), tStr('thickness', language), tStr('finish', language), tStr('color', language), tStr('qty', language), tStr('targetPrice', language), tStr('origin', language), tStr('deliveryDate', language), tStr('note', language), tStr('images', language)].map(h => (
                            <th key={h} style={{ padding: '8px 10px', backgroundColor: 'var(--chrome)', color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', textAlign: 'center', border: '1px solid var(--chrome-line)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRequest.materials.map((m: any, i: number) => (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : 'var(--bg-soft)' }}>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{i + 1}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)', fontWeight: 700 }}>{displayVal(m.type, language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{displayVal(m.usage, language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{m.size || tStr('noValue', language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{m.thickness || tStr('noValue', language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{displayVal(m.finish, language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{displayVal(m.color, language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{m.quantity ? `${m.quantity} ${displayVal(m.unit, language) !== '—' ? displayVal(m.unit, language) : 'm²'}` : tStr('noValue', language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : tStr('noValue', language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{displayVal(m.origin, language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>{m.deliveryDate || tStr('noValue', language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 11, textAlign: 'center', border: '1px solid var(--line)', maxWidth: 120 }}>{m.note || tStr('noValue', language)}</td>
                            <td style={{ padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)' }}>
                              {m.images && m.images.length > 0 ? (
                                <div className="flex gap-1 justify-center">
                                  {m.images.map((img: string, j: number) => (
                                    <img key={j} src={img} alt="" onClick={() => setLightboxImg(img)}
                                      className="w-10 h-10 object-cover rounded border border-stone-200 cursor-zoom-in" />
                                  ))}
                                </div>
                              ) : tStr('noValue', language)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600 space-y-1">
                    {getReqMaterialLines(previewRequest).map((line, i) => <p key={i}>• {line}</p>)}
                  </div>
                )}
              </div>

              {previewRequest.description && (
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-2">{tStr('description', language)}</h3>
                  <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600">{previewRequest.description}</div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-stone-100">
              <button onClick={() => setPreviewRequest(null)} className="flex-1 bg-stone-100 text-stone-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-stone-200">{tStr('close', language)}</button>
              <div className="flex-1">{renderQuoteAction(previewRequest)}</div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center cursor-zoom-out" role="dialog" aria-modal="true" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightboxImg(null)} aria-label={tStr('close', language)}
            className="absolute top-5 right-5 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm">✕</button>
        </div>
      )}
    </div>
  );
}
