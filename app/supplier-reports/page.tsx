'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SupplierNav from '../components/SupplierNav';
import { displayVal, getSupplierData, Quote, QuoteLineItem } from '../lib/requestHelpers';
import { resolveOther } from '../lib/materialOptions';
import { getCityName } from '../lib/translations';
import { getCurrentUser, getLanguage, setLanguage, getQuotes, getRequests } from '../lib/store';

type Lang = 'ar' | 'en';

interface Request {
  id: number; contractorId: string; projectName?: string;
  materials?: any[]; location: string; deadline: string; createdAt: string; status: string;
}

const REPORT_TABS = [
  { id: 'summary',     iconAr: '📊', labelAr: 'ملخص الأداء',         labelEn: 'Performance Summary' },
  { id: 'materials',   iconAr: '🧱', labelAr: 'تفصيل حسب المواد',    labelEn: 'Materials Breakdown' },
  { id: 'monthly',     iconAr: '📅', labelAr: 'التقرير الشهري',      labelEn: 'Monthly Report'      },
  { id: 'contractors', iconAr: '🏗', labelAr: 'أفضل العملاء',        labelEn: 'Top Contractors'     },
];

function t(ar: string, en: string, lang: Lang) { return lang === 'ar' ? ar : en; }
/* 'ar-EG' not 'ar-SA' — ar-SA renders Eastern Arabic-Indic digits (١٢٣) which clash with the
   Western digits (123) used everywhere else in the app (dashboard, quotes, print views). */
