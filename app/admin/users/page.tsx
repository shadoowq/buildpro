'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { useToast } from '@/app/components/Toast';
import { setUserPassword } from '@/app/lib/auth';
import { formatDate } from '@/app/lib/requestHelpers';

type Lang = 'ar' | 'en';
type TypeFilter = 'all' | 'contractor' | 'supplier';

const T = {
  title:      { ar: 'إدارة المستخدمين', en: 'User Management' },
  search:     { ar: 'ابحث بالاسم أو الشركة أو البريد...', en: 'Search by name, company, or email...' },
  all:        { ar: 'الكل', en: 'All' },
  contractors:{ ar: 'المقاولون', en: 'Contractors' },
  suppliers:  { ar: 'الموردون', en: 'Suppliers' },
  name:       { ar: 'الاسم', en: 'Name' },
  type:       { ar: 'النوع', en: 'Type' },
  contractor: { ar: 'مقاول', en: 'Contractor' },
  supplier:   { ar: 'مورد', en: 'Supplier' },
  joined:     { ar: 'الانضمام', en: 'Joined' },
  activityCol:{ ar: 'النشاط', en: 'Activity' },
  status:     { ar: 'الحالة', en: 'Status' },
  actions:    { ar: 'إجراءات', en: 'Actions' },
  active:     { ar: 'نشط', en: 'Active' },
  suspendedBadge: { ar: 'معلّق', en: 'Suspended' },
  verified:   { ar: 'موثّق', en: 'Verified' },
  verify:     { ar: 'توثيق', en: 'Verify' },
  unverify:   { ar: 'إلغاء التوثيق', en: 'Unverify' },
  suspend:    { ar: 'تعليق', en: 'Suspend' },
  unsuspend:  { ar: 'إعادة تفعيل', en: 'Reactivate' },
  resetPass:  { ar: 'كلمة مرور جديدة', en: 'New password' },
  deleteBtn:  { ar: 'حذف', en: 'Delete' },
  requestsN:  { ar: 'طلب', en: 'requests' },
  quotesN:    { ar: 'عرض', en: 'quotes' },
  noUsers:    { ar: 'لا يوجد مستخدمون مطابقون', en: 'No matching users' },
  passPh:     { ar: 'كلمة المرور الجديدة (6+ أحرف)', en: 'New password (6+ chars)' },
  save:       { ar: 'حفظ', en: 'Save' },
  cancel:     { ar: 'إلغاء', en: 'Cancel' },
  passTooShort: { ar: 'كلمة المرور 6 أحرف على الأقل', en: 'Password must be at least 6 characters' },
  passSaved:  { ar: 'تم تغيير كلمة المرور', en: 'Password changed' },
  confirmSuspend: { ar: 'تعليق هذا الحساب؟ لن يتمكن صاحبه من تسجيل الدخول حتى تعيد تفعيله.', en: "Suspend this account? The owner won't be able to sign in until you reactivate it." },
  confirmDelete: { ar: 'حذف هذا الحساب نهائيًا؟ سيتم حذف كل بياناته معه (الطلبات أو العروض والتقييمات). لا يمكن التراجع.', en: 'Permanently delete this account? All its data (requests or quotes and ratings) will be deleted with it. This cannot be undone.' },
  deleted:    { ar: 'تم حذف الحساب وكل بياناته', en: 'Account and all its data deleted' },
  suspendedToast: { ar: 'تم تعليق الحساب', en: 'Account suspended' },
  unsuspendedToast: { ar: 'تمت إعادة تفعيل الحساب', en: 'Account reactivated' },
  verifiedToast: { ar: 'تم توثيق الحساب', en: 'Account verified' },
  unverifiedToast: { ar: 'تم إلغاء توثيق الحساب', en: 'Verification removed' },
};
const tx = (k: keyof typeof T, lang: Lang) => T[k][lang];

