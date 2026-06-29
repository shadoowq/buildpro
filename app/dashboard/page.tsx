'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Lang = 'ar' | 'en'

type Request = {
  id: string
  name: string
  tags: string[]
  status: 'active' | 'pending' | 'draft' | 'done'
  quotes: number
  deadline: string
  deadlineType: 'hot' | 'mid' | 'ok' | 'done' | 'none'
}

type Notification = {
  id: number
  type: 'quote' | 'accept' | 'warn'
  textAr: string
  textEn: string
  boldAr: string
  boldEn: string
  time: string
  unread: boolean
}

type Supplier = {
  id: number
  initials: string
  name: string
  city: string
  stars: number
}

const NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'quote',  boldAr: 'الخليج للسيراميك', boldEn: 'Gulf Ceramics',   textAr: ' أرسل عرض سعر على #REQ-0041', textEn: ' sent a quote on #REQ-0041', time: '23m ago', unread: true  },
  { id: 2, type: 'accept', boldAr: 'الرخام الذهبي',     boldEn: 'Golden Marble',   textAr: ' قبل طلب العرض #REQ-0040',    textEn: ' accepted quote request #REQ-0040', time: '1h ago', unread: true  },
  { id: 3, type: 'quote',  boldAr: 'مجموعة النور',       boldEn: 'Al-Nour Group',   textAr: ' أرسل عرض سعر على #REQ-0039', textEn: ' sent a quote on #REQ-0039', time: '3h ago', unread: false },
  { id: 4, type: 'warn',   boldAr: '#REQ-0041',          boldEn: '#REQ-0041',        textAr: ' ينتهي خلال يومين',            textEn: ' expires in 2 days', time: 'Today 09:00', unread: false },
]

const SUPPLIERS: Supplier[] = [
  { id: 1, initials: 'NG', name: 'مجموعة النور',      city: 'جدة',    stars: 5 },
  { id: 2, initials: 'KS', name: 'الخليج للسيراميك', city: 'الرياض', stars: 4 },
  { id: 3, initials: 'GR', name: 'الرخام الذهبي',    city: 'الدمام', stars: 4 },
]

