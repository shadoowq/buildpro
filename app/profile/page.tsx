'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContractorNav from '../components/ContractorNav';
import { saudiCities, getCityName } from '../lib/translations';

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
  account:       { ar: 'معلومات الحساب',         en: 'Account Details'          },
  role:          { ar: 'نوع الحساب',             en: 'Account Type'             },
  contractor:    { ar: 'مقاول',                  en: 'Contractor'               },
  supplier:      { ar: 'مورد',                   en: 'Supplier'                 },
  memberSince:   { ar: 'عضو منذ',               en: 'Member since'             },
  danger:        { ar: 'منطقة الخطر',            en: 'Danger Zone'              },
  logout:        { ar: 'تسجيل الخروج من الجهاز الحالي', en: 'Sign out of current device' },
  logoutBtn:     { ar: 'تسجيل خروج',             en: 'Sign Out'                 },
  namePlaceholder:   { ar: 'مثال: محمد العتيبي',  en: 'Ex: Mohammed Al-Otaibi'  },
  companyPlaceholder:{ ar: 'مثال: شركة المستقبل', en: 'Ex: Future Company'       },
  phonePlaceholder:  { ar: 'مثال: 0512345678',    en: 'Ex: 0512345678'           },
};

function t(key: keyof typeof T, lang: Lang): string {
  return (T[key] as any)[lang];
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
      {(['ar', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[#C0603E] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
          <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'} width="20" height="14" alt={l} className="rounded-sm" />
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E8DFD3] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#F1EAE0] bg-[#FFFDF9]">
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

const inputCls = 'w-full text-sm border border-[#E8DFD3] rounded-xl px-4 py-2.5 outline-none font-cairo bg-white text-stone-800 placeholder-stone-300 focus:border-[#8A7B6C] focus:ring-2 focus:ring-[#8A7B6C]/10 transition-all';
const readonlyCls = 'w-full text-sm border border-[#E8DFD3] rounded-xl px-4 py-2.5 font-cairo bg-[#FAF7F2] text-stone-500 cursor-not-allowed';

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);

  // info form
  const [name, setName]       = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone]     = useState('');
  const [city, setCity]       = useState('');
  const [infoSaved, setInfoSaved] = useState(false);

  // password form
  const [currentPass, setCurrentPass]   = useState('');
  const [newPass, setNewPass]           = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [passMsg, setPassMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);

    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const u = JSON.parse(userData);
    setUser(u);
    setName(u.name || '');
    setCompany(u.company || '');
    setPhone(u.phone || '');
    setCity(u.city || u.location || '');
  }, [router]);

  const handleLangChange = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  const handleSaveInfo = () => {
    if (!user) return;
    const updated = { ...user, name, company, phone, city };
    localStorage.setItem('currentUser', JSON.stringify(updated));

    // also update in users array
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = allUsers.map((u: any) => u.email === user.email ? { ...u, name, company, phone, city } : u);
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // also update user_ key if it exists
    const userKey = `user_${user.email}`;
    const keyData = localStorage.getItem(userKey);
    if (keyData) {
      try {
        const kd = JSON.parse(keyData);
        localStorage.setItem(userKey, JSON.stringify({ ...kd, name, company, phone, city }));
      } catch {}
    }

    setUser(updated);
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2500);
  };

  const handleChangePassword = () => {
    setPassMsg(null);
    if (!user) return;
    if (newPass.length < 6) { setPassMsg({ type: 'err', text: t('passShort', lang) }); return; }
    if (newPass !== confirmPass) { setPassMsg({ type: 'err', text: t('passNoMatch', lang) }); return; }

    // check current password — always required
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const dbUser = allUsers.find((u: any) => u.email === user.email);
    if (!currentPass || !dbUser || dbUser.password !== currentPass) {
      setPassMsg({ type: 'err', text: t('passWrong', lang) });
      return;
    }

    // update password
    const updatedUsers = allUsers.map((u: any) => u.email === user.email ? { ...u, password: newPass } : u);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    const updatedUser = { ...user, password: newPass };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
    setPassMsg({ type: 'ok', text: t('passSaved', lang) });
    setTimeout(() => setPassMsg(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const contractorNav = user?.userType === 'contractor';

  if (!user) return (
    <div className="min-h-screen bg-[#F7F2EC] flex items-center justify-center font-cairo">
      <div className="text-stone-400 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long' })
    : (lang === 'ar' ? 'غير معروف' : 'Unknown');

  return (
    <div className="min-h-screen bg-[#F7F2EC] font-cairo" dir={dir}>

      {contractorNav
        ? <ContractorNav lang={lang} setLang={handleLangChange} userName={name} active="/profile" />
        : (
          <nav className="bg-white border-b border-[#E8DFD3] px-4 md:px-7 flex items-center justify-between h-14 sticky top-0 z-20">
            <div className="text-[17px] font-bold text-[#C0603E]">Build<span className="text-[#8A7B6C]">Pro</span></div>
            <div className="flex gap-1">
              <Link href="/supplier-requests" className="text-xs px-3 py-1.5 rounded-lg font-medium text-stone-600 hover:bg-[#F7F2EC] hover:text-[#C0603E] transition-colors">
                {lang === 'ar' ? 'الطلبات المتاحة' : 'Available Requests'}
              </Link>
              <Link href="/my-quotes" className="text-xs px-3 py-1.5 rounded-lg font-medium text-stone-600 hover:bg-[#F7F2EC] hover:text-[#C0603E] transition-colors">
                {lang === 'ar' ? 'عروضي' : 'My Quotes'}
              </Link>
            </div>
            <button onClick={handleLogout} className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
              {lang === 'ar' ? 'خروج' : 'Logout'}
            </button>
          </nav>
        )
      }

      {/* HERO */}
      <div className="bg-[#C0603E] px-7 pt-6 pb-6">
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
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${infoSaved ? 'bg-emerald-500 text-white' : 'bg-[#C0603E] hover:bg-[#9C4C31] text-white'}`}>
              {infoSaved ? t('saved', lang) : t('saveInfo', lang)}
            </button>
          </div>
        </SectionCard>

        {/* SECURITY */}
        <SectionCard title={t('security', lang)}>
          <div className="space-y-4">
            <Field label={t('currentPass', lang)}>
              <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                placeholder="••••••••" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('newPass', lang)}>
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
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#8A7B6C] hover:bg-[#6F6255] text-white transition-colors">
              {t('savePass', lang)}
            </button>
          </div>
        </SectionCard>

        {/* ACCOUNT DETAILS */}
        <SectionCard title={t('account', lang)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl p-4">
              <p className="text-[10px] text-stone-400 mb-1">{t('role', lang)}</p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${user.userType === 'contractor' ? 'bg-[#F3EAE0] text-[#C0603E]' : 'bg-stone-100 text-stone-600'}`}>
                {user.userType === 'contractor' ? '👷' : '🏢'} {user.userType === 'contractor' ? t('contractor', lang) : t('supplier', lang)}
              </span>
            </div>
            <div className="bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl p-4">
              <p className="text-[10px] text-stone-400 mb-1">{t('memberSince', lang)}</p>
              <p className="text-sm font-bold text-stone-700">{memberSince}</p>
            </div>
          </div>
        </SectionCard>

        {/* DANGER ZONE */}
        <div className="bg-white border border-red-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50">
            <h2 className="text-sm font-bold text-red-700">{t('danger', lang)}</h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-800">{t('logout', lang)}</p>
              <p className="text-xs text-stone-400 mt-0.5">{user.email}</p>
            </div>
            <button onClick={handleLogout}
              className="text-sm font-bold px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">
              {t('logoutBtn', lang)}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
