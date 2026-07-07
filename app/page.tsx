'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getLanguage, setLanguage } from './lib/store';
import {
  IconClipboardList, IconInboxDownload, IconBadgeCheck,
  IconMapPin, IconPackage, IconHardHat, IconBuilding,
  IconSparkle, IconArrow, IconCheck, IconQuote,
} from './components/Icon';
import AddToHomeScreen from './components/AddToHomeScreen';
type Lang = 'ar' | 'en';

/* ─── scroll-reveal: fades/slides a section in the first time it enters the viewport ─── */
function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`bp-reveal ${visible ? 'bp-reveal-visible' : ''} ${className}`} style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}>
      {children}
    </div>
  );
}

/* ─── counts a stat up from 0 once its card scrolls into view ─── */
function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

function StatCard({ stat, lang }: { stat: typeof STATS[number]; lang: Lang }) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);
  const count = useCountUp(stat.num, visible);
  const Icon = stat.icon;
  return (
    <div ref={ref} className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 text-center hover:bg-white/[0.09] hover:-translate-y-1 transition-all duration-300">
      <div className="w-11 h-11 mx-auto rounded-xl bg-[var(--brand)]/15 flex items-center justify-center text-[var(--chrome-active-ink)] mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-extrabold text-white mb-1 tabular-nums">{count.toLocaleString()}{stat.suffix}</div>
      <div className="text-white/50 text-xs">{lang === 'ar' ? stat.ar : stat.en}</div>
    </div>
  );
}

/* ─── static content ─── */
const STEPS = [
  {
    icon: IconClipboardList,
    ar: { title: 'أنشئ طلب تسعير', body: 'حدد المواد المطلوبة — سيراميك، رخام، بورسلان — وأضف الكميات والمواصفات بدقيقتين.' },
    en: { title: 'Create a Request',   body: 'Specify required materials — ceramic, marble, porcelain — with quantities and specs in two minutes.' },
  },
  {
    icon: IconInboxDownload,
    ar: { title: 'استقبل عروض الأسعار', body: 'يصلك عروض من الموردين المؤهلين تلقائياً على نفس الطلب — لا مكالمات، لا مطاردة.' },
    en: { title: 'Receive Quotes',    body: 'Get quotes from qualified suppliers automatically on the same request — no calls, no chasing.' },
  },
  {
    icon: IconBadgeCheck,
    ar: { title: 'قارن واختر الأفضل', body: 'قارن الأسعار والمواصفات والمدد جنباً إلى جنب، واختر العرض الأنسب لمشروعك.' },
    en: { title: 'Compare & Choose',  body: 'Compare prices, specs, and delivery side by side, then pick the best offer for your project.' },
  },
];

const STATS = [
  { ar: 'مورد مسجّل',   en: 'Registered Suppliers', num: 300,  suffix: '+', icon: IconBuilding },
  { ar: 'مقاول نشط',    en: 'Active Contractors',   num: 500,  suffix: '+', icon: IconHardHat  },
  { ar: 'طلب مُنفَّذ', en: 'Requests Processed',  num: 1200, suffix: '+', icon: IconPackage  },
  { ar: 'مدينة سعودية', en: 'Saudi Cities',         num: 20,   suffix: '+', icon: IconMapPin   },
];

const SUPPLIER_LOGOS = [
  { src: '/images/logos/rajhi-steel.png', alt: 'Rajhi Steel' },
  { src: '/images/logos/alfanar-porcelain.png', alt: 'Alfanar Porcelain' },
  { src: '/images/logos/saveto.png', alt: 'Saveto Construction Materials' },
  { src: '/images/logos/alsafwa-cement.png', alt: 'Alsafwa Cement' },
  { src: '/images/logos/rak-ceramics.png', alt: 'RAK Ceramics' },
  { src: '/images/logos/khayyat-bricks.png', alt: 'El-Khayyat Red Bricks Factories' },
  { src: '/images/logos/saudi-ceramics.png', alt: 'Saudi Ceramics' },
  { src: '/images/logos/watania-steel.png', alt: 'Watania Steel' },
  { src: '/images/logos/elsewedy-cables.png', alt: 'Elsewedy Cables' },
  { src: '/images/logos/alsafa-aluminum.png', alt: 'Al-Safa Aluminum' },
  { src: '/images/logos/alwady-alakhdar.png', alt: 'Al-Wady Al-Akhdar' },
  { src: '/images/logos/jotun.png', alt: 'Jotun' },
];

