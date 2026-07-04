'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ContractorNav from '../components/ContractorNav';
import HelpTooltip from '../components/HelpTooltip';
import QuoteCompareTable from '../components/QuoteCompareTable';
import { displayVal } from '../lib/requestHelpers';

type Lang = 'ar' | 'en';

interface Request {
  id: number; contractorId: string; projectName?: string;
  materials?: any[]; ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  location: string; deadline: string; budget?: number; status: 'open' | 'closed'; createdAt: string;
}
interface Quote {
  id: number; requestId: number; supplierId: string; supplierName: string; supplierCompany: string;
  totalPrice: number; deliveryDays: number; description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision'; createdAt: string;
}
interface Rating { id: number; requestId: number; supplierId: string; supplierCompany: string; rating: number; }

const REPORT_TABS = [
  { id: 'summary',   iconAr: '📋', labelAr: 'ملخص المشاريع',      labelEn: 'Project Summary'     },
  { id: 'suppliers', iconAr: '🏆', labelAr: 'أداء الموردين',       labelEn: 'Supplier Scorecard'  },
  { id: 'compare',   iconAr: '📊', labelAr: 'مقارنة عروض الأسعار', labelEn: 'Quote Comparison'    },
  { id: 'monthly',   iconAr: '📅', labelAr: 'التقرير الشهري',      labelEn: 'Monthly Report'      },
  { id: 'materials', iconAr: '🧱', labelAr: 'تقرير المواد',        labelEn: 'Materials Report'    },
  { id: 'executive', iconAr: '⚡', labelAr: 'الملخص التنفيذي',     labelEn: 'Executive Summary'   },
];

