'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ContractorNav from '../components/ContractorNav';
import SupplierNav from '../components/SupplierNav';
import Link from 'next/link';
import { saudiCities, getCityName } from '../lib/translations';
import { persistUserUpdate, displayVal } from '../lib/requestHelpers';
import { getCurrentUser, getLanguage, setLanguage, getUsers, logout } from '../lib/store';
import { MATERIAL_OPTIONS } from '../lib/materialOptions';
import { MATERIAL_CATEGORIES } from '../lib/materialCategories';
import { verifyPassword, setUserPassword, ALLOWED_IMAGE_TYPES } from '../lib/auth';
import { downloadBackup, parseBackup, restoreBackup } from '../lib/backup';
import { compressImageToDataUrl } from '../lib/images';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import HelpTooltip from '../components/HelpTooltip';

type Lang = 'ar' | 'en';

const T = {
  title:         { ar: 'الملف الشخصي',          en: 'My Profile'              },
  subtitle:      { ar: 'إدارة بيانات حسابك',    en: 'Manage your account info' },
  accountInfo:   { ar: 'معلومات الحساب',         en: 'Account Information'      },
  name:          { ar: 'الاسم الكامل',           en: 'Full Name'                },
  company:       { ar: 'اسم الشركة / المؤسسة',  en: 'Company / Organization'   },
  phone:         { ar: 'رقم الجوال',             en: 'Phone Number'             },
  city:          { ar: 'المدينة',                en: 'City'                     },
  email:         { ar: 'البريد الإلكتروني',       en: 'Email Address'            },
  emailNote:     { ar: 'لا يمكن تغيير البريد الإلكتروني', en: 'Email cannot be changed' },
  saveInfo:      { ar: 'حفظ التغييرات',          en: 'Save Changes'             },
  saved:         { ar: 'تم الحفظ ✓',            en: 'Saved ✓'                  },
  selectCity:    { ar: 'اختر مدينتك',            en: 'Select your city'         },
  security:      { ar: 'الأمان وكلمة المرور',    en: 'Security & Password'      },
  currentPass:   { ar: 'كلمة المرور الحالية',    en: 'Current Password'         },
  newPass:       { ar: 'كلمة المرور الجديدة',    en: 'New Password'             },
  confirmPass:   { ar: 'تأكيد كلمة المرور',     en: 'Confirm New Password'     },
  savePass:      { ar: 'تغيير كلمة المرور',      en: 'Change Password'          },
  passSaved:     { ar: 'تم تغيير كلمة المرور ✓', en: 'Password changed ✓'      },
  passNoMatch:   { ar: 'كلمة المرور غير متطابقة', en: 'Passwords do not match'  },
  passWrong:     { ar: 'كلمة المرور الحالية خاطئة', en: 'Current password is wrong' },
  passShort:     { ar: 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)', en: 'Password too short (min 6 chars)' },
  passHint:      { ar: '6 أحرف على الأقل', en: 'At least 6 characters' },
  account:       { ar: 'معلومات الحساب',         en: 'Account Details'          },
  role:          { ar: 'نوع الحساب',             en: 'Account Type'             },
  contractor:    { ar: 'مقاول',                  en: 'Contractor'               },
  supplier:      { ar: 'مورد',                   en: 'Supplier'                 },
  memberSince:   { ar: 'عضو منذ',               en: 'Member since'             },
  danger:        { ar: 'الجلسة',                  en: 'Session'                  },
  logout:        { ar: 'تسجيل الخروج من الجهاز الحالي', en: 'Sign out of current device' },
  logoutBtn:     { ar: 'تسجيل خروج',             en: 'Sign Out'                 },
  namePlaceholder:   { ar: 'مثال: محمد العتيبي',  en: 'Ex: Mohammed Al-Otaibi'  },
  companyPlaceholder:{ ar: 'مثال: شركة المستقبل', en: 'Ex: Future Company'       },
  phonePlaceholder:  { ar: 'مثال: 0512345678',    en: 'Ex: 0512345678'           },
  branding:      { ar: 'الهوية البصرية / الورق الرسمي', en: 'Branding / Letterhead' },
  brandingNote:  { ar: 'ارفع هيدر وفوتر شركتك (بانرات جاهزة بالشعار وبيانات التواصل) — يظهروا تلقائيًا أعلى وأسفل كل عرض سعر تطبعه أو ترسله للمقاول', en: 'Upload your company header and footer banners — they appear automatically at the top and bottom of every quote you print or send to the contractor' },
  headerLabel:   { ar: 'الهيدر (أعلى الصفحة)',    en: 'Header (Top of Page)'     },
  footerLabel:   { ar: 'الفوتر (أسفل الصفحة)',    en: 'Footer (Bottom of Page)'  },
  uploadLogo:    { ar: 'رفع الهيدر',               en: 'Upload Header'            },
  uploadFooter:  { ar: 'رفع الفوتر',               en: 'Upload Footer'            },
  replaceLogo:   { ar: 'استبدال',                 en: 'Replace'                  },
  removeLogo:    { ar: 'حذف',                     en: 'Remove'                   },
  logoTooBig:    { ar: 'حجم الصورة كبير جداً (الحد الأقصى 800 كيلوبايت)', en: 'Image too large (max 800KB)' },
  logoSaved:     { ar: 'تم حفظ الهيدر ✓',          en: 'Header saved ✓'           },
  footerSaved:   { ar: 'تم حفظ الفوتر ✓',          en: 'Footer saved ✓'           },
  marketplace:   { ar: 'ملفك التعريفي في السوق',    en: 'Your Marketplace Profile' },
  marketplaceNote:{ ar: 'هذه البيانات تظهر للمقاولين وتُستخدم لترشيح طلباتك تلقائيًا حسب تخصصك ومدنك.', en: 'This shows to contractors and is used to auto-match requests to your specialty and cities.' },
  autoMatchLabel:{ ar: 'استقبال الطلبات المطابقة تلقائيًا', en: 'Auto-receive matching requests' },
  autoMatchNote: { ar: 'لما تفعّلها، أي طلب مفتوح يطابق تخصصك ومدنك هيظهر في "الطلبات المتاحة" حتى لو المقاول ما اختارك يدويًا', en: "When on, any open request matching your specialty and cities appears in 'Available Requests' even if the contractor didn't hand-pick you" },
  specialties:   { ar: 'تخصصاتك (المواد)',          en: 'Your Specialties (Materials)' },
  coverageCities:{ ar: 'مدن التغطية',               en: 'Coverage Cities'          },
  bio:           { ar: 'نبذة عن الشركة',            en: 'Company Bio'              },
  bioPh:         { ar: 'اكتب نبذة قصيرة عن خبرتك ومميزاتك...', en: 'Write a short intro about your experience...' },
  certifications:{ ar: 'الشهادات والاعتمادات',       en: 'Certifications'           },
  certPh:        { ar: 'مثال: شهادة الهيئة السعودية للمواصفات', en: 'Ex: SASO certified' },
  addCert:       { ar: '+ إضافة',                  en: '+ Add'                     },
  gallery:       { ar: 'معرض الأعمال',              en: 'Work Gallery'              },
  galleryNote:   { ar: 'ارفع صورًا لمنتجاتك أو أعمال سابقة (حتى 6 صور)', en: 'Upload photos of your products or past work (up to 6)' },
  uploadPhoto:   { ar: '+ رفع صورة',                en: '+ Upload Photo'            },
  maxPhotos:     { ar: 'وصلت للحد الأقصى (6 صور)',  en: 'Max 6 photos reached'      },
  saveMarketplace:{ ar: 'حفظ ملف السوق',            en: 'Save Marketplace Profile'  },
  viewPublic:    { ar: 'معاينة الملف العام ↗',       en: 'Preview Public Profile ↗'  },
  marketplaceSaved:{ ar: 'تم حفظ ملف السوق ✓',      en: 'Marketplace profile saved ✓' },
  backup:        { ar: 'النسخ الاحتياطي',           en: 'Backup'                   },
  backupNote:    { ar: 'بياناتك محفوظة على هذا الجهاز فقط — صدّر نسخة احتياطية بانتظام واحتفظ بها في مكان آمن. مسح بيانات المتصفح يعني فقدان كل شيء بدونها.', en: 'Your data lives on this device only — export a backup regularly and keep it somewhere safe. Clearing browser data means losing everything without one.' },
  exportBtn:     { ar: '⬇ تصدير نسخة احتياطية',    en: '⬇ Export Backup'          },
  importBtn:     { ar: '⬆ استيراد نسخة احتياطية',  en: '⬆ Import Backup'          },
  importConfirm: { ar: 'سيتم استرجاع البيانات من النسخة الاحتياطية وقد تستبدل البيانات الحالية المطابقة. هل أنت متأكد؟', en: 'Data will be restored from the backup and may overwrite matching current data. Are you sure?' },
  importDone:    { ar: 'تم استرجاع النسخة الاحتياطية بنجاح — جاري إعادة التحميل...', en: 'Backup restored successfully — reloading...' },
  importInvalid: { ar: 'الملف ليس نسخة احتياطية صالحة من BuildPro', en: 'This file is not a valid BuildPro backup' },
};

