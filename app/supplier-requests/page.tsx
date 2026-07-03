'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SupplierNav from '../components/SupplierNav';
import { displayVal, getDeadlineUrgency } from '../lib/requestHelpers';
import { getCityName } from '../lib/translations';
import { useToast } from '../components/Toast';

type Lang = 'ar' | 'en';
type FilterTab = 'all' | 'notQuoted' | 'quoted' | 'urgent';

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
  search:       { ar: 'ابحث برقم الطلب أو المدينة أو المادة...', en: 'Search by ID, city, or material...' },
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
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const router = useRouter();
  const showToast = useToast();
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'supplier') { router.push('/dashboard'); return; }
    setUser(parsedUser);

    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    setRequests(allRequests.filter((req: Request) =>
      req.selectedSuppliers && req.selectedSuppliers.includes(parsedUser.email)
    ));
    setAllQuotes(JSON.parse(localStorage.getItem('quotes') || '[]'));

    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLanguage(savedLang);
  }, [router]);

  useEffect(() => {
    if (pendingReqId === null) return;
    const el = document.getElementById(`avail-req-${pendingReqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#C0603E]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#C0603E]'), 2000);
    }
    setPendingReqId(null);
  }, [pendingReqId, requests]);

  const hasQuoted = (requestId: number) => allQuotes.some((q: any) => q.requestId === requestId && q.supplierId === user?.email);
  const hasDraft = (requestId: number) => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(`quoteDraft_${requestId}`);
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
    <div className="min-h-screen bg-[#F7F2EC] flex items-center justify-center font-cairo">
      <div className="text-stone-400 text-sm">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const openRequests = requests.filter(r => r.status === 'open');
  const urgentIds = new Set(openRequests.filter(r => {
    const u = getDeadlineUrgency(r.deadline, false);
    return u === 'soon' || u === 'overdue';
  }).map(r => r.id));

  const filtered = openRequests.filter(r => {
    const matchSearch = !search
      || String(r.id).includes(search)
      || getCityName(r.location, language).toLowerCase().includes(search.toLowerCase())
      || getReqName(r).toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'notQuoted' ? !hasQuoted(r.id) :
      filter === 'quoted' ? hasQuoted(r.id) :
      urgentIds.has(r.id);
    return matchSearch && matchFilter;
  });

  const stats = [
    { icon: '📋', bg: 'bg-[#F3EAE0]', val: openRequests.length, label: tStr('statAvail', language) },
    { icon: '📨', bg: 'bg-orange-50', val: openRequests.filter(r => !hasQuoted(r.id)).length, label: tStr('statNotQ', language) },
    { icon: '⏱', bg: 'bg-amber-50', val: urgentIds.size, label: tStr('statUrgent', language) },
    { icon: '✅', bg: 'bg-emerald-50', val: openRequests.filter(r => hasQuoted(r.id)).length, label: tStr('statQ', language) },
  ];

  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>
      <SupplierNav lang={language} setLang={l => { setLanguage(l); localStorage.setItem('language', l); }} userName={user.name || ''} active="/supplier-requests" />

      <Suspense fallback={null}>
        <ReqIdParamReader onFound={setPendingReqId} />
      </Suspense>

      {/* HERO */}
      <div className="bg-[#C0603E] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-white/50 text-xs mb-1">
              {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1">{tStr('title', language)}</h1>
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 w-64 mb-1">
            <span className="text-white/40 text-sm">🔍</span>
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
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${filter === val ? 'text-white border-[#8A7B6C]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-[#E8DFD3] rounded-xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 md:px-7 pb-10">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E8DFD3] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-stone-900 font-bold text-base">{tStr('noRequests', language)}</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {filtered.map(request => {
              const urgency = getDeadlineUrgency(request.deadline, false);
              const quoted = hasQuoted(request.id);
              return (
                <div key={request.id} id={`avail-req-${request.id}`}
                  className="bg-white border border-[#E8DFD3] rounded-2xl p-5 transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-stone-900">{getReqName(request)}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgency === 'overdue' ? 'bg-red-50 text-red-700 border border-red-200' : urgency === 'soon' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {urgency === 'overdue' ? '🔴' : urgency === 'soon' ? '🟠' : '🟢'} {String(request.id).slice(-6)}
                    </span>
                  </div>

                  <p className="text-xs text-stone-500 mb-1"><span className="font-semibold text-stone-600">{tStr('location', language)}</span> {getCityName(request.location, language)}</p>
                  <p className="text-xs text-stone-500 mb-3">
                    <span className="font-semibold text-stone-600">{tStr('deadline', language)}</span>{' '}
                    <span className={urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'soon' ? 'text-amber-600 font-semibold' : ''}>{request.deadline}</span>
                  </p>

                  <div className="bg-[#FAF7F2] rounded-lg p-3 mb-3">
                    {getReqMaterialLines(request).map((line, i) => (
                      <p key={i} className="text-xs text-stone-700 my-0.5">• {line}</p>
                    ))}
                  </div>

                  {quoted ? (
                    <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-center font-bold text-xs">
                      {tStr('quoteSubmitted', language)}
                    </div>
                  ) : hasDraft(request.id) ? (
                    <Link href={`/supplier-requests/quote/${request.id}`}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors text-center block">
                      📝 {tStr('continueDraft', language)}
                    </Link>
                  ) : (
                    <Link href={`/supplier-requests/quote/${request.id}`}
                      className="w-full py-2.5 bg-[#C0603E] hover:bg-[#9C4C31] text-white rounded-xl font-bold text-xs transition-colors text-center block">
                      {tStr('submitQuote', language)}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
