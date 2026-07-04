'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import SupplierNav from '../components/SupplierNav';
import StatusBadge from '../components/StatusBadge';
import QuoteCompareTable from '../components/QuoteCompareTable';
import { formatDate, appendActivityLog, setQuoteStatus, displayVal, withdrawQuote, requestQuoteEdit, approveQuoteEdit, declineQuoteEdit, clearEditRequestFlag } from '../lib/requestHelpers';
import { getCityName } from '../lib/translations';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import HelpTooltip from '../components/HelpTooltip';

type Lang = 'ar' | 'en';
type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'revision';
type FilterTab = 'all' | QuoteStatus;

interface Quote {
  id: number;
  requestId: number;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  totalPrice: number;
  deliveryDays: number;
  description: string;
  status: QuoteStatus;
  revisionNote?: string;
  createdAt: string;
  quoteNumber?: string;
  validUntil?: string;
  editRequestStatus?: 'pending' | 'rejected';
  editRequestNote?: string;
}

interface Request {
  id: number;
  contractorId: string;
  projectName?: string;
  materials?: any[];
  ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  location: string;
  deadline: string;
  status: string;
}

const T = {
  title:        { ar: 'عروض الأسعار الواردة', en: 'Incoming Quotes'       },
  titleSupp:    { ar: 'عروضي المقدَّمة',      en: 'My Submitted Quotes'   },
  all:          { ar: 'الكل',                 en: 'All'                   },
  pending:      { ar: 'انتظار',               en: 'Pending'               },
  accepted:     { ar: 'مقبول',                en: 'Accepted'              },
  rejected:     { ar: 'مرفوض',               en: 'Rejected'              },
  revision:     { ar: 'طلب تعديل',            en: 'Revision'              },
  totalQ:       { ar: 'إجمالي العروض',        en: 'Total Quotes'          },
  pendingQ:     { ar: 'في الانتظار',          en: 'Pending'               },
  acceptedQ:    { ar: 'مقبولة',               en: 'Accepted'              },
  lowestPrice:  { ar: 'أقل سعر',             en: 'Lowest Price'          },
  sar:          { ar: 'ر.س',                 en: 'SAR'                   },
  days:         { ar: 'يوم',                 en: 'days'                  },
  delivery:     { ar: 'مدة التوريد:',         en: 'Delivery:'             },
  noQuotes:     { ar: 'لا توجد عروض بعد',    en: 'No quotes yet'         },
  noQuotesSub:  { ar: 'عندما يرسل موردون عروض أسعار على طلباتك ستظهر هنا', en: 'When suppliers quote your requests, they will appear here' },
  goRequests:   { ar: 'عرض طلباتي',          en: 'View My Requests'      },
  accept:       { ar: 'قبول',               en: 'Accept'                },
  reject:       { ar: 'رفض',               en: 'Reject'                },
  revisionBtn:  { ar: 'طلب تعديل',           en: 'Request Revision'      },
  undo:         { ar: 'إلغاء القرار',         en: 'Undo'                  },
  revNote:      { ar: 'ملاحظة التعديل:',      en: 'Revision Note:'        },
  writeRev:     { ar: 'اكتب ملاحظة للمورد...', en: 'Write a note to the supplier...' },
  sendRev:      { ar: 'إرسال',               en: 'Send'                  },
  cancel:       { ar: 'إلغاء',               en: 'Cancel'                },
  reqLabel:     { ar: 'طلب',                 en: 'Request'               },
  newBanner:    { ar: (n: number) => `لديك ${n} عرض جديد لم تتم مراجعته بعد`, en: (n: number) => `You have ${n} new unreviewed quote${n > 1 ? 's' : ''}` },
  compare:      { ar: 'مقارنة العروض',        en: 'Compare Quotes'        },
  supplier:     { ar: 'المورد',              en: 'Supplier'              },
  price:        { ar: 'السعر',               en: 'Price'                 },
  cheapest:     { ar: 'الأرخص',             en: 'Cheapest'              },
  fastest:      { ar: 'الأسرع',             en: 'Fastest'               },
  notes:        { ar: 'ملاحظات',             en: 'Notes'                 },
  status:       { ar: 'الحالة',              en: 'Status'                },
  action:       { ar: 'إجراء',              en: 'Action'                },
  request:      { ar: 'الطلب',              en: 'Request'               },
  yourPrice:    { ar: 'سعرك:',              en: 'Your Price:'           },
  reqStatus:    { ar: 'حالة الطلب:',         en: 'Request Status:'       },
  open:         { ar: 'مفتوح',              en: 'Open'                  },
  closed:       { ar: 'مغلق',               en: 'Closed'                },
  noSuppQ:      { ar: 'لم تقدم أي عروض بعد', en: 'No quotes submitted yet' },
  browseReqs:   { ar: 'تصفح الطلبات المتاحة', en: 'Browse Requests'      },
  submittedOn:  { ar: 'تاريخ التقديم:',       en: 'Submitted:'            },
  acceptedValue:{ ar: 'قيمة العروض المقبولة', en: 'Accepted Value'        },
  withdrawBtn:  { ar: 'سحب العرض',           en: 'Withdraw'              },
  editResubmitBtn:{ ar: 'تعديل وإعادة الإرسال', en: 'Edit & Resubmit'    },
  confirmWithdraw:{ ar: 'هل أنت متأكد من سحب هذا العرض؟', en: 'Withdraw this quote?' },
  print:        { ar: 'طباعة',                en: 'Print'                 },
  withdrawnToTrash: { ar: 'تم نقل العرض لسلة المهملات', en: 'Quote moved to trash' },
  view:         { ar: 'عرض',                  en: 'View'                  },
  withdrawLocked: { ar: 'لا يمكن سحب العرض إلا بعد انتهاء صلاحيته', en: "Can't withdraw until the quote's validity expires" },
  approve:      { ar: 'موافقة',               en: 'Approve'               },
  editReqNotice:{ ar: 'المورد يطلب إذنًا بتعديل العرض:', en: 'Supplier requests permission to edit:' },
  requestEditBtn:{ ar: 'طلب إذن بالتعديل',    en: 'Request Edit Permission' },
  editReqPlaceholder: { ar: 'اكتب سبب طلب التعديل...', en: 'Explain why you want to edit...' },
  sendEditReq:  { ar: 'إرسال الطلب',           en: 'Send Request'          },
  editReqPendingBadge: { ar: 'بانتظار موافقة المقاول على التعديل', en: "Awaiting contractor's approval to edit" },
  editReqRejectedNotice: { ar: 'تم رفض طلبك بالتعديل', en: 'Your edit request was declined' },
  dismiss:      { ar: 'حسنًا',                 en: 'Dismiss'               },
};

