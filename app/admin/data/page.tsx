'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { useToast } from '@/app/components/Toast';
import { downloadBackup, parseBackup, restoreBackup } from '@/app/lib/backup';
import { seedDemoData, DEMO_ACCOUNTS } from '@/app/lib/demoData';
import { getCurrentUser, getLanguage, setLanguage } from '@/app/lib/store';

type Lang = 'ar' | 'en';

const T = {
  title:     { ar: 'البيانات والنسخ الاحتياطي', en: 'Data & Backup' },
  subtitle:  { ar: 'تصدير واستيراد وإدارة بيانات المنصة بالكامل', en: 'Export, import, and manage all platform data' },
  exportT:   { ar: 'تصدير نسخة احتياطية', en: 'Export Backup' },
  exportSub: { ar: 'ملف JSON يحتوي كل بيانات المنصة — نزّله بانتظام، البيانات تعيش في المتصفح فقط', en: 'A JSON file with all platform data — download regularly; data lives only in this browser' },
  exportBtn: { ar: '⬇ تنزيل النسخة الاحتياطية', en: '⬇ Download Backup' },
  importT:   { ar: 'استيراد نسخة احتياطية', en: 'Import Backup' },
  importSub: { ar: 'استعادة البيانات من ملف نسخة سابقة — يضيف ويستبدل، ولا يمس جلستك الحالية', en: 'Restore from a previous backup file — adds/overwrites, never touches your current session' },
  importBtn: { ar: '⬆ اختيار ملف واستيراد', en: '⬆ Choose File & Import' },
  imported:  { ar: (n: number) => `تمت الاستعادة — ${n} عنصر`, en: (n: number) => `Restored ${n} keys` },
  invalidFile: { ar: 'الملف ليس نسخة احتياطية صالحة من BuildPro', en: 'Not a valid BuildPro backup file' },
  seedT:     { ar: 'بيانات تجريبية', en: 'Demo Data' },
  seedSub:   { ar: 'زرع حسابات وطلبات وعروض تجريبية جاهزة للعرض — يستبدل بيانات الديمو السابقة', en: 'Seed ready-made demo accounts, requests, and quotes — replaces previous demo data' },
  seedBtn:   { ar: '🌱 زرع البيانات التجريبية', en: '🌱 Seed Demo Data' },
  seeded:    { ar: 'تم زرع البيانات التجريبية', en: 'Demo data seeded' },
  seedAccounts: { ar: 'الحسابات (كلمة المرور للجميع: 123456):', en: 'Accounts (password for all: 123456):' },
  dangerT:   { ar: 'منطقة الخطر', en: 'Danger Zone' },
  wipeT:     { ar: 'مسح كل بيانات المنصة', en: 'Wipe All Platform Data' },
  wipeSub:   { ar: 'حذف كل المستخدمين والطلبات والعروض نهائيًا. جلستك كأدمن ولغة الواجهة يبقيان.', en: 'Permanently delete all users, requests, and quotes. Your admin session and language stay.' },
  wipeBtn:   { ar: '🗑 مسح كل البيانات', en: '🗑 Wipe All Data' },
  confirmWipe1: { ar: 'هل أنت متأكد؟ سيتم حذف كل بيانات المنصة نهائيًا — ننصح بتنزيل نسخة احتياطية أولاً.', en: 'Are you sure? ALL platform data will be permanently deleted — download a backup first.' },
  confirmWipe2: { ar: 'تأكيد أخير: لا يمكن التراجع عن هذه الخطوة إطلاقًا.', en: 'Final confirmation: this cannot be undone.' },
  wipeConfirmBtn: { ar: 'نعم، امسح كل شيء', en: 'Yes, wipe everything' },
  wiped:     { ar: 'تم مسح كل البيانات', en: 'All data wiped' },
};
const tx = (k: keyof typeof T, lang: Lang, n?: number): string => {
  const v = T[k][lang] as any;
  return typeof v === 'function' ? v(n ?? 0) : v;
};

