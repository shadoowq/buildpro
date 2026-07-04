'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import { displayVal, arToEn, softDeleteDraft, softDeleteDrafts, purgeExpiredTrash, getSupplierData } from '../lib/requestHelpers';
import { getCityName } from '../lib/translations';
import { useEscapeKey } from '../components/useEscapeKey';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

type Lang = 'ar' | 'en';

interface MaterialRow {
  id: number; type: string; typePending: string;
  usage: string; quantity: string; unit: string;
  [key: string]: any;
}

interface AttachedFile { name: string; type: string; data: string; }

interface Draft {
  id: number;
  contractorId: string;
  projectName?: string;
  materials: MaterialRow[];
  location: string;
  deadline: string;
  description: string;
  selectedSuppliers: string[];
  attachedFiles?: AttachedFile[];
  savedAt: string;
}

function t(ar: string, en: string, lang: Lang) { return lang === 'ar' ? ar : en; }


export default function Drafts() {
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [lang, setLang] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [search, setSearch] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  useEscapeKey(() => { if (previewDraft) setPreviewDraft(null); });
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'contractor') { router.push('/dashboard'); return; }
    setUser(parsedUser);
    if (parsedUser.name) setUserName(parsedUser.name);

    purgeExpiredTrash(30);
    const allDrafts = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
    const myDrafts = allDrafts.filter((d: Draft) => d.contractorId === parsedUser.email);
    setDrafts(myDrafts.sort((a: Draft, b: Draft) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));

    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const onStorage = (e: StorageEvent) => { if (e.key === 'language' && e.newValue) setLang(e.newValue as Lang); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
      attachedFiles: draft.attachedFiles || [],
    }));
    localStorage.setItem('loadingFromDraft', 'true');
    router.push(`/create-request?draft=${draft.id}`);
  };

  const handleDelete = async (draftId: number) => {
    if (!(await confirmDialog(t('هل أنت متأكد من حذف هذه المسودة؟', 'Are you sure you want to delete this draft?', lang), { confirmText: t('حذف', 'Delete', lang), danger: true }))) return;
    softDeleteDraft(draftId);
    setDrafts(prev => prev.filter(d => d.id !== draftId));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(draftId); return s; });
    showToast(t('تم نقل المسودة لسلة المهملات', 'Draft moved to trash', lang));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleBulkDelete = async () => {
    if (!(await confirmDialog(
      lang === 'ar' ? `هل أنت متأكد من حذف ${selectedIds.size} مسودة؟` : `Delete ${selectedIds.size} draft(s)?`,
      { confirmText: t('حذف', 'Delete', lang), danger: true }
    ))) return;
    softDeleteDrafts([...selectedIds]);
    setDrafts(prev => prev.filter(d => !selectedIds.has(d.id)));
    setSelectedIds(new Set());
    showToast(t('تم نقل المسودات لسلة المهملات', 'Drafts moved to trash', lang));
  };

  const getDraftName = (draft: Draft) => {
    if (draft.projectName?.trim()) return draft.projectName.trim();
    const valid = draft.materials.filter(m => m.type?.trim() || m.typePending?.trim());
    if (valid.length === 0) return t('مسودة بدون اسم', 'Unnamed Draft', lang);
    return valid.map(m => displayVal(m.type || m.typePending, lang)).filter(Boolean).join(lang === 'ar' ? '، ' : ', ');
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

  if (!user) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>

      <ContractorNav lang={lang} setLang={handleLangChange} userName={userName} active="/drafts" />

      {/* ── HERO ── */}
      <div className="bg-[var(--chrome)] px-7 pt-6 pb-5">
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
            className="bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
            <span className="text-base">+</span> {t('طلب جديد', 'New Request', lang)}
          </Link>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-3 gap-3 px-7 py-5">
        {[
          { icon: '✏️', bg: 'bg-amber-50',   val: drafts.length,                                               label: t('إجمالي المسودات', 'Total Drafts', lang) },
          { icon: '📋', bg: 'bg-[var(--tint)]',  val: drafts.reduce((s, d) => s + getMaterialCount(d), 0),         label: t('إجمالي المواد', 'Total Materials', lang) },
          { icon: '📍', bg: 'bg-emerald-50', val: [...new Set(drafts.map(d => d.location).filter(Boolean))].length, label: t('مدن مختلفة', 'Different Cities', lang) },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center text-base mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-stone-900">{s.val}</div>
            <div className="text-[11px] text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="px-7 pb-10">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">

          {/* search bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line-soft)] flex-wrap gap-2">
            <span className="text-sm font-bold text-stone-900">{t('المسودات المحفوظة', 'Saved Drafts', lang)}</span>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button onClick={handleBulkDelete}
                  className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-100 transition-colors">
                  {t('حذف المحدد', 'Delete Selected', lang)} ({selectedIds.size})
                </button>
              )}
              <div className="flex items-center gap-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-3 py-1.5 w-56">
                <span className="text-stone-300 text-sm">🔍</span>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('ابحث عن مسودة...', 'Search drafts...', lang)}
                  className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-stone-300 text-stone-700" />
              </div>
            </div>
          </div>

          {/* empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mb-4">✏️</div>
              <h3 className="text-stone-700 font-bold text-base mb-1">
                {search ? t('لا توجد نتائج', 'No results found', lang) : t('لا توجد مسودات', 'No Drafts Yet', lang)}
              </h3>
              <p className="text-stone-400 text-sm mb-5">
                {t('عندما تحفظ طلبًا كمسودة، سيظهر هنا', 'When you save a request as draft it will appear here', lang)}
              </p>
              <Link href="/create-request"
                className="bg-[var(--brand)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
                {t('+ إنشاء طلب جديد', '+ Create New Request', lang)}
              </Link>
            </div>
          )}

          {/* drafts list */}
          {filtered.length > 0 && (
            <div className="divide-y divide-[var(--line-soft)]">
              {filtered.map(draft => {
                const matCount = getMaterialCount(draft);
                const suppCount = draft.selectedSuppliers?.length || 0;
                return (
                  <div key={draft.id} className="px-5 py-4 hover:bg-[var(--bg-soft)] transition-colors group">
                    <div className="flex items-start justify-between gap-4">

                      {/* left: checkbox + icon + info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input type="checkbox" checked={selectedIds.has(draft.id)} onChange={() => toggleSelect(draft.id)}
                          className="mt-3 shrink-0 cursor-pointer" />
                        <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5">
                          📝
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* name */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[13px] font-bold text-stone-900 truncate">{getDraftName(draft)}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              {t('مسودة', 'Draft', lang)}
                            </span>
                          </div>

                          {/* meta row */}
                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-stone-400">
                            {draft.location && (
                              <span className="flex items-center gap-1">📍 {getCityName(draft.location, lang)}</span>
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
                            <p className="text-[11px] text-stone-400 mt-1 truncate">{draft.description}</p>
                          )}

                          {/* save time */}
                          <p className="text-[10px] text-stone-300 mt-1">
                            {t('حُفظت:', 'Saved:', lang)} {formatDate(draft.savedAt)} {formatTime(draft.savedAt)}
                          </p>
                        </div>
                      </div>

                      {/* right: actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setPreviewDraft(draft)}
                          className="text-xs font-semibold px-3 py-2 bg-stone-50 text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors">
                          👁 {t('معاينة', 'Preview', lang)}
                        </button>
                        <button onClick={() => handleContinue(draft)}
                          className="text-xs font-semibold px-4 py-2 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
                          {t('استكمال', 'Continue', lang)}
                        </button>
                        <Link href={`/print/draft/${draft.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-semibold px-3 py-2 bg-stone-50 text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors">
                          🖨
                        </Link>
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
                            <span key={i} className="text-[10px] bg-[var(--tint)] text-[var(--brand-strong)] px-2 py-0.5 rounded-md font-medium">
                              {displayVal(m.type || m.typePending, lang)}
                              {m.quantity ? ` · ${m.quantity} ${lang === 'en' ? (arToEn[m.unit] || m.unit || 'm²') : (m.unit || 'م²')}` : ''}
                            </span>
                          ))}
                        {matCount > 6 && (
                          <span className="text-[10px] text-stone-400 px-2 py-0.5">+{matCount - 6}</span>
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

      {/* ── PREVIEW MODAL ── */}
      {previewDraft && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={() => setPreviewDraft(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <div>
                <h2 className="text-base font-bold text-stone-900">{getDraftName(previewDraft)}</h2>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {t('حُفظت:', 'Saved:', lang)} {formatDate(previewDraft.savedAt)} {formatTime(previewDraft.savedAt)}
                </p>
              </div>
              <button onClick={() => setPreviewDraft(null)} aria-label={t('إغلاق', 'Close', lang)}
                className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center font-bold hover:bg-stone-200">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* meta */}
              <div className="flex flex-wrap gap-2 text-xs">
                {previewDraft.location && <span className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600">📍 {getCityName(previewDraft.location, lang)}</span>}
                {previewDraft.deadline && <span className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600">⏱ {previewDraft.deadline}</span>}
              </div>

              {/* materials */}
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-2">{t('المواد المطلوبة', 'Required Materials', lang)}</h3>
                {getMaterialCount(previewDraft) > 0 ? (
                  <div className="space-y-2">
                    {previewDraft.materials.filter(m => m.type?.trim() || m.typePending?.trim()).map((m, i) => (
                      <div key={i} className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="font-bold">{displayVal(m.type || m.typePending, lang)}</span>
                        {m.usage && <span className="text-stone-500">{displayVal(m.usage, lang)}</span>}
                        {m.quantity && <span className="text-stone-500">{m.quantity} {lang === 'en' ? (arToEn[m.unit] || m.unit || 'm²') : (m.unit || 'م²')}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-400 text-center">{t('لا توجد مواد بعد', 'No materials yet', lang)}</div>
                )}
              </div>

              {/* description */}
              {previewDraft.description && (
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-2">{t('الوصف', 'Description', lang)}</h3>
                  <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-600">{previewDraft.description}</div>
                </div>
              )}

              {/* attached files */}
              {(previewDraft.attachedFiles?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-2">{t('المرفقات', 'Attached Files', lang)} ({previewDraft.attachedFiles!.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {previewDraft.attachedFiles!.map((f, i) => (
                      <span key={i} className="bg-stone-50 border border-stone-200 text-stone-600 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                        📎 {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* suppliers */}
              {previewDraft.selectedSuppliers?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-stone-900 mb-2">{t('الموردون المختارون', 'Selected Suppliers', lang)} ({previewDraft.selectedSuppliers.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {previewDraft.selectedSuppliers.map(email => {
                      const s = getSupplierData(email);
                      return (
                        <span key={email} className="bg-[var(--tint)] text-[var(--brand-strong)] text-xs font-medium px-2.5 py-1 rounded-lg">
                          {s?.company || email}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-stone-100">
              <button onClick={() => setPreviewDraft(null)} className="flex-1 bg-stone-100 text-stone-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-stone-200">
                {t('إغلاق', 'Close', lang)}
              </button>
              <button onClick={() => { const d = previewDraft; setPreviewDraft(null); handleContinue(d); }}
                className="flex-1 bg-[var(--brand)] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[var(--brand-hover)]">
                {t('استكمال', 'Continue', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