function t(ar: string, en: string, lang: Lang) { return lang === 'ar' ? ar : en; }
function fmtN(n: number, lang: Lang = 'ar') { return n.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US'); }
function fmtDate(d: string, lang: Lang) { return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }

const TH = (lang: Lang) => `border border-stone-200 bg-[var(--chrome)] px-3 py-2.5 ${lang === 'ar' ? 'text-right' : 'text-left'} text-white font-semibold text-[11px] whitespace-nowrap`;
const TD = 'border border-stone-200 px-3 py-2 text-[11px] text-stone-700';
const TDE = 'border border-stone-200 px-3 py-2 text-[11px] text-stone-700 bg-[var(--bg-soft)]';

export default function ReportsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [compareReqId, setCompareReqId] = useState<number | ''>('');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const printDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const cu = localStorage.getItem('currentUser');
    if (!cu) { router.push('/login'); return; }
    const user = JSON.parse(cu);
    if (user.userType !== 'contractor') { router.push('/dashboard'); return; }
    setUserName(user.name || '');
    setUserEmail(user.email || '');
    let allReqs: Request[] = [];
    try { allReqs = JSON.parse(localStorage.getItem('requests') || '[]'); } catch {}
    const myReqs = allReqs.filter(r => r.contractorId === user.email);
    setRequests(myReqs);
    const reqIds = myReqs.map(r => r.id);
    try {
      const allQ: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
      setQuotes(allQ.filter(q => reqIds.includes(q.requestId)));
    } catch {}
    try {
      const allR: Rating[] = JSON.parse(localStorage.getItem('ratings') || '[]');
      setRatings(allR.filter(r => reqIds.includes(r.requestId)));
    } catch {}
    if (myReqs.length > 0) setCompareReqId(myReqs[0].id);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  const getReqName = (req: Request) => {
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.slice(0, 2).join(' — ');
    }
    const parts: string[] = [];
    if (req.ceramic > 0)   parts.push(t('سيراميك','Ceramic', lang));
    if (req.porcelain > 0) parts.push(t('بورسلان','Porcelain', lang));
    if (req.marble > 0)    parts.push(t('رخام','Marble', lang));
    if (req.granite > 0)   parts.push(t('جرانيت','Granite', lang));
    if (req.terrazzo > 0)  parts.push(t('تيرازو','Terrazzo', lang));
    return parts.join(' — ') || `#${req.id}`;
  };

  /* ── REPORT 1: Project Summary ── */
  const report1 = useMemo(() => requests.map(req => {
    const rq = quotes.filter(q => q.requestId === req.id);
    const accepted = rq.find(q => q.status === 'accepted');
    const prices = rq.map(q => Number(q.totalPrice)).filter(p => !isNaN(p));
    const minP = prices.length ? Math.min(...prices) : null;
    const maxP = prices.length ? Math.max(...prices) : null;
    const savings = accepted && maxP ? maxP - Number(accepted.totalPrice) : null;
    return { req, quoteCount: rq.length, accepted, minP, maxP, savings };
  }).sort((a, b) => new Date(b.req.createdAt).getTime() - new Date(a.req.createdAt).getTime()), [requests, quotes]);

  const totalSavings = report1.reduce((s, r) => s + (r.savings || 0), 0);
  const totalAccepted = report1.filter(r => r.accepted).reduce((s, r) => s + Number(r.accepted!.totalPrice), 0);

  /* ── REPORT 2: Supplier Scorecard ── */
  const report2 = useMemo(() => {
    const map: Record<string, { id: string; name: string; company: string; total: number; accepted: number; rejected: number; totalPrice: number; totalDays: number; rating: number; ratingCount: number }> = {};
    quotes.forEach(q => {
      if (!map[q.supplierId]) map[q.supplierId] = { id: q.supplierId, name: q.supplierName, company: q.supplierCompany, total: 0, accepted: 0, rejected: 0, totalPrice: 0, totalDays: 0, rating: 0, ratingCount: 0 };
      const s = map[q.supplierId];
      s.total++; s.totalPrice += Number(q.totalPrice); s.totalDays += q.deliveryDays;
      if (q.status === 'accepted') s.accepted++;
      if (q.status === 'rejected') s.rejected++;
    });
    ratings.forEach(r => {
      if (map[r.supplierId]) { map[r.supplierId].rating += r.rating; map[r.supplierId].ratingCount++; }
    });
    return Object.values(map).sort((a, b) => b.accepted - a.accepted);
  }, [quotes, ratings]);

  /* ── REPORT 3: Quote Comparison ── */
  const compareQuotes = useMemo(() => {
    if (!compareReqId) return [];
    return quotes.filter(q => q.requestId === Number(compareReqId)).sort((a, b) => Number(a.totalPrice) - Number(b.totalPrice));
  }, [quotes, compareReqId]);
  const cheapestQ = compareQuotes.length ? compareQuotes[0] : null;
  const fastestQ  = compareQuotes.length ? [...compareQuotes].sort((a, b) => a.deliveryDays - b.deliveryDays)[0] : null;

  /* ── REPORT 4: Monthly ── */
  const report4 = useMemo(() => {
    const map: Record<string, { month: string; reqs: number; quotesReceived: number; accepted: number; totalVal: number }> = {};
    const getM = (d: string) => d.slice(0, 7);
    requests.forEach(r => {
      if (!r.createdAt) return;
      const m = getM(r.createdAt);
      if (!map[m]) map[m] = { month: m, reqs: 0, quotesReceived: 0, accepted: 0, totalVal: 0 };
      map[m].reqs++;
    });
    quotes.forEach(q => {
      if (!q.createdAt) return;
      const m = getM(q.createdAt);
      if (!map[m]) map[m] = { month: m, reqs: 0, quotesReceived: 0, accepted: 0, totalVal: 0 };
      map[m].quotesReceived++;
      if (q.status === 'accepted') { map[m].accepted++; map[m].totalVal += Number(q.totalPrice); }
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
  }, [requests, quotes]);

  /* ── REPORT 5: Materials ── */
  /* canonical (untranslated) type names — always Arabic, translated only at render time via displayVal */
  const getReqTypes = (req: Request): string[] => {
    if (req.materials?.length) return req.materials.map((m: any) => m.type || m.typePending).filter(Boolean);
    const types: string[] = [];
    if (req.ceramic > 0)   types.push('سيراميك');
    if (req.porcelain > 0) types.push('بورسلان');
    if (req.marble > 0)    types.push('رخام');
    if (req.granite > 0)   types.push('جرانيت');
    if (req.terrazzo > 0)  types.push('تيرازو');
    return types;
  };

  const report5 = useMemo(() => {
    const map: Record<string, { type: string; reqCount: number; totalQty: number; unit: string; quoteCount: number; acceptedPrices: number[] }> = {};
    const add = (type: string, qty: number, unit: string) => {
      const k = type.trim();
      if (!k) return;
      if (!map[k]) map[k] = { type: k, reqCount: 0, totalQty: 0, unit, quoteCount: 0, acceptedPrices: [] };
      map[k].reqCount++; map[k].totalQty += qty;
    };
    requests.forEach(req => {
      if (req.materials?.length) {
        req.materials.forEach((m: any) => {
          const type = m.type || m.typePending;
          if (type?.trim()) add(type, parseFloat(m.quantity) || 0, m.unit || 'م²');
        });
      } else {
        if (req.ceramic > 0)   add('سيراميك', req.ceramic, 'م²');
        if (req.porcelain > 0) add('بورسلان', req.porcelain, 'م²');
        if (req.marble > 0)    add('رخام', req.marble, 'م²');
        if (req.granite > 0)   add('جرانيت', req.granite, 'م²');
        if (req.terrazzo > 0)  add('تيرازو', req.terrazzo, 'م²');
      }
    });
    quotes.forEach(q => {
      const req = requests.find(r => r.id === q.requestId);
      if (!req) return;
      const types = getReqTypes(req);
      types.forEach((type: string) => {
        if (map[type]) {
          map[type].quoteCount++;
          if (q.status === 'accepted') map[type].acceptedPrices.push(Number(q.totalPrice) / (types.length || 1));
        }
      });
    });
    return Object.values(map).sort((a, b) => b.reqCount - a.reqCount);
  }, [requests, quotes, lang]);

  /* ── REPORT 6: Executive ── */
  const exec = useMemo(() => {
    const open   = requests.filter(r => r.status === 'open').length;
    const closed = requests.filter(r => r.status === 'closed').length;
    const pendQ  = quotes.filter(q => q.status === 'pending').length;
    const accQ   = quotes.filter(q => q.status === 'accepted').length;
    const rejQ   = quotes.filter(q => q.status === 'rejected').length;
    const totalV = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + Number(q.totalPrice), 0);
    const avgDays = quotes.length ? (quotes.reduce((s, q) => {
      const req = requests.find(r => r.id === q.requestId);
      if (!req) return s;
      return s + (new Date(q.createdAt).getTime() - new Date(req.createdAt).getTime()) / 86400000;
    }, 0) / quotes.length) : 0;
    const top3 = report2.slice(0, 3);
    const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) : 0;
    return { open, closed, pendQ, accQ, rejQ, totalV, avgDays, top3, avgRating };
  }, [requests, quotes, ratings, report2]);

  const formatMonth = (m: string) => new Date(m + '-01').toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long' });

  const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

  return (
    <div className="min-h-screen bg-[var(--bg)] md:ps-[190px]" style={{ fontFamily: 'Cairo, Arial, sans-serif' }} dir={dir}>
      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/reports" />

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-5 pb-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">{printDate}</p>
            <h1 className="text-white text-xl font-bold">{t('التقارير والتحليلات', 'Reports & Analytics', lang)}</h1>
            <p className="text-white/50 text-xs mt-0.5">{requests.length} {t('طلب','requests',lang)} · {quotes.length} {t('عرض','quotes',lang)}</p>
          </div>
          <button onClick={() => window.print()} className="mb-4 text-xs font-semibold px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors">
            🖨 {t('طباعة التقرير الحالي', 'Print Current Report', lang)}
          </button>
        </div>
        {/* TAB BAR */}
        <div className="flex gap-0 mt-4 border-t border-white/10 overflow-x-auto">
          {REPORT_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-white border-[var(--sec)]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
              {tab.iconAr} {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 md:px-7 py-6 print-area">

        {/* print header */}
        <div className="hidden print:block mb-6 pb-4 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-[var(--brand-strong)]">Build<span className="text-[var(--sec)]">Pro</span></div>
            <div className="text-sm text-stone-600 text-left">
              <p className="font-bold">{REPORT_TABS.find(t => t.id === activeTab)?.[lang === 'ar' ? 'labelAr' : 'labelEn']}</p>
              <p>{printDate}</p>
            </div>
          </div>
        </div>

        {/* ══════ REPORT 1: Project Summary ══════ */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: '📋', bg: 'bg-[var(--tint)]',  val: requests.length,                                           label: t('إجمالي الطلبات','Total Requests',lang) },
                { icon: '💼', bg: 'bg-stone-100',  val: quotes.length,                                            label: t('إجمالي العروض','Total Quotes',lang) },
                { icon: '💰', bg: 'bg-emerald-50', val: `${fmtN(totalAccepted, lang)} ${t('ر.س','SAR',lang)}`,          label: t('إجمالي المبالغ المقبولة','Total Accepted',lang) },
                { icon: '💡', bg: 'bg-amber-50',   val: `${fmtN(totalSavings, lang)} ${t('ر.س','SAR',lang)}`,           label: t('إجمالي الوفر','Total Savings',lang) },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
                  <div className="text-lg font-bold text-stone-900">{s.val}</div>
                  <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            {/* table */}
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--line-soft)] flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-900">📋 {t('تفاصيل المشاريع','Project Details',lang)}</h2>
                <span className="text-xs text-stone-400">{report1.length} {t('طلب','requests',lang)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {[t('المشروع','Project',lang), t('المدينة','City',lang), t('الموعد النهائي','Deadline',lang), t('الحالة','Status',lang),
                        t('عدد العروض','Quotes',lang), t('أقل سعر','Min Price',lang), t('العرض المقبول','Accepted',lang), t('الوفر','Savings',lang), t('تاريخ الإنشاء','Created',lang)
                      ].map(h => <th key={h} className={TH(lang)}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report1.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-10 text-stone-400 text-sm">{t('لا توجد طلبات بعد','No requests yet',lang)}</td></tr>
                    )}
                    {report1.map(({ req, quoteCount, accepted, minP, savings }, i) => (
                      <tr key={req.id}>
                        <td className={i%2===0?TD:TDE}><span className="font-semibold text-[var(--brand-strong)]">{getReqName(req)}</span></td>
                        <td className={i%2===0?TD:TDE}>{req.location || '—'}</td>
                        <td className={i%2===0?TD:TDE}>{req.deadline || '—'}</td>
                        <td className={i%2===0?TD:TDE}>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${req.status==='open'?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}`}>
                            {req.status==='open'?t('مفتوح','Open',lang):t('مغلق','Closed',lang)}
                          </span>
                        </td>
                        <td className={`${i%2===0?TD:TDE} text-center font-bold`}>{quoteCount}</td>
                        <td className={`${i%2===0?TD:TDE} text-emerald-700 font-bold`}>{minP !== null ? `${fmtN(minP, lang)} ${t('ر.س','SAR',lang)}` : '—'}</td>
                        <td className={`${i%2===0?TD:TDE} font-bold`}>{accepted ? `${fmtN(Number(accepted.totalPrice), lang)} ${t('ر.س','SAR',lang)}` : <span className="text-stone-400">—</span>}</td>
                        <td className={`${i%2===0?TD:TDE} text-amber-700 font-bold`}>{savings !== null && savings > 0 ? `${fmtN(savings, lang)} ${t('ر.س','SAR',lang)}` : '—'}</td>
                        <td className={i%2===0?TD:TDE}>{fmtDate(req.createdAt, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════ REPORT 2: Supplier Scorecard ══════ */}
        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: '🏢', bg: 'bg-[var(--tint)]',  val: report2.length,                                                              label: t('موردون تعاملنا معهم','Suppliers',lang) },
                { icon: '✅', bg: 'bg-emerald-50', val: report2.reduce((s,r)=>s+r.accepted,0),                                       label: t('عروض مقبولة','Accepted Quotes',lang) },
                { icon: '⭐', bg: 'bg-amber-50',   val: (() => { const rated = report2.filter(r => r.ratingCount > 0); return rated.length ? (rated.reduce((s,r)=>s+r.rating/r.ratingCount,0)/rated.length).toFixed(1) : '—'; })(), label: t('متوسط التقييم','Avg Rating',lang) },
                { icon: '⚡', bg: 'bg-stone-100',  val: report2.length ? `${Math.round(report2.reduce((s,r)=>s+(r.total?r.totalDays/r.total:0),0)/report2.length)} ${t('يوم','days',lang)}` : '—', label: t('متوسط مدة التوريد','Avg Delivery',lang) },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
                  <div className="text-lg font-bold text-stone-900">{s.val}</div>
                  <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
                <h2 className="text-sm font-bold text-stone-900">🏆 {t('بطاقة أداء الموردين','Supplier Scorecard',lang)}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {['#', t('المورد','Supplier',lang), t('إجمالي العروض','Total Quotes',lang), t('مقبول','Accepted',lang), t('مرفوض','Rejected',lang),
                        t('نسبة القبول','Accept Rate',lang), t('متوسط السعر','Avg Price',lang), t('متوسط التوريد','Avg Delivery',lang), t('التقييم','Rating',lang)
                      ].map(h => <th key={h} className={TH(lang)}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report2.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-10 text-stone-400 text-sm">{t('لا توجد بيانات موردين','No supplier data',lang)}</td></tr>
                    )}
                    {report2.map((s, i) => {
                      const rate = s.total > 0 ? Math.round((s.accepted / s.total) * 100) : 0;
                      const avgP = s.total > 0 ? Math.round(s.totalPrice / s.total) : 0;
                      const avgD = s.total > 0 ? Math.round(s.totalDays / s.total) : 0;
                      const avgR = s.ratingCount > 0 ? (s.rating / s.ratingCount).toFixed(1) : null;
                      const td = i%2===0?TD:TDE;
                      return (
                        <tr key={s.id}>
                          <td className={`${td} text-center font-bold text-[var(--brand-strong)]`}>{i+1}</td>
                          <td className={td}>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[var(--tint)] text-[var(--brand-strong)] text-[10px] font-bold flex items-center justify-center shrink-0">{s.company.slice(0,2)}</div>
                              <div><p className="font-semibold text-stone-900">{s.company}</p><p className="text-stone-400">{s.name}</p></div>
                            </div>
                          </td>
                          <td className={`${td} text-center font-bold`}>{s.total}</td>
                          <td className={`${td} text-center text-emerald-700 font-bold`}>{s.accepted}</td>
                          <td className={`${td} text-center text-red-600 font-bold`}>{s.rejected}</td>
                          <td className={td}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${rate}%`}} /></div>
                              <span className="font-bold text-emerald-700">{rate}%</span>
                            </div>
                          </td>
                          <td className={`${td} font-bold`}>{fmtN(avgP, lang)} {t('ر.س','SAR',lang)}</td>
                          <td className={`${td} text-center`}>{avgD} {t('يوم','days',lang)}</td>
                          <td className={td}>{avgR ? <span className="text-amber-500 font-bold">{avgR} ★</span> : <span className="text-stone-300">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════ REPORT 3: Quote Comparison ══════ */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="bg-white border border-[var(--line)] rounded-2xl py-16 text-center">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-stone-400 text-sm">{t('لا توجد طلبات بعد لمقارنة عروضها','No requests yet to compare quotes for',lang)}</p>
              </div>
            ) : (
            <>
            <div className="bg-white border border-[var(--line)] rounded-2xl p-4 flex items-center gap-3">
              <label className="text-sm font-bold text-stone-700 shrink-0">{t('اختر الطلب:','Select Request:',lang)}</label>
              <select value={compareReqId} onChange={e => setCompareReqId(Number(e.target.value))}
                className="flex-1 border border-[var(--line)] rounded-lg px-3 py-2 text-sm font-cairo text-stone-700 outline-none bg-[var(--bg-soft)]">
                {requests.map(r => <option key={r.id} value={r.id}>{getReqName(r)} — #{r.id}</option>)}
              </select>
            </div>
            {compareQuotes.length === 0 ? (
              <div className="bg-white border border-[var(--line)] rounded-2xl py-16 text-center">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-stone-400 text-sm">{t('لا توجد عروض على هذا الطلب','No quotes for this request',lang)}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* summary pills */}
                <div className="flex gap-3 flex-wrap">
                  <div className="bg-white border border-[var(--line)] rounded-xl px-4 py-2.5 text-sm">
                    <span className="text-stone-500">{t('أقل سعر:','Cheapest:',lang)} </span>
                    <span className="font-bold text-emerald-600">{cheapestQ ? `${fmtN(Number(cheapestQ.totalPrice), lang)} ${t('ر.س','SAR',lang)}` : '—'}</span>
                    {cheapestQ && <span className="text-stone-400 text-xs"> ({cheapestQ.supplierCompany})</span>}
                  </div>
                  <div className="bg-white border border-[var(--line)] rounded-xl px-4 py-2.5 text-sm">
                    <span className="text-stone-500">{t('أسرع توريد:','Fastest:',lang)} </span>
                    <span className="font-bold text-[var(--brand-strong)]">{fastestQ ? `${fastestQ.deliveryDays} ${t('يوم','days',lang)}` : '—'}</span>
                    {fastestQ && <span className="text-stone-400 text-xs"> ({fastestQ.supplierCompany})</span>}
                  </div>
                  {compareQuotes.length > 1 && cheapestQ && (
                    <div className="bg-white border border-[var(--line)] rounded-xl px-4 py-2.5 text-sm">
                      <span className="text-stone-500">{t('فرق الأسعار:','Price Range:',lang)} </span>
                      <span className="font-bold text-amber-600">
                        {fmtN(Math.max(...compareQuotes.map(q=>Number(q.totalPrice))) - Math.min(...compareQuotes.map(q=>Number(q.totalPrice))), lang)} {t('ر.س','SAR',lang)}
                      </span>
                    </div>
                  )}
                </div>
                {/* table */}
                <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                  <QuoteCompareTable quotes={compareQuotes} lang={lang} variant="readonly" />
                </div>
              </div>
            )}
            </>
            )}
          </div>
        )}

        {/* ══════ REPORT 4: Monthly ══════ */}
        {activeTab === 'monthly' && (
          <div className="space-y-4">
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
                <h2 className="text-sm font-bold text-stone-900">📅 {t('النشاط الشهري (آخر 12 شهر)','Monthly Activity (Last 12 Months)',lang)}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {[t('الشهر','Month',lang), t('طلبات جديدة','New Requests',lang), t('عروض واردة','Quotes Received',lang),
                        t('عروض مقبولة','Accepted',lang), t('نسبة القبول','Accept Rate',lang), t('إجمالي المبالغ المقبولة','Total Accepted Value',lang)
                      ].map(h => <th key={h} className={TH(lang)}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report4.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-stone-400 text-sm">{t('لا توجد بيانات','No data yet',lang)}</td></tr>
                    )}
                    {report4.map((row, i) => {
                      const rate = row.quotesReceived > 0 ? Math.round((row.accepted / row.quotesReceived) * 100) : 0;
                      const td = i%2===0?TD:TDE;
                      return (
                        <tr key={row.month}>
                          <td className={`${td} font-bold text-[var(--brand-strong)]`}>{formatMonth(row.month)}</td>
                          <td className={`${td} text-center font-bold`}>{row.reqs}</td>
                          <td className={`${td} text-center`}>{row.quotesReceived}</td>
                          <td className={`${td} text-center text-emerald-700 font-bold`}>{row.accepted}</td>
                          <td className={td}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 bg-stone-100 rounded-full overflow-hidden min-w-[60px]"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${rate}%`}} /></div>
                              <span className="font-bold">{rate}%</span>
                            </div>
                          </td>
                          <td className={`${td} font-bold text-[var(--brand-strong)]`}>{row.totalVal > 0 ? `${fmtN(row.totalVal, lang)} ${t('ر.س','SAR',lang)}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════ REPORT 5: Materials ══════ */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
                <h2 className="text-sm font-bold text-stone-900">🧱 {t('تحليل المواد المطلوبة','Requested Materials Analysis',lang)}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {['#', t('نوع المادة','Material Type',lang), t('عدد الطلبات','Requests',lang), t('إجمالي الكمية','Total Qty',lang),
                        t('عروض واردة','Quotes',lang), t('متوسط السعر المقبول','Avg Accepted Price',lang)
                      ].map(h => <th key={h} className={TH(lang)}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report5.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-stone-400 text-sm">{t('لا توجد مواد','No materials data',lang)}</td></tr>
                    )}
                    {report5.map((m, i) => {
                      const avgAccepted = m.acceptedPrices.length ? Math.round(m.acceptedPrices.reduce((s,p)=>s+p,0)/m.acceptedPrices.length) : null;
                      const td = i%2===0?TD:TDE;
                      return (
                        <tr key={m.type}>
                          <td className={`${td} text-center font-bold text-[var(--brand-strong)]`}>{i+1}</td>
                          <td className={`${td} font-bold text-stone-900`}>{displayVal(m.type, lang)}</td>
                          <td className={`${td} text-center font-bold`}>{m.reqCount}</td>
                          <td className={`${td} font-bold`}>{m.totalQty.toLocaleString()} {m.unit}</td>
                          <td className={`${td} text-center`}>{m.quoteCount || '—'}</td>
                          <td className={`${td} font-bold text-[var(--brand-strong)]`}>{avgAccepted ? `${fmtN(avgAccepted, lang)} ${t('ر.س','SAR',lang)}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════ REPORT 6: Executive Summary ══════ */}
        {activeTab === 'executive' && (
          <div className="space-y-5">
            {/* big KPIs — only metrics not already shown in Project Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: '⚡', label: t('متوسط وقت استلام العروض','Avg Quote Response',lang),  val: `${exec.avgDays.toFixed(1)} ${t('يوم','days',lang)}`, sub: t('من تاريخ الطلب','from request date',lang),                              color: 'text-amber-600'   },
                { icon: '✅', label: t('نسبة القبول الكلية','Overall Accept Rate',lang),      val: quotes.length ? `${Math.round((exec.accQ/quotes.length)*100)}%` : '—', sub: `${exec.accQ} / ${quotes.length}`,                     color: 'text-[var(--brand-strong)]'   },
                { icon: '⭐', label: t('متوسط تقييم الموردين','Avg Supplier Rating',lang),   val: ratings.length ? exec.avgRating.toFixed(1) : '—', sub: `${ratings.length} ${t('تقييم','ratings',lang)}`,                              color: 'text-amber-500'   },
              ].map((k, i) => (
                <div key={i} className="bg-white border border-[var(--line)] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[var(--tint)] rounded-xl flex items-center justify-center text-xl shrink-0">{k.icon}</div>
                    <div>
                      <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
                      <div className="text-xs font-semibold text-stone-700 mt-0.5 flex items-center gap-1">
                        {k.label}
                        {i === 0 && <HelpTooltip lang={lang}
                          textAr="متوسط عدد الأيام بين تاريخ إنشاء الطلب وتاريخ استلام كل عرض سعر عليه، محسوب على كل العروض."
                          textEn="Average number of days between a request's creation date and when each quote on it was submitted, across all quotes." />}
                        {i === 1 && <HelpTooltip lang={lang}
                          textAr="نسبة العروض التي قبلتها من إجمالي جميع العروض التي استلمتها (بصرف النظر عن الطلب)."
                          textEn="Percentage of all quotes you've received (across every request) that you ended up accepting." />}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5" dir={k.sub.includes('/') ? 'ltr' : undefined}>{k.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top 3 suppliers */}
            {exec.top3.length > 0 && (
              <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
                  <h2 className="text-sm font-bold text-stone-900">🏆 {t('أفضل 3 موردين','Top 3 Suppliers',lang)}</h2>
                </div>
                <div className="divide-y divide-[var(--line-soft)]">
                  {exec.top3.map((s, i) => {
                    const avgR = s.ratingCount > 0 ? (s.rating / s.ratingCount) : 0;
                    return (
                      <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${i===0?'bg-amber-400':i===1?'bg-stone-400':'bg-orange-700'}`}>{i+1}</div>
                        <div className="w-9 h-9 rounded-xl bg-[var(--tint)] text-[var(--brand-strong)] text-xs font-bold flex items-center justify-center shrink-0">{s.company.slice(0,2)}</div>
                        <div className="flex-1">
                          <p className="font-bold text-stone-900 text-sm">{s.company}</p>
                          <p className="text-xs text-stone-400">{s.name}</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-black text-emerald-600">{s.accepted}</div>
                          <div className="text-[10px] text-stone-400">{t('مقبول','accepted',lang)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-amber-500">{avgR > 0 ? `${avgR.toFixed(1)} ★` : '—'}</div>
                          <div className="text-[10px] text-stone-400">{t('تقييم','rating',lang)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-[var(--brand-strong)]">{Math.round((s.accepted/s.total)*100)}%</div>
                          <div className="text-[10px] text-stone-400">{t('قبول','acceptance',lang)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* insight boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <div className="text-emerald-800 font-bold text-sm mb-2">💡 {t('أبرز الإنجازات','Key Achievements',lang)}</div>
                <ul className="space-y-1.5 text-xs text-emerald-700">
                  {totalSavings > 0 && <li>✓ {t('وفّرت','You saved',lang)} <strong>{fmtN(totalSavings, lang)} {t('ر.س','SAR',lang)}</strong> {t('بالمقارنة بأغلى العروض','vs highest quotes',lang)}</li>}
                  {exec.accQ > 0 && <li>✓ {t('أكملت','Completed',lang)} <strong>{exec.accQ}</strong> {t('صفقة ناجحة','successful deals',lang)}</li>}
                  {report2.length > 0 && <li>✓ {t('تعاملت مع','Worked with',lang)} <strong>{report2.length}</strong> {t('مورد مختلف','different suppliers',lang)}</li>}
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="text-amber-800 font-bold text-sm mb-2">📈 {t('فرص للتحسين','Improvement Opportunities',lang)}</div>
                <ul className="space-y-1.5 text-xs text-amber-700">
                  {exec.pendQ > 0 && <li>• {exec.pendQ} {t('عرض لم يُتخذ قرار فيه بعد','quotes awaiting your decision',lang)}</li>}
                  {exec.open > 0 && exec.accQ === 0 && <li>• {t('لديك طلبات مفتوحة بدون موافقة على عروض','You have open requests with no accepted quotes',lang)}</li>}
                  {exec.avgDays > 7 && <li>• {t('متوسط وقت الرد من الموردين','Avg supplier response time',lang)} {exec.avgDays.toFixed(0)} {t('يوم — يمكن تحسينه بالتواصل المبكر','days — early outreach can help',lang)}</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
