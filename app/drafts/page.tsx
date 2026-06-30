'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Lang = 'ar' | 'en';

interface MaterialRow {
  id: number; type: string; typePending: string;
  usage: string; quantity: string; unit: string;
  [key: string]: any;
}

interface Draft {
  id: number;
  contractorId: string;
  projectName?: string;
  materials: MaterialRow[];
  location: string;
  deadline: string;
  description: string;
  selectedSuppliers: string[];
  savedAt: string;
}

function t(ar: string, en: string, lang: Lang) { return lang === 'ar' ? ar : en; }

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {(['ar', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
          <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="20" height="14" alt={l} className="rounded-sm" />
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function Drafts() {
  const [lang, setLang] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [search, setSearch] = useState('');
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'contractor') { router.push('/dashboard'); return; }
    setUser(parsedUser);
    if (parsedUser.name) setUserName(parsedUser.name);

    const allDrafts = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
    const myDrafts = allDrafts.filter((d: Draft) => d.contractorId === parsedUser.email);
    setDrafts(myDrafts.sort((a: Draft, b: Draft) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));

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

  const handleContinue = (draft: Draft) => {
    localStorage.setItem('createRequestDraft', JSON.stringify({
      projectName: draft.projectName || '',
      materials: draft.materials,
      location: draft.location,
      deadline: draft.deadline,
      description: draft.description,
      selectedSuppliers: draft.selectedSuppliers,
      attachedFiles: [],
    }));
    localStorage.setItem('currentDraftId', String(draft.id));
    localStorage.setItem('loadingFromDraft', 'true');
    router.push(`/create-request?draft=${draft.id}`);
  };

  const handleDelete = (draftId: number) => {
    if (!confirm(t('هل أنت متأكد من حذف هذه المسودة؟', 'Are you sure you want to delete this draft?', lang))) return;
    const allDrafts = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
    const updated = allDrafts.filter((d: Draft) => d.id !== draftId);
    localStorage.setItem('requestDrafts', JSON.stringify(updated));
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const getDraftName = (draft: Draft) => {
    if (draft.projectName?.trim()) return draft.projectName.trim();
    const valid = draft.materials.filter(m => m.type?.trim() || m.typePending?.trim());
    if (valid.length === 0) return t('مسودة بدون اسم', 'Unnamed Draft', lang);
    return valid.map(m => m.type || m.typePending).filter(Boolean).join('، ');
  };

  const getMaterialCount = (draft: Draft) =>
    draft.materials.filter(m => m.type?.trim() || m.typePending?.trim()).length;

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  const filtered = drafts.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getDraftName(d).toLowerCase().includes(q) || d.location?.toLowerCase().includes(q);
  });

  if (!user) return <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-cairo" dir={dir}>

      {/* ── TOPBAR ── */}
      <nav className="bg-white border-b border-[#E2EAF2] px-7 flex items-center justify-between h-14 sticky top-0 z-20">
        <div className="text-[17px] font-bold text-[#0F4C75]">Build<span className="text-[#1B9AAA]">Pro</span></div>
        <div className="flex gap-1">
          {[
            { labelAr: 'لوحة التحكم', labelEn: 'Dashboard',   href: '/dashboard'  },
            { labelAr: 'طلباتي',      labelEn: 'My Requests', href: '/my-requests'},
            { labelAr: 'عروض الأسعار',labelEn: 'Quotes',      href: '/my-quotes'  },
            { labelAr: 'الموردون',    labelEn: 'Suppliers',   href: '/suppliers'  },
            { labelAr: 'المسودات',    labelEn: 'Drafts',      href: '/drafts'     },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${item.href === '/drafts' ? 'bg-[#EBF5FF] text-[#0F4C75] font-semibold' : 'text-slate-600 hover:bg-[#F0F4F8] hover:text-[#0F4C75]'}`}>
              {lang === 'ar' ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} setLang={handleLangChange} />
          <div className="w-9 h-9 rounded-lg bg-[#0F4C75] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
            {userName.charAt(0) || 'م'}
          </div>
          <button
            onClick={() => { localStorage.removeItem('currentUser'); router.push('/login'); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {lang === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="bg-[#0F4C75] px-7 pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs mb-1">
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-white text-xl font-bold mb-1">
              {t('مسوداتي', 'My Drafts', lang)}
            </h1>
            <p className="text-white/50 text-xs">
              {drafts.length} {t('مسودة محفوظة', 'saved drafts', lang)}
            </p>
          </div>
          <Link href="/create-request"
            className="bg-[#1B9AAA] hover:bg-[#158494] text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
            <span className="text-base">+</span> {t('طلب جديد', 'New Request', lang)}
          </Link>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-3 gap-3 px-7 py-5">
        {[
          { icon: '✏️', bg: 'bg-amber-50',   val: drafts.length,                                               label: t('إجمالي المسودات', 'Total Drafts', lang) },
          { icon: '📋', bg: 'bg-blue-50',    val: drafts.reduce((s, d) => s + getMaterialCount(d), 0),         label: t('إجمالي المواد', 'Total Materials', lang) },
          { icon: '📍', bg: 'bg-emerald-50', val: [...new Set(drafts.map(d => d.location).filter(Boolean))].length, label: t('مدن مختلفة', 'Different Cities', lang) },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#E2EAF2] rounded-xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{s.val}</div>
            <div className="text-[11px] text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="px-7 pb-10">
        <div className="bg-white border border-[#E2EAF2] rounded-2xl overflow-hidden">

          {/* search bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <span className="text-sm font-bold text-slate-900">{t('المسودات المحفوظة', 'Saved Drafts', lang)}</span>
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2EAF2] rounded-lg px-3 py-1.5 w-56">
              <span className="text-slate-300 text-sm">🔍</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('ابحث عن مسودة...', 'Search drafts...', lang)}
                className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-slate-300 text-slate-700" />
            </div>
          </div>

          {/* empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mb-4">✏️</div>
              <h3 className="text-slate-700 font-bold text-base mb-1">
                {search ? t('لا توجد نتائج', 'No results found', lang) : t('لا توجد مسودات', 'No Drafts Yet', lang)}
              </h3>
              <p className="text-slate-400 text-sm mb-5">
                {t('لما تحفظ طلب كمسودة هيظهر هنا', 'When you save a request as draft it will appear here', lang)}
              </p>
              <Link href="/create-request"
                className="bg-[#0F4C75] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0D3F63] transition-colors">
                {t('+ إنشاء طلب جديد', '+ Create New Request', lang)}
              </Link>
            </div>
          )}

          {/* drafts list */}
          {filtered.length > 0 && (
            <div className="divide-y divide-[#F8FAFC]">
              {filtered.map(draft => {
                const matCount = getMaterialCount(draft);
                const suppCount = draft.selectedSuppliers?.length || 0;
                return (
                  <div key={draft.id} className="px-5 py-4 hover:bg-[#FAFBFD] transition-colors group">
                    <div className="flex items-start justify-between gap-4">

                      {/* left: icon + info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5">
                          📝
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* name */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[13px] font-bold text-slate-900 truncate">{getDraftName(draft)}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              {t('مسودة', 'Draft', lang)}
                            </span>
                          </div>

                          {/* meta row */}
                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400">
                            {draft.location && (
                              <span className="flex items-center gap-1">📍 {draft.location}</span>
                            )}
                            {draft.deadline && (
                              <span className="flex items-center gap-1">⏱ {draft.deadline}</span>
                            )}
                            <span className="flex items-center gap-1">
                              📋 {matCount} {t('مادة', 'material(s)', lang)}
                            </span>
                            {suppCount > 0 && (
                              <span className="flex items-center gap-1">
                                👥 {suppCount} {t('مورد', 'supplier(s)', lang)}
                              </span>
                            )}
                          </div>

                          {/* description snippet */}
                          {draft.description && (
                            <p className="text-[11px] text-slate-400 mt-1 truncate">{draft.description}</p>
                          )}

                          {/* save time */}
                          <p className="text-[10px] text-slate-300 mt-1">
                            {t('حُفظت:', 'Saved:', lang)} {formatDate(draft.savedAt)} {formatTime(draft.savedAt)}
                          </p>
                        </div>
                      </div>

                      {/* right: actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleContinue(draft)}
                          className="text-xs font-semibold px-4 py-2 bg-[#0F4C75] text-white rounded-xl hover:bg-[#0D3F63] transition-colors">
                          {t('استكمال', 'Continue', lang)}
                        </button>
                        <button onClick={() => handleDelete(draft.id)}
                          className="text-xs font-semibold px-3 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
                          {t('حذف', 'Delete', lang)}
                        </button>
                      </div>
                    </div>

                    {/* material tags */}
                    {matCount > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-3 mr-13" style={{ marginInlineStart: '52px' }}>
                        {draft.materials
                          .filter(m => m.type?.trim() || m.typePending?.trim())
                          .slice(0, 6)
                          .map((m, i) => (
                            <span key={i} className="text-[10px] bg-[#F0F9FF] text-[#0369A1] px-2 py-0.5 rounded-md font-medium">
                              {m.type || m.typePending}
                              {m.quantity ? ` · ${m.quantity} ${m.unit || 'م²'}` : ''}
                            </span>
                          ))}
                        {matCount > 6 && (
                          <span className="text-[10px] text-slate-400 px-2 py-0.5">+{matCount - 6}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
