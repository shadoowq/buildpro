'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ContractorNav from '../components/ContractorNav'
import RequestDetailModal from '../components/RequestDetailModal'
import RatingModal from '../components/RatingModal'
import { appendActivityLog, setQuoteStatus, softDeleteRequest, displayVal, getUnfinishedAutosave, getDeadlineUrgency, approveQuoteEdit, declineQuoteEdit, isQuoteExpired } from '../lib/requestHelpers'
import HelpTooltip from '../components/HelpTooltip'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { useEscapeKey } from '../components/useEscapeKey'
import {
  getLanguage, setLanguage, getCurrentUser,
  getRequests, setRequests as persistRequests,
  getQuotes, getActivityLogs,
  getRatings, setRatings as persistRatings,
  getRequestDrafts, getUsers, getUserShadow,
  getDismissedAutosaveDraftAt, setDismissedAutosaveDraftAt,
} from '../lib/store'

type Lang = 'ar' | 'en'

type ReqRow = {
  id: string
  name: string
  tags: string[]
  status: 'active' | 'pending' | 'done'
  quotesCount: number
  deadline: string
}

type Supplier = {
  email: string
  initials: string
  name: string
  company: string
  city: string
  stars: number
  quoteCount: number
}

const T = {
  dashboard:    { ar: 'لوحة التحكم',        en: 'Dashboard'           },
  myRequests:   { ar: 'طلباتي',             en: 'My Requests'         },
  quotesNav:    { ar: 'عروض الأسعار',       en: 'Quotes'              },
  suppliers:    { ar: 'الموردون',           en: 'Suppliers'           },
  drafts:       { ar: 'المسودات',           en: 'Drafts'              },
  newRequest:   { ar: 'طلب تسعير جديد',    en: 'New Request'         },
  hello:        { ar: 'أهلاً،',             en: 'Welcome,'            },
  heroSub:      { ar: 'عرض واردة تستحق مراجعتك', en: 'incoming quotes await your review' },
  filterAll:    { ar: 'الكل',               en: 'All'                 },
  filterActive: { ar: 'نشط',               en: 'Active'              },
  filterPend:   { ar: 'في الانتظار',        en: 'Pending'             },
  filterDone:   { ar: 'مغلق',              en: 'Closed'              },
  activeReqs:   { ar: 'طلبات نشطة',         en: 'Active Requests'     },
  incomingQ:    { ar: 'عروض أسعار واردة',   en: 'Incoming Quotes'     },
  lowestPrice:  { ar: 'أقل سعر مستلم',     en: 'Lowest Quote'        },
  savedDrafts:  { ar: 'مسودات محفوظة',      en: 'Saved Drafts'        },
  noLowest:     { ar: 'لا توجد عروض بعد',  en: 'No quotes yet'       },
  sar:          { ar: 'ر.س',               en: 'SAR'                 },
  pricingReqs:  { ar: 'طلبات التسعير',      en: 'Pricing Requests'    },
  search:       { ar: 'ابحث باسم الطلب...', en: 'Search requests...'  },
  addNew:       { ar: '+ طلب جديد',         en: '+ New Request'       },
  reqId:        { ar: 'رقم الطلب',          en: 'Request ID'          },
  reqName:      { ar: 'الطلب',             en: 'Request'             },
  status:       { ar: 'الحالة',             en: 'Status'              },
  quotesCol:    { ar: 'عروض',              en: 'Quotes'              },
  deadline:     { ar: 'الموعد',             en: 'Deadline'            },
  noRequests:   { ar: 'لا توجد طلبات — اضغط على طلب جديد للبداية', en: 'No requests — click New Request to start' },
  view:         { ar: 'عرض',               en: 'View'                },
  edit:         { ar: 'تعديل',             en: 'Edit'                },
  viewAll:      { ar: 'عرض الكل',          en: 'View All'            },
  topSuppliers: { ar: 'أكثر الموردين تفاعلاً', en: 'Top Suppliers'    },
  noSuppliers:  { ar: 'لا يوجد موردون بعد', en: 'No suppliers yet'    },
  monthActivity:{ ar: 'نشاط هذا الشهر',    en: 'This Month'          },
  sentReqs:     { ar: 'طلبات مرسلة',        en: 'Sent Requests'       },
  receivedQ:    { ar: 'عروض مستلمة',        en: 'Received Quotes'     },
  closedDeals:  { ar: 'صفقات مغلقة',        en: 'Closed Deals'        },
  reqDetails:   { ar: 'تفاصيل الطلب',      en: 'Request Details'     },
  materials:    { ar: 'المواد المطلوبة',    en: 'Required Materials'  },
  matType:      { ar: 'نوع المادة',         en: 'Material'            },
  usage:        { ar: 'الاستخدام',          en: 'Usage'               },
  size:         { ar: 'المقاس',             en: 'Size'                },
  thickness:    { ar: 'السماكة',            en: 'Thickness'           },
  finish:       { ar: 'الفنش',             en: 'Finish'              },
  color:        { ar: 'اللون',             en: 'Color'               },
  qty:          { ar: 'الكمية',             en: 'Qty'                 },
  targetPrice:  { ar: 'السعر المستهدف',     en: 'Target Price'        },
  origin:       { ar: 'الصناعة',           en: 'Origin'              },
  deliveryDate: { ar: 'تاريخ التوريد',      en: 'Delivery Date'       },
  itemNote:     { ar: 'وصف البند',          en: 'Note'                },
  images:       { ar: 'الصور',             en: 'Images'              },
  description:  { ar: 'الوصف',             en: 'Description'         },
  quotesSection:{ ar: 'عروض الأسعار',       en: 'Quotes'              },
  noQuotes:     { ar: 'لا توجد عروض أسعار بعد', en: 'No quotes yet'  },
  activityLog:  { ar: 'تاريخ النشاط',       en: 'Activity Log'        },
  close:        { ar: 'إغلاق',             en: 'Close'               },
  closeReq:     { ar: 'إغلاق الطلب',        en: 'Close Request'       },
  openReq:      { ar: 'فتح الطلب',          en: 'Open Request'        },
  delete:       { ar: 'حذف',               en: 'Delete'              },
  open:         { ar: 'مفتوح',             en: 'Open'                },
  closed:       { ar: 'مغلق',              en: 'Closed'              },
  confirmDelete:{ ar: 'هل أنت متأكد من حذف هذا الطلب؟', en: 'Are you sure you want to delete this request?' },
  accepted:     { ar: 'مقبول',             en: 'Accepted'            },
  rejected:     { ar: 'مرفوض',             en: 'Rejected'            },
  pending:      { ar: 'انتظار',            en: 'Pending'             },
  deliveryDays: { ar: 'مدة التوريد:',       en: 'Delivery:'           },
  days:         { ar: 'يوم',               en: 'days'                },
  newQuoteFrom: { ar: (c: string, id: number) => `${c} أرسل عرض سعر على طلب #${id}`, en: (c: string, id: number) => `${c} sent a quote on request #${id}` },
  quoteAccepted:{ ar: (c: string) => `تم قبول عرض ${c}`, en: (c: string) => `Quote from ${c} was accepted` },
  quoteRejected:{ ar: (c: string) => `تم رفض عرض ${c}`, en: (c: string) => `Quote from ${c} was rejected` },
}

