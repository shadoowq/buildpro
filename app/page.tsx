'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Lang = 'ar' | 'en';

/* ─── static content ─── */
const STEPS = [
  {
    icon: '📋',
    ar: { title: 'أنشئ طلب تسعير', body: 'حدد المواد المطلوبة — سيراميك، رخام، بورسلان — وأضف الكميات والمواصفات بدقيقتين.' },
    en: { title: 'Create a Request',   body: 'Specify required materials — ceramic, marble, porcelain — with quantities and specs in two minutes.' },
  },
  {
    icon: '📥',
    ar: { title: 'استقبل عروض الأسعار', body: 'يصلك عروض من الموردين المؤهلين تلقائياً على نفس الطلب — لا مكالمات، لا مطاردة.' },
    en: { title: 'Receive Quotes',    body: 'Get quotes from qualified suppliers automatically on the same request — no calls, no chasing.' },
  },
  {
    icon: '✅',
    ar: { title: 'قارن واختر الأفضل', body: 'قارن الأسعار والمواصفات والمدد جنباً إلى جنب، واختر العرض الأنسب لمشروعك.' },
    en: { title: 'Compare & Choose',  body: 'Compare prices, specs, and delivery side by side, then pick the best offer for your project.' },
  },
];

const STATS = [
  { ar: 'مورد مسجّل',   en: 'Registered Suppliers', val: '300+', icon: '🏢' },
  { ar: 'مقاول نشط',    en: 'Active Contractors',   val: '500+', icon: '👷' },
  { ar: 'طلب مُنفَّذ', en: 'Requests Processed',  val: '1,200+', icon: '📦' },
  { ar: 'مدينة سعودية', en: 'Saudi Cities',         val: '20+',  icon: '📍' },
];

const SUPPLIERS = [
  'RAK Ceramics', 'Saudi Ceramics', 'Porcelanosa',
  'National Ceramics', 'Future Ceramics', 'Al-Bandar Marble',
];