export default function AdminDataPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const showToast = useToast();
  const [lang, setLang] = useState<Lang>('ar');
  const fileRef = useRef<HTMLInputElement>(null);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const currentUser = getCurrentUser<any>() || {};
    if (currentUser.userType !== 'admin') { router.push('/login'); return; }
    setLang(getLanguage());
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = parseBackup(reader.result as string);
        const written = restoreBackup(backup);
        showToast(tx('imported', lang, written));
      } catch {
        showToast(tx('invalidFile', lang), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSeed = async () => {
    seedDemoData();
    showToast(tx('seeded', lang));
  };

  const handleWipe = async () => {
    if (!(await confirmDialog(tx('confirmWipe1', lang), { confirmText: tx('wipeConfirmBtn', lang), danger: true }))) return;
    if (!(await confirmDialog(tx('confirmWipe2', lang), { confirmText: tx('wipeConfirmBtn', lang), danger: true }))) return;
    const keep = new Map<string, string>();
    for (const k of ['currentUser', 'language']) {
      const v = localStorage.getItem(k);
      if (v !== null) keep.set(k, v);
    }
    localStorage.clear();
    keep.forEach((v, k) => localStorage.setItem(k, v));
    showToast(tx('wiped', lang));
  };

  const card = 'bg-white border border-[var(--line)] rounded-2xl p-5';

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <AdminSidebar lang={lang} setLang={handleLangChange} active="/admin/data" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-6">
        <h1 className="text-white text-xl font-bold mb-1">{tx('title', lang)}</h1>
        <p className="text-white/60 text-xs">{tx('subtitle', lang)}</p>
      </div>

      <div className="px-4 md:px-7 py-6 max-w-3xl space-y-4">
        <div className={card}>
          <h2 className="text-sm font-bold text-stone-900 mb-1">💾 {tx('exportT', lang)}</h2>
          <p className="text-xs text-stone-500 mb-3">{tx('exportSub', lang)}</p>
          <button onClick={downloadBackup}
            className="text-xs font-bold px-5 py-2.5 rounded-xl bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)] transition-colors">
            {tx('exportBtn', lang)}
          </button>
        </div>

        <div className={card}>
          <h2 className="text-sm font-bold text-stone-900 mb-1">📥 {tx('importT', lang)}</h2>
          <p className="text-xs text-stone-500 mb-3">{tx('importSub', lang)}</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()}
            className="text-xs font-bold px-5 py-2.5 rounded-xl bg-white text-[var(--brand-strong)] border-2 border-[var(--brand-strong)] hover:bg-[var(--tint)] transition-colors">
            {tx('importBtn', lang)}
          </button>
        </div>

        <div className={card}>
          <h2 className="text-sm font-bold text-stone-900 mb-1">🌱 {tx('seedT', lang)}</h2>
          <p className="text-xs text-stone-500 mb-3">{tx('seedSub', lang)}</p>
          <button onClick={handleSeed}
            className="text-xs font-bold px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
            {tx('seedBtn', lang)}
          </button>
          <div className="mt-3 bg-[var(--bg-soft)] border border-[var(--line-soft)] rounded-xl p-3">
            <p className="text-[11px] font-bold text-stone-600 mb-1.5">{tx('seedAccounts', lang)}</p>
            {DEMO_ACCOUNTS.map(a => (
              <p key={a.email} className="text-[11px] text-stone-500 my-0.5">
                {a.role === 'contractor' ? '🏗' : '🧱'} <span dir="ltr" className="font-mono">{a.email}</span> — {a.label}
              </p>
            ))}
          </div>
        </div>

        <div className="bg-red-50/50 border border-red-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-red-700 mb-1">⚠️ {tx('dangerT', lang)}</h2>
          <p className="text-xs font-bold text-stone-800 mt-3">{tx('wipeT', lang)}</p>
          <p className="text-xs text-stone-500 mb-3">{tx('wipeSub', lang)}</p>
          <button onClick={handleWipe}
            className="text-xs font-bold px-5 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">
            {tx('wipeBtn', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