function tStr(key: keyof typeof T, lang: Lang, a?: any, b?: any): string {
  const entry = T[key] as any
  const val = entry[lang]
  if (typeof val === 'function') return val(a, b)
  return val
}

function StatusPill({ status, lang }: { status: ReqRow['status']; lang: Lang }) {
  const map = {
    active:  { ar: 'نشط',      en: 'Active',   cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200', dot: 'bg-emerald-500' },
    pending: { ar: 'انتظار',   en: 'Pending',  cls: 'bg-orange-50 text-orange-800 border border-orange-200',   dot: 'bg-orange-400'  },
    done:    { ar: 'مغلق',     en: 'Closed',   cls: 'bg-stone-100 text-stone-600 border border-stone-200',     dot: 'bg-stone-400'   },
  }
  const m = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {lang === 'ar' ? m.ar : m.en}
    </span>
  )
}

function QuotesBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-stone-300 text-xs">—</span>
  return (
    <span className={`inline-flex items-center justify-center min-w-[26px] h-[22px] rounded-md text-xs font-bold px-1.5 ${
      count >= 3 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                 : 'bg-stone-100 text-stone-600 border border-stone-200'
    }`}>{count}</span>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const showToast = useToast()
  const confirmDialog = useConfirm()
  const [lang, setLang]         = useState<Lang>('ar')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'pending' | 'done'>('all')
  const [search, setSearch]     = useState('')
  const [userName, setUserName] = useState('المقاول')
  const [userEmail, setUserEmail] = useState('')

  const [rawRequests, setRawRequests] = useState<any[]>([])
  const [allQuotes, setAllQuotes]     = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [ratings, setRatings]         = useState<any[]>([])
  const [drafts, setDrafts]           = useState<any[]>([])
  const [allUsers, setAllUsers]       = useState<any[]>([])
  const [unfinishedDraft, setUnfinishedDraft] = useState<{ projectName?: string; materials?: any[]; savedAt?: string; hadAttachments?: boolean } | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingQuote, setRatingQuote] = useState<any>(null)

  const [selected, setSelected]   = useState<any>(null)
  const [lightbox, setLightbox]   = useState<string | null>(null)
  useEscapeKey(() => { if (lightbox) setLightbox(null) })
  const [revisionQuoteId, setRevisionQuoteId] = useState<number | null>(null)
  const [revisionNote, setRevisionNote]       = useState('')

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  /* ── load all data ── */
  useEffect(() => {
    setLang(getLanguage())

    const u = getCurrentUser<any>()
    if (u) {
      if (u.name)  setUserName(u.name)
      if (u.email) setUserEmail(u.email)
    }

    setRawRequests(getRequests())
    setAllQuotes(getQuotes())
    setActivityLogs(getActivityLogs())
    setRatings(getRatings())
    setDrafts(getRequestDrafts())
    setAllUsers(getUsers())

    const autosave = getUnfinishedAutosave()
    const dismissedAt = getDismissedAutosaveDraftAt()
    if (autosave && autosave.savedAt !== dismissedAt) setUnfinishedDraft(autosave)
  }, [])

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l) }

  const dismissUnfinishedDraft = () => {
    if (unfinishedDraft?.savedAt) setDismissedAutosaveDraftAt(unfinishedDraft.savedAt)
    setUnfinishedDraft(null)
  }

  const unfinishedDraftName = (() => {
    if (!unfinishedDraft) return ''
    if (unfinishedDraft.projectName?.trim()) return unfinishedDraft.projectName.trim()
    const types = [...new Set((unfinishedDraft.materials || []).map((m: any) => m.type || m.typePending).filter(Boolean))] as string[]
    return types.map(tp => displayVal(tp, lang)).join(lang === 'ar' ? '، ' : ', ')
  })()

  /* ── my requests only ── */
  const myRequests = rawRequests.filter(r => r.contractorId === userEmail)
  const myDrafts   = drafts.filter(d => d.contractorId === userEmail)

  /* ── helpers ── */
  const getReqQuotes   = (id: number) => allQuotes.filter((q: any) => q.requestId === id)
  const getReqLogs     = (id: number) => activityLogs
    .filter((l: any) => l.requestId === id)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const getReqName = (r: any) => {
    if (r.projectName?.trim()) return r.projectName.trim()
    if (r.materials?.length > 0) {
      const types = [...new Set(r.materials.map((m: any) => m.type || m.typePending).filter(Boolean))] as string[]
      if (types.length > 0) return types.map(tp => displayVal(tp, lang)).join(' — ')
    }
    const parts: string[] = []
    if (r.ceramic   > 0) parts.push(`${lang === 'ar' ? 'سيراميك'  : 'Ceramic'}  ${r.ceramic}m²`)
    if (r.porcelain > 0) parts.push(`${lang === 'ar' ? 'بورسلان'  : 'Porcelain'} ${r.porcelain}m²`)
    if (r.marble    > 0) parts.push(`${lang === 'ar' ? 'رخام'     : 'Marble'}    ${r.marble}m²`)
    if (r.granite   > 0) parts.push(`${lang === 'ar' ? 'جرانيت'   : 'Granite'}   ${r.granite}m²`)
    if (r.terrazzo  > 0) parts.push(`${lang === 'ar' ? 'تيرازو'   : 'Terrazzo'}  ${r.terrazzo}m²`)
    return parts.join(' — ') || `#${String(r.id).slice(-4)}`
  }

  const getReqTags = (r: any): string[] => {
    if (r.materials?.length > 0)
      return [...new Set(r.materials.map((m: any) => m.type || m.typePending).filter(Boolean))].map(tp => displayVal(tp as string, lang))
    return ([
      r.ceramic   > 0 ? (lang === 'ar' ? 'سيراميك'  : 'Ceramic')   : null,
      r.porcelain > 0 ? (lang === 'ar' ? 'بورسلان'  : 'Porcelain') : null,
      r.marble    > 0 ? (lang === 'ar' ? 'رخام'     : 'Marble')    : null,
      r.granite   > 0 ? (lang === 'ar' ? 'جرانيت'   : 'Granite')   : null,
      r.terrazzo  > 0 ? (lang === 'ar' ? 'تيرازو'   : 'Terrazzo')  : null,
    ].filter(Boolean) as string[])
  }

  /* single source of truth so Dashboard status always agrees with the Kanban column on My Requests */
  const getKanbanCol = (r: any): 'active' | 'awaiting' | 'closed' => {
    if (r.kanbanColumn) return r.kanbanColumn
    if (r.status === 'closed') return 'closed'
    if (getReqQuotes(r.id).length > 0) return 'active'
    return 'awaiting'
  }

  /* ── map to table rows ── */
  const rows: ReqRow[] = myRequests.map(r => {
    const col = getKanbanCol(r)
    const status: ReqRow['status'] = col === 'closed' ? 'done' : col === 'awaiting' ? 'pending' : 'active'
    return {
      id:          String(r.id),
      name:        getReqName(r),
      tags:        getReqTags(r),
      status,
      quotesCount: getReqQuotes(r.id).length,
      deadline:    r.deadline || '—',
    }
  })

  /* ── filters ── */
  const filtered = rows.filter(r => {
    const matchF = activeFilter === 'all' || r.status === activeFilter
    const matchS = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search)
    return matchF && matchS
  })

  /* ── stats ── */
  const myQuotes     = allQuotes.filter(q => myRequests.some(r => r.id === q.requestId))
  const unreadQuotes = myQuotes.filter(q => q.status === 'pending').length
  const validPrices  = myQuotes.map((q: any) => Number(q.totalPrice)).filter(p => !isNaN(p) && p > 0)
  const lowestQuote  = validPrices.length > 0 ? Math.min(...validPrices) : null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const reqsThisMonth    = myRequests.filter(r => new Date(r.createdAt) >= monthStart).length
  const quotesThisMonth  = myQuotes.filter(q => new Date(q.createdAt) >= monthStart).length
  const closedThisMonth  = myRequests.filter(r => r.status === 'closed' && new Date(r.updatedAt ?? r.createdAt) >= monthStart).length

  const stats = {
    active:     rows.filter(r => r.status === 'active').length,
    totalQ:     myQuotes.length,
    lowestQ:    lowestQuote,
    draftCount: myDrafts.length,
  }

  /* ── real suppliers ── */
  const supplierUsers: Supplier[] = (() => {
    const all = [...allUsers.filter((u: any) => u.userType === 'supplier')]

    // also try the user_<email> shadow record for any supplier we have quotes from
    const seenEmails = new Set(all.map((u: any) => u.email))
    myQuotes.forEach((q: any) => {
      if (!seenEmails.has(q.supplierId)) {
        const u = getUserShadow<any>(q.supplierId)
        if (u && u.userType === 'supplier') { all.push(u); seenEmails.add(q.supplierId) }
      }
    })

    return all
      .map((u: any) => {
        const suppRatings = ratings.filter((r: any) => r.supplierId === u.email)
        const avgRating   = suppRatings.length > 0
          ? suppRatings.reduce((s: number, r: any) => s + r.rating, 0) / suppRatings.length
          : 0
        const qCount = allQuotes.filter((q: any) => q.supplierId === u.email).length
        const displayName = u.company || u.name || u.email
        return {
          email:      u.email,
          initials:   displayName.slice(0, 2).toUpperCase(),
          name:       u.name || u.email,
          company:    u.company || '',
          city:       u.city || u.location || '',
          stars:      avgRating,
          quoteCount: qCount,
        } as Supplier
      })
      .filter(s => s.quoteCount > 0)
      .sort((a, b) => b.quoteCount - a.quoteCount || b.stars - a.stars)
      .slice(0, 4)
  })()

  /* ── actions ── */
  const handleDelete = async (id: number) => {
    if (!(await confirmDialog(tStr('confirmDelete', lang), { confirmText: tStr('delete', lang), danger: true }))) return
    const updated = softDeleteRequest(id)
    setRawRequests(updated)
    setSelected(null)
    showToast(lang === 'ar' ? 'تم نقل الطلب لسلة المهملات' : 'Moved to trash')
  }

  const handleDuplicate = (req: any) => {
    const newReq = {
      ...req,
      id: Date.now(),
      status: 'open',
      kanbanColumn: undefined,
      createdAt: new Date().toISOString(),
      projectName: req.projectName ? `${req.projectName} (${lang === 'ar' ? 'نسخة' : 'copy'})` : undefined,
    }
    const updated = [...rawRequests, newReq]
    persistRequests(updated)
    setRawRequests(updated)
    setActivityLogs(appendActivityLog(newReq.id, `تم إنشاء طلب بنسخ طلب #${req.id}`, `Duplicated from request #${req.id}`))
    setSelected(null)
  }

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open'
    const updated   = rawRequests.map(r => r.id === id ? { ...r, status: newStatus, kanbanColumn: newStatus === 'closed' ? 'closed' : undefined } : r)
    persistRequests(updated)
    setRawRequests(updated)
    setSelected((prev: any) => prev ? { ...prev, status: newStatus } : prev)
    if (newStatus === 'closed') {
      setActivityLogs(appendActivityLog(id, 'تم إغلاق الطلب', 'Request closed'))
      const acceptedQuote = allQuotes.find((q: any) => q.requestId === id && q.status === 'accepted')
      const alreadyRated = ratings.find((r: any) => r.requestId === id)
      if (acceptedQuote && !alreadyRated) {
        setRatingQuote(acceptedQuote)
        setShowRatingModal(true)
      }
    } else {
      setActivityLogs(appendActivityLog(id, 'تم فتح الطلب', 'Request reopened'))
    }
  }

  const handleSubmitRating = (stars: number, comment: string) => {
    if (!ratingQuote) return
    const newRating = { id: Date.now(), requestId: ratingQuote.requestId, supplierId: ratingQuote.supplierId, supplierCompany: ratingQuote.supplierCompany, rating: stars, comment, createdAt: new Date().toISOString() }
    const updatedRatings = [...ratings, newRating]
    persistRatings(updatedRatings)
    setRatings(updatedRatings)
    setActivityLogs(appendActivityLog(ratingQuote.requestId, `تم تقييم ${ratingQuote.supplierCompany} بـ ${stars} نجوم`, `Rated ${ratingQuote.supplierCompany} ${stars} stars`))
    setShowRatingModal(false)
    setRatingQuote(null)
  }

  const handleQuoteAction = async (quoteId: number, action: 'accepted' | 'rejected' | 'pending') => {
    const target = allQuotes.find((q: any) => q.id === quoteId)
    if (action === 'accepted' && target && isQuoteExpired(target)) {
      showToast(lang === 'ar' ? 'لا يمكن قبول عرض منتهي الصلاحية' : "Can't accept an expired quote", 'error')
      return
    }
    if (action === 'accepted' || action === 'rejected') {
      const msg = action === 'accepted'
        ? (lang === 'ar' ? 'هل أنت متأكد من قبول هذا العرض؟' : 'Accept this quote?')
        : (lang === 'ar' ? 'هل أنت متأكد من رفض هذا العرض؟' : 'Reject this quote?')
      const confirmText = action === 'accepted' ? (lang === 'ar' ? 'قبول' : 'Accept') : (lang === 'ar' ? 'رفض' : 'Reject')
      if (!(await confirmDialog(msg, { confirmText, danger: action === 'rejected' }))) return
    }
    const { quotes: updated, quote } = setQuoteStatus(quoteId, action)
    setAllQuotes(updated)
    if (quote) {
      if (action === 'accepted') setActivityLogs(appendActivityLog(quote.requestId, `تم قبول عرض ${quote.supplierCompany} بسعر ${quote.totalPrice} ر.س`, `Accepted quote from ${quote.supplierCompany} at ${quote.totalPrice} SAR`))
      else if (action === 'rejected') setActivityLogs(appendActivityLog(quote.requestId, `تم رفض عرض ${quote.supplierCompany}`, `Rejected quote from ${quote.supplierCompany}`))
      else setActivityLogs(appendActivityLog(quote.requestId, `تم إلغاء القرار على عرض ${quote.supplierCompany}`, `Undid decision on ${quote.supplierCompany} quote`))
    }
  }

  const handleRevisionSubmit = (quoteId: number) => {
    if (!revisionNote.trim()) { showToast(lang === 'ar' ? 'من فضلك اكتب ملاحظة التعديل' : 'Please write a revision note', 'error'); return }
    const { quotes: updated, quote } = setQuoteStatus(quoteId, 'revision', revisionNote)
    setAllQuotes(updated)
    if (quote) setActivityLogs(appendActivityLog(quote.requestId, `تم طلب تعديل على عرض ${quote.supplierCompany}: "${revisionNote}"`, `Requested revision on ${quote.supplierCompany}: "${revisionNote}"`))
    setRevisionQuoteId(null)
    setRevisionNote('')
  }

  const handleApproveEditRequest = (quoteId: number) => {
    const { quotes: updated, quote } = approveQuoteEdit(quoteId)
    setAllQuotes(updated)
    if (quote) setActivityLogs(appendActivityLog(quote.requestId, `تمت الموافقة على طلب ${quote.supplierCompany} بتعديل العرض`, `Approved ${quote.supplierCompany}'s request to edit their quote`))
  }
  const handleRejectEditRequest = (quoteId: number) => {
    const { quotes: updated, quote } = declineQuoteEdit(quoteId)
    setAllQuotes(updated)
    if (quote) setActivityLogs(appendActivityLog(quote.requestId, `تم رفض طلب ${quote.supplierCompany} بتعديل العرض`, `Declined ${quote.supplierCompany}'s request to edit their quote`))
  }

  /* ══════════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>

      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/dashboard" />

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="max-w-[1400px] mx-auto flex items-end justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1">{tStr('hello', lang)} {userName}</h1>
            <p className="text-white/50 text-xs">
              {unreadQuotes > 0
                ? `${unreadQuotes} ${tStr('heroSub', lang)}`
                : (lang === 'ar' ? 'ابدأ بإنشاء طلب تسعير جديد' : 'Start by creating a new pricing request')}
            </p>
          </div>
          <Link href="/create-request"
            className="mb-4 bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
            <span className="text-base">+</span> {tStr('newRequest', lang)}
          </Link>
        </div>
        {/* filter tabs */}
        <div className="max-w-[1400px] mx-auto flex gap-0 mt-4 border-t border-white/10">
          {([
            ['all',     tStr('filterAll', lang)],
            ['active',  tStr('filterActive', lang)],
            ['pending', tStr('filterPend', lang)],
            ['done',    tStr('filterDone', lang)],
          ] as ['all'|'active'|'pending'|'done', string][]).map(([val, label]) => (
            <button key={val} onClick={() => setActiveFilter(val)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${
                activeFilter === val ? 'text-white border-[var(--sec)]' : 'text-white/40 border-transparent hover:text-white/70'
              }`}>
              {label} ({val === 'all' ? rows.length : rows.filter(r => r.status === val).length})
            </button>
          ))}
        </div>
      </div>

      {/* ── UNFINISHED DRAFT BANNER ── */}
      {unfinishedDraft && (
        <div className="mx-4 md:mx-7 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">✏️</div>
          <div className="flex-1 min-w-0">
            <p className="text-amber-800 font-semibold text-sm truncate">
              {lang === 'ar'
                ? `لديك طلب لم يكتمل${unfinishedDraftName ? `: ${unfinishedDraftName}` : ''}`
                : `You have an unfinished request${unfinishedDraftName ? `: ${unfinishedDraftName}` : ''}`}
            </p>
            {unfinishedDraft.hadAttachments && (
              <p className="text-amber-600 text-[11px] mt-0.5">
                {lang === 'ar' ? '⚠ الصور والملفات المرفقة لم تُحفظ ويجب إعادة إضافتها' : '⚠ Attached photos/files were not saved and need to be re-added'}
              </p>
            )}
          </div>
          <Link href="/create-request"
            className="text-xs font-semibold px-3 py-1.5 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] transition-colors shrink-0">
            {lang === 'ar' ? 'استكمال' : 'Continue'}
          </Link>
          <button onClick={dismissUnfinishedDraft}
            className="text-amber-400 hover:text-amber-600 text-sm shrink-0 px-1">✕</button>
        </div>
      )}

      {/* STATS */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {[
          {
            icon: '🔥', bg: 'bg-emerald-50',
            val: stats.active,
            label: tStr('activeReqs', lang),
            badge: stats.active > 0 ? `${stats.active} ${lang === 'ar' ? 'نشطة' : 'active'}` : null,
            badgeCls: 'bg-emerald-50 text-emerald-700',
          },
          {
            icon: '📥', bg: 'bg-[var(--tint)]',
            val: stats.totalQ,
            label: tStr('incomingQ', lang),
            badge: unreadQuotes > 0 ? `${unreadQuotes} ${lang === 'ar' ? 'جديدة' : 'new'}` : null,
            badgeCls: 'bg-[var(--tint)] text-[var(--sec)]',
          },
          {
            icon: '💰', bg: 'bg-emerald-50',
            val: stats.lowestQ !== null ? stats.lowestQ.toLocaleString() : '—',
            label: tStr('lowestPrice', lang),
            badge: stats.lowestQ !== null ? tStr('sar', lang) : null,
            badgeCls: 'bg-stone-100 text-stone-600',
          },
          {
            icon: '✏️', bg: 'bg-amber-50',
            val: stats.draftCount,
            label: tStr('savedDrafts', lang),
            badge: null, badgeCls: '',
          },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4 relative">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
            {s.badge && (
              <span className={`absolute top-3 start-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeCls}`}>
                {s.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-4 px-4 md:px-7 pb-8">

        {/* ── طلبات Table ── */}
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line-soft)]">
            <span className="text-sm font-bold text-stone-900">{tStr('pricingReqs', lang)}</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-3 py-1.5 w-44">
                <span className="text-stone-300 text-sm">🔍</span>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={tStr('search', lang)}
                  className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-stone-300 text-stone-700" />
              </div>
              <Link href="/create-request"
                className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                {tStr('addNew', lang)}
              </Link>
            </div>
          </div>
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '88px' }} />
              <col />
              <col style={{ width: '100px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '68px' }} />
            </colgroup>
            <thead>
              <tr className="bg-[var(--bg-soft2)] border-b border-[var(--line-soft)]">
                {[tStr('reqId',lang), tStr('reqName',lang), tStr('status',lang), tStr('quotesCol',lang), tStr('deadline',lang), ''].map((h, i) => (
                  <th key={i} className={`text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-4 py-2.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    style={i === 3 ? { textAlign: 'center' } : {}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-stone-400 text-sm py-12">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📋</span>
                      {tStr('noRequests', lang)}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(req => {
                  const raw = rawRequests.find(r => String(r.id) === req.id)
                  const hasAccepted = raw ? getReqQuotes(raw.id).some((q: any) => q.status === 'accepted') : false
                  const urgency = raw ? getDeadlineUrgency(raw.deadline, hasAccepted) : null
                  return (
                    <tr key={req.id} className="border-b border-[var(--line-soft)] hover:bg-[var(--bg-soft)] transition-colors cursor-pointer"
                      onClick={() => raw && setSelected(raw)}>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-[var(--sec)] font-semibold font-mono">{req.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold text-stone-900 truncate">{req.name}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {req.tags.slice(0, 3).map((tg, i) => (
                            <span key={i} className="text-[10px] bg-[var(--tint)] text-[var(--brand-strong)] px-1.5 py-0.5 rounded font-medium">{tg}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={req.status} lang={lang} /></td>
                      <td className="px-4 py-3 text-center"><QuotesBadge count={req.quotesCount} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${urgency === 'overdue' ? 'text-red-600' : urgency === 'soon' ? 'text-amber-600' : 'text-stone-600 font-normal'}`}>
                          {urgency === 'overdue' ? '🔴' : urgency === 'soon' ? '🟠' : '⏱'} {req.deadline}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => raw && setSelected(raw)}
                          className="text-[11px] font-semibold text-[var(--brand-strong)] bg-[var(--tint)] border border-[var(--line)] rounded-md px-2.5 py-1 hover:bg-[var(--tint-hover)] transition-colors">
                          {tStr('view', lang)}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="flex flex-col gap-3.5">

          {/* Real Suppliers */}
          <div className="bg-white border border-[var(--line)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--line-soft)]">
              <span className="text-xs font-bold text-stone-900">{tStr('topSuppliers', lang)}</span>
              <Link href="/suppliers" className="text-[10px] text-[var(--sec)] font-semibold hover:underline">
                {tStr('viewAll', lang)}
              </Link>
            </div>
            {supplierUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="text-2xl mb-2">🏢</span>
                <p className="text-[11px] text-stone-400">{tStr('noSuppliers', lang)}</p>
              </div>
            ) : (
              supplierUsers.map(s => (
                <div key={s.email} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[var(--line-soft)] last:border-0">
                  <div className="w-9 h-9 rounded-lg bg-[var(--tint)] border border-[var(--line)] flex items-center justify-center text-[11px] font-bold text-[var(--brand-strong)] shrink-0">
                    {s.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-stone-900 truncate">{s.company || s.name}</div>
                    <div className="text-[10px] text-stone-500">{s.city || s.name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="text-xs text-amber-400 flex items-center gap-1">
                      {s.stars > 0 ? (
                        <>
                          <span>{'★'.repeat(Math.round(s.stars)) + '☆'.repeat(5 - Math.round(s.stars))}</span>
                          <span className="text-[9px] text-stone-400">({s.stars.toFixed(1)})</span>
                        </>
                      ) : '—'}
                    </div>
                    <span className="text-[9px] text-stone-400">
                      {s.quoteCount} {lang === 'ar' ? 'عرض' : 'quotes'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Real Monthly Activity */}
          <div className="bg-white border border-[var(--line)] rounded-xl overflow-hidden">
            <div className="px-3.5 py-3 border-b border-[var(--line-soft)] flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900">{tStr('monthActivity', lang)}</span>
              <HelpTooltip lang={lang}
                textAr="يقارن كل رقم نشاط الشهر الحالي بإجمالي طلباتك وعروضك منذ البداية، وليست مقارنة بين الأشهر. وتوضّح النسبة حصة هذا الشهر من الإجمالي."
                textEn="Each number compares this month's activity to your all-time total (not month-over-month). The bar shows this month's share of that total." />
            </div>
            <div className="px-3.5 py-3 flex flex-col gap-3">
              {(() => {
                const totalReqs   = Math.max(myRequests.length, 1)
                const totalQuotes = Math.max(myQuotes.length, 1)
                const totalClosed = Math.max(rows.filter(r => r.status === 'done').length, 1)
                return [
                  { ar: 'طلبات مرسلة',  en: 'Sent Requests',  val: `${reqsThisMonth} / ${myRequests.length}`,   pct: Math.round(reqsThisMonth / totalReqs * 100),   color: 'bg-[var(--sec)]'  },
                  { ar: 'عروض مستلمة',  en: 'Received Quotes', val: `${quotesThisMonth} / ${myQuotes.length}`,   pct: Math.round(quotesThisMonth / totalQuotes * 100), color: 'bg-[var(--brand)]'  },
                  { ar: 'صفقات مغلقة', en: 'Closed Deals',   val: `${closedThisMonth} / ${rows.length}`,        pct: Math.round(closedThisMonth / totalClosed * 100), color: 'bg-amber-500'  },
                ]
              })().map(p => (
                <div key={p.ar}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-stone-700 font-medium">{lang === 'ar' ? p.ar : p.en}</span>
                    <span className="text-[11px] text-stone-400" dir="ltr">{p.val}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all ${p.color}`} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      {selected && (
        <RequestDetailModal
          req={selected} lang={lang} dir={dir}
          quotes={getReqQuotes(selected.id)} logs={getReqLogs(selected.id)}
          revisionQuoteId={revisionQuoteId} revisionNote={revisionNote}
          setRevisionQuoteId={setRevisionQuoteId} setRevisionNote={setRevisionNote}
          onClose={() => setSelected(null)}
          onToggle={() => handleToggleStatus(selected.id, selected.status)}
          onDelete={() => handleDelete(selected.id)}
          onEdit={() => router.push(`/create-request?edit=${selected.id}`)}
          onDuplicate={() => handleDuplicate(selected)}
          onQuoteAction={handleQuoteAction} onRevisionSubmit={handleRevisionSubmit}
          onApproveEditRequest={handleApproveEditRequest} onRejectEditRequest={handleRejectEditRequest}
          setLightboxImg={setLightbox}
        />
      )}

      {/* RATING MODAL */}
      {showRatingModal && ratingQuote && (
        <RatingModal lang={lang} supplierCompany={ratingQuote.supplierCompany}
          onSubmit={handleSubmitRating}
          onSkip={() => { setShowRatingModal(false); setRatingQuote(null) }} />
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center cursor-zoom-out" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'} className="absolute top-5 start-5 bg-red-500 text-white px-4 py-2 rounded-lg font-bold">✕</button>
        </div>
      )}

    </div>
  )
}
