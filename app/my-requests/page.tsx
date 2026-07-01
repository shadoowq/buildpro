'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import RequestDetailModal from '../components/RequestDetailModal';
import RatingModal from '../components/RatingModal';
import { displayVal, appendActivityLog, setQuoteStatus, softDeleteRequest, softDeleteRequests } from '../lib/requestHelpers';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

function ReqIdParamReader({ onFound }: { onFound: (id: number) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const reqId = searchParams.get('reqId');
    if (reqId) onFound(Number(reqId));
  }, [searchParams, onFound]);
  return null;
}

type Lang = 'ar' | 'en';
type ViewMode = 'table' | 'cards' | 'kanban' | 'projects';
type FilterMode = 'all' | 'open' | 'closed';
type QuotesFilter = 'all' | 'with' | 'without';
type SortBy = 'newest' | 'oldest' | 'mostQuotes';

interface Quote {
  id: number; requestId: number; supplierId: string;
  supplierName: string; supplierCompany: string;
  totalPrice: number; deliveryDays: number; description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
  revisionNote?: string; createdAt: string;
}
type KanbanCol = 'active' | 'awaiting' | 'closed';
interface Request {
  id: number; contractorId: string;
  projectName?: string;
  kanbanColumn?: KanbanCol;
  ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  materials?: any[]; location: string; deadline: string;
  budget: number; description: string;
  status: 'open' | 'closed' | 'completed'; createdAt: string;
}
interface ActivityLog { id: number; requestId: number; action: string; actionEn: string; timestamp: string; }
interface Rating { id: number; requestId: number; supplierId: string; supplierCompany: string; rating: number; comment: string; createdAt: string; }

const T = {
  myRequests:   { ar: 'طلباتي',            en: 'My Requests'        },
  newRequest:   { ar: '+ طلب جديد',        en: '+ New Request'      },
  search:       { ar: 'ابحث عن طلب...',    en: 'Search requests...' },
  filterAll:    { ar: 'الكل',              en: 'All'                },
  filterOpen:   { ar: 'مفتوح',             en: 'Open'               },
  filterClosed: { ar: 'مغلق',              en: 'Closed'             },
  viewTable:    { ar: 'جدول',              en: 'Table'              },
  viewCards:    { ar: 'كروت',              en: 'Cards'              },
  viewKanban:   { ar: 'مسارات',            en: 'Board'              },
  viewProjects: { ar: 'مشاريع',            en: 'Projects'           },
  noRequests:   { ar: 'لا توجد طلبات',     en: 'No requests'        },
  createNow:    { ar: 'إنشاء طلب الآن',    en: 'Create Request Now' },
  reqId:        { ar: 'رقم الطلب',         en: 'Request ID'         },
  name:         { ar: 'الطلب',             en: 'Request'            },
  status:       { ar: 'الحالة',            en: 'Status'             },
  quotes:       { ar: 'عروض',              en: 'Quotes'             },
  location:     { ar: 'المدينة',           en: 'City'               },
  deadline:     { ar: 'الموعد',            en: 'Deadline'           },
  open:         { ar: 'مفتوح',             en: 'Open'               },
  closed:       { ar: 'مغلق',              en: 'Closed'             },
  active:       { ar: 'نشط',               en: 'Active'             },
  pending:      { ar: 'انتظار',            en: 'Pending'            },
  view:         { ar: 'عرض',              en: 'View'               },
  edit:         { ar: 'تعديل',             en: 'Edit'               },
  newQuote:     { ar: 'جديد',              en: 'new'                },
  newQuotes:    { ar: 'عرض جديد',          en: 'new quotes'         },
  kanbanActive: { ar: 'نشطة',              en: 'Active'             },
  kanbanPend:   { ar: 'بانتظار عروض',      en: 'Awaiting Quotes'    },
  kanbanClosed: { ar: 'مغلقة',             en: 'Closed'             },
  compare:      { ar: 'مقارنة',            en: 'Compare'            },
  thisMonth:    { ar: '+3 هذا الشهر',      en: '+3 this month'      },
  unread:       { ar: 'غير مقروءة',        en: 'unread'             },
  activeReqs:   { ar: 'طلبات نشطة',        en: 'Active Requests'    },
  incomingQ:    { ar: 'عروض واردة',        en: 'Incoming Quotes'    },
  closedReqs:   { ar: 'طلبات مغلقة',       en: 'Closed Requests'    },
  totalReqs:    { ar: 'إجمالي الطلبات',    en: 'Total Requests'     },
  // Detail modal
  reqDetails:   { ar: 'تفاصيل الطلب',     en: 'Request Details'    },
  materials:    { ar: 'المواد المطلوبة',   en: 'Required Materials' },
  matType:      { ar: 'نوع المادة',        en: 'Material'           },
  usage:        { ar: 'الاستخدام',         en: 'Usage'              },
  size:         { ar: 'المقاس',            en: 'Size'               },
  thickness:    { ar: 'السماكة',           en: 'Thickness'          },
  finish:       { ar: 'الفنش',             en: 'Finish'             },
  color:        { ar: 'اللون',             en: 'Color'              },
  qty:          { ar: 'الكمية',            en: 'Qty'                },
  targetPrice:  { ar: 'السعر المستهدف',    en: 'Target Price'       },
  origin:       { ar: 'الصناعة',           en: 'Origin'             },
  deliveryDate: { ar: 'تاريخ التوريد',     en: 'Delivery Date'      },
  note:         { ar: 'وصف البند',         en: 'Note'               },
  images:       { ar: 'الصور',             en: 'Images'             },
  description:  { ar: 'الوصف',             en: 'Description'        },
  quotesSection:{ ar: 'عروض الأسعار',      en: 'Quotes'             },
  noQuotes:     { ar: 'لا توجد عروض بعد', en: 'No quotes yet'      },
  activityLog:  { ar: 'تاريخ النشاط',      en: 'Activity History'   },
  accept:       { ar: 'قبول',              en: 'Accept'             },
  reject:       { ar: 'رفض',              en: 'Reject'             },
  revision:     { ar: 'طلب تعديل',         en: 'Request Revision'   },
  undoDecision: { ar: 'إلغاء القرار',      en: 'Undo Decision'      },
  accepted:     { ar: 'مقبول',             en: 'Accepted'           },
  rejected:     { ar: 'مرفوض',            en: 'Rejected'           },
  revisionReq:  { ar: 'طلب تعديل',         en: 'Revision Requested' },
  pendingQ:     { ar: 'قيد الانتظار',      en: 'Pending'            },
  contact:      { ar: 'بيانات التواصل:',   en: 'Contact Info:'      },
  nameL:        { ar: 'الاسم:',            en: 'Name:'              },
  companyL:     { ar: 'الشركة:',           en: 'Company:'           },
  phoneL:       { ar: 'التليفون:',         en: 'Phone:'             },
  emailL:       { ar: 'الإيميل:',          en: 'Email:'             },
  na:           { ar: 'غير متوفر',         en: 'N/A'                },
  revNoteLabel: { ar: 'ملاحظة التعديل:',   en: 'Revision Note:'     },
  writeRevNote: { ar: 'اكتب ملاحظة التعديل:', en: 'Write revision note:' },
  revPlaceholder:{ ar: 'مثال: أريد سعر أقل أو توريد أسرع...', en: 'Ex: Need lower price or faster delivery...' },
  sendRevision: { ar: 'إرسال التعديل',     en: 'Send Revision'      },
  cancel:       { ar: 'إلغاء',             en: 'Cancel'             },
  closeModal:   { ar: 'إغلاق',             en: 'Close'              },
  openReq:      { ar: 'فتح الطلب',         en: 'Open Request'       },
  closeReq:     { ar: 'إغلاق الطلب',       en: 'Close Request'      },
  deleteReq:    { ar: 'حذف الطلب',         en: 'Delete Request'     },
  editReq:      { ar: 'تعديل',             en: 'Edit'               },
  confirmDelete:{ ar: 'هل أنت متأكد من حذف هذا الطلب؟', en: 'Are you sure you want to delete this request?' },
  // Compare
  compareTitle: { ar: 'مقارنة العروض',     en: 'Compare Quotes'     },
  supplier:     { ar: 'المورد',            en: 'Supplier'           },
  price:        { ar: 'السعر',             en: 'Price'              },
  delivery:     { ar: 'مدة التوريد',       en: 'Delivery'           },
  notesL:       { ar: 'ملاحظات',           en: 'Notes'              },
  action:       { ar: 'إجراء',             en: 'Action'             },
  cheapest:     { ar: 'الأرخص',           en: 'Cheapest'           },
  fastest:      { ar: 'الأسرع',           en: 'Fastest'            },
  undo:         { ar: 'إلغاء',             en: 'Undo'               },
  summary:      { ar: 'ملخص المقارنة:',    en: 'Comparison Summary:'},
  lowestP:      { ar: 'أقل سعر:',         en: 'Lowest Price:'      },
  fastestD:     { ar: 'أسرع توريد:',      en: 'Fastest Delivery:'  },
  totalQ:       { ar: 'عدد العروض:',       en: 'Total Quotes:'      },
  days:         { ar: 'يوم',              en: 'days'               },
  sar:          { ar: 'ر.س',              en: 'SAR'                },
  // Rating
  rateSupplier: { ar: 'قيّم المورد',       en: 'Rate Supplier'      },
  rateExp:      { ar: 'كيف كانت تجربتك مع', en: 'How was your experience with' },
  rateComments: { ar: 'ملاحظات (اختياري)', en: 'Comments (Optional)' },
  rateWrite:    { ar: 'اكتب تجربتك مع المورد...', en: 'Write your experience...' },
  submitRating: { ar: 'إرسال التقييم',     en: 'Submit Rating'      },
  skip:         { ar: 'تخطي',             en: 'Skip'               },
  poor:         { ar: 'سيء',              en: 'Poor'               },
  fair:         { ar: 'مقبول',            en: 'Fair'               },
  good:         { ar: 'جيد',             en: 'Good'               },
  vgood:        { ar: 'جيد جداً',         en: 'Very Good'          },
  excellent:    { ar: 'ممتاز',            en: 'Excellent'          },
  selectRating: { ar: 'من فضلك اختار تقييم', en: 'Please select a rating' },
  rated:        { ar: 'تم التقييم',        en: 'Rated'              },
  // Notifications
  newQuoteBanner:{ ar: (n: number) => `عندك ${n} عرض سعر جديد على طلباتك`, en: (n: number) => `You have ${n} new quote(s) on your requests` },
  // Bulk & multi-select
  selectAll:     { ar: 'تحديد الكل',       en: 'Select All'            },
  deselectAll:   { ar: 'إلغاء التحديد',    en: 'Deselect All'          },
  selected:      { ar: (n: number) => `تم تحديد ${n} طلب`, en: (n: number) => `${n} selected` },
  deleteSelected:{ ar: 'حذف المحدد',       en: 'Delete Selected'       },
  closeSelected: { ar: 'إغلاق المحدد',     en: 'Close Selected'        },
  openSelected:  { ar: 'فتح المحدد',       en: 'Open Selected'         },
  moveSelected:  { ar: 'نقل المحدد إلى',   en: 'Move Selected to'      },
  delete:        { ar: 'حذف',              en: 'Delete'                },
  dropHere:      { ar: 'اسحب هنا',         en: 'Drop here'             },
  // Move menu
  moveTo:        { ar: 'نقل إلى',          en: 'Move to'               },
  moveActive:    { ar: 'نشطة',             en: 'Active'                },
  moveAwaiting:  { ar: 'بانتظار عروض',     en: 'Awaiting'              },
  moveClosed:    { ar: 'مغلقة',            en: 'Closed'                },
  // Filters
  filterLabel:   { ar: 'فلاتر',            en: 'Filters'               },
  allCities:     { ar: 'كل المدن',         en: 'All Cities'            },
  withQuotes:    { ar: 'لديها عروض',       en: 'With Quotes'           },
  noQuotes2:     { ar: 'بدون عروض',        en: 'No Quotes'             },
  allItems:      { ar: 'الكل',             en: 'All'                   },
  sortLabel:     { ar: 'ترتيب:',           en: 'Sort:'                 },
  sortNewest:    { ar: 'الأحدث',           en: 'Newest'                },
  sortOldest:    { ar: 'الأقدم',           en: 'Oldest'                },
  sortMostQ:     { ar: 'الأكثر عروضاً',   en: 'Most Quotes'           },
  resetFilters:  { ar: 'إعادة تعيين',      en: 'Reset'                 },
  // Projects
  myProjects:    { ar: 'مشاريعي',          en: 'My Projects'           },
  noProject:     { ar: 'بدون مشروع',       en: 'No Project'            },
  projReqs:      { ar: (n: number) => `${n} طلب`, en: (n: number) => `${n} requests` },
  projQuotes:    { ar: (n: number) => `${n} عرض`,  en: (n: number) => `${n} quotes`  },
  viewProj:      { ar: 'عرض المشروع',      en: 'View Project'          },
  backToAll:     { ar: '← كل الطلبات',     en: '← All Requests'        },
};

