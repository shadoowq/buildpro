'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../../components/ContractorNav';
import StatusBadge from '../../components/StatusBadge';
import RatingModal from '../../components/RatingModal';
import HelpTooltip from '../../components/HelpTooltip';
import QuoteCompareTable from '../../components/QuoteCompareTable';
import { useEscapeKey } from '../../components/useEscapeKey';
import { formatDate, displayVal, arToEn, appendActivityLog, setQuoteStatus, softDeleteRequest, getDeadlineUrgency } from '../../lib/requestHelpers';
import { getCityName } from '../../lib/translations';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

type Lang = 'ar' | 'en';
type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'revision';

interface Request {
  id: number;
  contractorId: string;
  projectName?: string;
  materials?: any[];
  ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  location: string; deadline: string;
  budget: number; description: string;
  status: 'open' | 'closed';
  createdAt: string;
  kanbanColumn?: string;
}

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
}

interface ActivityLog {
  id: number; requestId: number;
  action: string; actionEn: string;
  timestamp: string;
}

interface Rating {
  id: number; requestId: number; supplierId: string;
  supplierCompany: string; rating: number; comment: string; createdAt: string;
}

const T = {
  back:         { ar: '← طلباتي',        en: '← My Requests'      },
  reqDetails:   { ar: 'تفاصيل الطلب',    en: 'Request Details'    },
  materials:    { ar: 'المواد المطلوبة', en: 'Required Materials' },
  description:  { ar: 'الوصف',           en: 'Description'        },
  quotesSection:{ ar: 'عروض الأسعار',    en: 'Quotes'             },
  activity:     { ar: 'تاريخ النشاط',    en: 'Activity Log'       },
  open:         { ar: 'مفتوح',           en: 'Open'               },
  closed:       { ar: 'مغلق',            en: 'Closed'             },
  sar:          { ar: 'ر.س',             en: 'SAR'                },
  days:         { ar: 'يوم',             en: 'days'               },
  delivery:     { ar: 'مدة التوريد:',    en: 'Delivery:'          },
  noQuotes:     { ar: 'لا توجد عروض بعد', en: 'No quotes yet'   },
  noActivity:   { ar: 'لا يوجد نشاط بعد', en: 'No activity yet' },
  accept:       { ar: 'قبول',            en: 'Accept'             },
  reject:       { ar: 'رفض',            en: 'Reject'             },
  revisionBtn:  { ar: 'طلب تعديل',       en: 'Request Revision'   },
  undo:         { ar: 'إلغاء',           en: 'Undo'               },
  pending:      { ar: 'انتظار',          en: 'Pending'            },
  accepted:     { ar: 'مقبول',           en: 'Accepted'           },
  rejected:     { ar: 'مرفوض',          en: 'Rejected'           },
  revision:     { ar: 'طلب تعديل',       en: 'Revision'           },
  cheapest:     { ar: 'الأرخص',         en: 'Cheapest'           },
  fastest:      { ar: 'الأسرع',         en: 'Fastest'            },
  closeReq:     { ar: 'إغلاق الطلب',    en: 'Close Request'      },
  openReq:      { ar: 'فتح الطلب',      en: 'Open Request'       },
  editReq:      { ar: 'تعديل الطلب',    en: 'Edit Request'       },
  duplicate:    { ar: 'نسخ الطلب',      en: 'Duplicate Request'  },
  deleteReq:    { ar: 'حذف الطلب',      en: 'Delete Request'     },
  confirmDelete:{ ar: 'هل أنت متأكد من حذف هذا الطلب؟', en: 'Are you sure you want to delete this request?' },
  print:        { ar: 'طباعة',          en: 'Print'              },
  shareLink:    { ar: 'نسخ الرابط',     en: 'Copy Link'          },
  linkCopied:   { ar: 'تم النسخ ✓',     en: 'Copied ✓'           },
  writeRev:     { ar: 'اكتب ملاحظة للمورد...', en: 'Write a note to the supplier...' },
  sendRev:      { ar: 'إرسال التعديل',  en: 'Send Revision'      },
  cancel:       { ar: 'إلغاء',          en: 'Cancel'             },
  notFound:     { ar: 'الطلب غير موجود', en: 'Request not found' },
  goBack:       { ar: 'العودة لطلباتي', en: 'Back to Requests'   },
  location:     { ar: 'المدينة',        en: 'City'               },
  deadline:     { ar: 'الموعد النهائي', en: 'Deadline'           },
  createdAt:    { ar: 'تاريخ الإنشاء',  en: 'Created'            },
  budget:       { ar: 'الميزانية',      en: 'Budget'             },
  na:           { ar: 'غير محدد',       en: 'N/A'                },
  matType:      { ar: 'المادة',         en: 'Material'           },
  usage:        { ar: 'الاستخدام',      en: 'Usage'              },
  size:         { ar: 'المقاس',         en: 'Size'               },
  thickness:    { ar: 'السماكة',        en: 'Thickness'          },
  finish:       { ar: 'الفنش',         en: 'Finish'             },
  color:        { ar: 'اللون',          en: 'Color'              },
  qty:          { ar: 'الكمية',         en: 'Qty'                },
  targetPrice:  { ar: 'السعر المستهدف', en: 'Target Price'       },
  origin:       { ar: 'الصناعة',        en: 'Origin'             },
  deliveryDate: { ar: 'تاريخ التوريد',  en: 'Delivery Date'      },
  note:         { ar: 'ملاحظات',        en: 'Notes'              },
  images:       { ar: 'الصور',          en: 'Images'             },
  compareBtn:   { ar: 'مقارنة العروض',   en: 'Compare Quotes'     },
  cardsBtn:     { ar: 'عرض تفصيلي',      en: 'Detailed View'      },
};