export default function AdminUsersPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [lang, setLang] = useState<Lang>('ar');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.userType !== 'admin') { router.push('/login'); return; }
    setLang((localStorage.getItem('language') as Lang) || 'ar');
    try { setUsers(JSON.parse(localStorage.getItem('users') || '[]')); } catch {}
    try { setRequests(JSON.parse(localStorage.getItem('requests') || '[]')); } catch {}
    try { setQuotes(JSON.parse(localStorage.getItem('quotes') || '[]')); } catch {}
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  /* writes users[] and the user_<email> mirror in lockstep */
  const updateUser = (email: string, updates: Record<string, any>) => {
    const updated = users.map(u => u.email === email ? { ...u, ...updates } : u);
    setUsers(updated);
    localStorage.setItem('users', JSON.stringify(updated));
    const keyRaw = localStorage.getItem(`user_${email}`);
    if (keyRaw) {
      try { localStorage.setItem(`user_${email}`, JSON.stringify({ ...JSON.parse(keyRaw), ...updates })); } catch {}
    }
  };

  const toggleVerify = (u: any) => {
    updateUser(u.email, { verified: !u.verified });
    showToast(tx(u.verified ? 'unverifiedToast' : 'verifiedToast', lang));
  };

  const toggleSuspend = async (u: any) => {
    if (!u.suspended && !(await confirmDialog(tx('confirmSuspend', lang), { confirmText: tx('suspend', lang), danger: true }))) return;
    updateUser(u.email, { suspended: !u.suspended });
    showToast(tx(u.suspended ? 'unsuspendedToast' : 'suspendedToast', lang));
  };

  const savePassword = async (email: string) => {
    if (newPass.length < 6) { showToast(tx('passTooShort', lang), 'error'); return; }
    await setUserPassword(email, newPass);
    setResetFor(null);
    setNewPass('');
    showToast(tx('passSaved', lang));
  };

  /* full cascade: the account plus everything it owns */
  const deleteUser = async (u: any) => {
    if (!(await confirmDialog(tx('confirmDelete', lang), { confirmText: tx('deleteBtn', lang), danger: true }))) return;

    const remainingUsers = users.filter(x => x.email !== u.email);
    localStorage.setItem('users', JSON.stringify(remainingUsers));
    localStorage.removeItem(`user_${u.email}`);
    setUsers(remainingUsers);

    if (u.userType === 'contractor') {
      const myReqIds = new Set(requests.filter(r => r.contractorId === u.email).map(r => r.id));
      const keptReqs = requests.filter(r => !myReqIds.has(r.id));
      localStorage.setItem('requests', JSON.stringify(keptReqs));
      setRequests(keptReqs);
      const keptQuotes = quotes.filter(q => !myReqIds.has(q.requestId));
      localStorage.setItem('quotes', JSON.stringify(keptQuotes));
      setQuotes(keptQuotes);
      const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
      localStorage.setItem('activityLogs', JSON.stringify(logs.filter((l: any) => !myReqIds.has(l.requestId))));
      const ratings = JSON.parse(localStorage.getItem('ratings') || '[]');
      localStorage.setItem('ratings', JSON.stringify(ratings.filter((r: any) => r.contractorId !== u.email)));
    } else {
      const keptQuotes = quotes.filter(q => q.supplierId !== u.email);
      localStorage.setItem('quotes', JSON.stringify(keptQuotes));
      setQuotes(keptQuotes);
      const deletedQuotes = JSON.parse(localStorage.getItem('deletedQuotes') || '[]');
      localStorage.setItem('deletedQuotes', JSON.stringify(deletedQuotes.filter((q: any) => q.supplierId !== u.email)));
      const ratings = JSON.parse(localStorage.getItem('ratings') || '[]');
      localStorage.setItem('ratings', JSON.stringify(ratings.filter((r: any) => r.supplierId !== u.email)));
      const keptReqs = requests.map(r => ({ ...r, selectedSuppliers: (r.selectedSuppliers || []).filter((s: string) => s !== u.email) }));
      localStorage.setItem('requests', JSON.stringify(keptReqs));
      setRequests(keptReqs);
    }
    showToast(tx('deleted', lang));
  };

  const activityOf = (u: any) =>
    u.userType === 'contractor'
      ? `${requests.filter(r => r.contractorId === u.email).length} ${tx('requestsN', lang)}`
      : `${quotes.filter(q => q.supplierId === u.email).length} ${tx('quotesN', lang)}`;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || [u.name, u.company, u.email].some(v => (v || '').toLowerCase().includes(q));
    const matchType = typeFilter === 'all' || u.userType === typeFilter;
    return matchSearch && matchType;
  });

  const btn = 'text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors';

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <AdminSidebar lang={lang} setLang={handleLangChange} active="/admin/users" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-0">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="text-white text-xl font-bold mb-1">{tx('title', lang)}</h1>
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 w-72 mb-1">
            <span className="text-white/40 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={tx('search', lang)}
              className="bg-transparent border-none outline-none text-xs font-cairo w-full placeholder-white/40 text-white" />
          </div>
        </div>
        <div className="flex gap-0 mt-4 border-t border-white/10">
          {([['all', tx('all', lang)], ['contractor', tx('contractors', lang)], ['supplier', tx('suppliers', lang)]] as [TypeFilter, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`text-xs font-medium px-4 py-2.5 border-b-2 transition-colors font-cairo ${typeFilter === v ? 'text-white border-[var(--brand)]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
              {l} ({v === 'all' ? users.length : users.filter(u => u.userType === v).length})
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-7 py-6">
        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 860 }}>
            <thead>
              <tr className="bg-[var(--bg-soft)] border-b border-[var(--line-soft)]">
                {[tx('name', lang), tx('type', lang), tx('activityCol', lang), tx('joined', lang), tx('status', lang), tx('actions', lang)].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-semibold text-stone-500 whitespace-nowrap text-start">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-stone-400 py-12">📭 {tx('noUsers', lang)}</td></tr>
              ) : filtered.map(u => (
                <tr key={u.email} className="border-b border-[var(--line-soft)] last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${u.suspended ? 'bg-stone-200 text-stone-500' : 'bg-[var(--brand)] text-[var(--on-brand)]'}`}>
                        {(u.name || '؟').charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 flex items-center gap-1.5">
                          {u.name}
                          {u.verified && <span className="text-emerald-600" title={tx('verified', lang)}>✓</span>}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">{u.company} · <span dir="ltr">{u.email}</span></p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.userType === 'contractor' ? 'bg-[var(--tint)] text-[var(--brand-strong)]' : 'bg-stone-100 text-stone-600'}`}>
                      {tx(u.userType === 'contractor' ? 'contractor' : 'supplier', lang)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{activityOf(u)}</td>
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{u.joinDate ? formatDate(u.joinDate, lang) : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {u.suspended
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">{tx('suspendedBadge', lang)}</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{tx('active', lang)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => toggleVerify(u)} className={`${btn} ${u.verified ? 'bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>
                        {u.verified ? tx('unverify', lang) : `✓ ${tx('verify', lang)}`}
                      </button>
                      <button onClick={() => toggleSuspend(u)} className={`${btn} ${u.suspended ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}>
                        {u.suspended ? tx('unsuspend', lang) : tx('suspend', lang)}
                      </button>
                      <button onClick={() => { setResetFor(resetFor === u.email ? null : u.email); setNewPass(''); }}
                        className={`${btn} bg-[var(--tint)] text-[var(--brand-strong)] border border-[var(--line)] hover:bg-[var(--tint-hover)]`}>
                        🔑 {tx('resetPass', lang)}
                      </button>
                      <button onClick={() => deleteUser(u)} className={`${btn} bg-red-50 text-red-600 border border-red-100 hover:bg-red-100`}>
                        {tx('deleteBtn', lang)}
                      </button>
                    </div>
                    {resetFor === u.email && (
                      <div className="flex gap-1.5 mt-2">
                        <input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder={tx('passPh', lang)} dir="ltr"
                          className="text-xs border border-[var(--line)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--sec)] w-48" />
                        <button onClick={() => savePassword(u.email)} className={`${btn} bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)]`}>{tx('save', lang)}</button>
                        <button onClick={() => { setResetFor(null); setNewPass(''); }} className={`${btn} bg-stone-50 text-stone-500 border border-stone-200`}>{tx('cancel', lang)}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
