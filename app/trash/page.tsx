'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import { displayVal, restoreRequest, permanentlyDeleteRequest, purgeExpiredTrash, restoreDraft, permanentlyDeleteDraft, RequestLike } from '../lib/requestHelpers';
import { getCityName } from '../lib/translations';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

type Lang = 'ar' | 'en';

interface DraftLike {
  id: number; contractorId: string; projectName?: string;
  materials: any[]; location: string; deletedAt: string;
  [key: string]: any;
}

const RETENTION_DAYS = 30;

function t(ar: string, en: string, lang: Lang) { return lang === 'ar' ? ar : en; }

export default function Trash() {
  const router = useRouter();
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [lang, setLang] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [items, setItems] = useState<RequestLike[]>([]);
  const [draftItems, setDraftItems] = useState<DraftLike[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'contractor') { router.push('/dashboard'); return; }
    setUser(parsedUser);
    if (parsedUser.name) setUserName(parsedUser.name);

    purgeExpiredTrash(RETENTION_DAYS);
    const allDeleted = JSON.parse(localStorage.getItem('deletedRequests') || '[]');
    const mine = allDeleted.filter((r: RequestLike) => r.contractorId === parsedUser.email);
    setItems(mine.sort((a: RequestLike, b: RequestLike) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()));

    const allDeletedDrafts = JSON.parse(localStorage.getItem('deletedDrafts') || '[]');
    const myDrafts = allDeletedDrafts.filter((d: DraftLike) => d.contractorId === parsedUser.email);
    setDraftItems(myDrafts.sort((a: DraftLike, b: DraftLike) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()));

    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const getRequestName = (req: RequestLike) => {
    if (req.projectName?.trim()) return req.projectName.trim();
    if (req.materials?.length) {
      const types = [...new Set(req.materials.map((m: any) => m.type || m.typePending).filter(Boolean))];
      if (types.length) return types.map((tp: any) => displayVal(tp, lang)).join(' — ');
    }
    const parts: string[] = [];
    if (req.ceramic && req.ceramic > 0)     parts.push(`${t('سيراميك', 'Ceramic', lang)} ${req.ceramic}m²`);
    if (req.porcelain && req.porcelain > 0) parts.push(`${t('بورسلان', 'Porcelain', lang)} ${req.porcelain}m²`);
    if (req.marble && req.marble > 0)       parts.push(`${t('رخام', 'Marble', lang)} ${req.marble}m²`);
    if (req.granite && req.granite > 0)     parts.push(`${t('جرانيت', 'Granite', lang)} ${req.granite}m²`);
    if (req.terrazzo && req.terrazzo > 0)   parts.push(`${t('تيرازو', 'Terrazzo', lang)} ${req.terrazzo}m²`);
    return parts.join(' — ') || `#${String(req.id).slice(-4)}`;
  };

  const getDraftName = (draft: DraftLike) => {
    if (draft.projectName?.trim()) return draft.projectName.trim();
    const valid = (draft.materials || []).filter((m: any) => m.type?.trim() || m.typePending?.trim());
    if (valid.length === 0) return t('مسودة بدون اسم', 'Unnamed Draft', lang);
    return valid.map((m: any) => displayVal(m.type || m.typePending, lang)).filter(Boolean).join(lang === 'ar' ? '، ' : ', ');
  };

  const daysLeft = (deletedAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000);
    return Math.max(0, RETENTION_DAYS - elapsed);
  };

  const handleRestore = (id: number) => {
    restoreRequest(id);
    setItems(prev => prev.filter(r => r.id !== id));
    showToast(t('تم استرجاع الطلب', 'Request restored', lang));
  };

  const handlePermanentDelete = async (id: number) => {
    if (!(await confirmDialog(
      t('هذا الإجراء نهائي ولا يمكن التراجع عنه. هل تريد حذف الطلب نهائيًا؟', 'This is permanent and cannot be undone. Delete this request forever?', lang),
      { confirmText: t('حذف نهائي', 'Delete Forever', lang), danger: true }
    ))) return;
    permanentlyDeleteRequest(id);
    setItems(prev => prev.filter(r => r.id !== id));
    showToast(t('تم الحذف النهائي', 'Deleted permanently', lang));
  };

  const handleRestoreDraft = (id: number) => {
    restoreDraft(id);
    setDraftItems(prev => prev.filter(d => d.id !== id));
    showToast(t('تم استرجاع المسودة', 'Draft restored', lang));
  };

  const handlePermanentDeleteDraft = async (id: number) => {
    if (!(await confirmDialog(
      t('هذا الإجراء نهائي ولا يمكن التراجع عنه. هل تريد حذف المسودة نهائيًا؟', 'This is permanent and cannot be undone. Delete this draft forever?', lang),
      { confirmText: t('حذف نهائي', 'Delete Forever', lang), danger: true }
    ))) return;
    permanentlyDeleteDraft(id);
    setDraftItems(prev => prev.filter(d => d.id !== id));
    showToast(t('تم الحذف النهائي', 'Deleted permanently', lang));
  };

  const filtered = items.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getRequestName(r).toLowerCase().includes(q) || (r.location || '').toLowerCase().includes(q);
  });

  const filteredDrafts = draftItems.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getDraftName(d).toLowerCase().includes(q) || (d.location || '').toLowerCase().includes(q);
  });

  if (!user) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>

      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/trash" />

      {/* ── HERO ── */}
      <div className="bg-[var(--chrome)] px-7 pt-6 pb-5">
        <h1 className="text-white text-xl font-bold mb-1">{t('سلة المهملات', 'Trash', lang)}</h1>
        <p className="text-white/50 text-xs">
          {t(`الطلبات المحذوفة تُحذف نهائيًا بعد ${RETENTION_DAYS} يومًا`, `Deleted requests are permanently removed after ${RETENTION_DAYS} days`, lang)}
        </p>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 gap-3 px-7 py-5 max-w-xs">
        <div className="bg-white border border-[var(--line)] rounded-xl p-4">
          <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center text-base mb-3">🗑</div>
          <div className="text-2xl font-bold text-stone-900">{items.length + draftItems.length}</div>
          <div className="text-[11px] text-stone-500 mt-1">{t('عنصر في السلة', 'Items in trash', lang)}</div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-7 pb-10">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">

          {/* search bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line-soft)]">
            <span className="text-sm font-bold text-stone-900">{t('الطلبات المحذوفة', 'Deleted Requests', lang)}</span>
            <div className="flex items-center gap-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-3 py-1.5 w-56">
              <span className="text-stone-300 text-sm">🔍</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('ابحث...', 'Search...', lang)}
                className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-stone-300 text-stone-700" />
            </div>
          </div>

          {/* empty state */}
          {filtered.length === 0 && filteredDrafts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-3xl mb-4">🗑</div>
              <h3 className="text-stone-700 font-bold text-base mb-1">
                {search ? t('لا توجد نتائج', 'No results found', lang) : t('السلة فارغة', 'Trash is Empty', lang)}
              </h3>
              <p className="text-stone-400 text-sm mb-5">
                {t('ستظهر هنا الطلبات والمسودات المحذوفة', 'Deleted requests and drafts will appear here', lang)}
              </p>
              <Link href="/my-requests"
                className="bg-[var(--brand)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
                {t('← طلباتي', '← My Requests', lang)}
              </Link>
            </div>
          )}

          {/* list */}
          {filtered.length > 0 && (
            <div className="divide-y divide-[var(--line-soft)]">
              {filtered.map(req => {
                const left = daysLeft(req.deletedAt);
                return (
                  <div key={req.id} className="px-5 py-4 hover:bg-[var(--bg-soft)] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5">
                          🗑
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[13px] font-bold text-stone-900 truncate">{getRequestName(req)}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${left <= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                              {t(`${left} يوم متبقي`, `${left}d left`, lang)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-stone-400">
                            {req.location && <span className="flex items-center gap-1">📍 {getCityName(req.location, lang)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleRestore(req.id)}
                          className="text-xs font-semibold px-4 py-2 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
                          {t('استرجاع', 'Restore', lang)}
                        </button>
                        <button onClick={() => handlePermanentDelete(req.id)}
                          className="text-xs font-semibold px-3 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
                          {t('حذف نهائي', 'Delete Forever', lang)}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── DELETED DRAFTS ── */}
        {filteredDrafts.length > 0 && (
          <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden mt-4">
            <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
              <span className="text-sm font-bold text-stone-900">{t('المسودات المحذوفة', 'Deleted Drafts', lang)}</span>
            </div>
            <div className="divide-y divide-[var(--line-soft)]">
              {filteredDrafts.map(draft => {
                const left = daysLeft(draft.deletedAt);
                return (
                  <div key={draft.id} className="px-5 py-4 hover:bg-[var(--bg-soft)] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5">
                          📝
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[13px] font-bold text-stone-900 truncate">{getDraftName(draft)}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${left <= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                              {t(`${left} يوم متبقي`, `${left}d left`, lang)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-stone-400">
                            {draft.location && <span className="flex items-center gap-1">📍 {getCityName(draft.location, lang)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleRestoreDraft(draft.id)}
                          className="text-xs font-semibold px-4 py-2 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
                          {t('استرجاع', 'Restore', lang)}
                        </button>
                        <button onClick={() => handlePermanentDeleteDraft(draft.id)}
                          className="text-xs font-semibold px-3 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
                          {t('حذف نهائي', 'Delete Forever', lang)}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