// 3 groups splitting the 12 logos evenly with no overlap — every logo appears in
// exactly one group (only 12 unique logos exist, so 7-per-group would force repeats).
const LOGO_GROUP_SIZE = Math.ceil(SUPPLIER_LOGOS.length / 3);
const LOGO_GROUPS = [0, 1, 2].map(g =>
  SUPPLIER_LOGOS.slice(g * LOGO_GROUP_SIZE, (g + 1) * LOGO_GROUP_SIZE)
);

function LogoCarousel() {
  // one extra slide at the end duplicating the first group, so the loop can snap back
  // to slide 0 invisibly right after sliding into the duplicate — classic infinite-carousel trick
  const slides = [...LOGO_GROUPS, LOGO_GROUPS[0]];
  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => i + 1), 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (index !== slides.length - 1) return;
    const timer = setTimeout(() => {
      setInstant(true);
      setIndex(0);
    }, 700);
    return () => clearTimeout(timer);
  }, [index, slides.length]);

  useEffect(() => {
    if (!instant) return;
    const raf = requestAnimationFrame(() => setInstant(false));
    return () => cancelAnimationFrame(raf);
  }, [instant]);

  return (
    <div className="overflow-hidden" dir="ltr">
      <div
        className={`flex ${instant ? '' : 'transition-transform duration-700 ease-in-out'}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((group, gi) => (
          <div key={gi} className="w-full shrink-0 flex flex-wrap items-center justify-center gap-3 md:gap-5">
            {group.map((logo, i) => (
              <div key={i} className="w-36 h-24 md:w-44 md:h-28 shrink-0 bg-white border border-[var(--line)] rounded-xl shadow-sm flex items-center justify-center p-4">
                <img src={logo.src} alt={logo.alt} className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const TESTIMONIALS = [
  {
    ar: { text: 'وفّرنا 18% من تكلفة البلاط في مشروعنا بالرياض — كنا نجري ورا الموردين قبل BuildPro وهلأ هم اللي بيجروا ورانا.', name: 'م. خالد العتيبي', role: 'مقاول عام — الرياض' },
    en: { text: 'We saved 18% on tiling costs in our Riyadh project. We used to chase suppliers — now they come to us.', name: 'Eng. Khalid Al-Otaibi', role: 'General Contractor — Riyadh' },
  },
  {
    ar: { text: 'خلال أسبوع الأول وصلني 12 طلب تسعير من مقاولين جدد ما كنت أعرفهم. القناة دي فتحت لي سوق جديد.', name: 'أحمد محمود', role: 'مورد سيراميك — جدة' },
    en: { text: 'In my first week I received 12 pricing requests from new contractors I had never met. This channel opened a new market for me.', name: 'Ahmed Mahmoud', role: 'Ceramic Supplier — Jeddah' },
  },
  {
    ar: { text: 'قارنت بين 6 عروض حديد تسليح في نفس اليوم بدل ما أتصل على كل مورد لوحده. وفرت وقت أسبوع كامل.', name: 'م. سارة القحطاني', role: 'مديرة مشتريات — الدمام' },
    en: { text: 'I compared 6 rebar quotes in the same day instead of calling every supplier separately. Saved an entire week.', name: 'Eng. Sarah Al-Qahtani', role: 'Procurement Manager — Dammam' },
  },
  {
    ar: { text: 'أول منصة توصلني بمقاولين حقيقيين محتاجين ألمنيوم فورًا، من غير وسطاء ومن غير عمولة.', name: 'مايكل تشين', role: 'مورد ألمنيوم — جدة' },
    en: { text: 'The first platform that connects me to real contractors who need aluminum right now — no middlemen, no commission.', name: 'Michael Chen', role: 'Aluminum Supplier — Jeddah' },
  },
  {
    ar: { text: 'كنت بضيع نص وقتي في المكالمات، دلوقتي بس بحدد المواصفات وأستنى العروض توصل.', name: 'م. عبدالله الحربي', role: 'مقاول تشطيبات — مكة' },
    en: { text: 'I used to waste half my day on phone calls. Now I just set the specs and wait for quotes to arrive.', name: 'Eng. Abdullah Al-Harbi', role: 'Finishing Contractor — Mecca' },
  },
  {
    ar: { text: 'كمهندس مشتريات أجنبي في السوق السعودي، المنصة سهّلت عليّ فهم السوق المحلي والوصول لموردين موثوقين بسرعة.', name: 'راجيش كومار', role: 'مدير مشتريات — الخبر' },
    en: { text: 'As an expat procurement engineer in the Saudi market, this platform made it easy to understand the local market and reach trusted suppliers fast.', name: 'Rajesh Kumar', role: 'Procurement Manager — Khobar' },
  },
  {
    ar: { text: 'مشروعي السكني الأول، ومنصة BuildPro خلتني أقارن أسعار العزل الحراري زي المحترفين من غير خبرة سابقة.', name: 'فاطمة الزهراني', role: 'مالكة مشروع سكني — أبها' },
    en: { text: 'My first residential project, and BuildPro let me compare insulation prices like a pro with zero prior experience.', name: 'Fatima Al-Zahrani', role: 'Residential Project Owner — Abha' },
  },
  {
    ar: { text: 'وصلتنا طلبات عزل حراري من مدن ما كنا نوزع فيها أصلاً. المنصة وسّعت نطاق مبيعاتنا فعليًا.', name: 'جون أندرسون', role: 'مورد عزل حراري — ينبع' },
    en: { text: 'We started getting insulation requests from cities we never distributed to before. The platform genuinely expanded our sales reach.', name: 'John Anderson', role: 'Insulation Supplier — Yanbu' },
  },
  {
    ar: { text: 'أدرت 3 مشاريع في نفس الوقت بمتابعة كل طلب تسعير لوحده — سهّل عليّ التنظيم جدًا.', name: 'م. ماجد السبيعي', role: 'مقاول عام — تبوك' },
    en: { text: 'I managed 3 projects at once by tracking every pricing request separately — made organization so much easier.', name: 'Eng. Majed Al-Subaie', role: 'General Contractor — Tabuk' },
  },
  {
    ar: { text: 'الشفافية في مقارنة المواصفات جنبًا إلى جنب وفرتلي قرارات أسرع وأدق مع كل مورد.', name: 'بريا شارما', role: 'مهندسة مشتريات — الرياض' },
    en: { text: 'The transparency of comparing specs side by side gave me faster, more accurate decisions with every supplier.', name: 'Priya Sharma', role: 'Procurement Engineer — Riyadh' },
  },
  {
    ar: { text: 'ما كنت مصدق إن فيه منصة بتوصلني بمقاولين فعليين يبحثون عن حديد تسليح بجودة موثقة.', name: 'م. تركي العنزي', role: 'مورد حديد — جدة' },
    en: { text: 'I couldn\'t believe there was a platform connecting me to real contractors actively searching for certified rebar.', name: 'Eng. Turki Al-Anzi', role: 'Steel Supplier — Jeddah' },
  },
  {
    ar: { text: 'كمستشار مشاريع، بنصح كل عملائي يستخدموا BuildPro قبل ما يوقعوا أي عقد توريد.', name: 'ديفيد ميلر', role: 'مستشار مشاريع — الدمام' },
    en: { text: 'As a project consultant, I now advise every client to use BuildPro before signing any supply contract.', name: 'David Miller', role: 'Project Consultant — Dammam' },
  },
  {
    ar: { text: 'معرضي الصغير بقى يوصله طلبات من مقاولين في مدن تانية، مش بس اللي حواليّ.', name: 'نورة الشمري', role: 'مالكة معرض بلاط — الرياض' },
    en: { text: 'My small showroom now gets requests from contractors in other cities, not just my local area.', name: 'Noura Al-Shammari', role: 'Tile Showroom Owner — Riyadh' },
  },
  {
    ar: { text: 'كل موسم بناء كنا نخسر عملاء بسبب بطء الرد. دلوقتي عروضنا توصل خلال ساعات.', name: 'أحمد الزهراني', role: 'مورد أسمنت — مكة' },
    en: { text: 'Every construction season we used to lose clients due to slow responses. Now our quotes go out within hours.', name: 'Ahmed Al-Zahrani', role: 'Cement Supplier — Mecca' },
  },
  {
    ar: { text: 'واجهات المباني بتحتاج مواد دقيقة المواصفات، والمنصة سهّلت عليّ الوصول لموردين يفهموا المطلوب بالظبط.', name: 'كارلوس رودريغيز', role: 'مقاول واجهات — جدة' },
    en: { text: 'Building facades need very precise specs, and the platform made it easy to reach suppliers who understood exactly what was needed.', name: 'Carlos Rodriguez', role: 'Facade Contractor — Jeddah' },
  },
  {
    ar: { text: 'بقيت أوصل لعدد مقاولين أكبر بكتير من غير ما أزود ميزانية التسويق ولا ريال واحد.', name: 'م. بندر القرني', role: 'مورد دهانات — الرياض' },
    en: { text: 'I now reach far more contractors without increasing my marketing budget by a single riyal.', name: 'Eng. Bandar Al-Qarni', role: 'Paint Supplier — Riyadh' },
  },
  {
    ar: { text: 'إدارة عروض الأسعار لكل فروعنا بقت مركزية ومنظمة بدل ما كل فرع يشتغل لوحده.', name: 'فاطمة العتيبي', role: 'مديرة تنفيذية — الخبر' },
    en: { text: 'Managing quotes across all our branches became centralized and organized instead of every branch working on its own.', name: 'Fatima Al-Otaibi', role: 'Executive Manager — Khobar' },
  },
  {
    ar: { text: 'طلبات الكابلات كانت بتوصلنا بالصدفة قبل كده، دلوقتي بتوصلنا مستهدفة وبمواصفات واضحة من البداية.', name: 'حسن علي', role: 'مورد كابلات — الدمام' },
    en: { text: 'Cable requests used to reach us by chance before. Now they arrive targeted, with clear specs from the start.', name: 'Hassan Ali', role: 'Cables Supplier — Dammam' },
  },
  {
    ar: { text: 'مشروع ترميم في المدينة المنورة احتاج موردين متخصصين بسرعة، ولقيتهم كلهم في مكان واحد.', name: 'سلطان المطيري', role: 'مقاول عام — المدينة المنورة' },
    en: { text: 'A renovation project in Medina needed specialized suppliers fast, and I found them all in one place.', name: 'Sultan Al-Mutairi', role: 'General Contractor — Medina' },
  },
  {
    ar: { text: 'كمديرة مشتريات دولية، بحثت طويلاً عن منصة تفهم خصوصية السوق السعودي — وأخيرًا لقيتها.', name: 'إيميلي واطسون', role: 'مديرة مشتريات دولية — جدة' },
    en: { text: 'As an international procurement manager, I searched long for a platform that understands the specifics of the Saudi market — and finally found it.', name: 'Emily Watson', role: 'International Procurement Manager — Jeddah' },
  },
];

function TestimonialCarousel({ lang }: { lang: Lang }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % TESTIMONIALS.length);
        setVisible(true);
      }, 400);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const content = lang === 'ar' ? TESTIMONIALS[index].ar : TESTIMONIALS[index].en;

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`bg-white border border-[var(--line)] rounded-2xl p-8 shadow-sm transition-all duration-400 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
        <IconQuote className="w-8 h-8 text-[var(--tint-hover)] mb-3" />
        <p className="text-stone-700 text-base leading-relaxed mb-6 min-h-[75px]">{content.text}</p>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-[var(--brand)] flex items-center justify-center text-white font-bold text-sm">
            {content.name.charAt(content.name.length > 3 ? 2 : 0)}
          </div>
          <div>
            <div className="text-sm font-bold text-stone-900">{content.name}</div>
            <div className="text-xs text-stone-500">{content.role}</div>
          </div>
          <div className="mr-auto text-amber-400 text-sm">★★★★★</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('ar');
  const router = useRouter();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    setLang(getLanguage());
    const u = getCurrentUser<any>();
    if (u) {
      router.push(u.userType === 'supplier' ? '/supplier-requests' : '/dashboard');
    }
  }, [router]);

  const switchLang = (l: Lang) => {
    setLang(l);
    setLanguage(l);
  };

  const t = useCallback((ar: string, en: string) => lang === 'ar' ? ar : en, [lang]);

  return (
    <div className="min-h-screen bg-white font-cairo" dir={dir}>

      {/* ══ NAVBAR ══ */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[var(--line)] px-6 md:px-10 h-14 flex items-center justify-between">
        <span className="text-[17px] font-extrabold text-[var(--brand-strong)]">
          Build<span className="text-[var(--sec)]">Pro</span>
        </span>

        <div className="flex items-center gap-2">
          {/* lang toggle */}
          <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
            {(['ar', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => switchLang(l)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  lang === l ? 'bg-white text-[var(--brand-strong)] shadow-sm' : 'text-stone-400 hover:text-stone-600'
                }`}>
                <img src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'}
                  width="20" height="14" alt={l} className="rounded-sm" />
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <Link href="/login"
            className="text-xs font-semibold text-stone-600 hover:text-[var(--brand-strong)] px-3 py-1.5 rounded-lg hover:bg-[var(--bg)] transition-colors">
            {t('تسجيل الدخول', 'Login')}
          </Link>
          <Link href="/signup"
            className="text-xs font-semibold bg-[var(--brand)] text-white px-4 py-2 rounded-lg hover:bg-[var(--brand-hover)] transition-colors">
            {t('ابدأ مجاناً', 'Get Started')}
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="pt-16 pb-0 px-6 md:px-10 relative overflow-hidden">
        {/* full-bleed photo backdrop */}
        <Image
          src="/images/hero-construction-worker.jpg"
          alt={t('عامل بناء يرتدي خوذة وسترة أمان في موقع إنشائي', 'Construction worker wearing a hard hat and safety vest on a job site')}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-[var(--chrome)]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--chrome)] via-[var(--chrome)]/40 to-[var(--chrome)]/60" />

        {/* ambient floating gradient blobs — slow, blurred, sit above the photo for extra depth */}
        <div className="bp-blob absolute top-0 right-0 w-80 h-80 bg-[var(--brand)]/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="bp-blob-slow absolute bottom-0 left-0 w-72 h-72 bg-[var(--sec)]/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        <div className="bp-blob absolute top-1/3 left-1/3 w-40 h-40 bg-white/[0.04] rounded-full blur-2xl pointer-events-none" style={{ animationDelay: '-6s' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* badge */}
          <div className="inline-flex items-center gap-2 bg-[var(--brand)]/15 border border-[var(--brand)]/30 rounded-full px-4 py-1.5 mb-6">
            <IconSparkle className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span className="text-[var(--chrome-active-ink)] text-xs font-semibold">
              {t('منصة تسعير مواد البناء رقم 1 في السعودية', '#1 Building Materials Pricing Platform in Saudi Arabia')}
            </span>
          </div>

          <h1 className="text-white text-3xl md:text-5xl font-extrabold leading-tight mb-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            {t('اطلب تسعير مواد البناء', 'Request Building Materials')}
            <br />
            <span className="text-[var(--chrome-active-ink)]">
              {t('من 300+ مورد في دقائق', 'Pricing from 300+ Suppliers in Minutes')}
            </span>
          </h1>

          <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            {t(
              'أرسل طلب تسعير واحد وانتظر العروض تتراكم — بدل ما تجري ورا الموردين واحداً واحداً، خليهم هم يجوا ليك.',
              'Send one request and watch offers roll in — instead of chasing suppliers one by one, let them come to you.'
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/signup?type=contractor"
              className="w-full sm:w-auto bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--on-brand)] font-bold px-8 py-3.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-[var(--brand)]/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <IconHardHat className="w-4 h-4" /> {t('سجل كمقاول', 'Sign up as Contractor')}
            </Link>
            <Link href="/signup?type=supplier"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <IconBuilding className="w-4 h-4" /> {t('سجل كمورد', 'Sign up as Supplier')}
            </Link>
          </div>

          {/* social proof strip */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pb-10 text-white/50 text-xs">
            {[
              t('مجاني تماماً للمقاولين', 'Completely free for contractors'),
              t('بدون عمولة على الصفقات', 'No commission on deals'),
              t('عروض خلال 24 ساعة', 'Quotes within 24 hours'),
            ].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-[var(--brand)]" /> {item}
              </span>
            ))}
          </div>
        </div>

        {/* wave divider */}
        <div className="h-8 bg-[var(--bg)] relative z-10" style={{
          clipPath: 'ellipse(55% 100% at 50% 100%)',
          marginTop: '-1px',
        }} />
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="bg-[var(--bg)] py-16 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[var(--sec)] text-xs font-bold tracking-widest uppercase mb-2">
              {t('كيف يعمل', 'How It Works')}
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900">
              {t('3 خطوات بسيطة كفيلة بتوفير آلاف الريالات', '3 Simple Steps That Save You Thousands')}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={i} delay={i * 120}>
                  <div className="bg-white border border-[var(--line)] rounded-2xl p-6 relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full">
                    {/* subtle corner gradient for depth instead of flat white */}
                    <div className="absolute -top-8 -right-8 w-28 h-28 bg-[var(--tint)] rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity pointer-events-none" />
                    <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-[10px] font-extrabold z-10">
                      {i + 1}
                    </div>
                    <div className="relative w-12 h-12 rounded-xl bg-[var(--tint)] flex items-center justify-center text-[var(--brand-strong)] mb-4 group-hover:scale-110 group-hover:bg-[var(--brand)] group-hover:text-white transition-all duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="relative text-stone-900 font-bold text-base mb-2">
                      {lang === 'ar' ? step.ar.title : step.en.title}
                    </h3>
                    <p className="relative text-stone-500 text-sm leading-relaxed">
                      {lang === 'ar' ? step.ar.body : step.en.body}
                    </p>
                    {i < STEPS.length - 1 && (
                      <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 bg-white border border-[var(--line)] rounded-full items-center justify-center text-[var(--brand-strong)] z-10 shadow-sm">
                        <IconArrow className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="py-14 px-6 md:px-10 relative overflow-hidden">
        <Image
          src="/images/stats-city-night.jpg"
          alt={t('موقع بناء ليلاً وسط ناطحات السحاب', 'A construction site at night among city skyscrapers')}
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[var(--chrome)]/75" />
        <div className="bp-blob-slow absolute top-1/2 right-1/4 w-64 h-64 bg-[var(--brand)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal className="text-center mb-10">
            <p className="text-white/40 text-xs font-bold tracking-widest uppercase">
              {t('BuildPro بالأرقام', 'BuildPro By The Numbers')}
            </p>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => <StatCard key={i} stat={s} lang={lang} />)}
          </div>
        </div>
      </section>

      {/* ══ FOR WHOM ══ */}
      <section className="bg-white py-16 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[var(--sec)] text-xs font-bold tracking-widest uppercase mb-2">
              {t('لمن هذه المنصة', 'Who Is This For')}
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900">
              {t('حلول مختلفة لاحتياجات مختلفة', 'Different Solutions for Different Needs')}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contractor */}
            <Reveal>
              <div className="relative overflow-hidden border border-[var(--line)] rounded-2xl p-6 hover:border-[var(--brand)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full">
                <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-[var(--tint)] rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />
                <div className="relative w-12 h-12 rounded-xl bg-[var(--tint)] flex items-center justify-center text-[var(--brand-strong)] mb-4 group-hover:scale-110 group-hover:bg-[var(--brand)] group-hover:text-white transition-all duration-300">
                  <IconHardHat className="w-6 h-6" />
                </div>
                <h3 className="relative font-extrabold text-stone-900 text-lg mb-2">{t('أنا مقاول', "I'm a Contractor")}</h3>
                <p className="relative text-stone-500 text-sm leading-relaxed mb-4">
                  {t(
                    'وفّر وقتك وتكاليفك — أنشئ طلب تسعير واحد وتلقّ عروض أسعار منافسة من عشرات الموردين الموثوقين على نفس المواصفات.',
                    'Save time and money — create one request and receive competitive quotes from dozens of trusted suppliers on the same specs.'
                  )}
                </p>
                <ul className="relative text-sm text-stone-600 space-y-1.5 mb-5">
                  {(lang === 'ar'
                    ? ['مجاني 100% بدون عمولة', 'مقارنة الأسعار جنباً إلى جنب', 'تتبع حالة كل طلب', 'أرشيف كامل للطلبات والعروض']
                    : ['100% free, no commission', 'Side-by-side price comparison', 'Track every request status', 'Full archive of requests & quotes']
                  ).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <IconCheck className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup?type=contractor"
                  className="relative block w-full text-center bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  {t('سجل كمقاول مجاناً', 'Sign up as Contractor — Free')}
                </Link>
              </div>
            </Reveal>

            {/* Supplier */}
            <Reveal delay={120}>
              <div className="relative overflow-hidden border border-[var(--line)] rounded-2xl p-6 hover:border-[var(--sec)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full">
                <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-[var(--sec)]/10 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />
                <div className="relative w-12 h-12 rounded-xl bg-[var(--tint)] flex items-center justify-center text-[var(--brand-strong)] mb-4 group-hover:scale-110 group-hover:bg-[var(--sec)] group-hover:text-white transition-all duration-300">
                  <IconBuilding className="w-6 h-6" />
                </div>
                <h3 className="relative font-extrabold text-stone-900 text-lg mb-2">{t('أنا مورد', "I'm a Supplier")}</h3>
                <p className="relative text-stone-500 text-sm leading-relaxed mb-4">
                  {t(
                    'وسّع قاعدة عملائك — وصل إلى مئات المقاولين النشطين الباحثين عن موردين موثوقين في مدينتك وفي كل أنحاء المملكة.',
                    'Grow your customer base — reach hundreds of active contractors looking for trusted suppliers in your city and across the Kingdom.'
                  )}
                </p>
                <ul className="relative text-sm text-stone-600 space-y-1.5 mb-5">
                  {(lang === 'ar'
                    ? ['تصلك الطلبات المناسبة تلقائياً', 'لا رسوم على تقديم العروض', 'بناء سمعتك عبر تقييمات المقاولين', 'لوحة تحكم لمتابعة عروضك']
                    : ['Matching requests delivered automatically', 'No fees for submitting quotes', 'Build reputation through contractor ratings', 'Dashboard to track your quotes']
                  ).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <IconCheck className="w-4 h-4 text-[var(--sec)] shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup?type=supplier"
                  className="relative block w-full text-center bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  {t('سجل كمورد مجاناً', 'Sign up as Supplier — Free')}
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="bg-[var(--bg)] py-16 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-[var(--sec)] text-xs font-bold tracking-widest uppercase mb-2">
              {t('آراء العملاء', 'What Our Users Say')}
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900">
              {t('تجارب حقيقية من السوق السعودي', 'Real Experiences from the Saudi Market')}
            </h2>
          </Reveal>
          <TestimonialCarousel lang={lang} />
        </div>
      </section>

      {/* ══ LOGO WALL ══ */}
      <section className="bg-white py-16 border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto text-center px-6 md:px-10 mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900">
            {t('من بين موردينا الموثوقين', 'Among Our Trusted Suppliers')}
          </h2>
        </div>
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <LogoCarousel />
        </div>
      </section>

      {/* ══ BOTTOM CTA ══ */}
      <section className="py-16 px-6 md:px-10 relative overflow-hidden">
        <Image
          src="/images/cta-crane-sunset.jpg"
          alt={t('رافعة برج فوق موقع إنشائي عند الغروب', 'A tower crane above a construction site at sunset')}
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[var(--chrome)]/80" />
        <div className="bp-blob absolute top-0 left-1/4 w-64 h-64 bg-[var(--brand)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="bp-blob-slow absolute bottom-0 right-1/4 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <Reveal className="max-w-2xl mx-auto text-center relative z-10">
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
              className="w-full sm:w-auto bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--on-brand)] font-bold px-8 py-3.5 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-[var(--brand)]/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <IconHardHat className="w-4 h-4" /> {t('سجل كمقاول', 'Sign up as Contractor')}
            </Link>
            <Link href="/signup?type=supplier"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <IconBuilding className="w-4 h-4" /> {t('سجل كمورد', 'Sign up as Supplier')}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-[var(--chrome)] py-10 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* brand */}
            <div>
              <div className="text-[17px] font-extrabold text-white mb-2">
                Build<span className="text-[var(--sec)]">Pro</span>
              </div>
              <p className="text-stone-400 text-xs leading-relaxed">
                {t(
                  'منصة تسعير مواد البناء — نربط المقاولين بالموردين في السوق السعودي.',
                  'Building materials pricing platform — connecting contractors with suppliers in the Saudi market.'
                )}
              </p>
            </div>

            {/* quick links */}
            <div>
              <p className="text-stone-300 font-bold text-xs mb-3 uppercase tracking-wider">
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
                    className="text-stone-400 hover:text-white text-xs transition-colors">
                    {lang === 'ar' ? link.ar : link.en}
                  </Link>
                ))}
              </div>
            </div>

            {/* contact */}
            <div>
              <p className="text-stone-300 font-bold text-xs mb-3 uppercase tracking-wider">
                {t('تواصل معنا', 'Contact Us')}
              </p>
              <div className="flex flex-col gap-2 text-stone-400 text-xs">
                <span>📧 hello@buildpro.sa</span>
                <span>📱 {t('واتساب:', 'WhatsApp:')} +966 5X XXX XXXX</span>
                <span>🏙 {t('الرياض، المملكة العربية السعودية', 'Riyadh, Saudi Arabia')}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-stone-500 text-xs">
              © 2025 BuildPro. {t('جميع الحقوق محفوظة.', 'All rights reserved.')}
            </p>
            <p className="text-stone-600 text-xs">
              {t('مصنوع بـ ❤️ للسوق السعودي', 'Made with ❤️ for the Saudi Market')}
            </p>
          </div>
        </div>
      </footer>

      <AddToHomeScreen lang={lang} />
    </div>
  );
}
