'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import SupplierNav from '../components/SupplierNav'
import { displayVal, getDeadlineUrgency, formatDay } from '../lib/requestHelpers'
import { getCityName } from '../lib/translations'

type Lang = 'ar' | 'en'

const T = {
  hello:        { ar: 'أهلاً،',              en: 'Welcome,'             },
  heroSubN:     { ar: (n: number) => `${n} طلب جديد بانتظار عرضك`, en: (n: number) => `${n} new request${n > 1 ? 's' : ''} awaiting your quote` },
  heroSubZero:  { ar: 'لا توجد طلبات جديدة بانتظارك الآن', en: 'No new requests waiting on you right now' },
  browseReqs:   { ar: 'تصفح الطلبات المتاحة', en: 'Browse Available Requests' },
  quotesSub:    { ar: 'عروض مقدَّمة',          en: 'Quotes Submitted'    },
  acceptRate:   { ar: 'نسبة القبول',          en: 'Acceptance Rate'     },
  acceptedVal:  { ar: 'قيمة العروض المقبولة', en: 'Value of Accepted Quotes' },
  newAvail:     { ar: 'طلبات جديدة متاحة',    en: 'New Available Requests' },
  sar:          { ar: 'ر.س',                 en: 'SAR'                  },
  availReqs:    { ar: 'الطلبات المتاحة لك',   en: 'Requests Available to You' },
  viewAll:      { ar: 'عرض الكل',             en: 'View All'             },
  reqId:        { ar: 'رقم الطلب',            en: 'Request ID'           },
  reqName:      { ar: 'الطلب',               en: 'Request'              },
  city:         { ar: 'المدينة',              en: 'City'                 },
  status:       { ar: 'الحالة',               en: 'Status'               },
  deadline:     { ar: 'الموعد',               en: 'Deadline'             },
  noRequests:   { ar: 'لا توجد طلبات متاحة لك حالياً', en: 'No requests available to you right now' },
  view:         { ar: 'عرض',                 en: 'View'                 },
  quoted:       { ar: 'تم التقديم',           en: 'Quoted'               },
  notQuoted:    { ar: 'لم يُقدَّم بعد',        en: 'Not Quoted'           },
  needsAction:  { ar: 'يتطلب إجراء',          en: 'Action Needed'        },
  revisionBanner: { ar: (n: number) => `لديك ${n === 1 ? 'طلب تعديل واحد ينتظر' : `${n} طلبات تعديل تنتظر`} ردك`, en: (n: number) => `${n} revision request${n > 1 ? 's are' : ' is'} waiting for your reply` },
  reviewNow:    { ar: 'راجعها الآن ←',         en: 'Review now →'         },
  perf:         { ar: 'أداء عروضي',           en: 'My Quote Performance' },
  pending:      { ar: 'قيد الانتظار',         en: 'Pending'              },
  accepted:     { ar: 'مقبولة',               en: 'Accepted'             },
  rejected:     { ar: 'مرفوضة',               en: 'Rejected'             },
  revision:     { ar: 'طلب تعديل',            en: 'Revision Requested'   },
  noQuotesYet:  { ar: 'لم تقدّم أي عروض بعد', en: 'No quotes submitted yet' },
  ratingsRec:   { ar: 'التقييمات التي حصلت عليها', en: 'Ratings Received' },
  noRatings:    { ar: 'لا توجد تقييمات بعد',  en: 'No ratings yet'       },
  req:          { ar: 'طلب',                 en: 'Request'              },
}

function tStr(key: keyof typeof T, lang: Lang, n?: number): string {
  const entry = T[key] as any
  const val = entry[lang]
  return typeof val === 'function' ? val(n ?? 0) : val
}

