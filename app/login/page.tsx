'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Lang = 'ar' | 'en';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [lang, setLang]         = useState<Lang>('ar');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('language') as Lang) || 'ar';
    setLang(saved);
    /* redirect if already logged in */
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        const u = JSON.parse(user);
        router.push(u.userType === 'supplier' ? '/supplier-requests' : '/dashboard');
      } catch {}
    }
  }, [router]);

  const switchLang = (l: Lang) => { setLang(l); localStorage.setItem('language', l); };

  const handleLogin = () => {
    setError('');
    /* admin */
    if (email === 'admin@buildpro.sa' && password === 'Admin@2025') {
      localStorage.setItem('currentUser', JSON.stringify({ id: 'admin-001', name: 'Admin', email: 'admin@buildpro.sa', userType: 'admin' }));
      router.push('/admin');
      return;
    }
    /* normal users */
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user  = users.find((u: any) => u.email === email && u.password === password);
    if (!user) {
      setError(lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غلط' : 'Incorrect email or password');
      return;
    }
    localStorage.setItem('currentUser', JSON.stringify(user));
    router.push(user.userType === 'contractor' ? '/dashboard' : '/supplier-requests');
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  return (
    <div className="min-h-screen flex font-cairo" dir={dir}>

      {/* ── LEFT / BRAND PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-[#0F4C75] px-12 py-10 relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#1B9AAA]/20 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* logo */}
        <Link href="/" className="text-xl font-extrabold text-white relative z-10">
          Build<span className="text-[#1B9AAA]">Pro</span>
        </Link>

        {/* center content */}
        <div className="relative z-10">
          <div className="w-16 h-16 bg-[#1B9AAA]/20 rounded-2xl flex items-center justify-center text-4xl mb-6">🏗</div>
          <h2 className="text-white text-2xl font-extrabold leading-snug mb-3">
            {t('منصة تسعير مواد البناء\nرقم 1 في السعودية', 'Saudi Arabia\'s #1\nBuilding Materials\nPricing Platform')}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            {t('أرسل طلب واحد وانتظر العروض — بدل ما تجري ورا الموردين واحداً واحداً.',
               'Send one request and let offers come to you — no more chasing suppliers one by one.')}
          </p>

          <div className="flex flex-col gap-3">
            {[
              { icon: '⚡', ar: 'عروض خلال 24 ساعة',         en: 'Quotes within 24 hours'      },
              { icon: '🔒', ar: 'بدون عمولة على الصفقات',    en: 'No commission on deals'       },
              { icon: '📊', ar: 'قارن الأسعار جنباً إلى جنب', en: 'Side-by-side price comparison' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm shrink-0">{item.icon}</div>
                <span className="text-white/70 text-sm">{lang === 'ar' ? item.ar : item.en}</span>
              </div>
            ))}
          </div>
        </div>

        {/* bottom stats */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { val: '300+', label: t('مورد', 'Suppliers') },
            { val: '500+', label: t('مقاول', 'Contractors') },
            { val: '1,200+', label: t('طلب', 'Requests') },
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
        <div className="flex items-center justify-between px-8 py-4 border-b border-[#F1F5F9]">
          <Link href="/" className="lg:hidden text-[16px] font-extrabold text-[#0F4C75]">
            Build<span className="text-[#1B9AAA]">Pro</span>
          </Link>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mr-auto">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => switchLang(l)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'}
                  width="20" height="14" alt={l} className="rounded-sm" />
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* form area */}
        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
                {t('أهلاً بعودتك 👋', 'Welcome back 👋')}
              </h1>
              <p className="text-slate-500 text-sm">
                {t('سجّل دخولك للوصول إلى حسابك', 'Sign in to access your account')}
              </p>
            </div>

            <div className="space-y-4">
              {/* email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('البريد الإلكتروني', 'Email address')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder={t('example@email.com', 'example@email.com')}
                  className="w-full border border-[#E2EAF2] bg-[#F8FAFC] rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B9AAA] focus:border-transparent transition-all"
                  dir="ltr"
                />
              </div>

              {/* password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('كلمة المرور', 'Password')}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    className="w-full border border-[#E2EAF2] bg-[#F8FAFC] rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B9AAA] focus:border-transparent transition-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 hover:text-slate-600 text-xs"
                  >
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
              <button
                onClick={handleLogin}
                className="w-full bg-[#0F4C75] hover:bg-[#0D3F63] text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                {t('دخول', 'Sign In')}
              </button>

              {/* divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-slate-300 text-xs">{t('أو', 'or')}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* signup links */}
              <div className="grid grid-cols-2 gap-2">
                <Link href="/signup?type=contractor"
                  className="flex items-center justify-center gap-1.5 border border-[#E2EAF2] rounded-xl py-2.5 text-xs font-semibold text-slate-600 hover:bg-[#F0F4F8] hover:text-[#0F4C75] transition-colors">
                  <span>👷</span> {t('مقاول جديد', 'New Contractor')}
                </Link>
                <Link href="/signup?type=supplier"
                  className="flex items-center justify-center gap-1.5 border border-[#E2EAF2] rounded-xl py-2.5 text-xs font-semibold text-slate-600 hover:bg-[#F0F4F8] hover:text-[#0F4C75] transition-colors">
                  <span>🏢</span> {t('مورد جديد', 'New Supplier')}
                </Link>
              </div>
            </div>

            <p className="text-center text-slate-400 text-xs mt-6">
              <Link href="/" className="hover:text-[#0F4C75] transition-colors">
                ← {t('العودة للصفحة الرئيسية', 'Back to homepage')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