function fmtN(n: number, lang: Lang) { return Math.round(n).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US'); }

const TH = (lang: Lang) => `border border-stone-200 bg-[var(--chrome)] px-3 py-2.5 ${lang === 'ar' ? 'text-right' : 'text-left'} text-white font-semibold text-xs whitespace-nowrap`;
const TD = 'border border-stone-200 px-3 py-2 text-xs text-stone-700';
const TDE = 'border border-stone-200 px-3 py-2 text-xs text-stone-700 bg-[var(--bg-soft)]';

export default function SupplierReportsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [activeTab, setActiveTab] = useState('summary');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const printDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    setLang(getLanguage());
    const user = getCurrentUser<any>();
    if (!user) { router.push('/login'); return; }
    if (user.userType !== 'supplier') { router.push('/dashboard'); return; }
    setUserName(user.name || '');
    setUserEmail(user.email || '');

    const allQuotes: Quote[] = getQuotes<Quote>();
    setQuotes(allQuotes.filter(q => q.supplierId === user.email));

    const allReqs: Request[] = getRequests<Request>();
    setRequests(allReqs);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  const getReq = (id: number) => requests.find(r => r.id === id);
  const getReqName = (req?: Request) => {
    if (!req) return '—';
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.map((tp: any) => displayVal(tp, lang)).join(' — ');
    }
    return `#${req.id}`;
  };

  const accepted = quotes.filter(q => q.status === 'accepted');
  const rejected = quotes.filter(q => q.status === 'rejected');
  const pending = quotes.filter(q => q.status === 'pending');
  const revision = quotes.filter(q => q.status === 'revision');
  const decided = accepted.length + rejected.length;
  const winRate = decided > 0 ? Math.round((accepted.length / decided) * 100) : null;
  const totalAccepted = accepted.reduce((s, q) => s + (Number(q.totalPrice) || 0), 0);
  const avgQuoteValue = quotes.length > 0 ? quotes.reduce((s, q) => s + (Number(q.totalPrice) || 0), 0) / quotes.length : 0;

  const responseDays = (q: Quote): number | null => {
    const req = getReq(q.requestId);
    if (!req?.createdAt) return null;
    const diff = new Date(q.createdAt).getTime() - new Date(req.createdAt).getTime();
    return diff >= 0 ? Math.round(diff / 86400000 * 10) / 10 : null;
  };
  const validResponseTimes = quotes.map(responseDays).filter((d): d is number => d !== null);
  const avgResponseDays = validResponseTimes.length > 0 ? validResponseTimes.reduce((s, d) => s + d, 0) / validResponseTimes.length : null;

  /* ── materials breakdown ── */
  interface MatStat { key: string; label: string; quoted: number; accepted: number; totalQty: number; totalValue: number; }
  const materialStats: MatStat[] = (() => {
    const map = new Map<string, MatStat>();
    quotes.forEach(q => {
      const items: QuoteLineItem[] = q.lineItems || [];
      const seenInThisQuote = new Set<string>();
      items.forEach(li => {
        const label = displayVal(resolveOther(li.type, li.typeOther), lang) || t('غير محدد', 'Unspecified', lang);
        const key = li.type || li.typeOther || 'unknown';
        if (!map.has(key)) map.set(key, { key, label, quoted: 0, accepted: 0, totalQty: 0, totalValue: 0 });
        const stat = map.get(key)!;
        stat.totalQty += Number(li.quantity) || 0;
        stat.totalValue += (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0);
        if (!seenInThisQuote.has(key)) {
          stat.quoted += 1;
          if (q.status === 'accepted') stat.accepted += 1;
          seenInThisQuote.add(key);
        }
      });
    });
    return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
  })();

  /* ── monthly ── */
  interface MonthStat { key: string; label: string; count: number; acceptedValue: number; acceptedCount: number; }
  const monthlyStats: MonthStat[] = (() => {
    const map = new Map<string, MonthStat>();
    quotes.forEach(q => {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' });
      if (!map.has(key)) map.set(key, { key, label, count: 0, acceptedValue: 0, acceptedCount: 0 });
      const stat = map.get(key)!;
      stat.count += 1;
      if (q.status === 'accepted') { stat.acceptedValue += Number(q.totalPrice) || 0; stat.acceptedCount += 1; }
    });
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  })();

  /* ── top contractors ── */
  interface ContractorStat { email: string; name: string; company: string; quoted: number; accepted: number; acceptedValue: number; }
  const contractorStats: ContractorStat[] = (() => {
    const map = new Map<string, ContractorStat>();
    quotes.forEach(q => {
      const req = getReq(q.requestId);
      if (!req) return;
      if (!map.has(req.contractorId)) {
        const c = getSupplierData(req.contractorId);
        map.set(req.contractorId, { email: req.contractorId, name: c?.name || req.contractorId, company: c?.company || '', quoted: 0, accepted: 0, acceptedValue: 0 });
      }
      const stat = map.get(req.contractorId)!;
      stat.quoted += 1;
      if (q.status === 'accepted') { stat.accepted += 1; stat.acceptedValue += Number(q.totalPrice) || 0; }
    });
    return [...map.values()].sort((a, b) => b.acceptedValue - a.acceptedValue);
  })();

  return (
    <div className="min-h-screen bg-[var(--bg)] md:ps-[190px]" style={{ fontFamily: 'Cairo, Arial, sans-serif' }} dir={dir}>
      <SupplierNav lang={lang} setLang={handleLangChange} userName={userName} active="/supplier-reports" />

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-5 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-white/70 text-xs mb-1">{printDate}</p>
            <h1 className="text-white text-xl font-bold">{t('التقارير والتحليلات', 'Reports & Analytics', lang)}</h1>
            <p className="text-white/70 text-xs mt-0.5">{quotes.length} {t('عرض مقدَّم', 'quotes submitted', lang)}</p>
          </div>
          <button onClick={() => window.print()} className="mb-4 text-xs font-semibold px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors">
            🖨 {t('طباعة التقرير الحالي', 'Print Current Report', lang)}
          </button>
        </div>
        <div className="flex gap-0 mt-4 border-t border-white/10 overflow-x-auto">
          {REPORT_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-white border-[var(--sec)]' : 'text-white/60 border-transparent hover:text-white/70'}`}>
              {tab.iconAr} {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 md:px-7 py-6 print-area">

        <div className="hidden print:block mb-6 pb-4 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-[var(--brand-strong)]">Build<span className="text-[var(--sec)]">Pro</span></div>
            <div className="text-sm text-stone-600 text-left">
              <p className="font-bold">{REPORT_TABS.find(x => x.id === activeTab)?.[lang === 'ar' ? 'labelAr' : 'labelEn']}</p>
              <p>{printDate}</p>
            </div>
          </div>
        </div>

        {quotes.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📊</span>
            <p className="text-stone-900 font-bold text-base">{t('لا توجد بيانات كافية بعد', 'Not enough data yet', lang)}</p>
            <p className="text-stone-500 text-sm max-w-xs">{t('قدّم عروض أسعار على الطلبات المتاحة لتظهر تقاريرك هنا', 'Submit quotes on available requests for your reports to appear here', lang)}</p>
          </div>
        ) : (
          <>
            {/* ══════ SUMMARY ══════ */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: '📄', bg: 'bg-[var(--tint)]',  val: quotes.length,                                             label: t('إجمالي العروض', 'Total Quotes', lang) },
                    { icon: '📈', bg: 'bg-emerald-50', val: winRate !== null ? `${winRate}%` : '—',                    label: t('نسبة الفوز', 'Win Rate', lang) },
                    { icon: '💰', bg: 'bg-amber-50',   val: `${fmtN(totalAccepted, lang)} ${t('ر.س', 'SAR', lang)}`,    label: t('إجمالي القيمة المقبولة', 'Total Accepted Value', lang) },
                    { icon: '⏱', bg: 'bg-stone-100',   val: avgResponseDays !== null ? `${avgResponseDays} ${t('يوم', 'd', lang)}` : '—', label: t('متوسط زمن الرد', 'Avg Response Time', lang) },
                  ].map((s, i) => (
                    <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
                      <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
                      <div className="text-lg font-bold text-stone-900">{s.val}</div>
                      <div className="text-xs text-stone-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { val: pending.length, label: t('قيد الانتظار', 'Pending', lang), color: 'text-orange-500' },
                    { val: accepted.length, label: t('مقبولة', 'Accepted', lang), color: 'text-emerald-600' },
                    { val: rejected.length, label: t('مرفوضة', 'Rejected', lang), color: 'text-red-500' },
                    { val: revision.length, label: t('طلب تعديل', 'Revision', lang), color: 'text-amber-500' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                      <div className="text-xs text-stone-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[var(--line-soft)] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-stone-900">📄 {t('تفاصيل العروض', 'Quote Details', lang)}</h2>
                    <span className="text-xs text-stone-500">{quotes.length} {t('عرض', 'quotes', lang)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {[t('رقم العرض', 'Quote #', lang), t('المشروع', 'Project', lang), t('المدينة', 'City', lang), t('السعر', 'Price', lang), t('مدة التوريد', 'Delivery', lang), t('زمن الرد', 'Response', lang), t('الحالة', 'Status', lang)].map((h, i) => (
                            <th key={i} className={TH(lang)}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {quotes.map((q, i) => {
                          const req = getReq(q.requestId);
                          const rd = responseDays(q);
                          return (
                            <tr key={q.id}>
                              <td className={i % 2 === 0 ? TD : TDE}>{q.quoteNumber || `#${q.id}`}</td>
                              <td className={i % 2 === 0 ? TD : TDE}>{getReqName(req)}</td>
                              <td className={i % 2 === 0 ? TD : TDE}>{req?.location ? getCityName(req.location, lang) : '—'}</td>
                              <td className={i % 2 === 0 ? TD : TDE}>{fmtN(Number(q.totalPrice), lang)} {t('ر.س', 'SAR', lang)}</td>
                              <td className={i % 2 === 0 ? TD : TDE}>{q.deliveryDays} {t('يوم', 'd', lang)}</td>
                              <td className={i % 2 === 0 ? TD : TDE}>{rd !== null ? `${rd} ${t('يوم', 'd', lang)}` : '—'}</td>
                              <td className={i % 2 === 0 ? TD : TDE}>{t(
                                q.status === 'accepted' ? 'مقبول' : q.status === 'rejected' ? 'مرفوض' : q.status === 'revision' ? 'طلب تعديل' : 'قيد الانتظار',
                                q.status === 'accepted' ? 'Accepted' : q.status === 'rejected' ? 'Rejected' : q.status === 'revision' ? 'Revision' : 'Pending',
                                lang
                              )}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════ MATERIALS ══════ */}
            {activeTab === 'materials' && (
              <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
                  <h2 className="text-sm font-bold text-stone-900">🧱 {t('تفصيل حسب نوع المادة', 'Breakdown by Material Type', lang)}</h2>
                </div>
                {materialStats.length === 0 ? (
                  <div className="p-10 text-center text-sm text-stone-500">{t('لا توجد بنود مفصّلة في عروضك بعد', 'No itemized line items in your quotes yet', lang)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {[t('المادة', 'Material', lang), t('مرات العرض', 'Times Quoted', lang), t('مرات القبول', 'Times Accepted', lang), t('نسبة الفوز', 'Win Rate', lang), t('إجمالي الكمية', 'Total Qty', lang), t('إجمالي القيمة', 'Total Value', lang)].map((h, i) => (
                            <th key={i} className={TH(lang)}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {materialStats.map((m, i) => (
                          <tr key={m.key}>
                            <td className={i % 2 === 0 ? TD : TDE}><strong>{m.label}</strong></td>
                            <td className={i % 2 === 0 ? TD : TDE}>{m.quoted}</td>
                            <td className={i % 2 === 0 ? TD : TDE}>{m.accepted}</td>
                            <td className={i % 2 === 0 ? TD : TDE}>{m.quoted > 0 ? Math.round((m.accepted / m.quoted) * 100) : 0}%</td>
                            <td className={i % 2 === 0 ? TD : TDE}>{fmtN(m.totalQty, lang)}</td>
                            <td className={i % 2 === 0 ? TD : TDE}>{fmtN(m.totalValue, lang)} {t('ر.س', 'SAR', lang)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══════ MONTHLY ══════ */}
            {activeTab === 'monthly' && (
              <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
                  <h2 className="text-sm font-bold text-stone-900">📅 {t('الأداء الشهري', 'Monthly Performance', lang)}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {[t('الشهر', 'Month', lang), t('عدد العروض', 'Quotes', lang), t('عروض مقبولة', 'Accepted', lang), t('قيمة العروض المقبولة', 'Accepted Value', lang)].map((h, i) => (
                          <th key={i} className={TH(lang)}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyStats.map((m, i) => (
                        <tr key={m.key}>
                          <td className={i % 2 === 0 ? TD : TDE}><strong>{m.label}</strong></td>
                          <td className={i % 2 === 0 ? TD : TDE}>{m.count}</td>
                          <td className={i % 2 === 0 ? TD : TDE}>{m.acceptedCount}</td>
                          <td className={i % 2 === 0 ? TD : TDE}>{fmtN(m.acceptedValue, lang)} {t('ر.س', 'SAR', lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════ CONTRACTORS ══════ */}
            {activeTab === 'contractors' && (
              <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
                  <h2 className="text-sm font-bold text-stone-900">🏗 {t('العملاء (المقاولون)', 'Contractors', lang)}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {[t('المقاول', 'Contractor', lang), t('عدد العروض', 'Quotes', lang), t('عروض مقبولة', 'Accepted', lang), t('نسبة الفوز', 'Win Rate', lang), t('إجمالي القيمة المقبولة', 'Accepted Value', lang)].map((h, i) => (
                          <th key={i} className={TH(lang)}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contractorStats.map((c, i) => (
                        <tr key={c.email}>
                          <td className={i % 2 === 0 ? TD : TDE}>
                            <strong>{c.company || c.name}</strong>
                            {c.company && <div className="text-stone-500">{c.name}</div>}
                          </td>
                          <td className={i % 2 === 0 ? TD : TDE}>{c.quoted}</td>
                          <td className={i % 2 === 0 ? TD : TDE}>{c.accepted}</td>
                          <td className={i % 2 === 0 ? TD : TDE}>{c.quoted > 0 ? Math.round((c.accepted / c.quoted) * 100) : 0}%</td>
                          <td className={i % 2 === 0 ? TD : TDE}>{fmtN(c.acceptedValue, lang)} {t('ر.س', 'SAR', lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