const T = {
  dashboard:    { ar: 'لوحة التحكم',     en: 'Dashboard'       },
  myRequests:   { ar: 'طلباتي',          en: 'My Requests'     },
  quotes:       { ar: 'عروض الأسعار',    en: 'Quotes'          },
  suppliers:    { ar: 'الموردون',        en: 'Suppliers'       },
  drafts:       { ar: 'المسودات',        en: 'Drafts'          },
  newRequest:   { ar: 'طلب تسعير جديد', en: 'New Request'     },
  hello:        { ar: 'أهلاً،',          en: 'Welcome,'        },
  heroSub:      { ar: 'لديك',            en: 'You have'        },
  heroSub2:     { ar: 'عرض يستحق مراجعتك', en: 'quotes awaiting your review' },
  filterAll:    { ar: 'الكل',            en: 'All'             },
  filterActive: { ar: 'نشط',             en: 'Active'          },
  filterPend:   { ar: 'في الانتظار',     en: 'Pending'         },
  filterDraft:  { ar: 'مسودة',           en: 'Draft'           },
  filterDone:   { ar: 'مغلق',            en: 'Closed'          },
  activeReqs:   { ar: 'طلبات نشطة',      en: 'Active Requests' },
  incomingQ:    { ar: 'عروض أسعار واردة', en: 'Incoming Quotes' },
  lowestPrice:  { ar: 'أقل سعر مستلم (ريال)', en: 'Lowest Price (SAR)' },
  savedDrafts:  { ar: 'مسودات محفوظة',   en: 'Saved Drafts'    },
  thisMonth:    { ar: '+3 هذا الشهر',    en: '+3 this month'   },
  unread:       { ar: '8 غير مقروءة',    en: '8 unread'        },
  expireSoon:   { ar: '2 تنتهي قريباً',  en: '2 expiring soon' },
  pricingReqs:  { ar: 'طلبات التسعير',   en: 'Pricing Requests'},
  search:       { ar: 'ابحث باسم الطلب...', en: 'Search requests...' },
  addNew:       { ar: '+ طلب جديد',      en: '+ New Request'   },
  reqId:        { ar: 'رقم الطلب',       en: 'Request ID'      },
  reqName:      { ar: 'اسم الطلب',       en: 'Request'         },
  status:       { ar: 'الحالة',          en: 'Status'          },
  quotesCol:    { ar: 'عروض',            en: 'Quotes'          },
  deadline:     { ar: 'الموعد النهائي',  en: 'Deadline'        },
  noRequests:   { ar: 'لا توجد طلبات — اضغط على طلب جديد للبداية', en: 'No requests — click New Request to start' },
  view:         { ar: 'عرض',             en: 'View'            },
  edit:         { ar: 'تعديل',           en: 'Edit'            },
  archive:      { ar: 'أرشيف',           en: 'Archive'         },
  ctaTitle:     { ar: 'طلب تسعير جديد', en: 'New Pricing Request' },
  ctaSub:       { ar: 'أرسله لأكثر من 300 مورد دفعة واحدة', en: 'Send to 300+ suppliers at once' },
  startNow:     { ar: 'ابدأ الآن',       en: 'Start Now'       },
  latestUpdates:{ ar: 'آخر التحديثات',   en: 'Latest Updates'  },
  viewAll:      { ar: 'عرض الكل',        en: 'View All'        },
  topSuppliers: { ar: 'أكثر الموردين تفاعلاً', en: 'Top Suppliers' },
  monthActivity:{ ar: 'نشاط هذا الشهر', en: 'This Month'      },
  sentReqs:     { ar: 'طلبات مرسلة',    en: 'Sent Requests'   },
  receivedQ:    { ar: 'عروض مستلمة',    en: 'Received Quotes' },
  closedDeals:  { ar: 'صفقات مكتملة',   en: 'Closed Deals'    },
  reqDetails:   { ar: 'تفاصيل الطلب',   en: 'Request Details' },
  materials:    { ar: 'المواد المطلوبة', en: 'Required Materials' },
  matType:      { ar: 'نوع المادة',      en: 'Material'        },
  usage:        { ar: 'الاستخدام',       en: 'Usage'           },
  size:         { ar: 'المقاس',          en: 'Size'            },
  thickness:    { ar: 'السماكة',         en: 'Thickness'       },
  finish:       { ar: 'الفنش',           en: 'Finish'          },
  color:        { ar: 'اللون',           en: 'Color'           },
  qty:          { ar: 'الكمية',          en: 'Qty'             },
  targetPrice:  { ar: 'السعر المستهدف',  en: 'Target Price'    },
  origin:       { ar: 'الصناعة',         en: 'Origin'          },
  deliveryDate: { ar: 'تاريخ التوريد',   en: 'Delivery Date'   },
  itemNote:     { ar: 'وصف البند',       en: 'Note'            },
  images:       { ar: 'الصور',           en: 'Images'          },
  description:  { ar: 'الوصف',           en: 'Description'     },
  quotesSection:{ ar: 'عروض الأسعار',    en: 'Quotes'          },
  noQuotes:     { ar: 'لا توجد عروض أسعار بعد', en: 'No quotes yet' },
  activityLog:  { ar: 'تاريخ النشاط',    en: 'Activity Log'    },
  close:        { ar: 'إغلاق',           en: 'Close'           },
  closeReq:     { ar: 'إغلاق الطلب',     en: 'Close Request'   },
  openReq:      { ar: 'فتح الطلب',       en: 'Open Request'    },
  delete:       { ar: 'حذف',             en: 'Delete'          },
  open:         { ar: 'مفتوح',           en: 'Open'            },
  closed:       { ar: 'مغلق',            en: 'Closed'          },
  confirmDelete:{ ar: 'هل أنت متأكد من حذف هذا الطلب؟', en: 'Are you sure you want to delete this request?' },
  ceramic:      { ar: 'سيراميك',         en: 'Ceramic'         },
  porcelain:    { ar: 'بورسلان',         en: 'Porcelain'       },
  marble:       { ar: 'رخام',            en: 'Marble'          },
  granite:      { ar: 'جرانيت',          en: 'Granite'         },
  terrazzo:     { ar: 'تيرازو',          en: 'Terrazzo'        },
  accepted:     { ar: 'مقبول',           en: 'Accepted'        },
  rejected:     { ar: 'مرفوض',           en: 'Rejected'        },
  pending:      { ar: 'انتظار',          en: 'Pending'         },
  deliveryDays: { ar: 'مدة التوريد:',    en: 'Delivery:'       },
  days:         { ar: 'يوم',             en: 'days'            },
  sar:          { ar: 'ر.س',             en: 'SAR'             },
}