function ReqStatusPill({ quoted, urgent, lang, needsAction }: { quoted: boolean; urgent: boolean; lang: Lang; needsAction?: boolean }) {
  if (needsAction) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {tStr('needsAction', lang)}
      </span>
    )
  }
  if (quoted) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {tStr('quoted', lang)}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgent ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${urgent ? 'bg-amber-400' : 'bg-orange-400'}`} />
      {tStr('notQuoted', lang)}
    </span>
  )
}

export default function SupplierDashboardPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [userName, setUserName] = useState('المورد')
  const [userEmail, setUserEmail] = useState('')

  const [rawRequests, setRawRequests] = useState<any[]>([])
  const [allQuotes, setAllQuotes] = useState<any[]>([])
  const [ratings, setRatings] = useState<any[]>([])

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang
    if (savedLang) setLang(savedLang)

    const userData = localStorage.getItem('currentUser')
    if (userData) {
      try {
        const u = JSON.parse(userData)
        if (u.name) setUserName(u.name)
        if (u.email) setUserEmail(u.email)
      } catch {}
    }

    try { setRawRequests(JSON.parse(localStorage.getItem('requests') || '[]')) } catch {}
    try { setAllQuotes(JSON.parse(localStorage.getItem('quotes') || '[]')) } catch {}
    try { setRatings(JSON.parse(localStorage.getItem('ratings') || '[]')) } catch {}
  }, [])

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l) }

  /* ── my data ── */
  const myQuotes = allQuotes.filter(q => q.supplierId === userEmail)
  const myRatings = ratings.filter(r => r.supplierId === userEmail)
  const availableRequests = rawRequests.filter(r => r.selectedSuppliers?.includes(userEmail) && r.status === 'open')

  const hasQuoted = (reqId: number) => myQuotes.some(q => q.requestId === reqId)

  const getReqName = (r: any) => {
    if (r.projectName?.trim()) return r.projectName.trim()
    if (r.materials?.length > 0) {
      const types = [...new Set(r.materials.map((m: any) => m.type || m.typePending).filter(Boolean))] as string[]
      if (types.length > 0) return types.map(tp => displayVal(tp, lang)).join(' — ')
    }
    const parts: string[] = []
    if (r.ceramic > 0) parts.push(`${lang === 'ar' ? 'سيراميك' : 'Ceramic'} ${r.ceramic}m²`)
    if (r.porcelain > 0) parts.push(`${lang === 'ar' ? 'بورسلان' : 'Porcelain'} ${r.porcelain}m²`)
    if (r.marble > 0) parts.push(`${lang === 'ar' ? 'رخام' : 'Marble'} ${r.marble}m²`)
    if (r.granite > 0) parts.push(`${lang === 'ar' ? 'جرانيت' : 'Granite'} ${r.granite}m²`)
    if (r.terrazzo > 0) parts.push(`${lang === 'ar' ? 'تيرازو' : 'Terrazzo'} ${r.terrazzo}m²`)
    return parts.join(' — ') || `#${String(r.id).slice(-4)}`
  }

  /* ── stats ── */
  const acceptedQ = myQuotes.filter(q => q.status === 'accepted')
  const rejectedQ = myQuotes.filter(q => q.status === 'rejected')
  const pendingQ = myQuotes.filter(q => q.status === 'pending')
  const revisionQ = myQuotes.filter(q => q.status === 'revision')
  const decidedCount = acceptedQ.length + rejectedQ.length
  const acceptanceRate = decidedCount > 0 ? Math.round((acceptedQ.length / decidedCount) * 100) : null
  const acceptedValue = acceptedQ.reduce((s, q) => s + (Number(q.totalPrice) || 0), 0)
  const notYetQuotedCount = availableRequests.filter(r => !hasQuoted(r.id)).length

  const stats = [
    { icon: '📄', bg: 'bg-[#F3EAE0]', val: myQuotes.length, label: tStr('quotesSub', lang), badge: null as string | null },
    { icon: '📈', bg: 'bg-emerald-50', val: acceptanceRate !== null ? `${acceptanceRate}%` : '—', label: tStr('acceptRate', lang), badge: decidedCount > 0 ? `${acceptedQ.length}/${decidedCount}` : null },
    { icon: '💰', bg: 'bg-amber-50', val: acceptedValue.toLocaleString(), label: tStr('acceptedVal', lang), badge: acceptedQ.length > 0 ? tStr('sar', lang) : null },
    { icon: '📨', bg: 'bg-[#F3EAE0]', val: notYetQuotedCount, label: tStr('newAvail', lang), badge: notYetQuotedCount > 0 ? (lang === 'ar' ? 'جديد' : 'new') : null },
  ]

  /* ── action needed: quotes the contractor asked me to revise ── */
  const needsActionReqIds = new Set(revisionQ.map(q => q.requestId))

  /* ── table rows: action-needed first, then not-yet-quoted ── */
  const rowRank = (r: any) => needsActionReqIds.has(r.id) ? 0 : hasQuoted(r.id) ? 2 : 1
  const tableRows = [...availableRequests].sort((a, b) => rowRank(a) - rowRank(b))

  /* ── performance bars ── */
  const totalQ = Math.max(myQuotes.length, 1)
  const perfBars = [
    { key: 'pending', val: pendingQ.length, color: 'bg-orange-400' },
    { key: 'accepted', val: acceptedQ.length, color: 'bg-emerald-500' },
    { key: 'rejected', val: rejectedQ.length, color: 'bg-red-400' },
    { key: 'revision', val: revisionQ.length, color: 'bg-amber-500' },
  ] as { key: keyof typeof T; val: number; color: string }[]

  /* ── ratings ── */
  const avgRating = myRatings.length > 0 ? myRatings.reduce((s, r) => s + r.rating, 0) / myRatings.length : 0
  const recentRatings = [...myRatings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>

      <SupplierNav lang={lang} setLang={handleLangChange} userName={userName} active="/supplier-dashboard" />

      {/* HERO */}
      <div className="bg-[#C0603E] px-4 md:px-7 pt-6 pb-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-white/50 text-xs mb-1">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1">{tStr('hello', lang)} {userName}</h1>
            <p className="text-white/50 text-xs">
              {notYetQuotedCount > 0 ? tStr('heroSubN', lang, notYetQuotedCount) : tStr('heroSubZero', lang)}
            </p>
          </div>
          <Link href="/supplier-requests"
            className="mb-1 bg-[#8A7B6C] hover:bg-[#6F6255] text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
            {tStr('browseReqs', lang)}
          </Link>
        </div>
      </div>

      {/* ACTION REQUIRED BANNER */}
      {revisionQ.length > 0 && (
        <div className="mx-4 md:mx-7 mt-5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">✏</div>
            <p className="text-amber-900 font-semibold text-sm">{tStr('revisionBanner', lang, revisionQ.length)}</p>
          </div>
          <Link href="/my-quotes" className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-lg transition-colors">
            {tStr('reviewNow', lang)}
          </Link>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-7 py-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-[#E8DFD3] rounded-xl p-4 relative">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
            {s.badge && (
              <span className="absolute top-3 start-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {s.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_268px] gap-4 px-4 md:px-7 pb-8">

        {/* ── available requests table ── */}
        <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1EAE0]">
            <span className="text-sm font-bold text-stone-900">{tStr('availReqs', lang)}</span>
            <Link href="/supplier-requests" className="text-[11px] text-[#8A7B6C] font-semibold hover:underline">
              {tStr('viewAll', lang)}
            </Link>
          </div>
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '88px' }} />
              <col />
              <col style={{ width: '90px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '68px' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#FFFDF9] border-b border-[#F1EAE0]">
                {[tStr('reqId', lang), tStr('reqName', lang), tStr('city', lang), tStr('status', lang), tStr('deadline', lang), ''].map((h, i) => (
                  <th key={i} className={`text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-4 py-2.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-stone-400 text-sm py-12">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📭</span>
                      {tStr('noRequests', lang)}
                    </div>
                  </td>
                </tr>
              ) : (
                tableRows.map(r => {
                  const quoted = hasQuoted(r.id)
                  const urgency = getDeadlineUrgency(r.deadline, false)
                  const needsAction = needsActionReqIds.has(r.id)
                  return (
                    <tr key={r.id} className="border-b border-[#FAF7F2] hover:bg-[#FFFDF9] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-[#8A7B6C] font-semibold font-mono">{String(r.id).slice(-6)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold text-stone-900 truncate">{getReqName(r)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">{getCityName(r.location, lang)}</td>
                      <td className="px-4 py-3"><ReqStatusPill quoted={quoted} urgent={urgency === 'soon' || urgency === 'overdue'} lang={lang} needsAction={needsAction} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${urgency === 'overdue' ? 'text-red-600' : urgency === 'soon' ? 'text-amber-600' : 'text-stone-600 font-normal'}`}>
                          {urgency === 'overdue' ? '🔴' : urgency === 'soon' ? '🟠' : '⏱'} {formatDay(r.deadline, lang)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/supplier-requests?reqId=${r.id}`}
                          className="text-[11px] font-semibold text-[#C0603E] bg-[#F3EAE0] border border-[#E8DFD3] rounded-md px-2.5 py-1 hover:bg-[#EDE0D2] transition-colors">
                          {tStr('view', lang)}
                        </Link>
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

          {/* Quote Performance */}
          <div className="bg-white border border-[#E8DFD3] rounded-xl overflow-hidden">
            <div className="px-3.5 py-3 border-b border-[#F1EAE0]">
              <span className="text-xs font-bold text-stone-900">{tStr('perf', lang)}</span>
            </div>
            {myQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="text-2xl mb-2">📄</span>
                <p className="text-[11px] text-stone-400">{tStr('noQuotesYet', lang)}</p>
              </div>
            ) : (
              <div className="px-3.5 py-3 flex flex-col gap-3">
                {perfBars.map(p => (
                  <div key={p.key}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[11px] text-stone-700 font-medium">{tStr(p.key, lang)}</span>
                      <span className="text-[11px] text-stone-400" dir="ltr">{p.val} / {myQuotes.length}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-1.5 rounded-full transition-all ${p.color}`} style={{ width: `${Math.round((p.val / totalQ) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ratings Received */}
          <div className="bg-white border border-[#E8DFD3] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#F1EAE0]">
              <span className="text-xs font-bold text-stone-900">{tStr('ratingsRec', lang)}</span>
              {myRatings.length > 0 && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <span>{'★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating))}</span>
                  <span className="text-[9px] text-stone-400">({avgRating.toFixed(1)})</span>
                </span>
              )}
            </div>
            {recentRatings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <span className="text-2xl mb-2">⭐</span>
                <p className="text-[11px] text-stone-400">{tStr('noRatings', lang)}</p>
              </div>
            ) : (
              recentRatings.map(r => (
                <div key={r.id} className="px-3.5 py-2.5 border-b border-[#FAF7F2] last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400">{'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</span>
                    <span className="text-[9px] text-stone-400">{tStr('req', lang)} #{String(r.requestId).slice(-4)}</span>
                  </div>
                  {r.comment && <p className="text-[11px] text-stone-600 mt-1 truncate">{r.comment}</p>}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