function tFn(key: keyof typeof T, lang: Lang, n?: number): string {
  const entry = T[key] as any;
  const val = entry[lang];
  return typeof val === 'function' ? val(n ?? 0) : val;
}

/* ══════════════════════ CONTRACTOR VIEW ══════════════════════ */
function ReqIdParamReader({ onFound }: { onFound: (id: number) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const reqId = searchParams.get('reqId');
    if (reqId) onFound(Number(reqId));
  }, [searchParams, onFound]);
  return null;
}

function ContractorQuotes({ lang, userName, setLang }: { lang: Lang; userName: string; setLang: (l: Lang) => void }) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [seenQuotes, setSeenQuotes] = useState<number[]>([]);
  const [revisionQuoteId, setRevisionQuoteId] = useState<number | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [compareReqId, setCompareReqId] = useState<number | null>(null);
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  /* deep-link: scroll a specific request's quotes into view via ?reqId= */
  useEffect(() => {
    if (pendingReqId === null) return;
    const el = document.getElementById(`quote-group-${pendingReqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#C0603E]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#C0603E]'), 2000);
    }
    setPendingReqId(null);
  }, [pendingReqId, allQuotes]);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) return;
    const user = JSON.parse(userData);
    const reqs: Request[] = JSON.parse(localStorage.getItem('requests') || '[]')
      .filter((r: Request) => r.contractorId === user.email);
    setMyRequests(reqs);
    const reqIds = reqs.map(r => r.id);
    const quotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]')
      .filter((q: Quote) => reqIds.includes(q.requestId));
    setAllQuotes(quotes);
    const seen: number[] = JSON.parse(localStorage.getItem(`seenQuotes_${user.email}`) || '[]');
    setSeenQuotes(seen);
  }, []);

  const markSeen = (quoteIds: number[]) => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) return;
    const user = JSON.parse(userData);
    const updated = [...new Set([...seenQuotes, ...quoteIds])];
    setSeenQuotes(updated);
    localStorage.setItem(`seenQuotes_${user.email}`, JSON.stringify(updated));
  };

  const getReqName = (req: Request) => {
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.map(tp => displayVal(tp as string, lang)).join(' — ');
    }
    return `#${String(req.id).slice(-4)}`;
  };

  const handleQuoteAction = async (quoteId: number, action: QuoteStatus | 'pending') => {
    if (action === 'accepted' || action === 'rejected') {
      const msg = action === 'accepted'
        ? (lang === 'ar' ? 'هل أنت متأكد من قبول هذا العرض؟' : 'Accept this quote?')
        : (lang === 'ar' ? 'هل أنت متأكد من رفض هذا العرض؟' : 'Reject this quote?');
      const confirmText = action === 'accepted' ? (lang === 'ar' ? 'قبول' : 'Accept') : (lang === 'ar' ? 'رفض' : 'Reject');
      if (!(await confirmDialog(msg, { confirmText, danger: action === 'rejected' }))) return;
    }
    const { quotes: updated, quote: q } = setQuoteStatus(quoteId, action);
    setAllQuotes(updated.filter((x: Quote) => myRequests.some(r => r.id === x.requestId)));
    if (q) {
      const actionText = action === 'accepted'
        ? { ar: `تم قبول عرض ${q.supplierCompany} بسعر ${q.totalPrice} ر.س`, en: `Accepted quote from ${q.supplierCompany} at ${q.totalPrice} SAR` }
        : action === 'rejected'
        ? { ar: `تم رفض عرض ${q.supplierCompany}`, en: `Rejected quote from ${q.supplierCompany}` }
        : { ar: `تم إلغاء القرار على عرض ${q.supplierCompany}`, en: `Undid decision on ${q.supplierCompany}` };
      appendActivityLog(q.requestId, actionText.ar, actionText.en);
    }
  };

  const handleRevisionSubmit = (quoteId: number) => {
    if (!revisionNote.trim()) return;
    const { quotes: updated, quote: q } = setQuoteStatus(quoteId, 'revision', revisionNote);
    setAllQuotes(updated.filter((x: Quote) => myRequests.some(r => r.id === x.requestId)));
    if (q) appendActivityLog(q.requestId, `طلب تعديل على عرض ${q.supplierCompany}: "${revisionNote}"`, `Revision on ${q.supplierCompany}: "${revisionNote}"`);
    setRevisionQuoteId(null);
    setRevisionNote('');
  };

  const handleApproveEditRequest = (quoteId: number) => {
    const { quotes: updated, quote: q } = approveQuoteEdit(quoteId);
    setAllQuotes(updated.filter((x: Quote) => myRequests.some(r => r.id === x.requestId)));
    if (q) appendActivityLog(q.requestId, `تمت الموافقة على طلب ${q.supplierCompany} بتعديل العرض`, `Approved ${q.supplierCompany}'s request to edit their quote`);
  };
  const handleRejectEditRequest = (quoteId: number) => {
    const { quotes: updated, quote: q } = declineQuoteEdit(quoteId);
    setAllQuotes(updated.filter((x: Quote) => myRequests.some(r => r.id === x.requestId)));
    if (q) appendActivityLog(q.requestId, `تم رفض طلب ${q.supplierCompany} بتعديل العرض`, `Declined ${q.supplierCompany}'s request to edit their quote`);
  };

  const filteredQuotes = filter === 'all' ? allQuotes : allQuotes.filter(q => q.status === filter);
  const newCount = allQuotes.filter(q => q.status === 'pending' && !seenQuotes.includes(q.id)).length;
  const validPrices = allQuotes.map(q => Number(q.totalPrice)).filter(p => !isNaN(p) && p > 0);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  const stats = [
    { icon: '📥', bg: 'bg-[#F3EAE0]', val: allQuotes.length, label: tFn('totalQ', lang), badge: null },
    { icon: '⏳', bg: 'bg-orange-50', val: allQuotes.filter(q => q.status === 'pending').length, label: tFn('pendingQ', lang), badge: null },
    { icon: '✅', bg: 'bg-emerald-50', val: allQuotes.filter(q => q.status === 'accepted').length, label: tFn('acceptedQ', lang), badge: null },
    { icon: '💰', bg: 'bg-amber-50', val: lowestPrice !== null ? lowestPrice.toLocaleString() : '—', label: tFn('lowestPrice', lang), badge: lowestPrice !== null ? tFn('sar', lang) : null },
  ];

  /* group quotes by request for display */
  const groupedByRequest: Record<number, Quote[]> = {};
  filteredQuotes.forEach(q => {
    if (!groupedByRequest[q.requestId]) groupedByRequest[q.requestId] = [];
    groupedByRequest[q.requestId].push(q);
  });

  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>

      <ContractorNav lang={lang} setLang={setLang} userName={userName} active="/my-quotes" />

      <Suspense fallback={null}>
        <ReqIdParamReader onFound={setPendingReqId} />
      </Suspense>

      {/* HERO */}
      <div className="bg-[#C0603E] px-7 pt-6 pb-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1 flex items-center gap-2">
              {tFn('title', lang)}
              <HelpTooltip lang={lang}
                textAr="قبول أحد العروض لا يؤدي إلى رفض باقي العروض تلقائيًا — يجب التعامل مع كل عرض على حدة. ويمكن التراجع عن أي قرار (قبول أو رفض) باستخدام زر «إلغاء القرار»."
                textEn='Accepting a quote does not auto-reject the others — you handle each one individually. Any decision (accept/reject) can be undone with the "Undo" button.' />
            </h1>
            <p className="text-white/50 text-xs">
              {allQuotes.length > 0
                ? `${allQuotes.length} ${lang === 'ar' ? 'عرض على جميع طلباتك' : 'quotes across all your requests'}`
                : lang === 'ar' ? 'لا توجد عروض بعد' : 'No quotes yet'}
            </p>
          </div>
        </div>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {(['all', 'pending', 'accepted', 'rejected', 'revision'] as FilterTab[]).map(tab => {
            const count = tab === 'all' ? allQuotes.length : allQuotes.filter(q => q.status === tab).length;
            const label = tFn(tab === 'all' ? 'all' : tab, lang);
            return (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${filter === tab ? 'text-white border-[#8A7B6C]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-[#E8DFD3] rounded-xl p-4 relative">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
            {s.badge && <span className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{s.badge}</span>}
          </div>
        ))}
      </div>

      <div className="px-4 md:px-7 pb-10 space-y-4">

        {/* new quotes banner */}
        {newCount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">🔔</div>
            <p className="text-emerald-800 font-semibold text-sm">{tFn('newBanner', lang, newCount)}</p>
          </div>
        )}

        {/* empty state */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white border border-[#E8DFD3] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-stone-900 font-bold text-base">{tFn('noQuotes', lang)}</p>
            <p className="text-stone-400 text-sm max-w-xs">{tFn('noQuotesSub', lang)}</p>
            <Link href="/my-requests" className="mt-2 bg-[#C0603E] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#9C4C31] transition-colors">
              {tFn('goRequests', lang)}
            </Link>
          </div>
        ) : (
          /* grouped by request */
          Object.entries(groupedByRequest).map(([reqIdStr, quotes]) => {
            const reqId = Number(reqIdStr);
            const req = myRequests.find(r => r.id === reqId);
            const reqName = req ? getReqName(req) : `#${reqId}`;
            const cheapestId = quotes.length > 1 ? quotes.reduce((a, b) => a.totalPrice < b.totalPrice ? a : b).id : null;
            const fastestId = quotes.length > 1 ? quotes.reduce((a, b) => a.deliveryDays < b.deliveryDays ? a : b).id : null;
            const isComparing = compareReqId === reqId;

            return (
              <div key={reqId} id={`quote-group-${reqId}`} className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden transition-shadow">
                {/* request header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[#FFFDF9] border-b border-[#F1EAE0]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#F3EAE0] rounded-lg flex items-center justify-center text-[#C0603E] text-sm">📋</div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{reqName}</p>
                      <p className="text-[10px] text-stone-400">
                        {quotes.length} {lang === 'ar' ? 'عرض' : 'quotes'}
                        {req?.location ? ` · ${getCityName(req.location, lang)}` : ''}
                        {req?.deadline ? ` · ⏱ ${req.deadline}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {quotes.length > 1 && (
                      <button
                        onClick={() => { setCompareReqId(isComparing ? null : reqId); markSeen(quotes.map(q => q.id)); }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isComparing ? 'bg-[#C0603E] text-white border-[#C0603E]' : 'bg-white text-[#C0603E] border-[#C0603E] hover:bg-[#F3EAE0]'}`}>
                        {tFn('compare', lang)} {isComparing ? '✕' : '⇄'}
                      </button>
                    )}
                    <Link href={`/request/${reqId}`}
                      className="text-[11px] text-[#8A7B6C] font-semibold hover:underline">
                      {lang === 'ar' ? 'فتح الطلب' : 'Open Request'} ↗
                    </Link>
                  </div>
                </div>

                {/* compare table */}
                {isComparing ? (
                  <div className="p-5">
                    <QuoteCompareTable quotes={quotes} lang={lang} variant="actions"
                      onAccept={id => handleQuoteAction(id, 'accepted')}
                      onReject={id => handleQuoteAction(id, 'rejected')}
                      onUndo={id => handleQuoteAction(id, 'pending')}
                      printHrefBase="/print/quote/"
                      revisionQuoteId={revisionQuoteId} revisionNote={revisionNote}
                      setRevisionQuoteId={setRevisionQuoteId} setRevisionNote={setRevisionNote}
                      onRevisionSubmit={handleRevisionSubmit} />
                  </div>
                ) : (
                  /* cards view */
                  <div className="divide-y divide-[#FAF7F2]">
                    {quotes.map(q => {
                      const isNew = q.status === 'pending' && !seenQuotes.includes(q.id);
                      return (
                        <div key={q.id}
                          className={`flex items-start gap-4 px-5 py-4 hover:bg-[#FFFDF9] transition-colors ${q.status === 'accepted' ? 'bg-emerald-50/30' : q.status === 'rejected' ? 'bg-red-50/30' : ''}`}
                          onClick={() => isNew && markSeen([q.id])}>
                          {/* supplier avatar */}
                          <div className="w-10 h-10 rounded-xl bg-[#F3EAE0] border border-[#E8DFD3] flex items-center justify-center text-[12px] font-bold text-[#C0603E] shrink-0">
                            {q.supplierCompany.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-stone-900">{q.supplierCompany}</p>
                              <p className="text-[11px] text-stone-400">{q.supplierName}</p>
                              <StatusBadge status={q.status} lang={lang} />
                              {isNew && <span className="text-[9px] bg-[#C0603E] text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                              {q.id === cheapestId && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{tFn('cheapest', lang)}</span>}
                              {q.id === fastestId && <span className="text-[9px] bg-[#F3EAE0] text-[#C0603E] px-1.5 py-0.5 rounded-full font-bold">{tFn('fastest', lang)}</span>}
                            </div>
                            <div className="flex gap-4 mt-1.5">
                              <span className="text-base font-bold text-stone-900">{Number(q.totalPrice).toLocaleString()} <span className="text-xs font-medium text-stone-500">{tFn('sar', lang)}</span></span>
                              <span className="text-xs text-stone-500 self-end">{tFn('delivery', lang)} {q.deliveryDays} {tFn('days', lang)}</span>
                            </div>
                            {q.description && <p className="text-xs text-stone-500 mt-1">{q.description}</p>}
                            {q.status === 'revision' && q.revisionNote && (
                              <p className="text-xs text-amber-700 mt-1">✏ {q.revisionNote}</p>
                            )}
                            {q.editRequestStatus === 'pending' && (
                              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5" onClick={e => e.stopPropagation()}>
                                <p className="text-xs text-amber-800"><strong>{tFn('editReqNotice', lang)}</strong> {q.editRequestNote}</p>
                                <div className="flex gap-2 mt-1.5">
                                  <button onClick={() => handleApproveEditRequest(q.id)} className="text-[11px] font-semibold px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors">{tFn('approve', lang)}</button>
                                  <button onClick={() => handleRejectEditRequest(q.id)} className="text-[11px] font-semibold px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">{tFn('reject', lang)}</button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* actions */}
                          <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                            {q.status === 'pending' ? (
                              <>
                                <button onClick={() => handleQuoteAction(q.id, 'accepted')}
                                  className="text-[11px] font-semibold px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                                  {tFn('accept', lang)}
                                </button>
                                <button onClick={() => handleQuoteAction(q.id, 'rejected')}
                                  className="text-[11px] font-semibold px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                  {tFn('reject', lang)}
                                </button>
                                <button onClick={() => { setRevisionQuoteId(q.id); setRevisionNote(''); }}
                                  className="text-[11px] font-semibold px-3 py-1.5 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors">
                                  {tFn('revisionBtn', lang)}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleQuoteAction(q.id, 'pending')}
                                className="text-[11px] font-semibold px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                                {tFn('undo', lang)}
                              </button>
                            )}
                            <a href={`/print/quote/${q.id}`} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-semibold px-3 py-1.5 bg-[#F3EAE0] text-[#C0603E] rounded-lg hover:bg-[#EADFCF] transition-colors text-center">
                              👁 {tFn('view', lang)}
                            </a>
                            <a href={`/print/quote/${q.id}?autoprint=1`} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-semibold px-3 py-1.5 bg-stone-50 text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors text-center">
                              🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* revision input */}
                {quotes.some(q => q.id === revisionQuoteId) && (
                  <div className="px-5 py-4 bg-amber-50 border-t border-amber-200">
                    <p className="text-xs font-bold text-amber-800 mb-2">{tFn('writeRev', lang)}</p>
                    <textarea
                      value={revisionNote}
                      onChange={e => setRevisionNote(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: أريد سعر أقل أو توريد أسرع...' : 'Ex: Need lower price or faster delivery...'}
                      rows={2}
                      className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 outline-none font-cairo bg-white resize-none text-stone-700"
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleRevisionSubmit(revisionQuoteId!)}
                        className="text-xs font-semibold px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                        {tFn('sendRev', lang)}
                      </button>
                      <button onClick={() => { setRevisionQuoteId(null); setRevisionNote(''); }}
                        className="text-xs font-semibold px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
                        {tFn('cancel', lang)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ══════════════════════ SUPPLIER VIEW ══════════════════════ */
function SupplierQuotes({ lang, userName, setLang }: { lang: Lang; userName: string; setLang: (l: Lang) => void }) {
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const [editReqQuoteId, setEditReqQuoteId] = useState<number | null>(null);
  const [editReqNote, setEditReqNote] = useState('');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) return;
    const user = JSON.parse(userData);
    const all: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
    setQuotes(all.filter(q => q.supplierId === user.email));
  }, []);

  useEffect(() => {
    if (pendingReqId === null) return;
    const el = document.getElementById(`supp-quote-${pendingReqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#C0603E]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#C0603E]'), 2000);
    }
    setPendingReqId(null);
  }, [pendingReqId, quotes]);

  const getRequest = (id: number): Request | null => {
    const all: Request[] = JSON.parse(localStorage.getItem('requests') || '[]');
    return all.find(r => r.id === id) || null;
  };

  const getReqDisplayName = (req: Request | null, requestId: number) => {
    if (!req) return `#${requestId}`;
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.map(tp => displayVal(tp as string, lang)).join(' — ');
    }
    return `#${requestId}`;
  };

  const isWithdrawable = (q: Quote) => !q.validUntil || q.validUntil < new Date().toISOString().slice(0, 10);

  const handleWithdraw = async (quoteId: number, requestId: number) => {
    if (!(await confirmDialog(tFn('confirmWithdraw', lang), { confirmText: tFn('withdrawBtn', lang), danger: true }))) return;
    const { quotes: updated } = withdrawQuote(quoteId);
    const userData = localStorage.getItem('currentUser');
    const user = userData ? JSON.parse(userData) : null;
    setQuotes(user ? updated.filter((q: Quote) => q.supplierId === user.email) : updated);
    appendActivityLog(requestId, `تم سحب عرض المورد`, `Supplier withdrew their quote`);
    showToast(tFn('withdrawnToTrash', lang));
  };

  const refreshQuotes = (updated: Quote[]) => {
    const userData = localStorage.getItem('currentUser');
    const user = userData ? JSON.parse(userData) : null;
    setQuotes(user ? updated.filter((q: Quote) => q.supplierId === user.email) : updated);
  };

  const handleSendEditRequest = (quoteId: number, requestId: number) => {
    if (!editReqNote.trim()) return;
    const { quotes: updated } = requestQuoteEdit(quoteId, editReqNote);
    refreshQuotes(updated);
    appendActivityLog(requestId, `طلب المورد إذنًا بتعديل العرض: "${editReqNote}"`, `Supplier requested permission to edit their quote: "${editReqNote}"`);
    setEditReqQuoteId(null);
    setEditReqNote('');
  };

  const handleDismissEditRejection = (quoteId: number) => {
    const { quotes: updated } = clearEditRequestFlag(quoteId);
    refreshQuotes(updated);
  };

  const filteredQuotes = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (Number(q.totalPrice) || 0), 0);

  const stats = [
    { icon: '📄', bg: 'bg-[#F3EAE0]', val: quotes.length, label: tFn('totalQ', lang) },
    { icon: '⏳', bg: 'bg-orange-50', val: quotes.filter(q => q.status === 'pending').length, label: tFn('pendingQ', lang) },
    { icon: '✅', bg: 'bg-emerald-50', val: quotes.filter(q => q.status === 'accepted').length, label: tFn('acceptedQ', lang) },
    { icon: '💰', bg: 'bg-amber-50', val: acceptedValue.toLocaleString(), label: tFn('acceptedValue', lang) },
  ];

  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>
      <SupplierNav lang={lang} setLang={setLang} userName={userName} active="/my-quotes" />

      <Suspense fallback={null}>
        <ReqIdParamReader onFound={setPendingReqId} />
      </Suspense>

      <div className="bg-[#C0603E] px-4 md:px-7 pt-6 pb-0">
        <h1 className="text-white text-xl font-bold mb-1">{tFn('titleSupp', lang)}</h1>
        <p className="text-white/50 text-xs">{quotes.length} {lang === 'ar' ? 'عرض مقدَّم' : 'submitted quotes'}</p>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {(['all', 'pending', 'accepted', 'rejected', 'revision'] as FilterTab[]).map(tab => {
            const count = tab === 'all' ? quotes.length : quotes.filter(q => q.status === tab).length;
            const label = tFn(tab === 'all' ? 'all' : tab, lang);
            return (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${filter === tab ? 'text-white border-[#8A7B6C]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
                {label} ({count})
              </button>
            );
          })}
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

      <div className="px-4 md:px-7 pb-10 space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white border border-[#E8DFD3] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-stone-900 font-bold">{tFn('noSuppQ', lang)}</p>
            <Link href="/supplier-requests" className="mt-2 bg-[#C0603E] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#9C4C31] transition-colors">
              {tFn('browseReqs', lang)}
            </Link>
          </div>
        ) : (
          filteredQuotes.map(q => {
            const req = getRequest(q.requestId);
            return (
              <div key={q.id} id={`supp-quote-${q.requestId}`} className={`bg-white border rounded-2xl p-5 transition-shadow ${q.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/20' : q.status === 'rejected' ? 'border-red-200 bg-red-50/20' : q.status === 'revision' ? 'border-amber-200 bg-amber-50/20' : 'border-[#E8DFD3]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-stone-900">{getReqDisplayName(req, q.requestId)}</p>
                      {q.quoteNumber && <span className="text-[10px] font-mono font-semibold text-[#8A7B6C] bg-[#F3EAE0] px-1.5 py-0.5 rounded">{q.quoteNumber}</span>}
                    </div>
                    {req && <p className="text-xs text-stone-400 mt-0.5">📍 {getCityName(req.location, lang)} {req.deadline ? `· ⏱ ${req.deadline}` : ''}</p>}
                  </div>
                  <StatusBadge status={q.status} lang={lang} />
                </div>

                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] text-stone-400">{tFn('yourPrice', lang)}</p>
                    <p className="text-xl font-bold text-stone-900">{Number(q.totalPrice).toLocaleString()} <span className="text-sm font-medium text-stone-500">{tFn('sar', lang)}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-400">{tFn('delivery', lang)}</p>
                    <p className="text-sm font-semibold text-stone-700">{q.deliveryDays} {tFn('days', lang)}</p>
                  </div>
                </div>
                {q.description && <p className="text-xs text-stone-500 mt-2">{q.description}</p>}

                {q.status === 'revision' && q.revisionNote && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-800">{tFn('revNote', lang)}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{q.revisionNote}</p>
                  </div>
                )}
                {q.editRequestStatus === 'pending' && (
                  <div className="mt-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-stone-600">⏳ {tFn('editReqPendingBadge', lang)}</p>
                  </div>
                )}
                {q.editRequestStatus === 'rejected' && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-red-700">{tFn('editReqRejectedNotice', lang)}</p>
                    <button onClick={() => handleDismissEditRejection(q.id)}
                      className="text-[11px] font-semibold px-2.5 py-1 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-100 transition-colors shrink-0">
                      {tFn('dismiss', lang)}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-stone-400">{tFn('submittedOn', lang)} {formatDate(q.createdAt, lang)}</p>
                  <div className="flex gap-2">
                    {(q.status === 'pending' || q.status === 'revision') && (
                      isWithdrawable(q) ? (
                        <button onClick={() => handleWithdraw(q.id, q.requestId)}
                          className="text-[11px] font-semibold px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors">
                          {tFn('withdrawBtn', lang)}
                        </button>
                      ) : (
                        <span title={tFn('withdrawLocked', lang)}
                          className="text-[11px] font-semibold px-3 py-1.5 bg-stone-50 text-stone-300 border border-stone-100 rounded-lg cursor-not-allowed">
                          {tFn('withdrawBtn', lang)}
                        </span>
                      )
                    )}
                    {q.status === 'revision' && (
                      <Link href={`/supplier-requests/quote/${q.requestId}?editQuoteId=${q.id}`}
                        className="text-[11px] font-semibold px-3 py-1.5 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors inline-block text-center">
                        {tFn('editResubmitBtn', lang)}
                      </Link>
                    )}
                    {q.status !== 'revision' && !q.editRequestStatus && (
                      <button onClick={() => { setEditReqQuoteId(q.id); setEditReqNote(''); }}
                        className="text-[11px] font-semibold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                        {tFn('requestEditBtn', lang)}
                      </button>
                    )}
                    <a href={`/print/quote/${q.id}`} target="_blank" rel="noopener noreferrer" title={tFn('view', lang)}
                      className="text-[11px] font-semibold px-3 py-1.5 bg-[#F3EAE0] text-[#C0603E] rounded-lg hover:bg-[#EADFCF] transition-colors">
                      👁 {tFn('view', lang)}
                    </a>
                    <a href={`/print/quote/${q.id}?autoprint=1`} target="_blank" rel="noopener noreferrer" title={tFn('print', lang)}
                      className="text-[11px] font-semibold px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                      🖨 {tFn('print', lang)}
                    </a>
                  </div>
                </div>
                {editReqQuoteId === q.id && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <textarea value={editReqNote} onChange={e => setEditReqNote(e.target.value)}
                      placeholder={tFn('editReqPlaceholder', lang)} rows={2}
                      className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 outline-none font-cairo bg-white resize-none text-stone-700" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleSendEditRequest(q.id, q.requestId)}
                        className="text-xs font-semibold px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                        {tFn('sendEditReq', lang)}
                      </button>
                      <button onClick={() => { setEditReqQuoteId(null); setEditReqNote(''); }}
                        className="text-xs font-semibold px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
                        {tFn('cancel', lang)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ══════════════════════ ROOT ══════════════════════ */
export default function MyQuotesPage() {
  const [lang, setLang] = useState<Lang>('ar');
  const [userType, setUserType] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const user = JSON.parse(userData);
    setUserType(user.userType);
    if (user.name) setUserName(user.name);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  if (!userType) return (
    <div className="min-h-screen bg-[#F7F2EC] flex items-center justify-center font-cairo">
      <div className="text-stone-400 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  if (userType === 'supplier') return <SupplierQuotes lang={lang} userName={userName} setLang={handleLangChange} />;
  return <ContractorQuotes lang={lang} userName={userName} setLang={handleLangChange} />;
}
