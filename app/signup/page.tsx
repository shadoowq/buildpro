'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hashPassword, makeSalt } from '../lib/auth';
import { getCurrentUser, getLanguage, setLanguage, getUsers, setUsers, getUserShadow, setUserShadow } from '../lib/store';

type Lang = 'ar' | 'en';
type UserType = 'contractor' | 'supplier';

export default function SignupPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ar');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]   = useState('');
  const [formData, setFormData] = useState({
    email:    '',
    password: '',
    name:     '',
    company:  '',
    phone:    '',
    userType: 'contractor' as UserType,
  });

  useEffect(() => {
    setLang(getLanguage());

    /* read ?type= query param to pre-select account type */
    const params = new URLSearchParams(window.location.search);
    const type   = params.get('type');
    if (type === 'contractor' || type === 'supplier') {
      setFormData(prev => ({ ...prev, userType: type }));
    }

    /* redirect if already logged in */
    const u = getCurrentUser<any>();
    if (u) {
      router.push(u.userType === 'supplier' ? '/supplier-requests' : '/dashboard');
    }
  }, [router]);

  const switchLang = (l: Lang) => { setLang(l); setLanguage(l); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

    if (!formData.email || !formData.password || !formData.name || !formData.company) {
      setError(t('جميع الحقول مطلوبة', 'All fields are required'));
      return;
    }
    if (formData.password.length < 6) {
      setError(t('كلمة المرور 6 أحرف على الأقل', 'Password must be at least 6 characters'));
      return;
    }

    const existingUser = getUserShadow(formData.email);
    if (existingUser) {
      setError(t('البريد الإلكتروني مستخدم بالفعل', 'Email already in use'));
      return;
    }

    const passwordSalt = makeSalt();
    const passwordHash = await hashPassword(formData.password, passwordSalt);
    const userData = {
      email:     formData.email,
      passwordHash,
      passwordSalt,
      name:      formData.name,
      company:   formData.company,
      phone:     formData.phone,
      userType:  formData.userType,
      verified:  false,
      rating:    0,
      joinDate:  new Date().toISOString(),
    };

    setUserShadow(formData.email, userData);
    const users = getUsers();
    if (!users.find((u: any) => u.email === formData.email)) {
      users.push(userData);
      setUsers(users);
    }

    router.push('/login');
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const t   = (ar: string, en: string) => lang === 'ar' ? ar : en;

  const isContractor = formData.userType === 'contractor';

  return (
    <div className="min-h-screen flex font-cairo" dir={dir}>

      {/* ── LEFT / BRAND PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-[var(--chrome)] px-12 py-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--sec)]/20 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <Link href="/" className="text-xl font-extrabold text-white relative z-10">
          Build<span className="text-[var(--sec)]">Pro</span>
        </Link>

        <div className="relative z-10">
          {/* account type visual */}
          <div className="flex gap-3 mb-6">
            {[
              { type: 'contractor' as UserType, icon: '👷', ar: 'مقاول', en: 'Contractor' },
              { type: 'supplier'   as UserType, icon: '🏢', ar: 'مورد',  en: 'Supplier'   },
            ].map(item => (
              <button key={item.type}
                onClick={() => setFormData(prev => ({ ...prev, userType: item.type }))}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-sm font-bold ${
                  formData.userType === item.type
                    ? 'bg-[var(--sec)] border-[var(--sec)] text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                }`}>
                <span className="text-2xl">{item.icon}</span>
                {lang === 'ar' ? item.ar : item.en}
              </button>
            ))}
          </div>

          <h2 className="text-white text-2xl font-extrabold leading-snug mb-3">
            {isContractor
              ? t('وفّر وقتك وتكاليفك\nمع BuildPro', 'Save time and money\nwith BuildPro')
              : t('وسّع قاعدة عملائك\nmع BuildPro', 'Grow your client base\nwith BuildPro')}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            {isContractor
              ? t('أرسل طلب تسعير واحد وتلقّ عروض من عشرات الموردين على نفس المواصفات.',
                  'Send one pricing request and receive quotes from dozens of suppliers on the same specs.')
              : t('تصلك الطلبات المناسبة تلقائياً — لا رسوم، لا عمولة على الصفقات.',
                  'Matching requests delivered to you automatically — no fees, no deal commissions.')}
          </p>

          <div className="flex flex-col gap-3">
            {(isContractor ? [
              { icon: '⚡', ar: 'مجاني 100% للمقاولين',        en: '100% free for contractors'     },
              { icon: '📊', ar: 'قارن الأسعار جنباً إلى جنب',  en: 'Side-by-side price comparison'  },
              { icon: '🔒', ar: 'بدون عمولة على الصفقات',      en: 'Zero commission on deals'       },
            ] : [
              { icon: '📥', ar: 'طلبات تصلك تلقائياً',         en: 'Requests delivered automatically' },
              { icon: '⭐', ar: 'بناء سمعتك عبر التقييمات',    en: 'Build reputation through ratings'  },
              { icon: '📈', ar: 'وصول لمئات المقاولين النشطين', en: 'Reach hundreds of active clients'  },
            ]).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm shrink-0">{item.icon}</div>
                <span className="text-white/70 text-sm">{lang === 'ar' ? item.ar : item.en}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { val: '300+',  label: t('مورد', 'Suppliers')    },
            { val: '500+',  label: t('مقاول', 'Contractors') },
            { val: '1,200+', label: t('طلب', 'Requests')     },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.07] rounded-xl p-3 text-center">
              <div className="text-white font-extrabold text-lg">{s.val}</div>
              <div className="text-white/40 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT / FORM PANEL ── */}
      <div className="flex-1 bg-white flex flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-[var(--line-soft)]">
          <Link href="/" className="lg:hidden text-[16px] font-extrabold text-[var(--brand-strong)]">
            Build<span className="text-[var(--sec)]">Pro</span>
          </Link>
          <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 mr-auto">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => switchLang(l)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[var(--brand-strong)] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'}
                  width="20" height="14" alt={l} className="rounded-sm" />
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* form area */}
        <div className="flex-1 flex items-center justify-center px-8 py-8 overflow-y-auto">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-stone-900 mb-1">
                {t('إنشاء حساب جديد ✨', 'Create your account ✨')}
              </h1>
              <p className="text-stone-500 text-sm">
                {t('مجاني تماماً — لا يستغرق أكثر من دقيقتين', 'Completely free — takes less than 2 minutes')}
              </p>
            </div>

            {/* mobile account type selector */}
            <div className="flex gap-2 mb-5 lg:hidden">
              {[
                { type: 'contractor' as UserType, icon: '👷', ar: 'مقاول', en: 'Contractor' },
                { type: 'supplier'   as UserType, icon: '🏢', ar: 'مورد',  en: 'Supplier'   },
              ].map(item => (
                <button key={item.type}
                  onClick={() => setFormData(prev => ({ ...prev, userType: item.type }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    formData.userType === item.type
                      ? 'bg-[var(--brand)] border-[var(--brand-strong)] text-white'
                      : 'border-[var(--line)] text-stone-500 hover:bg-[var(--bg)]'
                  }`}>
                  <span>{item.icon}</span> {lang === 'ar' ? item.ar : item.en}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* name + company row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    {t('الاسم الكامل', 'Full name')} <span className="text-red-400">*</span>
                  </label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder={t('اسمك', 'Your name')}
                    className="w-full border border-[var(--line)] bg-[var(--bg-soft)] rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--sec)] focus:border-transparent transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    {t('اسم الشركة', 'Company')} <span className="text-red-400">*</span>
                  </label>
                  <input type="text" name="company" value={formData.company} onChange={handleChange}
                    placeholder={t('اسم الشركة', 'Company name')}
                    className="w-full border border-[var(--line)] bg-[var(--bg-soft)] rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--sec)] focus:border-transparent transition-all" />
                </div>
              </div>

              {/* phone */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {t('رقم الهاتف', 'Phone number')}
                </label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  placeholder={t('+966 5X XXX XXXX', '+966 5X XXX XXXX')}
                  className="w-full border border-[var(--line)] bg-[var(--bg-soft)] rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--sec)] focus:border-transparent transition-all"
                  dir="ltr" />
              </div>

              {/* email */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {t('البريد الإلكتروني', 'Email address')} <span className="text-red-400">*</span>
                </label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="example@email.com"
                  className="w-full border border-[var(--line)] bg-[var(--bg-soft)] rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--sec)] focus:border-transparent transition-all"
                  dir="ltr" />
              </div>

              {/* password */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {t('كلمة المرور', 'Password')} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                    placeholder={t('6 أحرف على الأقل', 'At least 6 characters')}
                    className="w-full border border-[var(--line)] bg-[var(--bg-soft)] rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--sec)] focus:border-transparent transition-all"
                    dir="ltr" />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute top-1/2 -translate-y-1/2 left-3 text-stone-400 hover:text-stone-600 text-xs">
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* error */}
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3 rounded-xl text-center">
                  {error}
                </div>
              )}

              {/* submit */}
              <button type="submit"
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-bold py-3 rounded-xl text-sm transition-colors mt-1">
                {t('إنشاء الحساب', 'Create Account')}
              </button>
            </form>

            <div className="text-center mt-4 space-y-2">
              <p className="text-stone-500 text-xs">
                {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
                <Link href="/login" className="text-[var(--brand-strong)] font-semibold hover:underline">
                  {t('سجّل دخولك', 'Sign in')}
                </Link>
              </p>
              <p>
                <Link href="/" className="text-stone-400 hover:text-[var(--brand-strong)] text-xs transition-colors">
                  ← {t('العودة للصفحة الرئيسية', 'Back to homepage')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