function t(key: keyof typeof T, lang: Lang, arg?: number): string {
  const entry = T[key];
  if (!entry) return key;
  const val = (entry as any)[lang];
  if (typeof val === 'function') return val(arg ?? 0);
  return val;
}

function StatusPill({ status, hasQuotes, lang }: { status: string; hasQuotes: boolean; lang: Lang }) {
  if (status === 'closed') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />{t('closed', lang)}
    </span>
  );
  if (hasQuotes) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t('active', lang)}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />{t('pending', lang)}
    </span>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
      {(['ar', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[#C0603E] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
          <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="20" height="14" alt={l} className="rounded-sm" />
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function MyRequests() {
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [lang, setLang] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [revisionQuoteId, setRevisionQuoteId] = useState<number | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [compareRequest, setCompareRequest] = useState<Request | null>(null);
  const [seenQuotes, setSeenQuotes] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingRequest, setRatingRequest] = useState<Request | null>(null);
  const [ratingQuote, setRatingQuote] = useState<Quote | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanCol | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [quotesFilter, setQuotesFilter] = useState<QuotesFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [moveMenuId, setMoveMenuId] = useState<number | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [pendingReqId, setPendingReqId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType === 'supplier') { router.push('/supplier-requests'); return; }
    setUser(parsedUser);
    if (parsedUser.name) setUserName(parsedUser.name);

    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    setRequests(allRequests.filter((req: Request) => req.contractorId === parsedUser.email));
    setQuotes(JSON.parse(localStorage.getItem('quotes') || '[]'));
    setSeenQuotes(JSON.parse(localStorage.getItem(`seenQuotes_${parsedUser.email}`) || '[]'));
    setActivityLogs(JSON.parse(localStorage.getItem('activityLogs') || '[]'));
    setRatings(JSON.parse(localStorage.getItem('ratings') || '[]'));

    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const interval = setInterval(() => {
      const nl = localStorage.getItem('language') as Lang || 'ar';
      setLang(prev => prev !== nl ? nl : prev);
    }, 100);
    return () => clearInterval(interval);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  /* ── helpers ── */
  const addActivityLog = (requestId: number, action: string, actionEn: string) => {
    setActivityLogs(appendActivityLog(requestId, action, actionEn));
  };
  const getRequestLogs = (id: number) =>
    activityLogs.filter(l => l.requestId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const getRequestRating = (id: number) => ratings.find(r => r.requestId === id) || null;
  const getNewQuotesCount = () => {
    const ids = requests.map(r => r.id);
    return quotes.filter(q => ids.includes(q.requestId) && q.status === 'pending' && !seenQuotes.includes(q.id)).length;
  };
  const getRequestNewQuotes = (id: number) =>
    quotes.filter(q => q.requestId === id && q.status === 'pending' && !seenQuotes.includes(q.id)).length;
  const markRequestQuotesAsSeen = (id: number) => {
    const ids = quotes.filter(q => q.requestId === id).map(q => q.id);
    const newSeen = [...new Set([...seenQuotes, ...ids])];
    setSeenQuotes(newSeen);
    if (user) localStorage.setItem(`seenQuotes_${user.email}`, JSON.stringify(newSeen));
  };
  const getRequestQuotes = (id: number) => quotes.filter(q => q.requestId === id);
  const getLowestPrice = (qs: Quote[]) => qs.length === 0 ? null : Math.min(...qs.map(q => q.totalPrice));
  const getFastestDelivery = (qs: Quote[]) => qs.length === 0 ? null : Math.min(...qs.map(q => q.deliveryDays));
  const getRequestName = (req: Request) => {
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials && req.materials.length > 0) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length > 0) return types.map(tp => displayVal(tp as string, lang)).join(' — ');
    }
    const parts: string[] = [];
    if (req.ceramic > 0) parts.push(`${lang === 'ar' ? 'سيراميك' : 'Ceramic'} ${req.ceramic}m²`);
    if (req.porcelain > 0) parts.push(`${lang === 'ar' ? 'بورسلان' : 'Porcelain'} ${req.porcelain}m²`);
    if (req.marble > 0) parts.push(`${lang === 'ar' ? 'رخام' : 'Marble'} ${req.marble}m²`);
    if (req.granite > 0) parts.push(`${lang === 'ar' ? 'جرانيت' : 'Granite'} ${req.granite}m²`);
    if (req.terrazzo > 0) parts.push(`${lang === 'ar' ? 'تيرازو' : 'Terrazzo'} ${req.terrazzo}m²`);
    return parts.join(' — ') || `#${String(req.id).slice(-4)}`;
  };
  const getRequestTags = (req: Request): string[] => {
    if (req.materials && req.materials.length > 0)
      return [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))].map(tp => displayVal(tp as string, lang));
    return [
      req.ceramic > 0 ? (lang === 'ar' ? 'سيراميك' : 'Ceramic') : null,
      req.porcelain > 0 ? (lang === 'ar' ? 'بورسلان' : 'Porcelain') : null,
      req.marble > 0 ? (lang === 'ar' ? 'رخام' : 'Marble') : null,
      req.granite > 0 ? (lang === 'ar' ? 'جرانيت' : 'Granite') : null,
      req.terrazzo > 0 ? (lang === 'ar' ? 'تيرازو' : 'Terrazzo') : null,
    ].filter(Boolean) as string[];
  };

  /* ── actions ── */
  const toggleRequestStatus = (requestId: number) => {
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const req = allRequests.find((r: Request) => r.id === requestId);
    const newStatus = req?.status === 'open' ? 'closed' : 'open';
    const updated = allRequests.map((r: Request) => r.id === requestId ? { ...r, status: newStatus, kanbanColumn: newStatus === 'closed' ? 'closed' : undefined } : r);
    localStorage.setItem('requests', JSON.stringify(updated));
    setRequests(updated.filter((r: Request) => r.contractorId === user.email));
    if (newStatus === 'closed') {
      addActivityLog(requestId, 'تم إغلاق الطلب', 'Request closed');
      const acceptedQuote = quotes.find(q => q.requestId === requestId && q.status === 'accepted');
      const alreadyRated = ratings.find(r => r.requestId === requestId);
      if (acceptedQuote && !alreadyRated) {
        setRatingRequest(allRequests.find((r: Request) => r.id === requestId) || null);
        setRatingQuote(acceptedQuote);
        setShowRatingModal(true);
      }
    } else addActivityLog(requestId, 'تم فتح الطلب', 'Request reopened');
  };
  const handleDuplicateRequest = (req: Request) => {
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const newReq = {
      ...req,
      id: Date.now(),
      status: 'open',
      kanbanColumn: undefined,
      createdAt: new Date().toISOString(),
      projectName: req.projectName ? `${req.projectName} (${lang === 'ar' ? 'نسخة' : 'copy'})` : undefined,
    };
    allRequests.push(newReq);
    localStorage.setItem('requests', JSON.stringify(allRequests));
    setRequests(allRequests.filter((r: Request) => r.contractorId === user.email));
    addActivityLog(newReq.id, `تم إنشاء طلب بنسخ طلب #${req.id}`, `Duplicated from request #${req.id}`);
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!(await confirmDialog(t('confirmDelete', lang), { confirmText: t('delete', lang), danger: true }))) return;
    const newAll = softDeleteRequest(requestId) as unknown as Request[];
    setRequests(newAll.filter((req: Request) => req.contractorId === user.email));
    setSelectedRequest(null);
    showToast(lang === 'ar' ? 'تم نقل الطلب لسلة المهملات' : 'Moved to trash');
  };
  const handleQuoteAction = async (quoteId: number, action: 'accepted' | 'rejected' | 'pending') => {
    if (action === 'accepted' || action === 'rejected') {
      const msg = action === 'accepted'
        ? (lang === 'ar' ? 'هل أنت متأكد من قبول هذا العرض؟' : 'Accept this quote?')
        : (lang === 'ar' ? 'هل أنت متأكد من رفض هذا العرض؟' : 'Reject this quote?');
      const confirmText = action === 'accepted' ? (lang === 'ar' ? 'قبول' : 'Accept') : (lang === 'ar' ? 'رفض' : 'Reject');
      if (!(await confirmDialog(msg, { confirmText, danger: action === 'rejected' }))) return;
    }
    const { quotes: updated, quote } = setQuoteStatus(quoteId, action);
    setQuotes(updated);
    if (quote) {
      if (action === 'accepted') addActivityLog(quote.requestId, `تم قبول عرض ${quote.supplierCompany} بسعر ${quote.totalPrice} ر.س`, `Accepted quote from ${quote.supplierCompany} at ${quote.totalPrice} SAR`);
      else if (action === 'rejected') addActivityLog(quote.requestId, `تم رفض عرض ${quote.supplierCompany}`, `Rejected quote from ${quote.supplierCompany}`);
      else addActivityLog(quote.requestId, `تم إلغاء القرار على عرض ${quote.supplierCompany}`, `Undid decision on ${quote.supplierCompany} quote`);
    }
  };
  const handleRevisionSubmit = (quoteId: number) => {
    if (!revisionNote.trim()) { showToast(lang === 'ar' ? 'من فضلك اكتب ملاحظة التعديل' : 'Please write a revision note', 'error'); return; }
    const { quotes: updated, quote } = setQuoteStatus(quoteId, 'revision', revisionNote);
    setQuotes(updated);
    if (quote) addActivityLog(quote.requestId, `تم طلب تعديل على عرض ${quote.supplierCompany}: "${revisionNote}"`, `Requested revision on ${quote.supplierCompany}: "${revisionNote}"`);
    setRevisionQuoteId(null);
    setRevisionNote('');
  };
  const handleSubmitRating = (stars: number, comment: string) => {
    if (!ratingRequest || !ratingQuote) return;
    const allRatings = JSON.parse(localStorage.getItem('ratings') || '[]');
    const newRating: Rating = { id: Date.now(), requestId: ratingRequest.id, supplierId: ratingQuote.supplierId, supplierCompany: ratingQuote.supplierCompany, rating: stars, comment, createdAt: new Date().toISOString() };
    allRatings.push(newRating);
    localStorage.setItem('ratings', JSON.stringify(allRatings));
    setRatings(allRatings);
    addActivityLog(ratingRequest.id, `تم تقييم ${ratingQuote.supplierCompany} بـ ${stars} نجوم`, `Rated ${ratingQuote.supplierCompany} ${stars} stars`);
    setShowRatingModal(false); setRatingRequest(null); setRatingQuote(null);
    showToast(lang === 'ar' ? 'تم إرسال التقييم بنجاح!' : 'Rating submitted successfully!');
  };

  const openRequest = (req: Request) => { setSelectedRequest(req); markRequestQuotesAsSeen(req.id); };

  /* ── deep-link: open a specific request via ?reqId= ── */
  useEffect(() => {
    if (pendingReqId === null || requests.length === 0) return;
    const found = requests.find(r => r.id === pendingReqId);
    if (found) openRequest(found);
    setPendingReqId(null);
    router.replace('/my-requests');
  }, [pendingReqId, requests]);

  /* ── multi-select ── */
  const toggleSelect = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRequests.map(r => r.id)));
  };
  const handleBulkDelete = async () => {
    if (!(await confirmDialog(lang === 'ar' ? `هل أنت متأكد من حذف ${selectedIds.size} طلبات؟` : `Delete ${selectedIds.size} requests?`, { confirmText: t('delete', lang), danger: true }))) return;
    const newAll = softDeleteRequests([...selectedIds]) as unknown as Request[];
    setRequests(newAll.filter((r: Request) => r.contractorId === user.email));
    setSelectedIds(new Set());
    showToast(lang === 'ar' ? 'تم نقل الطلبات لسلة المهملات' : 'Moved to trash');
  };
  const handleBulkSetStatus = (status: 'open' | 'closed') => {
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const updated = allRequests.map((r: Request) => selectedIds.has(r.id) ? { ...r, status, kanbanColumn: status === 'closed' ? 'closed' : undefined } : r);
    localStorage.setItem('requests', JSON.stringify(updated));
    setRequests(updated.filter((r: Request) => r.contractorId === user.email));
    selectedIds.forEach(id => addActivityLog(id, status === 'closed' ? 'تم إغلاق الطلب' : 'تم فتح الطلب', status === 'closed' ? 'Request closed' : 'Request reopened'));
    setSelectedIds(new Set());
  };

  /* ── kanban DnD ── */
  const getKanbanCol = (req: Request): KanbanCol => {
    if (req.kanbanColumn) return req.kanbanColumn;
    if (req.status === 'closed') return 'closed';
    if (getRequestQuotes(req.id).length > 0) return 'active';
    return 'awaiting';
  };
  const handleKanbanDrop = (col: KanbanCol) => {
    if (!draggingId) return;
    const newStatus = col === 'closed' ? 'closed' : 'open';
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const updated = allRequests.map((r: Request) =>
      r.id === draggingId ? { ...r, status: newStatus, kanbanColumn: col } : r
    );
    localStorage.setItem('requests', JSON.stringify(updated));
    setRequests(updated.filter((r: Request) => r.contractorId === user.email));
    addActivityLog(draggingId, `تم نقل الطلب إلى ${T[col === 'active' ? 'kanbanActive' : col === 'awaiting' ? 'kanbanPend' : 'kanbanClosed'].ar}`, `Moved request to ${T[col === 'active' ? 'kanbanActive' : col === 'awaiting' ? 'kanbanPend' : 'kanbanClosed'].en}`);
    setDraggingId(null);
    setDragOverCol(null);
  };

  /* ── move single request to kanban column ── */
  const handleMoveRequest = (reqId: number, col: KanbanCol) => {
    const newStatus = col === 'closed' ? 'closed' : 'open';
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const updated = allRequests.map((r: Request) =>
      r.id === reqId ? { ...r, status: newStatus, kanbanColumn: col } : r
    );
    localStorage.setItem('requests', JSON.stringify(updated));
    setRequests(updated.filter((r: Request) => r.contractorId === user.email));
    addActivityLog(reqId, `تم نقل الطلب إلى ${T[col === 'active' ? 'kanbanActive' : col === 'awaiting' ? 'kanbanPend' : 'kanbanClosed'].ar}`, `Moved request to ${T[col === 'active' ? 'kanbanActive' : col === 'awaiting' ? 'kanbanPend' : 'kanbanClosed'].en}`);
    setMoveMenuId(null);
  };

  /* ── filtered list ── */
  const filteredRequests = requests.filter(req => {
    const matchFilter = filter === 'all' || req.status === filter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || req.location?.toLowerCase().includes(q) || String(req.id).includes(q) || req.description?.toLowerCase().includes(q) || getRequestName(req).toLowerCase().includes(q) || req.projectName?.toLowerCase().includes(q);
    const matchCity = !cityFilter || req.location === cityFilter;
    const reqQuotes = getRequestQuotes(req.id);
    const matchQuotes = quotesFilter === 'all' || (quotesFilter === 'with' && reqQuotes.length > 0) || (quotesFilter === 'without' && reqQuotes.length === 0);
    const matchProject = !projectFilter || (req.projectName?.trim() || '') === projectFilter;
    return matchFilter && matchSearch && matchCity && matchQuotes && matchProject;
  }).sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'mostQuotes') return getRequestQuotes(b.id).length - getRequestQuotes(a.id).length;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  /* ── projects grouped ── */
  const availableCities = [...new Set(requests.map(r => r.location).filter(Boolean))];
  const projectGroups: Record<string, Request[]> = {};
  requests.forEach(req => {
    const key = req.projectName?.trim() || '__none__';
    if (!projectGroups[key]) projectGroups[key] = [];
    projectGroups[key].push(req);
  });

  const stats = {
    total:  requests.length,
    active: requests.filter(r => r.status === 'open' && getRequestQuotes(r.id).length > 0).length,
    quotes: requests.reduce((s, r) => s + getRequestQuotes(r.id).length, 0),
    closed: requests.filter(r => r.status === 'closed').length,
  };
  const newQuotesCount = getNewQuotesCount();

  /* ── table th/td style ── */
  const thCls = 'text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-4 py-2.5 text-right bg-[#FFFDF9] border-b border-[#F1EAE0]';
  const tdCls = 'px-4 py-3 border-b border-[#FAF7F2] text-[13px] text-stone-700';

  if (!user) return <div className="min-h-screen bg-[#F7F2EC] flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>;

  /* ════════════════════════════════════════ RENDER ════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>

      <Suspense fallback={null}>
        <ReqIdParamReader onFound={setPendingReqId} />
      </Suspense>

      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/my-requests" />

      {/* ── HERO ── */}
      <div className="bg-[#C0603E] px-7 pt-6 pb-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <h1 className="text-white text-xl font-bold mb-1">{t('myRequests', lang)}</h1>
            <p className="text-white/50 text-xs">{stats.active} {t('active', lang)} — {stats.quotes} {t('incomingQ', lang)}</p>
          </div>
          <Link href="/create-request"
            className="mb-4 bg-[#8A7B6C] hover:bg-[#6F6255] text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
            <span className="text-base">+</span> {t('newRequest', lang)}
          </Link>
        </div>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {([['all', t('filterAll', lang)], ['open', t('filterOpen', lang)], ['closed', t('filterClosed', lang)]] as [FilterMode, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`text-xs font-medium px-5 py-2.5 border-b-2 transition-colors font-cairo ${filter === val ? 'text-white border-[#8A7B6C]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
              {label} ({val === 'all' ? requests.length : requests.filter(r => r.status === val).length})
            </button>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {[
          { icon: '📋', bg: 'bg-amber-50',   val: stats.total,  label: t('totalReqs', lang),  badge: null },
          { icon: '🔥', bg: 'bg-emerald-50', val: stats.active, label: t('activeReqs', lang), badge: stats.active > 0 ? t('thisMonth', lang) : null },
          { icon: '📥', bg: 'bg-[#F3EAE0]',  val: stats.quotes, label: t('incomingQ', lang),  badge: newQuotesCount > 0 ? `${newQuotesCount} ${t('unread', lang)}` : null },
          { icon: '🔒', bg: 'bg-stone-50',   val: stats.closed, label: t('closedReqs', lang), badge: null },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#E8DFD3] rounded-xl p-4 relative">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
            {s.badge && <span className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{s.badge}</span>}
          </div>
        ))}
      </div>

      {/* ── NEW QUOTES BANNER ── */}
      {newQuotesCount > 0 && (
        <div className="mx-4 md:mx-7 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">🔔</div>
          <p className="text-emerald-800 font-semibold text-sm">{t('newQuoteBanner', lang, newQuotesCount)}</p>
        </div>
      )}

      {/* ── CONTENT AREA ── */}
      <div className="px-4 md:px-7 pb-10">
        {/* project breadcrumb */}
        {projectFilter !== null && (
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setProjectFilter(null)}
              className="text-xs font-semibold text-[#8A7B6C] hover:text-[#C0603E] underline">
              {t('backToAll', lang)}
            </button>
            <span className="text-stone-300">›</span>
            <span className="text-xs font-bold text-stone-700">
              {projectFilter === '__none__' ? t('noProject', lang) : projectFilter}
            </span>
          </div>
        )}

        {/* search + view toggle */}
        <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F1EAE0] flex-wrap">
            {/* search */}
            <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#E8DFD3] rounded-lg px-3 py-1.5 w-56">
              <span className="text-stone-300 text-sm">🔍</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('search', lang)}
                className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-stone-300 text-stone-700" />
            </div>

            {/* تحديد الكل */}
            {viewMode !== 'projects' && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox"
                  checked={filteredRequests.length > 0 && selectedIds.size === filteredRequests.length}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-stone-300 accent-[#8A7B6C] cursor-pointer" />
                <span className="text-xs font-semibold text-stone-600">{t('selectAll', lang)}</span>
              </label>
            )}

            {/* filters toggle */}
            <button onClick={() => setShowFilters(p => !p)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${showFilters ? 'bg-[#F3EAE0] border-[#8A7B6C] text-[#C0603E]' : 'border-[#E8DFD3] text-stone-500 hover:bg-stone-50'}`}>
              ⚙ {t('filterLabel', lang)}
              {(cityFilter || quotesFilter !== 'all' || sortBy !== 'newest') && (
                <span className="w-2 h-2 bg-[#8A7B6C] rounded-full" />
              )}
            </button>

            {/* view mode toggle */}
            <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 mr-auto">
              {([
                { mode: 'table'    as ViewMode, icon: '☰', labelAr: 'جدول',   labelEn: 'Table'    },
                { mode: 'cards'    as ViewMode, icon: '⊞', labelAr: 'كروت',   labelEn: 'Cards'    },
                { mode: 'kanban'   as ViewMode, icon: '⣿', labelAr: 'مسارات', labelEn: 'Board'    },
                { mode: 'projects' as ViewMode, icon: '📁', labelAr: 'مشاريع', labelEn: 'Projects' },
              ]).map(v => (
                <button key={v.mode} onClick={() => { setViewMode(v.mode); setSelectedIds(new Set()); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === v.mode ? 'bg-white text-[#C0603E] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                  <span className="text-sm">{v.icon}</span>
                  {lang === 'ar' ? v.labelAr : v.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* ── FILTER ROW ── */}
          {showFilters && (
            <div className="flex items-center gap-4 px-5 py-3 bg-[#FAF7F2] border-b border-[#F1EAE0] flex-wrap">
              {/* city */}
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                className="text-xs font-semibold border border-[#E8DFD3] rounded-lg px-3 py-1.5 bg-white text-stone-700 outline-none cursor-pointer">
                <option value="">{t('allCities', lang)}</option>
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* quotes */}
              <div className="flex items-center gap-1 bg-white border border-[#E8DFD3] rounded-lg p-0.5">
                {([['all', t('allItems', lang)], ['with', t('withQuotes', lang)], ['without', t('noQuotes2', lang)]] as [QuotesFilter, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setQuotesFilter(v)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${quotesFilter === v ? 'bg-[#C0603E] text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {/* sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-semibold">{t('sortLabel', lang)}</span>
                <div className="flex items-center gap-1 bg-white border border-[#E8DFD3] rounded-lg p-0.5">
                  {([['newest', t('sortNewest', lang)], ['oldest', t('sortOldest', lang)], ['mostQuotes', t('sortMostQ', lang)]] as [SortBy, string][]).map(([v, l]) => (
                    <button key={v} onClick={() => setSortBy(v)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${sortBy === v ? 'bg-[#8A7B6C] text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {/* reset */}
              {(cityFilter || quotesFilter !== 'all' || sortBy !== 'newest') && (
                <button onClick={() => { setCityFilter(''); setQuotesFilter('all'); setSortBy('newest'); }}
                  className="text-xs text-red-500 font-semibold hover:text-red-700 underline">
                  {t('resetFilters', lang)}
                </button>
              )}
            </div>
          )}

          {/* ── BULK ACTION BAR ── */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-[#F3EAE0] border-b border-[#D9CFC2] flex-wrap">
              <span className="text-xs font-bold text-[#C0603E]">{t('selected', lang, selectedIds.size)}</span>
              <div className="flex gap-1.5 flex-wrap mr-2">
                <button onClick={handleBulkDelete}
                  className="text-xs font-semibold px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1">
                  🗑 {t('deleteSelected', lang)}
                </button>
                <button onClick={() => handleBulkSetStatus('closed')}
                  className="text-xs font-semibold px-3 py-1.5 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition-colors">
                  🔒 {t('closeSelected', lang)}
                </button>
                <button onClick={() => handleBulkSetStatus('open')}
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                  🔓 {t('openSelected', lang)}
                </button>
                {/* نقل جماعي */}
                <span className="flex items-center gap-1">
                  <span className="text-xs text-stone-500 font-semibold">{t('moveSelected', lang)}</span>
                  {([
                    { col: 'active'   as KanbanCol, labelAr: 'نشطة',          labelEn: 'Active',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
                    { col: 'awaiting' as KanbanCol, labelAr: 'بانتظار عروض', labelEn: 'Awaiting', cls: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
                    { col: 'closed'   as KanbanCol, labelAr: 'مغلقة',         labelEn: 'Closed',   cls: 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200' },
                  ]).map(m => (
                    <button key={m.col}
                      onClick={() => { [...selectedIds].forEach(id => handleMoveRequest(id, m.col)); setSelectedIds(new Set()); }}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${m.cls}`}>
                      {lang === 'ar' ? m.labelAr : m.labelEn}
                    </button>
                  ))}
                </span>
              </div>
              <button onClick={() => setSelectedIds(new Set())}
                className="text-xs text-stone-500 hover:text-stone-700 underline mr-auto">
                {t('deselectAll', lang)}
              </button>
            </div>
          )}

          {/* ═══ TABLE VIEW ═══ */}
          {viewMode === 'table' && (
            filteredRequests.length === 0 ? (
              <EmptyState lang={lang} />
            ) : (
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '36px' }} />
                  <col style={{ width: '80px' }} />
                  <col />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '56px' }} />
                  <col style={{ width: '96px' }} />
                  <col style={{ width: '96px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={thCls} style={{ textAlign: 'center', padding: '8px 6px' }}>□</th>
                    {[t('reqId',lang), t('name',lang), t('status',lang), t('quotes',lang), t('location',lang), t('deadline',lang), ''].map((h, i) => (
                      <th key={i} className={thCls} style={i === 3 ? { textAlign: 'center' } : {}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(req => {
                    const rq = getRequestQuotes(req.id);
                    const nq = getRequestNewQuotes(req.id);
                    const isSelected = selectedIds.has(req.id);
                    return (
                      <tr key={req.id}
                        className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#F3EAE0]' : 'hover:bg-[#FFFDF9]'}`}
                        onClick={() => openRequest(req)}>
                        <td className={tdCls} style={{ padding: '8px 6px', textAlign: 'center' }} onClick={e => toggleSelect(req.id, e)}>
                          <input type="checkbox" checked={isSelected} onChange={() => {}}
                            className="w-3.5 h-3.5 rounded border-stone-300 accent-[#8A7B6C] cursor-pointer" />
                        </td>
                        <td className={tdCls}>
                          <span className="text-[10px] text-[#8A7B6C] font-semibold font-mono">{req.id}</span>
                        </td>
                        <td className={tdCls}>
                          <div className="text-[13px] font-semibold text-stone-900 truncate">{getRequestName(req)}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {getRequestTags(req).slice(0, 3).map((tg, i) => (
                              <span key={i} className="text-[10px] bg-[#F3EAE0] text-[#C0603E] px-1.5 py-0.5 rounded font-medium">{tg}</span>
                            ))}
                          </div>
                        </td>
                        <td className={tdCls}><StatusPill status={req.status} hasQuotes={rq.length > 0} lang={lang} /></td>
                        <td className={`${tdCls} text-center`}>
                          <span className={`inline-flex items-center justify-center min-w-[26px] h-[22px] rounded-md text-xs font-bold px-1.5 relative ${rq.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600 border border-stone-200'}`}>
                            {rq.length}
                            {nq > 0 && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">{nq}</span>}
                          </span>
                        </td>
                        <td className={tdCls}><span className="text-xs text-stone-500">📍 {req.location || '—'}</span></td>
                        <td className={tdCls}><span className="text-xs text-stone-600">⏱ {req.deadline || '—'}</span></td>
                        <td className={tdCls} onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => openRequest(req)}
                              className="w-full text-[11px] font-semibold text-[#C0603E] bg-[#F3EAE0] border border-[#E8DFD3] rounded-md px-2 py-1 hover:bg-[#EDE0D2] transition-colors">
                              {t('view', lang)}
                            </button>
                            <button onClick={() => router.push(`/create-request?edit=${req.id}`)}
                              className="w-full text-[11px] font-semibold text-[#8A7B6C] bg-stone-100 border border-stone-200 rounded-md px-2 py-1 hover:bg-stone-200 transition-colors">
                              {t('edit', lang)}
                            </button>
                            <button onClick={() => toggleRequestStatus(req.id)}
                              className={`w-full text-[11px] font-semibold rounded-md px-2 py-1 transition-colors ${req.status === 'open' ? 'bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100'}`}>
                              {req.status === 'open' ? (lang === 'ar' ? 'قفل' : 'Close') : (lang === 'ar' ? 'فتح' : 'Open')}
                            </button>
                            <div className="relative">
                              <button onClick={() => setMoveMenuId(moveMenuId === req.id ? null : req.id)}
                                className="w-full text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-2 py-1 hover:bg-violet-100 transition-colors">
                                {t('moveTo', lang)} ↕
                              </button>
                              {moveMenuId === req.id && (
                                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E8DFD3] rounded-xl shadow-lg overflow-hidden">
                                  {([
                                    { col: 'active'   as KanbanCol, ar: 'نشطة',         en: 'Active',   cls: 'hover:bg-emerald-50 text-emerald-700' },
                                    { col: 'awaiting' as KanbanCol, ar: 'بانتظار عروض', en: 'Awaiting', cls: 'hover:bg-orange-50 text-orange-700'  },
                                    { col: 'closed'   as KanbanCol, ar: 'مغلقة',        en: 'Closed',   cls: 'hover:bg-stone-100 text-stone-600'   },
                                  ]).map(m => (
                                    <button key={m.col} onClick={() => handleMoveRequest(req.id, m.col)}
                                      className={`w-full text-right px-3 py-1.5 text-[11px] font-semibold transition-colors ${m.cls}`}>
                                      {lang === 'ar' ? m.ar : m.en}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button onClick={() => handleDuplicateRequest(req)}
                              className="w-full text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-2 py-1 hover:bg-violet-100 transition-colors">
                              {lang === 'ar' ? 'نسخ' : 'Copy'}
                            </button>
                            <a href={`/print/request/${req.id}`} target="_blank"
                              className="w-full text-[11px] font-semibold text-stone-600 bg-stone-50 border border-stone-200 rounded-md px-2 py-1 hover:bg-stone-100 transition-colors text-center block">
                              🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
                            </a>
                            <button onClick={() => handleDeleteRequest(req.id)}
                              className="w-full text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1 hover:bg-red-100 transition-colors">
                              {t('delete', lang)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}

          {/* ═══ CARDS VIEW ═══ */}
          {viewMode === 'cards' && (
            filteredRequests.length === 0 ? <EmptyState lang={lang} /> : (
              <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredRequests.map(req => {
                  const rq = getRequestQuotes(req.id);
                  const nq = getRequestNewQuotes(req.id);
                  const rating = getRequestRating(req.id);
                  const isClosed = req.status === 'closed';
                  return (
                    <div key={req.id}
                      className={`border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md group relative ${selectedIds.has(req.id) ? 'border-[#8A7B6C] bg-[#F0FAFC]' : isClosed ? 'border-stone-200 bg-stone-50' : nq > 0 ? 'border-emerald-300 bg-white shadow-sm' : 'border-[#E8DFD3] bg-white'}`}
                      onClick={() => openRequest(req)}>
                      {/* select checkbox */}
                      <span className="absolute top-2.5 left-2.5 z-10" onClick={e => toggleSelect(req.id, e)}>
                        <input type="checkbox" checked={selectedIds.has(req.id)} onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-stone-300 accent-[#8A7B6C] cursor-pointer" />
                      </span>
                      {nq > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {nq}
                        </span>
                      )}
                      {/* card header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-[10px] text-[#8A7B6C] font-semibold font-mono">#{req.id}</span>
                          <p className="text-[13px] font-bold text-stone-900 mt-0.5 leading-tight line-clamp-2">{getRequestName(req)}</p>
                        </div>
                        <StatusPill status={req.status} hasQuotes={rq.length > 0} lang={lang} />
                      </div>
                      {/* tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {getRequestTags(req).slice(0, 4).map((tg, i) => (
                          <span key={i} className="text-[10px] bg-[#F3EAE0] text-[#C0603E] px-1.5 py-0.5 rounded font-medium">{tg}</span>
                        ))}
                      </div>
                      {/* info row */}
                      <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
                        {req.location && <span>📍 {req.location}</span>}
                        {req.deadline && <span>⏱ {req.deadline}</span>}
                      </div>
                      {/* quotes bar */}
                      <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${rq.length > 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-stone-50 border border-stone-100'}`}>
                        <span className={`text-xs font-bold ${rq.length > 0 ? 'text-emerald-700' : 'text-stone-400'}`}>
                          {rq.length} {t('quotes', lang)}
                        </span>
                        {nq > 0 && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">{nq} {t('newQuote', lang)}</span>}
                      </div>
                      {/* rating */}
                      {rating && (
                        <div className="mt-2 text-center">
                          <span className="text-amber-400 text-sm">{'★'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}</span>
                        </div>
                      )}
                      {/* actions row 1: عرض | تعديل */}
                      <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
                        <button onClick={e => { e.stopPropagation(); openRequest(req); }}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[#F3EAE0] text-[#C0603E] border border-[#E8DFD3] hover:bg-[#EDE0D2] transition-colors">
                          {t('view', lang)}
                        </button>
                        <button onClick={e => { e.stopPropagation(); router.push(`/create-request?edit=${req.id}`); }}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-stone-100 text-[#8A7B6C] border border-stone-200 hover:bg-stone-200 transition-colors">
                          {t('edit', lang)}
                        </button>
                      </div>
                      {/* actions row 2: فتح/قفل | حذف */}
                      <div className="flex gap-1.5 mt-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={e => { e.stopPropagation(); toggleRequestStatus(req.id); }}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${isClosed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}>
                          {isClosed ? (lang === 'ar' ? 'فتح' : 'Open') : (lang === 'ar' ? 'قفل' : 'Close')}
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteRequest(req.id); }}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors">
                          {t('delete', lang)}
                        </button>
                      </div>
                      {/* actions row 3: نقل | مقارنة */}
                      <div className="flex gap-1.5 mt-1.5 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={e => { e.stopPropagation(); setMoveMenuId(moveMenuId === req.id ? null : req.id); }}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-colors">
                          {t('moveTo', lang)} ↕
                        </button>
                        {rq.length > 1 && (
                          <button onClick={e => { e.stopPropagation(); setCompareRequest(req); }}
                            className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">
                            {t('compare', lang)}
                          </button>
                        )}
                        {moveMenuId === req.id && (
                          <div className="absolute z-20 bottom-full mb-1 left-0 bg-white border border-[#E8DFD3] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                            {([
                              { col: 'active'   as KanbanCol, ar: 'نشطة',         en: 'Active',   cls: 'hover:bg-emerald-50 text-emerald-700' },
                              { col: 'awaiting' as KanbanCol, ar: 'بانتظار عروض', en: 'Awaiting', cls: 'hover:bg-orange-50 text-orange-700'  },
                              { col: 'closed'   as KanbanCol, ar: 'مغلقة',        en: 'Closed',   cls: 'hover:bg-stone-100 text-stone-600'   },
                            ]).map(m => (
                              <button key={m.col} onClick={() => handleMoveRequest(req.id, m.col)}
                                className={`w-full text-right px-4 py-2 text-xs font-semibold transition-colors border-b border-stone-50 last:border-0 ${m.cls}`}>
                                {lang === 'ar' ? m.ar : m.en}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* duplicate + print */}
                      <div className="mt-1.5 flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={e => { e.stopPropagation(); handleDuplicateRequest(req); }}
                          className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                          {lang === 'ar' ? '⊕ نسخ' : '⊕ Copy'}
                        </button>
                        <a href={`/print/request/${req.id}`} target="_blank" onClick={e => e.stopPropagation()}
                          className="px-3 text-xs font-semibold py-1.5 rounded-lg bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 transition-colors">
                          🖨
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ═══ KANBAN / مسارات VIEW ═══ */}
          {viewMode === 'kanban' && (
            filteredRequests.length === 0 ? <EmptyState lang={lang} /> : (
              <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {([
                  { col: 'active'   as KanbanCol, title: t('kanbanActive', lang), color: 'emerald', icon: '🔥' },
                  { col: 'awaiting' as KanbanCol, title: t('kanbanPend', lang),   color: 'orange',  icon: '⏳' },
                  { col: 'closed'   as KanbanCol, title: t('kanbanClosed', lang), color: 'slate',   icon: '🔒' },
                ] as {col: KanbanCol; title: string; color: string; icon: string}[]).map(({ col, title, color, icon }) => (
                  <KanbanColumn key={col}
                    col={col} title={title} color={color} icon={icon}
                    requests={filteredRequests.filter(r => getKanbanCol(r) === col)}
                    lang={lang} dragOverCol={dragOverCol} draggingId={draggingId}
                    onOpen={openRequest} onEdit={(id: number) => router.push(`/create-request?edit=${id}`)}
                    onToggle={toggleRequestStatus} onCompare={setCompareRequest}
                    onMove={handleMoveRequest}
                    onDragStart={(id: number) => setDraggingId(id)}
                    onDragOver={(c: KanbanCol) => setDragOverCol(c)}
                    onDrop={() => handleKanbanDrop(col)}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                    onSelect={toggleSelect} selectedIds={selectedIds}
                    getRequestName={getRequestName} getRequestTags={getRequestTags}
                    getRequestQuotes={getRequestQuotes} getRequestNewQuotes={getRequestNewQuotes} />
                ))}
              </div>
            )
          )}

          {/* ═══ PROJECTS VIEW ═══ */}
          {viewMode === 'projects' && (
            Object.keys(projectGroups).length === 0 ? <EmptyState lang={lang} /> : (
              <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(projectGroups)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([key, reqs]) => {
                    const projQuotes = reqs.reduce((s, r) => s + getRequestQuotes(r.id).length, 0);
                    const openCount = reqs.filter(r => r.status === 'open').length;
                    const closedCount = reqs.filter(r => r.status === 'closed').length;
                    const hasNew = reqs.some(r => getRequestNewQuotes(r.id) > 0);
                    return (
                      <div key={key}
                        className={`bg-white border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all relative ${hasNew ? 'border-emerald-300' : 'border-[#E8DFD3]'}`}
                        onClick={() => { setProjectFilter(key); setViewMode('table'); }}>
                        {hasNew && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">!</span>}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-11 h-11 bg-[#F3EAE0] rounded-xl flex items-center justify-center text-xl shrink-0">📁</div>
                          <div>
                            <p className="text-[13px] font-bold text-stone-900 leading-tight">
                              {key === '__none__' ? t('noProject', lang) : key}
                            </p>
                            <p className="text-[11px] text-stone-400 mt-0.5">{t('projReqs', lang, reqs.length)}</p>
                          </div>
                        </div>
                        {/* stats */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-stone-50 rounded-lg px-3 py-2">
                            <p className="text-xs font-bold text-stone-900">{projQuotes}</p>
                            <p className="text-[10px] text-stone-400">{lang === 'ar' ? 'عروض' : 'quotes'}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg px-3 py-2">
                            <p className="text-xs font-bold text-emerald-700">{openCount}</p>
                            <p className="text-[10px] text-emerald-500">{lang === 'ar' ? 'مفتوح' : 'open'}</p>
                          </div>
                        </div>
                        {/* request name tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {reqs.slice(0, 3).map(r => (
                            <span key={r.id} className="text-[10px] bg-[#F3EAE0] text-[#C0603E] px-2 py-0.5 rounded font-medium truncate max-w-[100px]">
                              {getRequestName(r)}
                            </span>
                          ))}
                          {reqs.length > 3 && <span className="text-[10px] text-stone-400 px-1">+{reqs.length - 3}</span>}
                        </div>
                        {/* status bar */}
                        <div className="flex items-center gap-2">
                          {openCount > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {openCount} {lang === 'ar' ? 'نشط' : 'active'}
                            </span>
                          )}
                          {closedCount > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                              {closedCount} {lang === 'ar' ? 'مغلق' : 'closed'}
                            </span>
                          )}
                          <span className="text-[10px] text-[#8A7B6C] font-semibold mr-auto hover:underline">{t('viewProj', lang)} →</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          )}
        </div>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* Rating Modal */}
      {showRatingModal && ratingQuote && (
        <RatingModal lang={lang} supplierCompany={ratingQuote.supplierCompany}
          onSubmit={handleSubmitRating}
          onSkip={() => { setShowRatingModal(false); setRatingRequest(null); setRatingQuote(null); }} />
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/92 z-[9999] flex items-center justify-center cursor-zoom-out" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightboxImg(null)}
            className="absolute top-5 right-5 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm">✕</button>
        </div>
      )}

      {/* Compare Modal */}
      {compareRequest && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={() => setCompareRequest(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" dir={dir} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-stone-900">{t('compareTitle', lang)} — <span className="text-[#8A7B6C]">#{compareRequest.id}</span></h2>
              <button onClick={() => setCompareRequest(null)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-100 text-lg">✕</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#C0603E] text-white">
                    {[t('supplier',lang), t('price',lang), t('delivery',lang), t('status',lang), t('notesL',lang), t('action',lang)].map(h => (
                      <th key={h} className="px-4 py-3 text-right font-semibold text-xs whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getRequestQuotes(compareRequest.id).map((quote, i) => {
                    const lowestP = getLowestPrice(getRequestQuotes(compareRequest.id));
                    const fastestD = getFastestDelivery(getRequestQuotes(compareRequest.id));
                    return (
                      <tr key={quote.id} className={`border-b border-stone-100 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAF7F2]'} ${quote.status === 'accepted' ? '!bg-emerald-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-stone-900 text-sm">{quote.supplierCompany}</p>
                          <p className="text-stone-400 text-xs">{quote.supplierName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-bold text-sm ${quote.totalPrice === lowestP ? 'text-emerald-600' : 'text-stone-900'}`}>{quote.totalPrice?.toLocaleString()} {t('sar', lang)}</p>
                          {quote.totalPrice === lowestP && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{t('cheapest', lang)}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-bold text-sm ${quote.deliveryDays === fastestD ? 'text-[#C0603E]' : 'text-stone-900'}`}>{quote.deliveryDays} {t('days', lang)}</p>
                          {quote.deliveryDays === fastestD && <span className="text-[10px] bg-[#F3EAE0] text-[#C0603E] px-1.5 py-0.5 rounded-full">{t('fastest', lang)}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : quote.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
                            {quote.status === 'accepted' ? t('accepted',lang) : quote.status === 'rejected' ? t('rejected',lang) : t('pendingQ',lang)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500 max-w-[120px]">{quote.description || '—'}</td>
                        <td className="px-4 py-3">
                          {quote.status === 'pending' && (
                            <div className="flex flex-col gap-1">
                              <button onClick={() => { handleQuoteAction(quote.id, 'accepted'); setCompareRequest(null); }}
                                className="text-[11px] font-bold bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600">{t('accept',lang)}</button>
                              <button onClick={() => handleQuoteAction(quote.id, 'rejected')}
                                className="text-[11px] font-bold bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600">{t('reject',lang)}</button>
                            </div>
                          )}
                          {quote.status === 'accepted' && (
                            <button onClick={() => handleQuoteAction(quote.id, 'pending')}
                              className="text-[11px] font-bold bg-stone-200 text-stone-600 px-3 py-1 rounded-lg hover:bg-stone-300">{t('undo',lang)}</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 bg-[#FAF7F2] rounded-xl px-4 py-3 flex gap-6 flex-wrap">
              <span className="text-emerald-600 text-sm font-semibold">✅ {t('lowestP',lang)} {getLowestPrice(getRequestQuotes(compareRequest.id))?.toLocaleString()} {t('sar',lang)}</span>
              <span className="text-[#C0603E] text-sm font-semibold">⚡ {t('fastestD',lang)} {getFastestDelivery(getRequestQuotes(compareRequest.id))} {t('days',lang)}</span>
              <span className="text-stone-500 text-sm">📊 {t('totalQ',lang)} {getRequestQuotes(compareRequest.id).length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          req={selectedRequest} lang={lang} dir={dir}
          quotes={getRequestQuotes(selectedRequest.id)}
          logs={getRequestLogs(selectedRequest.id)}
          revisionQuoteId={revisionQuoteId} revisionNote={revisionNote}
          setRevisionQuoteId={setRevisionQuoteId} setRevisionNote={setRevisionNote}
          onClose={() => setSelectedRequest(null)}
          onToggle={() => { toggleRequestStatus(selectedRequest.id); setSelectedRequest(null); }}
          onDelete={() => handleDeleteRequest(selectedRequest.id)}
          onEdit={() => router.push(`/create-request?edit=${selectedRequest.id}`)}
          onQuoteAction={handleQuoteAction} onRevisionSubmit={handleRevisionSubmit}
          setLightboxImg={setLightboxImg}
        />
      )}
    </div>
  );
}

/* ══════════ SUB-COMPONENTS ══════════ */

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-3xl mb-4">📋</div>
      <h3 className="text-stone-700 font-bold text-base mb-1">{lang === 'ar' ? 'لا توجد طلبات' : 'No requests'}</h3>
      <p className="text-stone-400 text-sm mb-5">{lang === 'ar' ? 'ابدأ بإنشاء طلب تسعير جديد' : 'Start by creating a new pricing request'}</p>
      <Link href="/create-request"
        className="bg-[#C0603E] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#9C4C31] transition-colors">
        {lang === 'ar' ? '+ طلب جديد' : '+ New Request'}
      </Link>
    </div>
  );
}

function KanbanColumn({ col, title, color, icon, requests, lang, dragOverCol, draggingId, onOpen, onEdit, onToggle, onCompare, onMove, onDragStart, onDragOver, onDrop, onDragEnd, onSelect, selectedIds, getRequestName, getRequestTags, getRequestQuotes, getRequestNewQuotes }: any) {
  const [openMoveId, setOpenMoveId] = useState<number | null>(null);
  const colStyles: Record<string, { header: string; dot: string; card: string; dropzone: string }> = {
    emerald: { header: 'bg-emerald-50 border-emerald-200 text-emerald-800', dot: 'bg-emerald-500', card: 'border-emerald-100 hover:border-emerald-300', dropzone: 'border-emerald-400 bg-emerald-50' },
    orange:  { header: 'bg-orange-50 border-orange-200 text-orange-800',   dot: 'bg-orange-400',  card: 'border-orange-100 hover:border-orange-300',  dropzone: 'border-orange-400 bg-orange-50'  },
    slate:   { header: 'bg-stone-100 border-stone-200 text-stone-600',     dot: 'bg-stone-400',   card: 'border-stone-200 hover:border-stone-300',    dropzone: 'border-stone-400 bg-stone-100'   },
  };
  const s = colStyles[color];
  const isDropTarget = dragOverCol === col && draggingId !== null;
  return (
    <div className="flex flex-col gap-2"
      onDragOver={e => { e.preventDefault(); onDragOver(col); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragLeave={() => {}}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${s.header} mb-1`}>
        <span>{icon}</span>
        <span className="text-xs font-bold">{title}</span>
        <span className={`mr-auto text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white ${s.dot}`}>{requests.length}</span>
      </div>
      {/* drop zone placeholder when dragging over */}
      {isDropTarget && (
        <div className={`border-2 border-dashed rounded-xl py-5 text-center text-xs font-semibold transition-all ${s.dropzone}`}>
          {lang === 'ar' ? '↓ اسحب هنا' : '↓ Drop here'}
        </div>
      )}
      {requests.length === 0 && !isDropTarget && (
        <div className="border-2 border-dashed border-stone-200 rounded-xl py-8 text-center text-stone-300 text-xs">—</div>
      )}
      {requests.map((req: Request) => {
        const rq = getRequestQuotes(req.id);
        const nq = getRequestNewQuotes(req.id);
        const isClosed = req.status === 'closed';
        const isDragging = draggingId === req.id;
        return (
          <div key={req.id}
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(req.id); }}
            onDragEnd={onDragEnd}
            className={`bg-white border rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm relative select-none ${isDragging ? 'opacity-40 scale-95' : ''} ${selectedIds?.has(req.id) ? 'border-[#8A7B6C] bg-[#F0FAFC]' : s.card}`}
            onClick={() => !isDragging && onOpen(req)}>
            {/* drag handle + checkbox */}
            <div className="flex items-center justify-between mb-1" onClick={e => e.stopPropagation()}>
              <span className="text-stone-200 text-xs select-none">⠿</span>
              <input type="checkbox" checked={selectedIds?.has(req.id) || false} onChange={() => {}}
                onClick={e => { e.stopPropagation(); onSelect?.(req.id, e); }}
                className="w-3 h-3 rounded border-stone-300 accent-[#8A7B6C] cursor-pointer" />
            </div>
            {nq > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{nq}</span>}
            <span className="text-[10px] text-[#8A7B6C] font-mono font-semibold">#{req.id}</span>
            <p className="text-xs font-bold text-stone-900 mt-0.5 mb-2 line-clamp-2">{getRequestName(req)}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {getRequestTags(req).slice(0, 2).map((tg: string, i: number) => (
                <span key={i} className="text-[9px] bg-[#F3EAE0] text-[#C0603E] px-1.5 py-0.5 rounded">{tg}</span>
              ))}
            </div>
            {req.location && <p className="text-[10px] text-stone-400 mb-1">📍 {req.location}</p>}
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-semibold ${rq.length > 0 ? 'text-emerald-600' : 'text-stone-400'}`}>{rq.length} {lang === 'ar' ? 'عروض' : 'quotes'}</span>
            </div>
            {/* action buttons */}
            <div className="flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
              <button onClick={e => { e.stopPropagation(); onOpen(req); }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F3EAE0] text-[#C0603E] border border-[#E8DFD3] transition-colors hover:bg-[#EDE0D2]">
                {lang === 'ar' ? 'عرض' : 'View'}
              </button>
              <button onClick={e => { e.stopPropagation(); onEdit(req.id); }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-[#8A7B6C] border border-stone-200 transition-colors hover:bg-stone-200">
                {lang === 'ar' ? 'تعديل' : 'Edit'}
              </button>
              <button onClick={e => { e.stopPropagation(); onToggle(req.id); }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${isClosed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                {isClosed ? (lang === 'ar' ? 'فتح' : 'Open') : (lang === 'ar' ? 'قفل' : 'Close')}
              </button>
              {rq.length > 1 && (
                <button onClick={e => { e.stopPropagation(); onCompare(req); }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 transition-colors">
                  {lang === 'ar' ? 'قارن' : 'Compare'}
                </button>
              )}
            </div>
            {/* نقل button + dropdown */}
            {onMove && (
              <div className="relative mt-1" onClick={e => e.stopPropagation()}>
                <button onClick={e => { e.stopPropagation(); setOpenMoveId(openMoveId === req.id ? null : req.id); }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 transition-colors hover:bg-violet-100 w-full text-center">
                  {lang === 'ar' ? 'نقل ↕' : 'Move ↕'}
                </button>
                {openMoveId === req.id && (
                  <div className="absolute z-20 bottom-full mb-1 left-0 bg-white border border-[#E8DFD3] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                    {([
                      { c: 'active'   as KanbanCol, ar: 'نشطة',         en: 'Active',   cls: 'hover:bg-emerald-50 text-emerald-700' },
                      { c: 'awaiting' as KanbanCol, ar: 'بانتظار عروض', en: 'Awaiting', cls: 'hover:bg-orange-50 text-orange-700'  },
                      { c: 'closed'   as KanbanCol, ar: 'مغلقة',        en: 'Closed',   cls: 'hover:bg-stone-100 text-stone-600'   },
                    ]).filter(m => m.c !== col).map(m => (
                      <button key={m.c} onClick={() => { onMove(req.id, m.c); setOpenMoveId(null); }}
                        className={`w-full text-right px-4 py-2 text-[11px] font-semibold transition-colors border-b border-stone-50 last:border-0 ${m.cls}`}>
                        {lang === 'ar' ? m.ar : m.en}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