function t(key: keyof typeof T, lang: Lang): string { return (T[key] as any)[lang]; }

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const confirmDialog = useConfirm();
  const showToast = useToast();

  const [lang, setLang] = useState<Lang>('ar');
  const [userName, setUserName] = useState('');
  const [request, setRequest] = useState<Request | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [revisionQuoteId, setRevisionQuoteId] = useState<number | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionError, setRevisionError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingQuote, setRatingQuote] = useState<Quote | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEscapeKey(() => { if (lightbox) setLightbox(null); });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const user = JSON.parse(userData);
    if (user.name) setUserName(user.name);

    let allReqs: Request[] = [];
    try { allReqs = JSON.parse(localStorage.getItem('requests') || '[]'); } catch {}
    const found = allReqs.find(r => r.id === id);
    if (found && found.contractorId !== user.email) { router.push('/my-requests'); return; }
    setRequest(found || null);

    try {
      const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
      setQuotes(allQuotes.filter(q => q.requestId === id));
    } catch {}

    try {
      const allLogs: ActivityLog[] = JSON.parse(localStorage.getItem('activityLogs') || '[]');
      setLogs(allLogs.filter(l => l.requestId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch {}

    try { setRatings(JSON.parse(localStorage.getItem('ratings') || '[]')); } catch {}

    setLoading(false);
  }, [id, router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  const addLog = (ar: string, en: string) => {
    const allLogs = appendActivityLog(id, ar, en);
    setLogs(allLogs.filter((l: ActivityLog) => l.requestId === id).sort((a: ActivityLog, b: ActivityLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
    setQuotes(updated.filter((x: Quote) => x.requestId === id));
    if (q) {
      if (action === 'accepted') addLog(`تم قبول عرض ${q.supplierCompany} بسعر ${q.totalPrice} ر.س`, `Accepted ${q.supplierCompany} at ${q.totalPrice} SAR`);
      else if (action === 'rejected') addLog(`تم رفض عرض ${q.supplierCompany}`, `Rejected ${q.supplierCompany}`);
      else if (action === 'pending') addLog(`تم إلغاء القرار على عرض ${q.supplierCompany}`, `Undid decision on ${q.supplierCompany}`);
    }
  };

  const handleRevisionSubmit = (quoteId: number) => {
    if (!revisionNote.trim()) { setRevisionError(true); return; }
    setRevisionError(false);
    const { quotes: updated, quote: q } = setQuoteStatus(quoteId, 'revision', revisionNote);
    setQuotes(updated.filter((x: Quote) => x.requestId === id));
    if (q) addLog(`طلب تعديل على عرض ${q.supplierCompany}: "${revisionNote}"`, `Revision on ${q.supplierCompany}: "${revisionNote}"`);
    setRevisionQuoteId(null);
    setRevisionNote('');
  };

  const handleToggleStatus = () => {
    if (!request) return;
    const newStatus = request.status === 'open' ? 'closed' : 'open';
    const all: Request[] = JSON.parse(localStorage.getItem('requests') || '[]');
    const updated = all.map(r => r.id === id ? { ...r, status: newStatus as 'open' | 'closed', kanbanColumn: newStatus === 'closed' ? 'closed' : undefined } : r);
    localStorage.setItem('requests', JSON.stringify(updated));
    setRequest(prev => prev ? { ...prev, status: newStatus as 'open' | 'closed' } : prev);
    addLog(
      newStatus === 'closed' ? 'تم إغلاق الطلب' : 'تم فتح الطلب',
      newStatus === 'closed' ? 'Request closed' : 'Request reopened',
    );
    if (newStatus === 'closed') {
      const acceptedQuote = quotes.find(q => q.status === 'accepted');
      const alreadyRated = ratings.find(r => r.requestId === id);
      if (acceptedQuote && !alreadyRated) {
        setRatingQuote(acceptedQuote);
        setShowRatingModal(true);
      }
    }
  };

  const handleSubmitRating = (stars: number, comment: string) => {
    if (!ratingQuote) return;
    const allRatings = JSON.parse(localStorage.getItem('ratings') || '[]');
    const newRating: Rating = { id: Date.now(), requestId: id, supplierId: ratingQuote.supplierId, supplierCompany: ratingQuote.supplierCompany, rating: stars, comment, createdAt: new Date().toISOString() };
    allRatings.push(newRating);
    localStorage.setItem('ratings', JSON.stringify(allRatings));
    setRatings(allRatings);
    addLog(`تم تقييم ${ratingQuote.supplierCompany} بـ ${stars} نجوم`, `Rated ${ratingQuote.supplierCompany} ${stars} stars`);
    setShowRatingModal(false);
    setRatingQuote(null);
  };

  const handleDuplicate = () => {
    if (!request) return;
    const all: Request[] = JSON.parse(localStorage.getItem('requests') || '[]');
    const newId = Date.now();
    const copy = { ...request, id: newId, status: 'open' as const, kanbanColumn: undefined, createdAt: new Date().toISOString(), projectName: request.projectName ? `${request.projectName} (${lang === 'ar' ? 'نسخة' : 'copy'})` : undefined };
    all.push(copy);
    localStorage.setItem('requests', JSON.stringify(all));
    appendActivityLog(newId, `تم إنشاء طلب بنسخ طلب #${request.id}`, `Duplicated from request #${request.id}`);
    router.push('/my-requests');
  };

  const handleDelete = async () => {
    if (!request) return;
    if (!(await confirmDialog(t('confirmDelete', lang), { confirmText: t('deleteReq', lang), danger: true }))) return;
    softDeleteRequest(request.id);
    showToast(lang === 'ar' ? 'تم نقل الطلب لسلة المهملات' : 'Moved to trash');
    router.push('/my-requests');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const getReqName = (req: Request) => {
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.map(tp => displayVal(tp as string, lang)).join(' — ');
    }
    const parts: string[] = [];
    if (req.ceramic > 0)   parts.push(`${lang === 'ar' ? 'سيراميك' : 'Ceramic'} ${req.ceramic}m²`);
    if (req.porcelain > 0) parts.push(`${lang === 'ar' ? 'بورسلان' : 'Porcelain'} ${req.porcelain}m²`);
    if (req.marble > 0)    parts.push(`${lang === 'ar' ? 'رخام' : 'Marble'} ${req.marble}m²`);
    if (req.granite > 0)   parts.push(`${lang === 'ar' ? 'جرانيت' : 'Granite'} ${req.granite}m²`);
    if (req.terrazzo > 0)  parts.push(`${lang === 'ar' ? 'تيرازو' : 'Terrazzo'} ${req.terrazzo}m²`);
    return parts.join(' — ') || `#${String(req.id).slice(-4)}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F7F2EC] flex items-center justify-center font-cairo">
      <div className="text-stone-400 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  if (!request) return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>
      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/my-requests" />
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="text-5xl">📭</span>
        <p className="text-stone-900 font-bold text-lg">{t('notFound', lang)}</p>
        <Link href="/my-requests" className="bg-[#C0603E] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#9C4C31] transition-colors">
          {t('goBack', lang)}
        </Link>
      </div>
    </div>
  );

  const cheapestId = quotes.length > 1 ? quotes.reduce((a, b) => a.totalPrice < b.totalPrice ? a : b).id : null;
  const fastestId  = quotes.length > 1 ? quotes.reduce((a, b) => a.deliveryDays < b.deliveryDays ? a : b).id : null;

  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo print:bg-white" dir={dir}>
      <div className="print:hidden">
        <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/my-requests" />
      </div>

      {/* HERO */}
      <div className="bg-[#C0603E] px-4 md:px-7 pt-5 pb-5 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link href="/my-requests" className="text-white/50 text-xs hover:text-white/80 transition-colors mb-2 inline-block">
              {t('back', lang)}
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-white text-xl font-bold">{getReqName(request)}</h1>
              <span className="text-[#8A7B6C] font-mono font-bold text-sm">#{request.id}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${request.status === 'open' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-white/10 text-white/60 border border-white/20'}`}>
                {t(request.status === 'open' ? 'open' : 'closed', lang)}
              </span>
            </div>
            <div className="flex gap-3 mt-2 text-white/50 text-xs flex-wrap">
              {request.location && <span>📍 {getCityName(request.location, lang)}</span>}
              {request.deadline && (() => {
                const urgency = getDeadlineUrgency(request.deadline, quotes.some(q => q.status === 'accepted'));
                return (
                  <span className={`font-semibold ${urgency === 'overdue' ? 'text-red-300' : urgency === 'soon' ? 'text-amber-300' : ''}`}>
                    {urgency === 'overdue' ? '🔴' : urgency === 'soon' ? '🟠' : '⏱'} {request.deadline}
                  </span>
                );
              })()}
              <span>📅 {formatDate(request.createdAt, lang)}</span>
            </div>
          </div>
          {/* action buttons */}
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handleToggleStatus}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${request.status === 'open' ? 'bg-amber-400 hover:bg-amber-500 text-white border-amber-400' : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'}`}>
              {request.status === 'open' ? t('closeReq', lang) : t('openReq', lang)}
            </button>
            <Link href={`/create-request?edit=${request.id}`}
              className="text-xs font-semibold px-3 py-2 bg-[#8A7B6C] hover:bg-[#6F6255] text-white rounded-lg transition-colors flex items-center gap-1.5">
              ✏ {t('editReq', lang)}
            </Link>
            <div className="relative">
              <button onClick={() => setShowMoreMenu(v => !v)}
                className="text-xs font-semibold px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors">
                ⋯
              </button>
              {showMoreMenu && (
                <div className="absolute z-20 top-full mt-1 end-0 w-52 bg-white border border-[#E8DFD3] rounded-xl shadow-lg overflow-hidden" dir={dir}>
                  <a href={`/print/request/${request.id}`} target="_blank" onClick={() => setShowMoreMenu(false)}
                    className={`block w-full px-3 py-2 text-xs font-semibold transition-colors hover:bg-stone-100 text-stone-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    🖨 {t('print', lang)}
                  </a>
                  <button onClick={() => { handleCopyLink(); setShowMoreMenu(false); }}
                    className={`w-full px-3 py-2 text-xs font-semibold transition-colors hover:bg-stone-100 text-stone-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    🔗 {linkCopied ? t('linkCopied', lang) : t('shareLink', lang)}
                  </button>
                  <button onClick={() => { handleDuplicate(); setShowMoreMenu(false); }}
                    className={`w-full px-3 py-2 text-xs font-semibold transition-colors hover:bg-violet-50 text-violet-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    ⊕ {t('duplicate', lang)}
                  </button>
                  <div className="border-t border-stone-100" />
                  <button onClick={() => { setShowMoreMenu(false); handleDelete(); }}
                    className={`w-full px-3 py-2 text-xs font-semibold transition-colors hover:bg-red-50 text-red-600 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    🗑 {t('deleteReq', lang)}
                  </button>
                </div>
              )}
            </div>
            <HelpTooltip lang={lang}
              textAr="نسخ الرابط يعمل فقط أثناء تسجيل دخولك بحسابك الخاص — ولا يمكن مشاركته مع مورد أو حساب آخر."
              textEn="Copy Link only works while you're signed into your own account — it can't be shared with a supplier or another account." />
          </div>
        </div>
      </div>

      {/* print header */}
      <div className="hidden print:block px-8 pt-6 pb-4 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-[#C0603E]">BuildPro</p>
            <p className="text-stone-500 text-sm mt-1">{t('reqDetails', lang)} — #{request.id}</p>
          </div>
          <div className="text-right text-sm text-stone-600">
            <p className="font-bold">{getReqName(request)}</p>
            <p>{getCityName(request.location, lang)} · {request.deadline}</p>
            <p>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 md:px-7 py-6 space-y-5 max-w-5xl print:max-w-full print:px-8 print:py-4">

        {/* MATERIALS */}
        <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden print:border print:border-stone-200 print:rounded-lg">
          <div className="px-5 py-3.5 border-b border-[#F1EAE0] flex items-center gap-2">
            <span className="text-base">📦</span>
            <h2 className="text-sm font-bold text-stone-900">{t('materials', lang)}</h2>
          </div>
          <div className="p-5">
            {request.materials && request.materials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {['#', t('matType', lang), t('usage', lang), t('size', lang), t('thickness', lang), t('finish', lang), t('color', lang), t('qty', lang), t('targetPrice', lang), t('origin', lang), t('deliveryDate', lang), t('note', lang), t('images', lang)].map(h => (
                        <th key={h} className="border border-stone-200 bg-[#C0603E] px-3 py-2 text-right text-white font-semibold whitespace-nowrap print:py-1.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {request.materials.map((m: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAF7F2]'}>
                        <td className="border border-stone-200 px-3 py-2 font-bold text-stone-900 text-center">{i + 1}</td>
                        <td className="border border-stone-200 px-3 py-2 font-bold text-stone-900">{displayVal(m.type, lang)}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{displayVal(m.usage, lang)}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{m.size || '—'}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{m.thickness || '—'}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{displayVal(m.finish, lang)}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{displayVal(m.color, lang)}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{m.quantity ? `${m.quantity} ${lang === 'en' ? (arToEn[m.unit] || m.unit || 'm²') : (m.unit || 'م²')}` : '—'}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{m.targetPrice ? `${m.targetPrice} ${lang === 'en' ? (m.currency === 'ر.س' ? 'SAR' : m.currency || 'SAR') : (m.currency || 'ر.س')}` : '—'}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{displayVal(m.origin, lang)}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700">{m.deliveryDate || '—'}</td>
                        <td className="border border-stone-200 px-3 py-2 text-stone-700 max-w-[120px]">{m.note || '—'}</td>
                        <td className="border border-stone-200 px-3 py-2 print:hidden">
                          {m.images?.length > 0 ? (
                            <div className="flex gap-1">
                              {m.images.map((img: string, j: number) => (
                                <img key={j} src={img} alt="" onClick={() => setLightbox(img)}
                                  className="w-10 h-10 object-cover rounded border border-stone-200 cursor-zoom-in" />
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-700 space-y-1">
                {request.ceramic > 0   && <p>• {lang === 'ar' ? 'سيراميك'  : 'Ceramic'}:   {request.ceramic} m²</p>}
                {request.porcelain > 0 && <p>• {lang === 'ar' ? 'بورسلان'  : 'Porcelain'}: {request.porcelain} m²</p>}
                {request.marble > 0    && <p>• {lang === 'ar' ? 'رخام'     : 'Marble'}:    {request.marble} m²</p>}
                {request.granite > 0   && <p>• {lang === 'ar' ? 'جرانيت'   : 'Granite'}:   {request.granite} m²</p>}
                {request.terrazzo > 0  && <p>• {lang === 'ar' ? 'تيرازو'   : 'Terrazzo'}:  {request.terrazzo} m²</p>}
              </div>
            )}
          </div>
        </div>

        {/* DESCRIPTION */}
        {request.description && (
          <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden print:border-stone-200 print:rounded-lg">
            <div className="px-5 py-3.5 border-b border-[#F1EAE0] flex items-center gap-2">
              <span className="text-base">📝</span>
              <h2 className="text-sm font-bold text-stone-900">{t('description', lang)}</h2>
            </div>
            <p className="px-5 py-4 text-sm text-stone-700 leading-relaxed">{request.description}</p>
          </div>
        )}

        {/* QUOTES */}
        <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden print:border-stone-200 print:rounded-lg">
          <div className="px-5 py-3.5 border-b border-[#F1EAE0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">💼</span>
              <h2 className="text-sm font-bold text-stone-900">{t('quotesSection', lang)} ({quotes.length})</h2>
            </div>
            <div className="flex items-center gap-3">
              {quotes.length > 0 && (
                <div className="flex gap-3 text-[11px] text-stone-400 print:hidden">
                  {cheapestId && <span>🟢 {t('cheapest', lang)}: {Number(quotes.find(q => q.id === cheapestId)?.totalPrice || 0).toLocaleString()} {t('sar', lang)}</span>}
                  {fastestId  && <span>⚡ {t('fastest', lang)}: {quotes.find(q => q.id === fastestId)?.deliveryDays} {t('days', lang)}</span>}
                </div>
              )}
              {quotes.length > 1 && (
                <button onClick={() => setShowCompare(v => !v)}
                  className="text-[11px] font-semibold px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors print:hidden">
                  {showCompare ? t('cardsBtn', lang) : t('compareBtn', lang)}
                </button>
              )}
            </div>
          </div>

          {quotes.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm text-stone-400">{t('noQuotes', lang)}</p>
            </div>
          ) : showCompare ? (
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
            <div className="divide-y divide-[#FAF7F2]">
              {quotes.map(q => (
                <div key={q.id}>
                  <div className={`flex items-start gap-4 px-5 py-4 flex-wrap md:flex-nowrap ${q.status === 'accepted' ? 'bg-emerald-50/40' : q.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                    {/* avatar */}
                    <div className="w-10 h-10 rounded-xl bg-[#F3EAE0] border border-[#E8DFD3] flex items-center justify-center text-[12px] font-bold text-[#C0603E] shrink-0">
                      {q.supplierCompany.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-stone-900">{q.supplierCompany}</p>
                        <p className="text-[11px] text-stone-400">{q.supplierName}</p>
                        <StatusBadge status={q.status} lang={lang} />
                        {q.id === cheapestId && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{t('cheapest', lang)}</span>}
                        {q.id === fastestId  && <span className="text-[9px] bg-[#F3EAE0] text-[#C0603E] px-1.5 py-0.5 rounded-full font-bold">{t('fastest', lang)}</span>}
                      </div>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xl font-bold text-stone-900">{Number(q.totalPrice).toLocaleString()} <span className="text-xs font-medium text-stone-500">{t('sar', lang)}</span></span>
                        <span className="text-xs text-stone-500 self-end">{t('delivery', lang)} {q.deliveryDays} {t('days', lang)}</span>
                      </div>
                      {q.description && <p className="text-xs text-stone-500 mt-1">{q.description}</p>}
                      {q.status === 'revision' && q.revisionNote && (
                        <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">✏ {q.revisionNote}</p>
                      )}
                      <p className="text-[10px] text-stone-300 mt-1">{formatDate(q.createdAt, lang)}</p>
                    </div>
                    {/* actions */}
                    <div className="flex gap-1.5 shrink-0 flex-wrap print:hidden">
                      {q.status === 'pending' ? (
                        <>
                          <button onClick={() => handleQuoteAction(q.id, 'accepted')}
                            className="text-[11px] font-semibold px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                            {t('accept', lang)}
                          </button>
                          <button onClick={() => handleQuoteAction(q.id, 'rejected')}
                            className="text-[11px] font-semibold px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                            {t('reject', lang)}
                          </button>
                          <button onClick={() => { setRevisionQuoteId(q.id); setRevisionNote(''); }}
                            className="text-[11px] font-semibold px-3 py-1.5 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors">
                            {t('revisionBtn', lang)}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleQuoteAction(q.id, 'pending')}
                          className="text-[11px] font-semibold px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                          {t('undo', lang)}
                        </button>
                      )}
                      <a href={`/print/quote/${q.id}`} target="_blank"
                        className="text-[11px] font-semibold px-3 py-1.5 bg-stone-50 text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors">
                        🖨
                      </a>
                    </div>
                  </div>
                  {/* revision input */}
                  {revisionQuoteId === q.id && (
                    <div className="px-5 py-4 bg-amber-50 border-t border-amber-200">
                      <textarea value={revisionNote} onChange={e => { setRevisionNote(e.target.value); setRevisionError(false); }}
                        placeholder={t('writeRev', lang)} rows={2}
                        className={`w-full text-xs border rounded-lg px-3 py-2 outline-none font-cairo bg-white resize-none text-stone-700 ${revisionError ? 'border-red-400 bg-red-50' : 'border-amber-200'}`} />
                      {revisionError && <p className="text-[10px] text-red-600 mt-1">{lang === 'ar' ? 'الرجاء كتابة ملاحظة أولاً' : 'Please write a note first'}</p>}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleRevisionSubmit(q.id)}
                          className="text-xs font-semibold px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                          {t('sendRev', lang)}
                        </button>
                        <button onClick={() => { setRevisionQuoteId(null); setRevisionNote(''); }}
                          className="text-xs font-semibold px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
                          {t('cancel', lang)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIVITY LOG */}
        {logs.length > 0 && (
          <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden print:border-stone-200 print:rounded-lg">
            <div className="px-5 py-3.5 border-b border-[#F1EAE0] flex items-center gap-2">
              <span className="text-base">📋</span>
              <h2 className="text-sm font-bold text-stone-900">{t('activity', lang)}</h2>
            </div>
            <div className="divide-y divide-[#FAF7F2]">
              {logs.map((log, i) => (
                <div key={log.id} className={`flex items-center justify-between px-5 py-3 text-xs ${i % 2 === 0 ? 'bg-white' : 'bg-[#FFFDF9]'}`}>
                  <span className="text-stone-700">
                    {log.action.includes('قبول') || log.action.includes('Accepted') ? '✅'
                     : log.action.includes('رفض') || log.action.includes('Rejected') ? '❌'
                     : log.action.includes('إغلاق') || log.action.includes('closed') ? '🔒'
                     : log.action.includes('فتح') || log.action.includes('reopened') ? '🔓'
                     : log.action.includes('تقييم') || log.action.includes('Rated') ? '⭐'
                     : log.action.includes('نسخ') || log.action.includes('Duplicated') ? '⊕'
                     : '📋'}{' '}
                    {lang === 'ar' ? log.action : log.actionEn}
                  </span>
                  <span className="text-stone-400 whitespace-nowrap me-4">
                    {new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RATING MODAL */}
      {showRatingModal && ratingQuote && (
        <RatingModal lang={lang} supplierCompany={ratingQuote.supplierCompany}
          onSubmit={handleSubmitRating}
          onSkip={() => { setShowRatingModal(false); setRatingQuote(null); }} />
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center cursor-zoom-out print:hidden" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'} className="absolute top-5 start-5 bg-red-500 text-white px-4 py-2 rounded-lg font-bold">✕</button>
        </div>
      )}

    </div>
  );
}