function t(key: keyof typeof T, lang: Lang) {
  return T[key][lang]
}

function StatusPill({ status, lang }: { status: Request['status'], lang: Lang }) {
  const map = {
    active:  { labelAr: 'نشط',    labelEn: 'Active',   cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200', dot: 'bg-emerald-500' },
    pending: { labelAr: 'انتظار', labelEn: 'Pending',  cls: 'bg-orange-50 text-orange-800 border border-orange-200',   dot: 'bg-orange-400'  },
    draft:   { labelAr: 'مسودة',  labelEn: 'Draft',    cls: 'bg-slate-50 text-slate-900 border border-slate-200',      dot: 'bg-slate-400'   },
    done:    { labelAr: 'مكتمل',  labelEn: 'Closed',   cls: 'bg-purple-50 text-purple-700 border border-purple-200',   dot: 'bg-purple-500'  },
  }
  const { labelAr, labelEn, cls, dot } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {lang === 'ar' ? labelAr : labelEn}
    </span>
  )
}

function QuotesBadge({ count, status }: { count: number; status: Request['status'] }) {
  if (status === 'draft') return <span className="text-slate-300 text-xs">—</span>
  const isNew = count >= 8
  return (
    <span className={`inline-flex items-center justify-center min-w-[26px] h-[22px] rounded-md text-xs font-bold px-1.5 ${
      isNew ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
    }`}>
      {count}
    </span>
  )
}