const TESTIMONIALS = [
  {
    ar: { text: 'وفّرنا 18% من تكلفة البلاط في مشروعنا بالرياض — كنا نجري ورا الموردين قبل BuildPro وهلأ هم اللي بيجروا ورانا.', name: 'م. خالد العتيبي', role: 'مقاول عام — الرياض' },
    en: { text: 'We saved 18% on tiling costs in our Riyadh project. We used to chase suppliers — now they come to us.', name: 'Eng. Khalid Al-Otaibi', role: 'General Contractor — Riyadh' },
  },
  {
    ar: { text: 'خلال أسبوع الأول وصلني 12 طلب تسعير من مقاولين جدد ما كنت أعرفهم. القناة دي فتحت لي سوق جديد.', name: 'أحمد محمود', role: 'مورد سيراميك — جدة' },
    en: { text: 'In my first week I received 12 pricing requests from new contractors I had never met. This channel opened a new market for me.', name: 'Ahmed Mahmoud', role: 'Ceramic Supplier — Jeddah' },
  },
];

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('ar');
  const router = useRouter();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const savedLang = (localStorage.getItem('language') as Lang) || 'ar';
    setLang(savedLang);
    const user = localStorage.getItem('currentUser');
    if (user) {
      try {
        const u = JSON.parse(user);
        router.push(u.userType === 'supplier' ? '/supplier-requests' : '/dashboard');
      } catch {}
    }
  }, [router]);

  const switchLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('language', l);
  };

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  return (
    <div className="min-h-screen bg-white font-cairo" dir={dir}>

      {/* ══ NAVBAR ══ */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E2EAF2] px-6 md:px-10 h-14 flex items-center justify-between">
        <span className="text-[17px] font-extrabold text-[#0F4C75]">
          Build<span className="text-[#1B9AAA]">Pro</span>
        </span>

        <div className="flex items-center gap-2">
          {/* lang toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => switchLang(l)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  lang === l ? 'bg-white text-[#0F4C75] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'}
                  width="20" height="14" alt={l} className="rounded-sm" />
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <Link href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-[#0F4C75] px-3 py-1.5 rounded-lg hover:bg-[#F0F4F8] transition-colors">
            {t('تسجيل الدخول', 'Login')}
          </Link>
          <Link href="/signup"
            className="text-xs font-semibold bg-[#0F4C75] text-white px-4 py-2 rounded-lg hover:bg-[#0D3F63] transition-colors">
            {t('ابدأ مجاناً', 'Get Started')}
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="bg-[#0F4C75] pt-16 pb-0 px-6 md:px-10 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03] pointer-events-none" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#1B9AAA]/10 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* badge */}
          <div className="inline-flex items-center gap-2 bg-[#1B9AAA]/20 border border-[#1B9AAA]/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-[#1B9AAA] rounded-full animate-pulse" />
            <span className="text-[#7ECFDA] text-xs font-semibold">
              {t('منصة تسعير مواد البناء رقم 1 في السعودية', '#1 Building Materials Pricing Platform in Saudi Arabia')}
            </span>
          </div>

          <h1 className="text-white text-3xl md:text-5xl font-extrabold leading-tight mb-4">
            {t('اطلب تسعير مواد البناء', 'Request Building Materials')}
            <br />
            <span className="text-[#1B9AAA]">
              {t('من 300+ مورد في دقائق', 'Pricing from 300+ Suppliers in Minutes')}
            </span>
          </h1>

          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            {t(
              'أرسل طلب تسعير واحد وانتظر العروض تتراكم — بدل ما تجري ورا الموردين واحداً واحداً، خليهم هم يجوا ليك.',
              'Send one request and watch offers roll in — instead of chasing suppliers one by one, let them come to you.'
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/signup?type=contractor"
              className="w-full sm:w-auto bg-[#1B9AAA] hover:bg-[#158494] text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-[#1B9AAA]/30 flex items-center justify-center gap-2">
              <span>👷</span> {t('سجل كمقاول', 'Sign up as Contractor')}
            </Link>
            <Link href="/signup?type=supplier"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              <span>🏢</span> {t('سجل كمورد', 'Sign up as Supplier')}
            </Link>
          </div>

          {/* social proof strip */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pb-10 text-white/40 text-xs">
            {[
              t('✓ مجاني تماماً للمقاولين', '✓ Completely free for contractors'),
              t('✓ بدون عمولة على الصفقات', '✓ No commission on deals'),
              t('✓ عروض خلال 24 ساعة', '✓ Quotes within 24 hours'),
            ].map((item, i) => <span key={i}>{item}</span>)}
          </div>
        </div>

        {/* wave divider */}
        <div className="h-8 bg-[#F0F4F8]" style={{
          clipPath: 'ellipse(55% 100% at 50% 100%)',
          marginTop: '-1px',
        }} />
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="bg-[#F0F4F8] py-16 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#1B9AAA] text-xs font-bold tracking-widest uppercase mb-2">
              {t('كيف يعمل', 'How It Works')}
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              {t('3 خطوات بسيطة كفيلة بتوفير آلاف الريالات', '3 Simple Steps That Save You Thousands')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
              <div key={i} className="bg-white border border-[#E2EAF2] rounded-2xl p-6 relative">
                <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-[#0F4C75] flex items-center justify-center text-white text-[10px] font-extrabold">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#EBF5FF] flex items-center justify-center text-2xl mb-4">
                  {step.icon}
                </div>
                <h3 className="text-slate-900 font-bold text-base mb-2">
                  {lang === 'ar' ? step.ar.title : step.en.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {lang === 'ar' ? step.ar.body : step.en.body}
                </p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 bg-[#E2EAF2] rounded-full items-center justify-center text-slate-400 text-xs z-10">
                    {lang === 'ar' ? '←' : '→'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="bg-[#0F4C75] py-14 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-white/40 text-xs font-bold tracking-widest uppercase mb-10">
            {t('BuildPro بالأرقام', 'BuildPro By The Numbers')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-3xl font-extrabold text-white mb-1">{s.val}</div>
                <div className="text-white/50 text-xs">{lang === 'ar' ? s.ar : s.en}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOR WHOM ══ */}
      <section className="bg-white py-16 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#1B9AAA] text-xs font-bold tracking-widest uppercase mb-2">
              {t('لمن هذه المنصة', 'Who Is This For')}
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              {t('حلول مختلفة لاحتياجات مختلفة', 'Different Solutions for Different Needs')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contractor */}
            <div className="border border-[#E2EAF2] rounded-2xl p-6 hover:border-[#1B9AAA] hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#EBF5FF] flex items-center justify-center text-2xl mb-4 group-hover:bg-[#1B9AAA]/10 transition-colors">
                👷
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-2">{t('أنا مقاول', "I'm a Contractor")}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                {t(
                  'وفّر وقتك وتكاليفك — أنشئ طلب تسعير واحد وتلقّ عروض أسعار منافسة من عشرات الموردين الموثوقين على نفس المواصفات.',
                  'Save time and money — create one request and receive competitive quotes from dozens of trusted suppliers on the same specs.'
                )}
              </p>
              <ul className="text-sm text-slate-600 space-y-1.5 mb-5">
                {(lang === 'ar'
                  ? ['مجاني 100% بدون عمولة', 'مقارنة الأسعار جنباً إلى جنب', 'تتبع حالة كل طلب', 'أرشيف كامل للطلبات والعروض']
                  : ['100% free, no commission', 'Side-by-side price comparison', 'Track every request status', 'Full archive of requests & quotes']
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#1B9AAA] mt-0.5">✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup?type=contractor"
                className="block w-full text-center bg-[#0F4C75] hover:bg-[#0D3F63] text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {t('سجل كمقاول مجاناً', 'Sign up as Contractor — Free')}
              </Link>
            </div>

            {/* Supplier */}
            <div className="border border-[#E2EAF2] rounded-2xl p-6 hover:border-[#1B9AAA] hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[#EBF5FF] flex items-center justify-center text-2xl mb-4 group-hover:bg-[#1B9AAA]/10 transition-colors">
                🏢
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-2">{t('أنا مورد', "I'm a Supplier")}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                {t(
                  'وسّع قاعدة عملائك — وصل إلى مئات المقاولين النشطين الباحثين عن موردين موثوقين في مدينتك وفي كل أنحاء المملكة.',
                  'Grow your customer base — reach hundreds of active contractors looking for trusted suppliers in your city and across the Kingdom.'
                )}
              </p>
              <ul className="text-sm text-slate-600 space-y-1.5 mb-5">
                {(lang === 'ar'
                  ? ['تصلك الطلبات المناسبة تلقائياً', 'لا رسوم على تقديم العروض', 'بناء سمعتك عبر تقييمات المقاولين', 'لوحة تحكم لمتابعة عروضك']
                  : ['Matching requests delivered automatically', 'No fees for submitting quotes', 'Build reputation through contractor ratings', 'Dashboard to track your quotes']
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#1B9AAA] mt-0.5">✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup?type=supplier"
                className="block w-full text-center bg-[#1B9AAA] hover:bg-[#158494] text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                {t('سجل كمورد مجاناً', 'Sign up as Supplier — Free')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="bg-[#F0F4F8] py-16 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#1B9AAA] text-xs font-bold tracking-widest uppercase mb-2">
              {t('آراء العملاء', 'What Our Users Say')}
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              {t('تجارب حقيقية من السوق السعودي', 'Real Experiences from the Saudi Market')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TESTIMONIALS.map((t_item, i) => {
              const content = lang === 'ar' ? t_item.ar : t_item.en;
              return (
                <div key={i} className="bg-white border border-[#E2EAF2] rounded-2xl p-6">
                  <div className="text-[#1B9AAA] text-2xl mb-3">"</div>
                  <p className="text-slate-700 text-sm leading-relaxed mb-5">{content.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0F4C75] flex items-center justify-center text-white font-bold text-sm">
                      {content.name.charAt(content.name.length > 3 ? 2 : 0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{content.name}</div>
                      <div className="text-xs text-slate-500">{content.role}</div>
                    </div>
                    <div className="mr-auto text-amber-400 text-sm">★★★★★</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ LOGO WALL ══ */}
      <section className="bg-white py-12 px-6 md:px-10 border-t border-[#E2EAF2]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-8">
            {t('من بين موردينا الموثوقين', 'Among Our Trusted Suppliers')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {SUPPLIERS.map((name, i) => (
              <div key={i} className="text-slate-300 font-bold text-sm tracking-wide hover:text-slate-500 transition-colors cursor-default">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BOTTOM CTA ══ */}
      <section className="bg-[#0F4C75] py-16 px-6 md:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-white text-2xl md:text-3xl font-extrabold mb-3">
            {t('جاهز تبدأ؟', 'Ready to Start?')}
          </h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            {t(
              'انضم لمئات المقاولين الذين يوفرون وقتهم ومالهم مع BuildPro — التسجيل مجاني ولا يستغرق دقيقتين.',
              'Join hundreds of contractors saving time and money with BuildPro — registration is free and takes less than two minutes.'
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup?type=contractor"
              className="w-full sm:w-auto bg-[#1B9AAA] hover:bg-[#158494] text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-[#1B9AAA]/30 flex items-center justify-center gap-2">
              <span>👷</span> {t('سجل كمقاول', 'Sign up as Contractor')}
            </Link>
            <Link href="/signup?type=supplier"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              <span>🏢</span> {t('سجل كمورد', 'Sign up as Supplier')}
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-slate-900 py-10 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* brand */}
            <div>
              <div className="text-[17px] font-extrabold text-white mb-2">
                Build<span className="text-[#1B9AAA]">Pro</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                {t(
                  'منصة تسعير مواد البناء — نربط المقاولين بالموردين في السوق السعودي.',
                  'Building materials pricing platform — connecting contractors with suppliers in the Saudi market.'
                )}
              </p>
            </div>

            {/* quick links */}
            <div>
              <p className="text-slate-300 font-bold text-xs mb-3 uppercase tracking-wider">
                {t('روابط سريعة', 'Quick Links')}
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { ar: 'تسجيل الدخول', en: 'Login',            href: '/login'    },
                  { ar: 'إنشاء حساب',   en: 'Sign Up',          href: '/signup'   },
                  { ar: 'للمقاولين',    en: 'For Contractors',  href: '/signup?type=contractor' },
                  { ar: 'للموردين',     en: 'For Suppliers',    href: '/signup?type=supplier'   },
                ].map(link => (
                  <Link key={link.href} href={link.href}
                    className="text-slate-400 hover:text-white text-xs transition-colors">
                    {lang === 'ar' ? link.ar : link.en}
                  </Link>
                ))}
              </div>
            </div>

            {/* contact */}
            <div>
              <p className="text-slate-300 font-bold text-xs mb-3 uppercase tracking-wider">
                {t('تواصل معنا', 'Contact Us')}
              </p>
              <div className="flex flex-col gap-2 text-slate-400 text-xs">
                <span>📧 hello@buildpro.sa</span>
                <span>📱 {t('واتساب:', 'WhatsApp:')} +966 5X XXX XXXX</span>
                <span>🏙 {t('الرياض، المملكة العربية السعودية', 'Riyadh, Saudi Arabia')}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-slate-500 text-xs">
              © 2025 BuildPro. {t('جميع الحقوق محفوظة.', 'All rights reserved.')}
            </p>
            <p className="text-slate-600 text-xs">
              {t('مصنوع بـ ❤️ للسوق السعودي', 'Made with ❤️ for the Saudi Market')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
