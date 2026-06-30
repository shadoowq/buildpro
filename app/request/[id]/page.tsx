'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Lang = 'ar' | 'en';

interface Request {
  id: number;
  contractorId: string;
  projectName?: string;
  ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  materials?: any[];
  location: string; deadline: string;
  budget: number; description: string;
  status: 'open' | 'closed' | 'completed';
  createdAt: string;
}

export default function RequestDetails() {
  const [lang, setLang] = useState<Lang>('ar');
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();
  const params = useParams();
  const requestId = parseInt(params.id as string);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const user = JSON.parse(userData);
    if (user.name) setUserName(user.name);

    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const found = allRequests.find((req: Request) => req.id === requestId);
    setRequest(found || null);
    setLoading(false);

    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const interval = setInterval(() => {
      const nl = localStorage.getItem('language') as Lang || 'ar';
      setLang(prev => prev !== nl ? nl : prev);
    }, 100);
    return () => clearInterval(interval);
  }, [requestId, router]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const tr = (ar: string, en: string) => lang === 'ar' ? ar : en;

  if (loading) return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-cairo" dir={dir}>

      {/* TOPBAR */}
      <nav className="bg-white border-b border-[#E2EAF2] px-7 flex items-center justify-between h-14 sticky top-0 z-20">
        <div className="text-[17px] font-bold text-[#0F4C75]">Build<span className="text-[#1B9AAA]">Pro</span></div>
        <div className="flex gap-1">
          {[
            { labelAr: 'لوحة التحكم', labelEn: 'Dashboard',   href: '/dashboard'   },
            { labelAr: 'طلباتي',      labelEn: 'My Requests', href: '/my-requests' },
            { labelAr: 'عروض الأسعار',labelEn: 'Quotes',      href: '/my-quotes'   },
            { labelAr: 'المسودات',    labelEn: 'Drafts',      href: '/drafts'      },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-slate-600 hover:bg-[#F0F4F8] hover:text-[#0F4C75] transition-colors">
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => { localStorage.setItem('language', l); setLang(l); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="20" height="14" alt={l} className="rounded-sm" />
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#0F4C75] flex items-center justify-center text-white text-xs font-bold">
            {userName.charAt(0) || 'م'}
          </div>
          <button
            onClick={() => { localStorage.removeItem('currentUser'); window.location.href = '/login'; }}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {lang === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="bg-[#0F4C75] px-7 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1">
              {request
                ? (request.projectName?.trim() || `${tr('طلب', 'Request')} #${request.id}`)
                : tr('الطلب غير موجود', 'Request Not Found')}
            </h1>
            {request && (
              <p className="text-white/50 text-xs">
                #{request.id} · {request.location || '—'} · {request.status === 'open' ? tr('مفتوح', 'Open') : tr('مغلق', 'Closed')}
              </p>
            )}
          </div>
          <button onClick={() => router.push('/my-requests')}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            ← {tr('العودة', 'Back')}
          </button>
        </div>
      </div>

      <div className="px-7 py-6">
        {!request ? (
          <div className="bg-white border border-[#E2EAF2] rounded-2xl p-10 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">❌</div>
            <h2 className="text-slate-700 font-bold text-base mb-2">{tr('الطلب غير موجود', 'Request Not Found')}</h2>
            <p className="text-slate-400 text-sm mb-5">{tr('لم يتم العثور على هذا الطلب', 'This request could not be found')}</p>
            <button onClick={() => router.push('/my-requests')}
              className="bg-[#0F4C75] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0D3F63]">
              {tr('العودة للطلبات', 'Back to Requests')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* status + meta card */}
            <div className="bg-white border border-[#E2EAF2] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">{tr('معلومات الطلب', 'Request Info')}</h2>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${request.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  {request.status === 'open' ? tr('مفتوح', 'Open') : tr('مغلق', 'Closed')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { icon: '📍', label: tr('الموقع', 'Location'), val: request.location || '—' },
                  { icon: '⏱', label: tr('الموعد', 'Deadline'), val: request.deadline || '—' },
                  { icon: '💰', label: tr('الميزانية', 'Budget'), val: request.budget ? `${Number(request.budget).toLocaleString()} ${tr('ر.س', 'SAR')}` : '—' },
                  { icon: '📅', label: tr('تاريخ الإنشاء', 'Created'), val: new Date(request.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US') },
                ].map((item, i) => (
                  <div key={i} className="bg-[#F8FAFC] rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 mb-1">{item.icon} {item.label}</p>
                    <p className="text-sm font-bold text-slate-900">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* materials */}
            <div className="bg-white border border-[#E2EAF2] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-4">{tr('المواد المطلوبة', 'Required Materials')}</h2>
              {request.materials && request.materials.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#0F4C75] text-white">
                        {['#', tr('النوع','Type'), tr('الاستخدام','Usage'), tr('المقاس','Size'), tr('الكمية','Qty'), tr('السعر المستهدف','Target Price'), tr('الصناعة','Origin')].map(h => (
                          <th key={h} className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {request.materials.map((m: any, i: number) => (
                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{m.type || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{m.usage || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{m.size || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{m.quantity ? `${m.quantity} ${m.unit || 'م²'}` : '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{m.origin || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm text-slate-600">
                  {request.ceramic > 0 && <p>• {tr('سيراميك','Ceramic')}: <strong>{request.ceramic} m²</strong></p>}
                  {request.porcelain > 0 && <p>• {tr('بورسلان','Porcelain')}: <strong>{request.porcelain} m²</strong></p>}
                  {request.marble > 0 && <p>• {tr('رخام','Marble')}: <strong>{request.marble} m²</strong></p>}
                  {request.granite > 0 && <p>• {tr('جرانيت','Granite')}: <strong>{request.granite} m²</strong></p>}
                  {request.terrazzo > 0 && <p>• {tr('تيرازو','Terrazzo')}: <strong>{request.terrazzo} m²</strong></p>}
                </div>
              )}
            </div>

            {/* description */}
            {request.description && (
              <div className="bg-white border border-[#E2EAF2] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-3">{tr('الوصف', 'Description')}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{request.description}</p>
              </div>
            )}

            {/* quotes placeholder */}
            <div className="bg-white border border-[#E2EAF2] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-3">{tr('عروض الأسعار', 'Quotes')}</h2>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl mb-3">📭</div>
                <p className="text-slate-400 text-sm">{tr('لا توجد عروض أسعار بعد', 'No quotes yet')}</p>
              </div>
            </div>

            {/* back button */}
            <button onClick={() => router.push('/my-requests')}
              className="w-full bg-[#0F4C75] hover:bg-[#0D3F63] text-white font-semibold py-3 rounded-xl text-sm transition-colors">
              {tr('العودة لطلباتي', 'Back to My Requests')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
