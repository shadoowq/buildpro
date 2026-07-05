'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import SupplierNav from '../components/SupplierNav';
import StatusBadge from '../components/StatusBadge';
import QuoteCompareTable from '../components/QuoteCompareTable';
import QuoteMessagesThread from '../components/QuoteMessagesThread';
import { formatDate, formatDay, appendActivityLog, setQuoteStatus, displayVal, withdrawQuote, requestQuoteEdit, approveQuoteEdit, declineQuoteEdit, clearEditRequestFlag, getEffectiveQuoteStatus, isQuoteExpired, quoteValidityDaysLeft, updateQuoteFields, getSupplierData, canUndoQuoteDecisionFreely } from '../lib/requestHelpers';
import { setQuoteExecutionStatus, generatePoNumber, submitRating, hasRated, Rating } from '../lib/marketplace';
import { getCityName } from '../lib/translations';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { downloadCsv } from '../lib/exportCsv';
import HelpTooltip from '../components/HelpTooltip';
import RatingModal from '../components/RatingModal';
import RejectReasonModal from '../components/RejectReasonModal';
import {
  getCurrentUser, getLanguage, setLanguage,
  getRequests, getQuotes, getRatings,
  getSeenQuoteIds, setSeenQuoteIds,
} from '../lib/store';

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
  rejectionReason?: string;
  createdAt: string;
  quoteNumber?: string;
  validUntil?: string;
  editRequestStatus?: 'pending' | 'rejected';
  editRequestNote?: string;
  statusChangedAt?: string;
  executionStatus?: 'preparing' | 'delivered';
  executionStatusChangedAt?: string;
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
  rejReason:    { ar: 'سبب الرفض:',           en: 'Rejection Reason:'     },
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
  confirmWithdraw:{ ar: 'هل أنت متأكد من سحب هذا العرض؟ سيتم إشعار المقاول بالسحب.', en: 'Withdraw this quote? The contractor will be notified.' },
  print:        { ar: 'طباعة',                en: 'Print'                 },
  withdrawnToTrash: { ar: 'تم سحب العرض ونقله لسلة المهملات — تم إشعار المقاول', en: 'Quote withdrawn to trash — the contractor was notified' },
  view:         { ar: 'عرض',                  en: 'View'                  },
  approve:      { ar: 'موافقة',               en: 'Approve'               },
  editReqNotice:{ ar: 'المورد يطلب إذنًا بتعديل العرض:', en: 'Supplier requests permission to edit:' },
  requestEditBtn:{ ar: 'طلب إذن بالتعديل',    en: 'Request Edit Permission' },
  editReqPlaceholder: { ar: 'اكتب سبب طلب التعديل...', en: 'Explain why you want to edit...' },
  sendEditReq:  { ar: 'إرسال الطلب',           en: 'Send Request'          },
  editReqPendingBadge: { ar: 'بانتظار موافقة المقاول على التعديل', en: "Awaiting contractor's approval to edit" },
  editReqRejectedNotice: { ar: 'تم رفض طلبك بالتعديل', en: 'Your edit request was declined' },
  dismiss:      { ar: 'حسنًا',                 en: 'Dismiss'               },
  expiredNote:  { ar: 'انتهت صلاحية العرض',    en: 'Quote expired'         },
  cantAcceptExpired: { ar: 'لا يمكن قبول عرض منتهي الصلاحية', en: "Can't accept an expired quote" },
  expiryExpired: { ar: 'انتهت صلاحية هذا العرض — لن يتمكن المقاول من قبوله حتى تمددها', en: "This quote has expired — the contractor can't accept it until you extend it" },
  expirySoon:   { ar: (n: number) => n === 0 ? 'صلاحية هذا العرض تنتهي اليوم' : `صلاحية هذا العرض تنتهي خلال ${n} يوم`, en: (n: number) => n === 0 ? 'This quote expires today' : `This quote expires in ${n} day${n > 1 ? 's' : ''}` },
  extendBtn:    { ar: 'تمديد الصلاحية 30 يومًا', en: 'Extend 30 days' },
  extended:     { ar: (n: number) => `تم تمديد صلاحية العرض ${n} يومًا من اليوم`, en: (n: number) => `Quote validity extended ${n} days from today` },
  validUntilLbl:{ ar: 'صالح حتى:',              en: 'Valid until:'          },
  exportCsv:    { ar: '⬇ تصدير CSV',           en: '⬇ Export CSV'          },
  csvEmpty:     { ar: 'لا توجد عروض للتصدير',  en: 'No quotes to export'   },
  dealContactTitle: { ar: 'بيانات التواصل بعد القبول', en: 'Contact Info (Post-Acceptance)' },
  deliveredStatus: { ar: 'تم التوريد',          en: 'Delivered'             },
  preparingStatus: { ar: 'قيد التجهيز',          en: 'Preparing'             },
  markDelivered: { ar: '✓ تم التوريد',          en: '✓ Mark Delivered'      },
  viewPo:       { ar: 'أمر الشراء',            en: 'Purchase Order'        },
  undoReasonPrompt: { ar: 'مضى وقت على القرار — اكتب سبب الإلغاء:', en: 'Some time has passed — write a reason for undoing:' },
  undoReasonPh: { ar: 'مثال: غيّرت رأيي في المواصفات...', en: 'Ex: I changed my mind about the specs...' },
  undoConfirm:  { ar: 'تأكيد الإلغاء',          en: 'Confirm Undo'          },
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
  const showToast = useToast();
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [seenQuotes, setSeenQuotes] = useState<number[]>([]);
  const [revisionQuoteId, setRevisionQuoteId] = useState<number | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [rejectQuoteId, setRejectQuoteId] = useState<number | null>(null);
  const [compareReqId, setCompareReqId] = useState<number | null>(null);
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const [undoReasonQuoteId, setUndoReasonQuoteId] = useState<number | null>(null);
  const [undoReasonText, setUndoReasonText] = useState('');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  /* deep-link: scroll a specific request's quotes into view via ?reqId= */
  useEffect(() => {
    if (pendingReqId === null) return;
    const el = document.getElementById(`quote-group-${pendingReqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[var(--brand)]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--brand)]'), 2000);
    }
    setPendingReqId(null);
  }, [pendingReqId, allQuotes]);

  useEffect(() => {
    const user = getCurrentUser<any>();
    if (!user) return;
    const reqs: Request[] = getRequests<Request>().filter((r: Request) => r.contractorId === user.email);
    setMyRequests(reqs);
    const reqIds = reqs.map(r => r.id);
    const quotes: Quote[] = getQuotes<Quote>().filter((q: Quote) => reqIds.includes(q.requestId));
    setAllQuotes(quotes);
    setSeenQuotes(getSeenQuoteIds(user.email));
  }, []);

  const markSeen = (quoteIds: number[]) => {
    const user = getCurrentUser<any>();
    if (!user) return;
    const updated = [...new Set([...seenQuotes, ...quoteIds])];
    setSeenQuotes(updated);
    setSeenQuoteIds(user.email, updated);
  };

  const getReqName = (req: Request) => {
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.map(tp => displayVal(tp as string, lang)).join(' — ');
    }
    return `#${String(req.id).slice(-4)}`;
  };

  const handleQuoteAction = async (quoteId: number, action: QuoteStatus | 'pending', undoReason?: string) => {
    const target = allQuotes.find(q => q.id === quoteId);
    if (action === 'accepted' && target && isQuoteExpired(target)) {
      showToast(tFn('cantAcceptExpired', lang), 'error');
      return;
    }
    if (action === 'rejected') { setRejectQuoteId(quoteId); return; }
    if (action === 'accepted') {
      const msg = lang === 'ar' ? 'هل أنت متأكد من قبول هذا العرض؟' : 'Accept this quote?';
      const confirmText = lang === 'ar' ? 'قبول' : 'Accept';
      if (!(await confirmDialog(msg, { confirmText }))) return;
    }
    const { quotes: updated, quote: q } = setQuoteStatus(quoteId, action);
    setAllQuotes(updated.filter((x: Quote) => myRequests.some(r => r.id === x.requestId)));
    if (q) {
      const actionText = action === 'accepted'
        ? { ar: `تم قبول عرض ${q.supplierCompany} بسعر ${q.totalPrice} ر.س`, en: `Accepted quote from ${q.supplierCompany} at ${q.totalPrice} SAR` }
        : undoReason
        ? { ar: `تم إلغاء القرار على عرض ${q.supplierCompany} — السبب: "${undoReason}"`, en: `Undid decision on ${q.supplierCompany} — reason: "${undoReason}"` }
        : { ar: `تم إلغاء القرار على عرض ${q.supplierCompany}`, en: `Undid decision on ${q.supplierCompany}` };
      appendActivityLog(q.requestId, actionText.ar, actionText.en);
    }
  };

  const handleRejectConfirm = (reason: string) => {
    if (rejectQuoteId === null) return;
    const { quotes: updated, quote: q } = setQuoteStatus(rejectQuoteId, 'rejected', reason || undefined);
    setAllQuotes(updated.filter((x: Quote) => myRequests.some(r => r.id === x.requestId)));
    if (q) appendActivityLog(q.requestId,
      reason ? `تم رفض عرض ${q.supplierCompany} — السبب: "${reason}"` : `تم رفض عرض ${q.supplierCompany}`,
      reason ? `Rejected quote from ${q.supplierCompany} — reason: "${reason}"` : `Rejected quote from ${q.supplierCompany}`);
    setRejectQuoteId(null);
  };

  /* undo is free within the grace window (setQuoteStatus stamps statusChangedAt); past
     it, the supplier may have already acted on the decision, so we require a reason. */
  const handleUndoClick = (q: Quote) => {
    if (canUndoQuoteDecisionFreely(q)) { handleQuoteAction(q.id, 'pending'); return; }
    setUndoReasonQuoteId(q.id);
    setUndoReasonText('');
  };
  const handleUndoReasonSubmit = (quoteId: number) => {
    if (!undoReasonText.trim()) return;
    handleQuoteAction(quoteId, 'pending', undoReasonText.trim());
    setUndoReasonQuoteId(null);
    setUndoReasonText('');
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
    { icon: '📥', bg: 'bg-[var(--tint)]', val: allQuotes.length, label: tFn('totalQ', lang), badge: null },
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
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>

      <ContractorNav lang={lang} setLang={setLang} userName={userName} active="/my-quotes" />

      <Suspense fallback={null}>
        <ReqIdParamReader onFound={setPendingReqId} />
      </Suspense>

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-7 pt-6 pb-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/70 text-xs mb-1">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1 flex items-center gap-2">
              {tFn('title', lang)}
              <HelpTooltip lang={lang}
                textAr="قبول أحد العروض لا يؤدي إلى رفض باقي العروض تلقائيًا — يجب التعامل مع كل عرض على حدة. ويمكن التراجع عن أي قرار (قبول أو رفض) باستخدام زر «إلغاء القرار»."
                textEn='Accepting a quote does not auto-reject the others — you handle each one individually. Any decision (accept/reject) can be undone with the "Undo" button.' />
            </h1>
            <p className="text-white/70 text-xs">
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
                className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${filter === tab ? 'text-white border-[var(--sec)]' : 'text-white/60 border-transparent hover:text-white/70'}`}>
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* STATS */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4 relative">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-xs text-stone-500 mt-1">{s.label}</div>
            {s.badge && <span className="absolute top-3 left-3 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{s.badge}</span>}
          </div>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-7 pb-10 space-y-4">

        {/* new quotes banner */}
        {newCount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">🔔</div>
            <p className="text-emerald-800 font-semibold text-sm">{tFn('newBanner', lang, newCount)}</p>
          </div>
        )}

        {/* empty state */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-stone-900 font-bold text-base">{tFn('noQuotes', lang)}</p>
            <p className="text-stone-500 text-sm max-w-xs">{tFn('noQuotesSub', lang)}</p>
            <Link href="/my-requests" className="mt-2 bg-[var(--brand)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
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
              <div key={reqId} id={`quote-group-${reqId}`} className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden transition-shadow">
                {/* request header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--bg-soft2)] border-b border-[var(--line-soft)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[var(--tint)] rounded-lg flex items-center justify-center text-[var(--brand-strong)] text-sm">📋</div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{reqName}</p>
                      <p className="text-[11px] text-stone-500">
                        {quotes.length} {lang === 'ar' ? 'عرض' : 'quotes'}
                        {req?.location ? ` · ${getCityName(req.location, lang)}` : ''}
                        {req?.deadline ? ` · ⏱ ${formatDay(req.deadline, lang)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {quotes.length > 1 && (
                      <button
                        onClick={() => { setCompareReqId(isComparing ? null : reqId); markSeen(quotes.map(q => q.id)); }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isComparing ? 'bg-[var(--brand)] text-white border-[var(--brand-strong)]' : 'bg-white text-[var(--brand-strong)] border-[var(--brand-strong)] hover:bg-[var(--tint)]'}`}>
                        {tFn('compare', lang)} {isComparing ? '✕' : '⇄'}
                      </button>
                    )}
                    <Link href={`/request/${reqId}`}
                      className="text-xs text-[var(--sec)] font-semibold hover:underline">
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
                  <div className="divide-y divide-[var(--line-soft)]">
                    {quotes.map(q => {
                      const expired = isQuoteExpired(q);
                      const isNew = q.status === 'pending' && !expired && !seenQuotes.includes(q.id);
                      return (
                        <div key={q.id}
                          className={`flex items-start gap-4 px-5 py-4 hover:bg-[var(--bg-soft)] transition-colors ${q.status === 'accepted' ? 'bg-emerald-50/30' : q.status === 'rejected' ? 'bg-red-50/30' : ''}`}
                          onClick={() => isNew && markSeen([q.id])}>
                          {/* supplier avatar */}
                          <div className="w-10 h-10 rounded-xl bg-[var(--tint)] border border-[var(--line)] flex items-center justify-center text-[12px] font-bold text-[var(--brand-strong)] shrink-0">
                            {q.supplierCompany.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/supplier-profile/${encodeURIComponent(q.supplierId)}`} onClick={e => e.stopPropagation()}
                                className="text-sm font-bold text-stone-900 hover:text-[var(--brand-strong)] hover:underline">{q.supplierCompany}</Link>
                              <p className="text-xs text-stone-500">{q.supplierName}</p>
                              <StatusBadge status={getEffectiveQuoteStatus(q)} lang={lang} />
                              {isNew && <span className="text-[10px] bg-[var(--brand)] text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                              {q.id === cheapestId && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{tFn('cheapest', lang)}</span>}
                              {q.id === fastestId && <span className="text-[10px] bg-[var(--tint)] text-[var(--brand-strong)] px-1.5 py-0.5 rounded-full font-bold">{tFn('fastest', lang)}</span>}
                            </div>
                            <div className="flex gap-4 mt-1.5">
                              <span className="text-base font-bold text-stone-900">{Number(q.totalPrice).toLocaleString()} <span className="text-xs font-medium text-stone-500">{tFn('sar', lang)}</span></span>
                              <span className="text-xs text-stone-500 self-end">{tFn('delivery', lang)} {q.deliveryDays} {tFn('days', lang)}</span>
                            </div>
                            {q.description && <p className="text-xs text-stone-500 mt-1">{q.description}</p>}
                            {q.status === 'revision' && q.revisionNote && (
                              <p className="text-xs text-amber-700 mt-1">✏ {q.revisionNote}</p>
                            )}
                            {q.status === 'rejected' && q.rejectionReason && (
                              <p className="text-xs text-red-700 mt-1">✕ {q.rejectionReason}</p>
                            )}
                            {q.editRequestStatus === 'pending' && (
                              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5" onClick={e => e.stopPropagation()}>
                                <p className="text-xs text-amber-800"><strong>{tFn('editReqNotice', lang)}</strong> {q.editRequestNote}</p>
                                <div className="flex gap-2 mt-1.5">
                                  <button onClick={() => handleApproveEditRequest(q.id)} className="text-xs font-semibold px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors">{tFn('approve', lang)}</button>
                                  <button onClick={() => handleRejectEditRequest(q.id)} className="text-xs font-semibold px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">{tFn('reject', lang)}</button>
                                </div>
                              </div>
                            )}
                            {q.status === 'accepted' && (() => {
                              const supplierInfo = getSupplierData(q.supplierId);
                              return (
                                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5" onClick={e => e.stopPropagation()}>
                                  <p className="text-[11px] font-bold text-emerald-800 mb-1">{tFn('dealContactTitle', lang)}</p>
                                  <p className="text-xs text-emerald-900">
                                    {q.supplierName} {supplierInfo?.phone && <span dir="ltr" className="font-mono">· {supplierInfo.phone}</span>}
                                  </p>
                                  <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${q.executionStatus === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                                      {q.executionStatus === 'delivered' ? `✓ ${tFn('deliveredStatus', lang)}` : `⏳ ${tFn('preparingStatus', lang)}`}
                                    </span>
                                    <a href={`/print/purchase-order/${q.id}`} target="_blank" rel="noopener noreferrer"
                                      className="text-[11px] font-bold px-2.5 py-1 bg-white border border-emerald-300 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors">
                                      📄 {tFn('viewPo', lang)}
                                    </a>
                                  </div>
                                </div>
                              );
                            })()}
                            {undoReasonQuoteId === q.id && (
                              <div className="mt-2 bg-stone-50 border border-stone-200 rounded-lg p-2.5 w-56" onClick={e => e.stopPropagation()}>
                                <p className="text-[11px] font-bold text-stone-600 mb-1.5">{tFn('undoReasonPrompt', lang)}</p>
                                <textarea value={undoReasonText} onChange={e => setUndoReasonText(e.target.value)} rows={2}
                                  placeholder={tFn('undoReasonPh', lang)}
                                  className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none font-cairo bg-white resize-none" />
                                <div className="flex gap-1.5 mt-1.5">
                                  <button onClick={() => handleUndoReasonSubmit(q.id)}
                                    className="text-[11px] font-semibold px-3 py-1 bg-stone-600 text-white rounded-md hover:bg-stone-700 transition-colors">
                                    {tFn('undoConfirm', lang)}
                                  </button>
                                  <button onClick={() => { setUndoReasonQuoteId(null); setUndoReasonText(''); }}
                                    className="text-[11px] font-semibold px-3 py-1 bg-white border border-stone-200 text-stone-600 rounded-md hover:bg-stone-100 transition-colors">
                                    {tFn('cancel', lang)}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* actions */}
                          <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                            {expired ? (
                              <span className="text-[11px] text-stone-500 text-center px-3 py-1.5">{tFn('expiredNote', lang)}</span>
                            ) : q.status === 'pending' ? (
                              <>
                                <button onClick={() => handleQuoteAction(q.id, 'accepted')}
                                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                                  {tFn('accept', lang)}
                                </button>
                                <button onClick={() => handleQuoteAction(q.id, 'rejected')}
                                  className="text-xs font-semibold px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                  {tFn('reject', lang)}
                                </button>
                                <button onClick={() => { setRevisionQuoteId(q.id); setRevisionNote(''); }}
                                  className="text-xs font-semibold px-3 py-1.5 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors">
                                  {tFn('revisionBtn', lang)}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleUndoClick(q)}
                                className="text-xs font-semibold px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                                {tFn('undo', lang)}
                              </button>
                            )}
                            <a href={`/print/quote/${q.id}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-semibold px-3 py-1.5 bg-[var(--tint)] text-[var(--brand-strong)] rounded-lg hover:bg-[var(--tint-hover)] transition-colors text-center">
                              👁 {tFn('view', lang)}
                            </a>
                            <a href={`/print/quote/${q.id}?autoprint=1`} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-semibold px-3 py-1.5 bg-stone-50 text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors text-center">
                              🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
                            </a>
                            <QuoteMessagesThread quoteId={q.id} requestId={q.requestId} lang={lang} role="contractor" senderName={userName} />
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

      {rejectQuoteId !== null && (
        <RejectReasonModal lang={lang}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectQuoteId(null)} />
      )}
    </div>
  );
}

/* ══════════════════════ SUPPLIER VIEW ══════════════════════ */
function SupplierQuotes({ lang, userName, setLang }: { lang: Lang; userName: string; setLang: (l: Lang) => void }) {
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const [editReqQuoteId, setEditReqQuoteId] = useState<number | null>(null);
  const [editReqNote, setEditReqNote] = useState('');
  const [ratingTarget, setRatingTarget] = useState<{ requestId: number; contractorName: string; contractorId: string } | null>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const user = getCurrentUser<any>();
    if (!user) return;
    const all: Quote[] = getQuotes<Quote>();
    setQuotes(all.filter(q => q.supplierId === user.email));
    setRatings(getRatings());
  }, []);

  useEffect(() => {
    if (pendingReqId === null) return;
    const el = document.getElementById(`supp-quote-${pendingReqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[var(--brand)]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--brand)]'), 2000);
    }
    setPendingReqId(null);
  }, [pendingReqId, quotes]);

  const getRequest = (id: number): Request | null => {
    const all: Request[] = getRequests<Request>();
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

  /* A live (undecided) quote can always be withdrawn — a supplier must be able to
     pull a mispriced offer before the contractor accepts it. Decided quotes can't. */
  const handleWithdraw = async (quoteId: number, requestId: number) => {
    if (!(await confirmDialog(tFn('confirmWithdraw', lang), { confirmText: tFn('withdrawBtn', lang), danger: true }))) return;
    const { quotes: updated, quote } = withdrawQuote(quoteId);
    const user = getCurrentUser<any>();
    setQuotes(user ? updated.filter((q: Quote) => q.supplierId === user.email) : updated);
    appendActivityLog(requestId,
      `تم سحب عرض ${quote?.supplierCompany || 'المورد'}`,
      `${quote?.supplierCompany || 'Supplier'} withdrew their quote`);
    showToast(tFn('withdrawnToTrash', lang));
  };

  const refreshQuotes = (updated: Quote[]) => {
    const user = getCurrentUser<any>();
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

  /* Extending validity only pushes the date — price and terms are untouched, so no contractor permission is needed. */
  const handleExtendValidity = (quoteId: number, requestId: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const { quotes: updated } = updateQuoteFields(quoteId, { validUntil: d.toISOString().slice(0, 10) });
    refreshQuotes(updated);
    appendActivityLog(requestId, 'قام المورد بتمديد صلاحية عرضه 30 يومًا', 'Supplier extended their quote validity by 30 days');
    showToast(tFn('extended', lang, 30));
  };

  const handleMarkDelivered = (quoteId: number, requestId: number, contractorId: string, contractorName: string) => {
    const { quotes: updated } = setQuoteExecutionStatus(quoteId, 'delivered');
    refreshQuotes(updated);
    appendActivityLog(requestId, 'أعلن المورد اكتمال التوريد', 'Supplier marked the order as delivered');
    if (!hasRated(ratings, requestId, 'supplier')) {
      setRatingTarget({ requestId, contractorName, contractorId });
    }
  };

  const handleSubmitContractorRating = (stars: number, comment: string) => {
    if (!ratingTarget) return;
    const user = getCurrentUser<any>();
    const updated = submitRating({
      requestId: ratingTarget.requestId, supplierId: user?.email || '', supplierCompany: user?.company || '',
      contractorId: ratingTarget.contractorId, contractorName: ratingTarget.contractorName,
      raterRole: 'supplier', rating: stars, comment,
    });
    setRatings(updated);
    appendActivityLog(ratingTarget.requestId, `تم تقييم المقاول بـ ${stars} نجوم`, `Rated the contractor ${stars} stars`);
    setRatingTarget(null);
  };

  const handleExportCsv = () => {
    if (quotes.length === 0) { showToast(tFn('csvEmpty', lang), 'error'); return; }
    const headers = lang === 'ar'
      ? ['رقم العرض', 'المشروع', 'المدينة', 'الحالة', 'السعر الإجمالي', 'مدة التوريد (أيام)', 'تاريخ التقديم', 'صالح حتى']
      : ['Quote #', 'Project', 'City', 'Status', 'Total Price', 'Delivery (days)', 'Submitted', 'Valid Until'];
    const rows = quotes.map(q => {
      const req = getRequest(q.requestId);
      return [
        q.quoteNumber || String(q.id),
        getReqDisplayName(req, q.requestId),
        req ? getCityName(req.location, lang) : '',
        tFn(getEffectiveQuoteStatus(q) === 'expired' ? 'expiredNote' : q.status, lang),
        Number(q.totalPrice) || 0,
        q.deliveryDays,
        q.createdAt?.slice(0, 10) || '',
        q.validUntil || '',
      ];
    });
    downloadCsv(`quotes-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const filteredQuotes = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (Number(q.totalPrice) || 0), 0);

  const stats = [
    { icon: '📄', bg: 'bg-[var(--tint)]', val: quotes.length, label: tFn('totalQ', lang) },
    { icon: '⏳', bg: 'bg-orange-50', val: quotes.filter(q => q.status === 'pending').length, label: tFn('pendingQ', lang) },
    { icon: '✅', bg: 'bg-emerald-50', val: quotes.filter(q => q.status === 'accepted').length, label: tFn('acceptedQ', lang) },
    { icon: '💰', bg: 'bg-amber-50', val: acceptedValue.toLocaleString(), label: tFn('acceptedValue', lang) },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <SupplierNav lang={lang} setLang={setLang} userName={userName} active="/my-quotes" />

      <Suspense fallback={null}>
        <ReqIdParamReader onFound={setPendingReqId} />
      </Suspense>

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-bold mb-1">{tFn('titleSupp', lang)}</h1>
            <p className="text-white/70 text-xs">{quotes.length} {lang === 'ar' ? 'عرض مقدَّم' : 'submitted quotes'}</p>
          </div>
          <button onClick={handleExportCsv}
            className="mb-1 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
            {tFn('exportCsv', lang)}
          </button>
        </div>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {(['all', 'pending', 'accepted', 'rejected', 'revision'] as FilterTab[]).map(tab => {
            const count = tab === 'all' ? quotes.length : quotes.filter(q => q.status === tab).length;
            const label = tFn(tab === 'all' ? 'all' : tab, lang);
            return (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${filter === tab ? 'text-white border-[var(--sec)]' : 'text-white/60 border-transparent hover:text-white/70'}`}>
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* STATS */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-xs text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-7 pb-10 space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📭</span>
            <p className="text-stone-900 font-bold">{tFn('noSuppQ', lang)}</p>
            <Link href="/supplier-requests" className="mt-2 bg-[var(--brand)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
              {tFn('browseReqs', lang)}
            </Link>
          </div>
        ) : (
          filteredQuotes.map(q => {
            const req = getRequest(q.requestId);
            return (
              <div key={q.id} id={`supp-quote-${q.requestId}`} className={`bg-white border rounded-2xl p-5 transition-shadow ${q.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/20' : q.status === 'rejected' ? 'border-red-200 bg-red-50/20' : q.status === 'revision' ? 'border-amber-200 bg-amber-50/20' : 'border-[var(--line)]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-stone-900">{getReqDisplayName(req, q.requestId)}</p>
                      {q.quoteNumber && <span className="text-[11px] font-mono font-semibold text-[var(--sec)] bg-[var(--tint)] px-1.5 py-0.5 rounded">{q.quoteNumber}</span>}
                    </div>
                    {req && <p className="text-xs text-stone-500 mt-0.5">📍 {getCityName(req.location, lang)} {req.deadline ? `· ⏱ ${formatDay(req.deadline, lang)}` : ''}</p>}
                  </div>
                  <StatusBadge status={getEffectiveQuoteStatus(q)} lang={lang} />
                </div>

                <div className="flex gap-6">
                  <div>
                    <p className="text-[11px] text-stone-500">{tFn('yourPrice', lang)}</p>
                    <p className="text-xl font-bold text-stone-900">{Number(q.totalPrice).toLocaleString()} <span className="text-sm font-medium text-stone-500">{tFn('sar', lang)}</span></p>
                  </div>
                  <div>
                    <p className="text-[11px] text-stone-500">{tFn('delivery', lang)}</p>
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
                {q.status === 'rejected' && q.rejectionReason && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-red-800">{tFn('rejReason', lang)}</p>
                    <p className="text-xs text-red-700 mt-0.5">{q.rejectionReason}</p>
                  </div>
                )}
                {q.status === 'accepted' && req && (() => {
                  const contractor = getSupplierData(req.contractorId);
                  return (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-bold text-emerald-800">{tFn('dealContactTitle', lang)}</p>
                      <p className="text-xs text-emerald-900">
                        {contractor?.name || req.contractorId} {contractor?.phone && <span dir="ltr" className="font-mono">· {contractor.phone}</span>}
                      </p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${q.executionStatus === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                          {q.executionStatus === 'delivered' ? `✓ ${tFn('deliveredStatus', lang)}` : `⏳ ${tFn('preparingStatus', lang)}`}
                        </span>
                        <div className="flex gap-2">
                          {q.executionStatus !== 'delivered' && (
                            <button onClick={() => handleMarkDelivered(q.id, q.requestId, req.contractorId, contractor?.name || req.contractorId)}
                              className="text-[11px] font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                              {tFn('markDelivered', lang)}
                            </button>
                          )}
                          <a href={`/print/purchase-order/${q.id}`} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-bold px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                            📄 {tFn('viewPo', lang)}
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {q.editRequestStatus === 'pending' && (
                  <div className="mt-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-stone-600">⏳ {tFn('editReqPendingBadge', lang)}</p>
                  </div>
                )}
                {q.status === 'pending' && (() => {
                  const daysLeft = quoteValidityDaysLeft(q);
                  if (daysLeft === null || daysLeft > 3) return null;
                  const expired = isQuoteExpired(q);
                  return (
                    <div className={`mt-2 rounded-lg px-3 py-2 flex items-center justify-between gap-3 flex-wrap border ${expired ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                      <p className={`text-xs font-semibold ${expired ? 'text-red-700' : 'text-orange-700'}`}>
                        ⏳ {expired ? tFn('expiryExpired', lang) : tFn('expirySoon', lang, daysLeft)}
                        <span className="font-normal text-stone-500"> · {tFn('validUntilLbl', lang)} {formatDay(q.validUntil, lang)}</span>
                      </p>
                      <button onClick={() => handleExtendValidity(q.id, q.requestId)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-colors shrink-0 ${expired ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                        {tFn('extendBtn', lang)}
                      </button>
                    </div>
                  );
                })()}
                {q.editRequestStatus === 'rejected' && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-red-700">{tFn('editReqRejectedNotice', lang)}</p>
                    <button onClick={() => handleDismissEditRejection(q.id)}
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-100 transition-colors shrink-0">
                      {tFn('dismiss', lang)}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <p className="text-[11px] text-stone-500">{tFn('submittedOn', lang)} {formatDate(q.createdAt, lang)}</p>
                  <div className="flex gap-2">
                    {(q.status === 'pending' || q.status === 'revision') && (
                      <button onClick={() => handleWithdraw(q.id, q.requestId)}
                        className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors">
                        {tFn('withdrawBtn', lang)}
                      </button>
                    )}
                    {q.status === 'revision' && (
                      <Link href={`/supplier-requests/quote/${q.requestId}?editQuoteId=${q.id}`}
                        className="text-xs font-semibold px-3 py-1.5 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors inline-block text-center">
                        {tFn('editResubmitBtn', lang)}
                      </Link>
                    )}
                    {q.status === 'pending' && !q.editRequestStatus && (
                      <button onClick={() => { setEditReqQuoteId(q.id); setEditReqNote(''); }}
                        className="text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                        {tFn('requestEditBtn', lang)}
                      </button>
                    )}
                    <a href={`/print/quote/${q.id}`} target="_blank" rel="noopener noreferrer" title={tFn('view', lang)}
                      className="text-xs font-semibold px-3 py-1.5 bg-[var(--tint)] text-[var(--brand-strong)] rounded-lg hover:bg-[var(--tint-hover)] transition-colors">
                      👁 {tFn('view', lang)}
                    </a>
                    <a href={`/print/quote/${q.id}?autoprint=1`} target="_blank" rel="noopener noreferrer" title={tFn('print', lang)}
                      className="text-xs font-semibold px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                      🖨 {tFn('print', lang)}
                    </a>
                    <QuoteMessagesThread quoteId={q.id} requestId={q.requestId} lang={lang} role="supplier" senderName={userName} />
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

      {ratingTarget && (
        <RatingModal lang={lang} supplierCompany={ratingTarget.contractorName} target="contractor"
          onSubmit={handleSubmitContractorRating}
          onSkip={() => setRatingTarget(null)} />
      )}
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
    setLang(getLanguage());
    const user = getCurrentUser<any>();
    if (!user) { router.push('/login'); return; }
    setUserType(user.userType);
    if (user.name) setUserName(user.name);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  if (!userType) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-500 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  if (userType === 'supplier') return <SupplierQuotes lang={lang} userName={userName} setLang={handleLangChange} />;
  return <ContractorQuotes lang={lang} userName={userName} setLang={handleLangChange} />;
}