function NotifIcon({ type }: { type: Notification['type'] }) {
  const map = {
    quote:  { bg: 'bg-blue-50',    icon: '📄', color: 'text-[#1B9AAA]'   },
    accept: { bg: 'bg-emerald-50', icon: '✓',  color: 'text-emerald-600' },
    warn:   { bg: 'bg-amber-50',   icon: '⚠',  color: 'text-amber-500'   },
  }
  const { bg, icon, color } = map[type]
  return (
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-sm ${color} shrink-0 mt-0.5`}>
      {icon}
    </div>
  )
}

function LangToggle({ lang, setLang }: { lang: Lang, setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      <button
        onClick={() => setLang('ar')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          lang === 'ar' ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <img src="https://flagcdn.com/w20/sa.png" width="20" height="14" alt="SA" className="rounded-sm" />
        <span>AR</span>
      </button>
      <button
        onClick={() => setLang('en')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          lang === 'en' ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <img src="https://flagcdn.com/w20/us.png" width="20" height="14" alt="US" className="rounded-sm" />
        <span>EN</span>
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const [lang, setLang]               = useState<Lang>('ar')
  const [activeFilter, setActiveFilter] = useState('الكل')
  const [search, setSearch]           = useState('')
  const [userName, setUserName]       = useState('المقاول')
  const [requests, setRequests]       = useState<Request[]>([])
  const [allRaw, setAllRaw]           = useState<any[]>([])
  const [selected, setSelected]       = useState<any>(null)
  const [lightbox, setLightbox]       = useState<string | null>(null)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [quotes, setQuotes]           = useState<any[]>([])

  const FILTERS = [
    t('filterAll', lang), t('filterActive', lang),
    t('filterPend', lang), t('filterDraft', lang), t('filterDone', lang)
  ]

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang
    if (savedLang) setLang(savedLang)

    const user = localStorage.getItem('currentUser')
    if (user) {
      try {
        const parsed = JSON.parse(user)
        if (parsed.name) setUserName(parsed.name)
      } catch {}
    }

    const stored = localStorage.getItem('requests')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setAllRaw(parsed)
          const mapped = parsed.map((r: any) => ({
            id: String(r.id),
            name: (() => {
              const parts: string[] = []
              if (r.ceramic   > 0) parts.push(`${lang === 'ar' ? 'سيراميك' : 'Ceramic'} ${r.ceramic} m²`)
              if (r.porcelain > 0) parts.push(`${lang === 'ar' ? 'بورسلان' : 'Porcelain'} ${r.porcelain} m²`)
              if (r.marble    > 0) parts.push(`${lang === 'ar' ? 'رخام' : 'Marble'} ${r.marble} m²`)
              if (r.granite   > 0) parts.push(`${lang === 'ar' ? 'جرانيت' : 'Granite'} ${r.granite} m²`)
              if (r.terrazzo  > 0) parts.push(`${lang === 'ar' ? 'تيرازو' : 'Terrazzo'} ${r.terrazzo} m²`)
              if (r.materials?.length > 0) {
                const types = [...new Set(r.materials.map((m: any) => m.type).filter(Boolean))]
                if (types.length > 0 && parts.length === 0) return (types as string[]).join(' — ')
              }
              return parts.length > 0 ? parts.join(' — ') : `Request ${String(r.id).slice(-4)}`
            })(),
            tags: r.materials?.length > 0
              ? [...new Set(r.materials.map((m: any) => m.type).filter(Boolean))] as string[]
              : ([
                  r.ceramic   > 0 ? (lang === 'ar' ? 'سيراميك'  : 'Ceramic')   : null,
                  r.porcelain > 0 ? (lang === 'ar' ? 'بورسلان'  : 'Porcelain') : null,
                  r.marble    > 0 ? (lang === 'ar' ? 'رخام'     : 'Marble')    : null,
                  r.granite   > 0 ? (lang === 'ar' ? 'جرانيت'   : 'Granite')   : null,
                  r.terrazzo  > 0 ? (lang === 'ar' ? 'تيرازو'   : 'Terrazzo')  : null,
                ].filter(Boolean) as string[]),
            status: (r.status === 'draft' ? 'draft'
              : r.status === 'closed' || r.status === 'done' ? 'done'
              : r.quotes?.length > 0 ? 'active'
              : 'pending') as Request['status'],
            quotes: r.quotes?.length || 0,
            deadline: r.deadline || r.deliveryDate || '—',
            deadlineType: 'ok' as const,
          }))
          setRequests(mapped)
        }
      } catch {}
    }

    const logs = localStorage.getItem('activityLogs')
    if (logs) { try { setActivityLogs(JSON.parse(logs)) } catch {} }
    const q = localStorage.getItem('quotes')
    if (q) { try { setQuotes(JSON.parse(q)) } catch {} }
  }, [lang])

  const handleLangChange = (l: Lang) => {
    setLang(l)
    localStorage.setItem('language', l)
  }

  const handleDelete = (id: number) => {
    if (!confirm(t('confirmDelete', lang))) return
    const all = JSON.parse(localStorage.getItem('requests') || '[]')
    const updated = all.filter((r: any) => r.id !== id)
    localStorage.setItem('requests', JSON.stringify(updated))
    setAllRaw(updated)
    setRequests(prev => prev.filter(r => r.id !== String(id)))
    setSelected(null)
  }

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const all = JSON.parse(localStorage.getItem('requests') || '[]')
    const newStatus = currentStatus === 'open' ? 'closed' : 'open'
    const updated = all.map((r: any) => r.id === id ? { ...r, status: newStatus } : r)
    localStorage.setItem('requests', JSON.stringify(updated))
    setAllRaw(updated)
    setSelected((prev: any) => prev ? { ...prev, status: newStatus } : prev)
  }

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  const filtered = requests.filter(r => {
    const f = activeFilter
    const matchFilter =
      f === t('filterAll', lang)    ? true :
      f === t('filterActive', lang) ? r.status === 'active'  :
      f === t('filterPend', lang)   ? r.status === 'pending' :
      f === t('filterDraft', lang)  ? r.status === 'draft'   :
      f === t('filterDone', lang)   ? r.status === 'done'    : true
    const matchSearch = r.name.includes(search) || r.id.includes(search)
    return matchFilter && matchSearch
  })

  const stats = {
    active:  requests.filter(r => r.status === 'active').length,
    quotes:  requests.reduce((a, r) => a + r.quotes, 0),
    minPrice: 18500,
    drafts:  requests.filter(r => r.status === 'draft').length,
  }

  const getRequestQuotes = (id: number) => quotes.filter((q: any) => q.requestId === id)
  const getRequestLogs   = (id: number) => activityLogs
    .filter((l: any) => l.requestId === id)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-cairo" dir={dir}>

      {/* TOPBAR */}
      <nav className="bg-white border-b border-[#E2EAF2] px-7 flex items-center justify-between h-14 sticky top-0 z-20">
        <div className="text-[17px] font-bold text-[#0F4C75]">Build<span className="text-[#1B9AAA]">Pro</span></div>
        <div className="flex gap-1">
          {[
            { labelAr: 'لوحة التحكم', labelEn: 'Dashboard',   href: '/dashboard'  },
            { labelAr: 'طلباتي',      labelEn: 'My Requests',  href: '/my-requests'},
            { labelAr: 'عروض الأسعار', labelEn: 'Quotes',      href: '/quotes'     },
            { labelAr: 'الموردون',    labelEn: 'Suppliers',    href: '/suppliers'  },
            { labelAr: 'المسودات',    labelEn: 'Drafts',       href: '/drafts'     },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                item.href === '/dashboard'
                  ? 'bg-[#EBF5FF] text-[#0F4C75] font-semibold'
                  : 'text-slate-600 hover:bg-[#F0F4F8] hover:text-[#0F4C75]'
              }`}>
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} setLang={handleLangChange} />
          <button className="relative w-9 h-9 rounded-lg border border-[#E2EAF2] flex items-center justify-center hover:bg-[#F0F4F8] transition-colors">
            <span className="text-slate-500 text-base">🔔</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-[#0F4C75] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
            {userName.charAt(0)}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="bg-[#0F4C75] px-7 pt-6 pb-0">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">{new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <h1 className="text-white text-xl font-bold mb-1">{t('hello', lang)} {userName}</h1>
            <p className="text-white/50 text-xs">{t('heroSub', lang)} {stats.quotes} {t('heroSub2', lang)}</p>
          </div>
          <Link href="/create-request"
            className="mb-4 bg-[#1B9AAA] hover:bg-[#158494] text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
            <span className="text-base">+</span> {t('newRequest', lang)}
          </Link>
        </div>
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${
                activeFilter === f ? 'text-white border-[#1B9AAA]' : 'text-white/40 border-transparent hover:text-white/70'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 px-7 py-5">
        {[
          { icon: '📋', iconBg: 'bg-blue-50',    val: stats.active,                    label: t('activeReqs', lang),  badge: t('thisMonth', lang),  badgeCls: 'bg-emerald-50 text-emerald-700' },
          { icon: '📥', iconBg: 'bg-teal-50',    val: stats.quotes,                    label: t('incomingQ', lang),   badge: t('unread', lang),     badgeCls: 'bg-blue-50 text-[#1B9AAA]'      },
          { icon: '💰', iconBg: 'bg-emerald-50', val: stats.minPrice.toLocaleString(), label: t('lowestPrice', lang), badge: null,                  badgeCls: ''                               },
          { icon: '✏️', iconBg: 'bg-amber-50',   val: stats.drafts,                    label: t('savedDrafts', lang), badge: t('expireSoon', lang), badgeCls: 'bg-amber-50 text-amber-700'     },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#E2EAF2] rounded-xl p-4 relative">
            <div className={`w-9 h-9 ${s.iconBg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{s.val}</div>
            <div className="text-[11px] text-slate-500 mt-1">{s.label}</div>
            {s.badge && <span className={`absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeCls}`}>{s.badge}</span>}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-[1fr_268px] gap-4 px-7 pb-8">

        {/* جدول الطلبات */}
        <div className="bg-white border border-[#E2EAF2] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <span className="text-sm font-bold text-slate-900">{t('pricingReqs', lang)}</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2EAF2] rounded-lg px-3 py-1.5 w-44">
                <span className="text-slate-300 text-sm">🔍</span>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('search', lang)}
                  className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-slate-300"
                  style={{ color: '#334155', backgroundColor: 'transparent' }} />
              </div>
              <Link href="/create-request"
                className="bg-[#0F4C75] hover:bg-[#0D3F63] text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                {t('addNew', lang)}
              </Link>
            </div>
          </div>
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '92px' }} />
              <col />
              <col style={{ width: '100px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '105px' }} />
              <col style={{ width: '72px' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#FAFBFC] border-b border-[#F1F5F9]">
                {[t('reqId',lang), t('reqName',lang), t('status',lang), t('quotesCol',lang), t('deadline',lang), ''].map((h, i) => (
                  <th key={i} className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-2.5 text-right"
                    style={i === 3 ? { textAlign: 'center' } : {}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-400 text-sm py-10">{t('noRequests', lang)}</td></tr>
              ) : (
                filtered.map(req => (
                  <tr key={req.id} className="border-b border-[#F8FAFC] hover:bg-[#FAFBFD] transition-colors">
                    <td className="px-4 py-3"><span className="text-[10px] text-[#1B9AAA] font-semibold font-mono">{req.id}</span></td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-slate-900">{req.name}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {req.tags.map((tg, i) => (
                          <span key={`${req.id}-${tg}-${i}`} className="text-[10px] bg-[#F0F9FF] text-[#0369A1] px-1.5 py-0.5 rounded font-medium">{tg}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={req.status} lang={lang} /></td>
                    <td className="px-4 py-3 text-center"><QuotesBadge count={req.quotes} status={req.status} /></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-600">⏱ {req.deadline}</span></td>
                    <td className="px-4 py-3">
                      {req.status === 'draft' ? (
                        <Link href={`/edit-request/${req.id}`} className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-1 hover:bg-amber-100 transition-colors">{t('edit', lang)}</Link>
                      ) : req.status === 'done' ? (
                        <Link href="/my-requests" className="text-[11px] font-semibold text-purple-600 bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1 hover:bg-purple-100 transition-colors">{t('archive', lang)}</Link>
                      ) : (
                        <button onClick={() => { const raw = allRaw.find((r: any) => String(r.id) === req.id); setSelected(raw || null) }}
                          className="text-[11px] font-semibold text-[#0F4C75] bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1 hover:bg-blue-100 transition-colors">
                          {t('view', lang)}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* سايدبار */}
        <div className="flex flex-col gap-3.5">
          <div className="bg-[#0F4C75] rounded-xl p-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl mb-3">📄</div>
            <div className="text-white text-sm font-bold mb-1">{t('ctaTitle', lang)}</div>
            <div className="text-white/50 text-xs">{t('ctaSub', lang)}</div>
            <Link href="/create-request" className="mt-3 block bg-[#1B9AAA] hover:bg-[#158494] text-white text-xs font-semibold text-center px-3 py-2 rounded-lg transition-colors">{t('startNow', lang)}</Link>
          </div>

          <div className="bg-white border border-[#E2EAF2] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-slate-900">{t('latestUpdates', lang)}</span>
              <span className="text-[10px] text-[#1B9AAA] font-semibold cursor-pointer">{t('viewAll', lang)}</span>
            </div>
            {NOTIFICATIONS.map(n => (
              <div key={n.id} className="flex gap-2.5 px-3.5 py-2.5 border-b border-[#F8FAFC] hover:bg-[#FAFBFD] cursor-pointer last:border-0">
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    <strong className="font-bold text-slate-900">{lang === 'ar' ? n.boldAr : n.boldEn}</strong>
                    {lang === 'ar' ? n.textAr : n.textEn}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                </div>
                {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#1B9AAA] shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#E2EAF2] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-slate-900">{t('topSuppliers', lang)}</span>
              <span className="text-[10px] text-[#1B9AAA] font-semibold cursor-pointer">{t('viewAll', lang)}</span>
            </div>
            {SUPPLIERS.map(s => (
              <div key={s.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#F8FAFC] last:border-0">
                <div className="w-9 h-9 rounded-lg bg-[#EBF5FF] border border-[#BFDBFE] flex items-center justify-center text-[11px] font-bold text-[#1D4ED8] shrink-0">{s.initials}</div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{s.name}</div>
                  <div className="text-[10px] text-slate-500">{s.city}</div>
                </div>
                <div className="text-xs text-amber-400 mr-auto">{'★'.repeat(s.stars)}{'☆'.repeat(5 - s.stars)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#E2EAF2] rounded-xl overflow-hidden">
            <div className="px-3.5 py-3 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-slate-900">{t('monthActivity', lang)}</span>
            </div>
            <div className="px-3.5 py-3 flex flex-col gap-3">
              {[
                { labelAr: 'طلبات مرسلة',  labelEn: 'Sent Requests',  val: '12 / 16', pct: 75, color: 'bg-[#1B9AAA]'  },
                { labelAr: 'عروض مستلمة',  labelEn: 'Received Quotes', val: '47 / 80', pct: 59, color: 'bg-blue-500'   },
                { labelAr: 'صفقات مكتملة', labelEn: 'Closed Deals',   val: '3 / 12',  pct: 25, color: 'bg-purple-500' },
              ].map(p => (
                <div key={p.labelAr}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-slate-700 font-medium">{lang === 'ar' ? p.labelAr : p.labelEn}</span>
                    <span className="text-[11px] text-slate-400">{p.val}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{t('reqDetails', lang)}</h2>
                <span className="text-[#1B9AAA] font-bold text-sm">#{selected.id}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${selected.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                  {selected.status === 'open' ? t('open', lang) : t('closed', lang)}
                </span>
                {selected.location && <span className="text-slate-500 text-sm">📍 {selected.location}</span>}
                {selected.deadline && <span className="text-slate-500 text-sm">📅 {selected.deadline}</span>}
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-100 text-lg">✕</button>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">{t('materials', lang)}</h3>
              {selected.materials && selected.materials.length > 0 ? (
                <div className="overflow-x-auto mb-5 border border-slate-200 rounded-xl">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {['#', t('matType',lang), t('usage',lang), t('size',lang), t('thickness',lang), t('finish',lang), t('color',lang), t('qty',lang), t('targetPrice',lang), t('origin',lang), t('deliveryDate',lang), t('itemNote',lang), t('images',lang)].map(h => (
                          <th key={h} className="border border-slate-300 bg-[#0F4C75] px-3 py-2 text-right text-white font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.materials.map((m: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F0F7FF]'}>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{i+1}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.type || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.usage || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.size || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.thickness || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.finish || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.color || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.quantity ? `${m.quantity} ${m.unit || 'm²'}` : '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.targetPrice ? `${m.targetPrice} ${m.currency || t('sar',lang)}` : '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.origin || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold">{m.deliveryDate || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-900 font-bold max-w-[120px]">{m.note || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2">
                            {m.images && m.images.length > 0 ? (
                              <div className="flex gap-1">
                                {m.images.map((img: string, j: number) => (
                                  <img key={j} src={img} alt="" className="w-10 h-10 object-cover rounded border border-slate-200 cursor-zoom-in"
                                    onClick={e => { e.stopPropagation(); setLightbox(img) }} />
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
                <div className="bg-slate-50 rounded-xl p-4 mb-5 text-sm text-slate-700 space-y-1">
                  {selected.ceramic   > 0 && <p>• {t('ceramic',lang)}: {selected.ceramic} m²</p>}
                  {selected.porcelain > 0 && <p>• {t('porcelain',lang)}: {selected.porcelain} m²</p>}
                  {selected.marble    > 0 && <p>• {t('marble',lang)}: {selected.marble} m²</p>}
                  {selected.granite   > 0 && <p>• {t('granite',lang)}: {selected.granite} m²</p>}
                  {selected.terrazzo  > 0 && <p>• {t('terrazzo',lang)}: {selected.terrazzo} m²</p>}
                </div>
              )}

              {selected.description && (
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{t('description', lang)}</h3>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">{selected.description}</div>
                </div>
              )}

              <h3 className="text-sm font-bold text-slate-900 mb-3">{t('quotesSection', lang)} ({getRequestQuotes(selected.id).length})</h3>
              {getRequestQuotes(selected.id).length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-400 text-center mb-5">{t('noQuotes', lang)}</div>
              ) : (
                <div className="mb-5 flex flex-col gap-3">
                  {getRequestQuotes(selected.id).map((q: any) => (
                    <div key={q.id} className={`border rounded-xl p-4 ${q.status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : q.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{q.supplierCompany}</p>
                          <p className="text-xs text-slate-500">{q.supplierName}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                          {q.status === 'accepted' ? t('accepted',lang) : q.status === 'rejected' ? t('rejected',lang) : t('pending',lang)}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{q.totalPrice?.toLocaleString()} {t('sar',lang)}</p>
                      <p className="text-xs text-slate-500 mt-1">{t('deliveryDays',lang)} {q.deliveryDays} {t('days',lang)}</p>
                      {q.description && <p className="text-xs text-slate-500 mt-1">{q.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              {getRequestLogs(selected.id).length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">{t('activityLog', lang)}</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    {getRequestLogs(selected.id).map((log: any, i: number) => (
                      <div key={log.id} className={`flex justify-between items-center px-4 py-3 text-xs border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <span className="text-slate-700">
                          {log.action.includes('قبول') ? '✅' : log.action.includes('رفض') ? '❌' : log.action.includes('إغلاق') ? '🔒' : log.action.includes('فتح') ? '🔓' : '📋'} {lang === 'ar' ? log.action : log.actionEn}
                        </span>
                        <span className="text-slate-400 whitespace-nowrap mr-4">{new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setSelected(null)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">{t('close', lang)}</button>
              <button onClick={() => handleToggleStatus(selected.id, selected.status)}
                className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition-colors ${selected.status === 'open' ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                {selected.status === 'open' ? t('closeReq', lang) : t('openReq', lang)}
              </button>
              <Link href={`/create-request?edit=${selected.id}`} className="flex-1 bg-[#1B9AAA] text-white font-semibold py-2.5 rounded-xl text-sm text-center hover:bg-[#158494] transition-colors">{t('edit', lang)}</Link>
              <button onClick={() => handleDelete(selected.id)} className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors">{t('delete', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} className="absolute top-5 left-5 bg-red-500 text-white px-4 py-2 rounded-lg font-bold">✕</button>
        </div>
      )}

    </div>
  )
}