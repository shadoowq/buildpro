'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ContractorNav from '../components/ContractorNav'
import RequestDetailModal from '../components/RequestDetailModal'
import { appendActivityLog, setQuoteStatus, softDeleteRequest } from '../lib/requestHelpers'
import { buildNotifications, notifIconMap, timeAgo, NotifItem } from '../lib/notifications'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'

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
  ctaTitle:     { ar: 'طلب تسعير جديد',    en: 'New Pricing Request'  },
  ctaSub:       { ar: 'أرسله لأكثر من 300 مورد دفعة واحدة', en: 'Send to 300+ suppliers at once' },
  startNow:     { ar: 'ابدأ الآن',          en: 'Start Now'           },
  latestUpdates:{ ar: 'آخر التحديثات',      en: 'Latest Updates'      },
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
  noNotifs:     { ar: 'لا توجد تحديثات بعد', en: 'No updates yet'    },
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
    done:    { ar: 'مغلق',     en: 'Closed',   cls: 'bg-slate-100 text-slate-600 border border-slate-200',     dot: 'bg-slate-400'   },
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
  if (count === 0) return <span className="text-slate-300 text-xs">—</span>
  return (
    <span className={`inline-flex items-center justify-center min-w-[26px] h-[22px] rounded-md text-xs font-bold px-1.5 ${
      count >= 3 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                 : 'bg-blue-50 text-blue-700 border border-blue-200'
    }`}>{count}</span>
  )
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {(['ar', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            lang === l ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}>
          <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'}
            width="20" height="14" alt={l} className="rounded-sm" />
          {l.toUpperCase()}
        </button>
      ))}
    </div>
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

  const [selected, setSelected]   = useState<any>(null)
  const [lightbox, setLightbox]   = useState<string | null>(null)
  const [revisionQuoteId, setRevisionQuoteId] = useState<number | null>(null)
  const [revisionNote, setRevisionNote]       = useState('')

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  /* ── load all data ── */
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang
    if (savedLang) setLang(savedLang)

    const userData = localStorage.getItem('currentUser')
    if (userData) {
      try {
        const u = JSON.parse(userData)
        if (u.name)  setUserName(u.name)
        if (u.email) setUserEmail(u.email)
      } catch {}
    }

    try { setRawRequests(JSON.parse(localStorage.getItem('requests')  || '[]')) } catch {}
    try { setAllQuotes(  JSON.parse(localStorage.getItem('quotes')    || '[]')) } catch {}
    try { setActivityLogs(JSON.parse(localStorage.getItem('activityLogs') || '[]')) } catch {}
    try { setRatings(    JSON.parse(localStorage.getItem('ratings')   || '[]')) } catch {}
    try { setDrafts(     JSON.parse(localStorage.getItem('requestDrafts') || '[]')) } catch {}
    try { setAllUsers(   JSON.parse(localStorage.getItem('users')     || '[]')) } catch {}
  }, [])

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l) }

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
      if (types.length > 0) return types.join(' — ')
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
      return [...new Set(r.materials.map((m: any) => m.type || m.typePending).filter(Boolean))] as string[]
    return ([
      r.ceramic   > 0 ? (lang === 'ar' ? 'سيراميك'  : 'Ceramic')   : null,
      r.porcelain > 0 ? (lang === 'ar' ? 'بورسلان'  : 'Porcelain') : null,
      r.marble    > 0 ? (lang === 'ar' ? 'رخام'     : 'Marble')    : null,
      r.granite   > 0 ? (lang === 'ar' ? 'جرانيت'   : 'Granite')   : null,
      r.terrazzo  > 0 ? (lang === 'ar' ? 'تيرازو'   : 'Terrazzo')  : null,
    ].filter(Boolean) as string[])
  }

  /* ── map to table rows ── */
  const rows: ReqRow[] = myRequests.map(r => {
    const rq = getReqQuotes(r.id)
    const status: ReqRow['status'] =
      r.status === 'closed' ? 'done'
      : rq.length > 0 ? 'active'
      : 'pending'
    return {
      id:          String(r.id),
      name:        getReqName(r),
      tags:        getReqTags(r),
      status,
      quotesCount: rq.length,
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

  /* ── real notifications ── */
  const notifs: NotifItem[] = buildNotifications(allQuotes, activityLogs, myRequests.map(r => r.id), { limit: 5 })

  /* ── real suppliers ── */
  const supplierUsers: Supplier[] = (() => {
    const all = [...allUsers.filter((u: any) => u.userType === 'supplier')]

    // also try user_ keys from localStorage for any supplier we have quotes from
    const seenEmails = new Set(all.map((u: any) => u.email))
    myQuotes.forEach((q: any) => {
      if (!seenEmails.has(q.supplierId)) {
        const key = `user_${q.supplierId}`
        try {
          const u = JSON.parse(localStorage.getItem(key) || 'null')
          if (u && u.userType === 'supplier') { all.push(u); seenEmails.add(q.supplierId) }
        } catch {}
      }
    })

    return all
      .map((u: any) => {
        const suppRatings = ratings.filter((r: any) => r.supplierId === u.email)
        const avgRating   = suppRatings.length > 0
          ? Math.round(suppRatings.reduce((s: number, r: any) => s + r.rating, 0) / suppRatings.length)
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

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open'
    const updated   = rawRequests.map(r => r.id === id ? { ...r, status: newStatus } : r)
    localStorage.setItem('requests', JSON.stringify(updated))
    setRawRequests(updated)
    setSelected((prev: any) => prev ? { ...prev, status: newStatus } : prev)
    setActivityLogs(newStatus === 'closed'
      ? appendActivityLog(id, 'تم إغلاق الطلب', 'Request closed')
      : appendActivityLog(id, 'تم فتح الطلب', 'Request reopened'))
  }

  const handleQuoteAction = (quoteId: number, action: 'accepted' | 'rejected' | 'pending') => {
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

  /* ══════════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F0F4F8] font-cairo" dir={dir}>

      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/dashboard" />

      {/* HERO */}
      <div className="bg-[#0F4C75] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1">{tStr('hello', lang)} {userName}</h1>
            <p className="text-white/50 text-xs">
              {stats.totalQ > 0
                ? `${stats.totalQ} ${tStr('heroSub', lang)}`
                : (lang === 'ar' ? 'ابدأ بإنشاء طلب تسعير جديد' : 'Start by creating a new pricing request')}
            </p>
          </div>
          <Link href="/create-request"
            className="mb-4 bg-[#1B9AAA] hover:bg-[#158494] text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
            <span className="text-base">+</span> {tStr('newRequest', lang)}
          </Link>
        </div>
        {/* filter tabs */}
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {([
            ['all',     tStr('filterAll', lang)],
            ['active',  tStr('filterActive', lang)],
            ['pending', tStr('filterPend', lang)],
            ['done',    tStr('filterDone', lang)],
          ] as ['all'|'active'|'pending'|'done', string][]).map(([val, label]) => (
            <button key={val} onClick={() => setActiveFilter(val)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${
                activeFilter === val ? 'text-white border-[#1B9AAA]' : 'text-white/40 border-transparent hover:text-white/70'
              }`}>
              {label} ({val === 'all' ? rows.length : rows.filter(r => r.status === val).length})
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {[
          {
            icon: '🔥', bg: 'bg-emerald-50',
            val: stats.active,
            label: tStr('activeReqs', lang),
            badge: stats.active > 0 ? `${stats.active} ${lang === 'ar' ? 'نشطة' : 'active'}` : null,
            badgeCls: 'bg-emerald-50 text-emerald-700',
          },
          {
            icon: '📥', bg: 'bg-teal-50',
            val: stats.totalQ,
            label: tStr('incomingQ', lang),
            badge: unreadQuotes > 0 ? `${unreadQuotes} ${lang === 'ar' ? 'جديدة' : 'new'}` : null,
            badgeCls: 'bg-blue-50 text-[#1B9AAA]',
          },
          {
            icon: '💰', bg: 'bg-emerald-50',
            val: stats.lowestQ !== null ? stats.lowestQ.toLocaleString() : '—',
            label: tStr('lowestPrice', lang),
            badge: stats.lowestQ !== null ? tStr('sar', lang) : null,
            badgeCls: 'bg-slate-100 text-slate-600',
          },
          {
            icon: '✏️', bg: 'bg-amber-50',
            val: stats.draftCount,
            label: tStr('savedDrafts', lang),
            badge: null, badgeCls: '',
          },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#E2EAF2] rounded-xl p-4 relative">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{s.val}</div>
            <div className="text-[11px] text-slate-500 mt-1">{s.label}</div>
            {s.badge && (
              <span className={`absolute top-3 start-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeCls}`}>
                {s.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-4 px-4 md:px-7 pb-8">

        {/* ── طلبات Table ── */}
        <div className="bg-white border border-[#E2EAF2] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <span className="text-sm font-bold text-slate-900">{tStr('pricingReqs', lang)}</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2EAF2] rounded-lg px-3 py-1.5 w-44">
                <span className="text-slate-300 text-sm">🔍</span>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={tStr('search', lang)}
                  className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-slate-300 text-slate-700" />
              </div>
              <Link href="/create-request"
                className="bg-[#0F4C75] hover:bg-[#0D3F63] text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
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
              <tr className="bg-[#FAFBFC] border-b border-[#F1F5F9]">
                {[tStr('reqId',lang), tStr('reqName',lang), tStr('status',lang), tStr('quotesCol',lang), tStr('deadline',lang), ''].map((h, i) => (
                  <th key={i} className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-2.5 text-right"
                    style={i === 3 ? { textAlign: 'center' } : {}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-400 text-sm py-12">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📋</span>
                      {tStr('noRequests', lang)}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(req => {
                  const raw = rawRequests.find(r => String(r.id) === req.id)
                  return (
                    <tr key={req.id} className="border-b border-[#F8FAFC] hover:bg-[#FAFBFD] transition-colors cursor-pointer"
                      onClick={() => raw && setSelected(raw)}>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-[#1B9AAA] font-semibold font-mono">{req.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">{req.name}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {req.tags.slice(0, 3).map((tg, i) => (
                            <span key={i} className="text-[10px] bg-[#F0F9FF] text-[#0369A1] px-1.5 py-0.5 rounded font-medium">{tg}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={req.status} lang={lang} /></td>
                      <td className="px-4 py-3 text-center"><QuotesBadge count={req.quotesCount} /></td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-600">⏱ {req.deadline}</span></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => raw && setSelected(raw)}
                          className="text-[11px] font-semibold text-[#0F4C75] bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1 hover:bg-blue-100 transition-colors">
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

          {/* CTA */}
          <div className="bg-[#0F4C75] rounded-xl p-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl mb-3">📄</div>
            <div className="text-white text-sm font-bold mb-1">{tStr('ctaTitle', lang)}</div>
            <div className="text-white/50 text-xs">{tStr('ctaSub', lang)}</div>
            <Link href="/create-request"
              className="mt-3 block bg-[#1B9AAA] hover:bg-[#158494] text-white text-xs font-semibold text-center px-3 py-2 rounded-lg transition-colors">
              {tStr('startNow', lang)}
            </Link>
          </div>

          {/* Real Notifications */}
          <div className="bg-white border border-[#E2EAF2] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-slate-900">{tStr('latestUpdates', lang)}</span>
              <Link href="/notifications" className="text-[10px] text-[#1B9AAA] font-semibold hover:underline">
                {tStr('viewAll', lang)}
              </Link>
            </div>
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="text-2xl mb-2">🔔</span>
                <p className="text-[11px] text-slate-400">{tStr('noNotifs', lang)}</p>
              </div>
            ) : (
              notifs.map(n => {
                const icon = notifIconMap[n.type]
                return (
                  <Link key={n.id} href={`/my-requests?reqId=${n.requestId}`}
                    className="flex gap-2.5 px-3.5 py-2.5 border-b border-[#F8FAFC] hover:bg-[#FAFBFD] cursor-pointer last:border-0">
                    <div className={`w-8 h-8 rounded-lg ${icon.bg} flex items-center justify-center text-sm ${icon.color} shrink-0 mt-0.5`}>
                      {icon.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-700 leading-relaxed">{lang === 'ar' ? n.textAr : n.textEn}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.timestamp, lang)}</p>
                    </div>
                    {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#1B9AAA] shrink-0 mt-1.5" />}
                  </Link>
                )
              })
            )}
          </div>

          {/* Real Suppliers */}
          <div className="bg-white border border-[#E2EAF2] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-slate-900">{tStr('topSuppliers', lang)}</span>
              <Link href="/suppliers" className="text-[10px] text-[#1B9AAA] font-semibold hover:underline">
                {tStr('viewAll', lang)}
              </Link>
            </div>
            {supplierUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="text-2xl mb-2">🏢</span>
                <p className="text-[11px] text-slate-400">{tStr('noSuppliers', lang)}</p>
              </div>
            ) : (
              supplierUsers.map(s => (
                <div key={s.email} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#F8FAFC] last:border-0">
                  <div className="w-9 h-9 rounded-lg bg-[#EBF5FF] border border-[#BFDBFE] flex items-center justify-center text-[11px] font-bold text-[#1D4ED8] shrink-0">
                    {s.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{s.company || s.name}</div>
                    <div className="text-[10px] text-slate-500">{s.city || s.name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="text-xs text-amber-400">
                      {s.stars > 0 ? '★'.repeat(s.stars) + '☆'.repeat(5 - s.stars) : '—'}
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {s.quoteCount} {lang === 'ar' ? 'عرض' : 'quotes'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Real Monthly Activity */}
          <div className="bg-white border border-[#E2EAF2] rounded-xl overflow-hidden">
            <div className="px-3.5 py-3 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-slate-900">{tStr('monthActivity', lang)}</span>
            </div>
            <div className="px-3.5 py-3 flex flex-col gap-3">
              {(() => {
                const totalReqs   = Math.max(myRequests.length, 1)
                const totalQuotes = Math.max(myQuotes.length, 1)
                const totalClosed = Math.max(rows.filter(r => r.status === 'done').length, 1)
                return [
                  { ar: 'طلبات مرسلة',  en: 'Sent Requests',  val: `${reqsThisMonth} / ${myRequests.length}`,   pct: Math.round(reqsThisMonth / totalReqs * 100),   color: 'bg-[#1B9AAA]'  },
                  { ar: 'عروض مستلمة',  en: 'Received Quotes', val: `${quotesThisMonth} / ${myQuotes.length}`,   pct: Math.round(quotesThisMonth / totalQuotes * 100), color: 'bg-blue-500'   },
                  { ar: 'صفقات مغلقة', en: 'Closed Deals',   val: `${closedThisMonth} / ${rows.length}`,        pct: Math.round(closedThisMonth / totalClosed * 100), color: 'bg-purple-500' },
                ]
              })().map(p => (
                <div key={p.ar}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-slate-700 font-medium">{lang === 'ar' ? p.ar : p.en}</span>
                    <span className="text-[11px] text-slate-400">{p.val}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
          onQuoteAction={handleQuoteAction} onRevisionSubmit={handleRevisionSubmit}
          setLightboxImg={setLightbox}
        />
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} className="absolute top-5 start-5 bg-red-500 text-white px-4 py-2 rounded-lg font-bold">✕</button>
        </div>
      )}

    </div>
  )
}