function t(key: keyof typeof T, lang: Lang): string {
  return (T[key] as any)[lang];
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
      {(['ar', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[var(--brand-strong)] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
          <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="20" height="14" alt={l} className="rounded-sm" />
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--line-soft)] bg-[var(--bg-soft2)]">
        <h2 className="text-sm font-bold text-stone-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">{label}</label>
      {children}
      {note && <p className="text-[10px] text-stone-400 mt-1">{note}</p>}
    </div>
  );
}

const inputCls = 'w-full text-sm border border-[var(--line)] rounded-xl px-4 py-2.5 outline-none font-cairo bg-white text-stone-800 placeholder-stone-300 focus:border-[var(--sec)] focus:ring-2 focus:ring-[var(--sec)]/10 transition-all';
const readonlyCls = 'w-full text-sm border border-[var(--line)] rounded-xl px-4 py-2.5 font-cairo bg-[var(--bg-soft)] text-stone-500 cursor-not-allowed';

export default function ProfilePage() {
  const router = useRouter();
  const showToast = useToast();
  const confirmDialog = useConfirm();
  const [lang, setLang] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);

  // info form
  const [name, setName]       = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone]     = useState('');
  const [city, setCity]       = useState('');
  const [infoSaved, setInfoSaved] = useState(false);

  // branding
  const [letterhead, setLetterhead] = useState<string | null>(null);
  const [letterheadFooter, setLetterheadFooter] = useState<string | null>(null);

  // marketplace profile (suppliers only)
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [coverageCities, setCoverageCities] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [autoMatch, setAutoMatch] = useState(false);
  const [marketplaceSaved, setMarketplaceSaved] = useState(false);

  // password form
  const [currentPass, setCurrentPass]   = useState('');
  const [newPass, setNewPass]           = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [passMsg, setPassMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    setLang(getLanguage());

    const u = getCurrentUser<any>();
    if (!u) { router.push('/login'); return; }
    setUser(u);
    setName(u.name || '');
    setCompany(u.company || '');
    setPhone(u.phone || '');
    setCity(u.city || u.location || '');
    setLetterhead(u.letterhead || null);
    setLetterheadFooter(u.letterheadFooter || null);
    setSpecialties(u.specialties || []);
    setCoverageCities(u.coverageCities || []);
    setBio(u.bio || '');
    setCertifications(u.certifications || []);
    setGallery(u.gallery || []);
    setAutoMatch(!!u.autoMatch);
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); setLanguage(l); };

  const handleSaveInfo = () => {
    if (!user) return;
    const updated = persistUserUpdate({ name, company, phone, city });
    setUser(updated);
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2500);
  };

  const toggleSpecialty = (m: string) => setSpecialties(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  const toggleCity = (c: string) => setCoverageCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const addCert = () => {
    if (!certInput.trim()) return;
    setCertifications(prev => [...prev, certInput.trim()]);
    setCertInput('');
  };
  const removeCert = (i: number) => setCertifications(prev => prev.filter((_, idx) => idx !== i));

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const remaining = 6 - gallery.length;
    for (const file of files.slice(0, remaining)) {
      try {
        const dataUrl = await compressImageToDataUrl(file);
        setGallery(prev => prev.length < 6 ? [...prev, dataUrl] : prev);
      } catch { /* skip files that fail to decode */ }
    }
  };
  const removeGalleryPhoto = (i: number) => setGallery(prev => prev.filter((_, idx) => idx !== i));

  const handleSaveMarketplace = () => {
    if (!user) return;
    const updated = persistUserUpdate({ specialties, coverageCities, bio, certifications, gallery, autoMatch });
    setUser(updated);
    setMarketplaceSaved(true);
    showToast(t('marketplaceSaved', lang));
    setTimeout(() => setMarketplaceSaved(false), 2500);
  };

  const MAX_LETTERHEAD_BYTES = 800 * 1024;

  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_LETTERHEAD_BYTES) {
      showToast(t('logoTooBig', lang), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLetterhead(dataUrl);
      const updated = persistUserUpdate({ letterhead: dataUrl });
      setUser(updated);
      showToast(t('logoSaved', lang));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLetterhead = () => {
    setLetterhead(null);
    const updated = persistUserUpdate({ letterhead: undefined });
    setUser(updated);
  };

  const handleFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_LETTERHEAD_BYTES) {
      showToast(t('logoTooBig', lang), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLetterheadFooter(dataUrl);
      const updated = persistUserUpdate({ letterheadFooter: dataUrl });
      setUser(updated);
      showToast(t('footerSaved', lang));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFooter = () => {
    setLetterheadFooter(null);
    const updated = persistUserUpdate({ letterheadFooter: undefined });
    setUser(updated);
  };

  const handleChangePassword = async () => {
    setPassMsg(null);
    if (!user) return;
    if (newPass.length < 6) { setPassMsg({ type: 'err', text: t('passShort', lang) }); return; }
    if (newPass !== confirmPass) { setPassMsg({ type: 'err', text: t('passNoMatch', lang) }); return; }

    // check current password — always required
    const allUsers = getUsers();
    const dbUser = allUsers.find((u: any) => u.email === user.email);
    if (!currentPass || !dbUser || !(await verifyPassword(dbUser, currentPass))) {
      setPassMsg({ type: 'err', text: t('passWrong', lang) });
      return;
    }

    // store the new salted hash; the session copy never carries credentials
    await setUserPassword(user.email, newPass);
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
    setPassMsg({ type: 'ok', text: t('passSaved', lang) });
    setTimeout(() => setPassMsg(null), 3000);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let backup;
    try {
      backup = parseBackup(await file.text());
    } catch {
      showToast(t('importInvalid', lang), 'error');
      return;
    }
    if (!(await confirmDialog(t('importConfirm', lang), { danger: true }))) return;
    restoreBackup(backup);
    showToast(t('importDone', lang));
    setTimeout(() => window.location.reload(), 1200);
  };

  const contractorNav = user?.userType === 'contractor';

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-400 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { year: 'numeric', month: 'long' })
    : (lang === 'ar' ? 'غير معروف' : 'Unknown');

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>

      {contractorNav
        ? <ContractorNav lang={lang} setLang={handleLangChange} userName={name} active="/profile" />
        : <SupplierNav lang={lang} setLang={handleLangChange} userName={name} active="/profile" />
      }

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-7 pt-6 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-xl font-bold">
            {name.charAt(0) || 'م'}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{name || (lang === 'ar' ? 'المستخدم' : 'User')}</h1>
            <p className="text-white/50 text-xs mt-0.5">
              {user.userType === 'contractor' ? t('contractor', lang) : t('supplier', lang)}
              {' · '}{user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-7 py-6 max-w-2xl mx-auto space-y-5">

        {/* ACCOUNT INFO */}
        <SectionCard title={t('accountInfo', lang)}>
          <div className="space-y-4">
            <Field label={t('name', lang)}>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={t('namePlaceholder', lang)} className={inputCls} />
            </Field>
            <Field label={t('company', lang)}>
              <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder={t('companyPlaceholder', lang)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('phone', lang)}>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder={t('phonePlaceholder', lang)} className={inputCls} />
              </Field>
              <Field label={t('city', lang)}>
                <select value={city} onChange={e => setCity(e.target.value)} className={inputCls}>
                  <option value="">{t('selectCity', lang)}</option>
                  {saudiCities.map(c => <option key={c} value={c}>{getCityName(c, lang)}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t('email', lang)} note={t('emailNote', lang)}>
              <div className={readonlyCls}>{user.email}</div>
            </Field>
            <button onClick={handleSaveInfo}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${infoSaved ? 'bg-emerald-500 text-white' : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white'}`}>
              {infoSaved ? t('saved', lang) : t('saveInfo', lang)}
            </button>
          </div>
        </SectionCard>

        {/* BRANDING / LETTERHEAD (suppliers only) */}
        {user.userType === 'supplier' && (
          <SectionCard title={t('branding', lang)}>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs text-stone-500">{t('brandingNote', lang)}</p>
              <HelpTooltip lang={lang}
                textAr="الهيدر والفوتر بيظهروا تلقائيًا كبانرات عريضة أعلى وأسفل كل عرض سعر — سواء وقت الطباعة أو لما العرض يوصل للمقاول"
                textEn="The header and footer appear automatically as wide banners at the top and bottom of every quote — both when printing and when the quote reaches the contractor" />
            </div>

            <div className="space-y-5">
              {/* HEADER */}
              <div>
                <p className="text-xs font-semibold text-stone-700 mb-2">{t('headerLabel', lang)}</p>
                {letterhead ? (
                  <div className="flex flex-col gap-3">
                    <img src={letterhead} alt="header" className="w-full max-w-md h-24 object-contain border border-[var(--line)] rounded-xl bg-[var(--bg-soft)]" />
                    <div className="flex gap-2">
                      <label className="cursor-pointer text-xs font-semibold px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200">
                        {t('replaceLogo', lang)}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLetterheadUpload} className="hidden" />
                      </label>
                      <button onClick={handleRemoveLetterhead}
                        className="text-xs font-semibold px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100">
                        {t('removeLogo', lang)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-block text-xs font-semibold px-4 py-2.5 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-hover)]">
                    {t('uploadLogo', lang)}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLetterheadUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* FOOTER */}
              <div className="pt-4 border-t border-[var(--line-soft)]">
                <p className="text-xs font-semibold text-stone-700 mb-2">{t('footerLabel', lang)}</p>
                {letterheadFooter ? (
                  <div className="flex flex-col gap-3">
                    <img src={letterheadFooter} alt="footer" className="w-full max-w-md h-24 object-contain border border-[var(--line)] rounded-xl bg-[var(--bg-soft)]" />
                    <div className="flex gap-2">
                      <label className="cursor-pointer text-xs font-semibold px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200">
                        {t('replaceLogo', lang)}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFooterUpload} className="hidden" />
                      </label>
                      <button onClick={handleRemoveFooter}
                        className="text-xs font-semibold px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100">
                        {t('removeLogo', lang)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-block text-xs font-semibold px-4 py-2.5 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-hover)]">
                    {t('uploadFooter', lang)}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFooterUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* MARKETPLACE PROFILE (suppliers only) */}
        {user.userType === 'supplier' && (
          <SectionCard title={t('marketplace', lang)}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="text-xs text-stone-500 leading-relaxed">{t('marketplaceNote', lang)}</p>
              <Link href={`/supplier-profile/${encodeURIComponent(user.email)}`} target="_blank"
                className="shrink-0 text-[11px] font-semibold text-[var(--sec)] hover:underline whitespace-nowrap">
                {t('viewPublic', lang)}
              </Link>
            </div>

            <div className="space-y-5">
              {/* auto-match toggle */}
              <div className="flex items-center justify-between gap-3 bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800">{t('autoMatchLabel', lang)}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">{t('autoMatchNote', lang)}</p>
                </div>
                <button type="button" onClick={() => setAutoMatch(v => !v)}
                  className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${autoMatch ? 'bg-emerald-500' : 'bg-stone-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${autoMatch ? 'end-0.5' : 'start-0.5'}`} />
                </button>
              </div>

              {/* specialties */}
              <Field label={t('specialties', lang)}>
                <div className="flex flex-wrap gap-2">
                  {MATERIAL_CATEGORIES.map(c => {
                    // legacy profiles picked tile-type strings (before categories existed) —
                    // that still counts as having picked the 'tiles' category.
                    const selected = specialties.includes(c.id)
                      || (c.id === 'tiles' && specialties.some(s => MATERIAL_OPTIONS.types.includes(s)));
                    return (
                      <button key={c.id} type="button" onClick={() => toggleSpecialty(c.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${selected ? 'bg-[var(--brand)] border-[var(--brand)]' : 'bg-white text-stone-600 border-[var(--line)] hover:bg-[var(--bg-soft)]'}`}>
                        {c.icon} {lang === 'ar' ? c.labelAr : c.labelEn}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* coverage cities */}
              <Field label={t('coverageCities', lang)}>
                <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2 border border-[var(--line)] rounded-xl p-3 bg-white">
                  {saudiCities.map(c => (
                    <button key={c} type="button" onClick={() => toggleCity(c)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${coverageCities.includes(c) ? 'bg-[var(--brand)] border-[var(--brand)]' : 'bg-white text-stone-600 border-[var(--line)] hover:bg-[var(--bg-soft)]'}`}>
                      {getCityName(c, lang)}
                    </button>
                  ))}
                </div>
              </Field>

              {/* bio */}
              <Field label={t('bio', lang)}>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                  placeholder={t('bioPh', lang)} className={`${inputCls} resize-none`} />
              </Field>

              {/* certifications */}
              <Field label={t('certifications', lang)}>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={certInput} onChange={e => setCertInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }}
                    placeholder={t('certPh', lang)} className={inputCls} />
                  <button type="button" onClick={addCert}
                    className="shrink-0 text-xs font-bold px-4 rounded-xl bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white transition-colors">
                    {t('addCert', lang)}
                  </button>
                </div>
                {certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {certifications.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--tint)] text-[var(--brand-strong)]">
                        🏅 {c}
                        <button type="button" onClick={() => removeCert(i)} className="text-[var(--brand-strong)]/60 hover:text-red-600">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              {/* gallery */}
              <Field label={t('gallery', lang)} note={t('galleryNote', lang)}>
                <div className="flex flex-wrap gap-3">
                  {gallery.map((img, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-xl border border-[var(--line)]" />
                      <button type="button" onClick={() => removeGalleryPhoto(i)}
                        className="absolute -top-1.5 -end-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center leading-none">✕</button>
                    </div>
                  ))}
                  {gallery.length < 6 ? (
                    <label className="w-20 h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-[var(--line)] rounded-xl cursor-pointer hover:bg-[var(--bg-soft)] transition-colors text-center px-1">
                      <span className="text-lg text-stone-400">＋</span>
                      <span className="text-[9px] text-stone-400">{t('uploadPhoto', lang)}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleGalleryUpload} className="hidden" />
                    </label>
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center text-center text-[9px] text-amber-700 bg-amber-50 rounded-xl px-1">
                      {t('maxPhotos', lang)}
                    </div>
                  )}
                </div>
              </Field>

              <button onClick={handleSaveMarketplace}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${marketplaceSaved ? 'bg-emerald-500 text-white' : 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white'}`}>
                {marketplaceSaved ? t('saved', lang) : t('saveMarketplace', lang)}
              </button>
            </div>
          </SectionCard>
        )}

        {/* SECURITY */}
        <SectionCard title={t('security', lang)}>
          <div className="space-y-4">
            <Field label={t('currentPass', lang)}>
              <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                placeholder="••••••••" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('newPass', lang)} note={t('passHint', lang)}>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </Field>
              <Field label={t('confirmPass', lang)}>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  placeholder="••••••••" className={inputCls} />
              </Field>
            </div>
            {passMsg && (
              <div className={`text-xs font-semibold px-3 py-2 rounded-lg ${passMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {passMsg.text}
              </div>
            )}
            <button onClick={handleChangePassword}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white transition-colors">
              {t('savePass', lang)}
            </button>
          </div>
        </SectionCard>

        {/* ACCOUNT DETAILS */}
        <SectionCard title={t('account', lang)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl p-4">
              <p className="text-[10px] text-stone-400 mb-1">{t('role', lang)}</p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${user.userType === 'contractor' ? 'bg-[var(--tint)] text-[var(--brand-strong)]' : 'bg-stone-100 text-stone-600'}`}>
                {user.userType === 'contractor' ? '👷' : '🏢'} {user.userType === 'contractor' ? t('contractor', lang) : t('supplier', lang)}
              </span>
            </div>
            <div className="bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl p-4">
              <p className="text-[10px] text-stone-400 mb-1">{t('memberSince', lang)}</p>
              <p className="text-sm font-bold text-stone-700">{memberSince}</p>
            </div>
          </div>
        </SectionCard>

        {/* BACKUP */}
        <SectionCard title={t('backup', lang)}>
          <p className="text-xs text-stone-500 leading-relaxed mb-4">{t('backupNote', lang)}</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={downloadBackup}
              className="py-2.5 rounded-xl text-sm font-bold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white transition-colors">
              {t('exportBtn', lang)}
            </button>
            <label className="py-2.5 rounded-xl text-sm font-bold bg-white text-[var(--sec)] border-2 border-[var(--sec)] hover:bg-[var(--bg-soft)] transition-colors text-center cursor-pointer">
              {t('importBtn', lang)}
              <input type="file" accept="application/json,.json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </SectionCard>

        {/* SESSION */}
        <SectionCard title={t('danger', lang)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-800">{t('logout', lang)}</p>
              <p className="text-xs text-stone-400 mt-0.5">{user.email}</p>
            </div>
            <button onClick={handleLogout}
              className="text-sm font-bold px-5 py-2 bg-stone-100 text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-200 transition-colors">
              {t('logoutBtn', lang)}
            </button>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
