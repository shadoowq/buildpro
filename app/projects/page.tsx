'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ContractorNav from '../components/ContractorNav';
import { Project, getProjectStatusLabel, getProjectStatusClasses } from '../lib/projects';
import { formatDate } from '../lib/requestHelpers';
import {
  getCurrentUser, getLanguage, setLanguage,
  getProjects, getRequests, getQuotes,
} from '../lib/store';

type Lang = 'ar' | 'en';

interface Request { id: number; projectId?: number; status: string; }
interface Quote { id: number; requestId: number; }

const T = {
  title:      { ar: 'المشاريع',                en: 'Projects'               },
  subtitle:   { ar: (n: number) => `${n} مشروع`, en: (n: number) => `${n} project(s)` },
  newProject: { ar: '+ مشروع جديد',            en: '+ New Project'          },
  empty:      { ar: 'لا توجد مشاريع بعد',      en: 'No projects yet'        },
  emptySub:   { ar: 'أنشئ أول طلب تسعير وسيتحول تلقائيًا إلى مشروع', en: 'Create your first pricing request and it will automatically become a project' },
  requests:   { ar: 'طلبات',                   en: 'requests'               },
  open:       { ar: 'مفتوح',                   en: 'open'                   },
  quotes:     { ar: 'عروض',                    en: 'quotes'                 },
  createdOn:  { ar: 'أُنشئ في',                 en: 'Created'                },
  viewProject:{ ar: 'فتح المشروع',              en: 'Open project'          },
};
function t<K extends keyof typeof T>(key: K, lang: Lang, n?: number): string {
  const v = T[key][lang] as any;
  return typeof v === 'function' ? v(n ?? 0) : v;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    const parsedUser = getCurrentUser<any>();
    if (!parsedUser) { router.push('/login'); return; }
    if (parsedUser.userType === 'supplier') { router.push('/supplier-requests'); return; }
    setUser(parsedUser);
    setLangState(getLanguage());
    setProjects(getProjects<Project>().filter(p => p.contractorId === parsedUser.email));
    setRequests(getRequests<Request>());
    setQuotes(getQuotes<Quote>());
  }, [router]);

  const handleLangChange = (l: Lang) => { setLangState(l); setLanguage(l); };
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-500 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const sorted = [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <ContractorNav lang={lang} setLang={handleLangChange} userName={user?.name || ''} active="/projects" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-bold mb-1">{t('title', lang)}</h1>
            <p className="text-white/70 text-xs">{t('subtitle', lang, projects.length)}</p>
          </div>
          <Link href="/create-request"
            className="bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
            {t('newProject', lang)}
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-7 py-6">
        {sorted.length === 0 ? (
          <div className="bg-white border border-[var(--line)] rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📁</span>
            <p className="text-stone-900 font-bold text-base">{t('empty', lang)}</p>
            <p className="text-stone-500 text-sm max-w-xs">{t('emptySub', lang)}</p>
            <Link href="/create-request" className="mt-2 bg-[var(--brand)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[var(--brand-hover)] transition-colors">
              {t('newProject', lang)}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(project => {
              const projReqs = requests.filter(r => r.projectId === project.id);
              const openCount = projReqs.filter(r => r.status === 'open').length;
              const quoteCount = quotes.filter(q => projReqs.some(r => r.id === q.requestId)).length;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}
                  className="bg-white border border-[var(--line)] rounded-2xl p-5 hover:shadow-md transition-all block">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 bg-[var(--tint)] rounded-xl flex items-center justify-center text-xl shrink-0">📁</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-stone-900 leading-tight truncate">{project.name}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{t('createdOn', lang)} {formatDate(project.createdAt, lang)}</p>
                    </div>
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border mb-4 ${getProjectStatusClasses(project.status)}`}>
                    {getProjectStatusLabel(project.status, lang)}
                  </span>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-xs font-bold text-stone-900">{projReqs.length}</p>
                      <p className="text-[10px] text-stone-400">{t('requests', lang)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg px-3 py-2">
                      <p className="text-xs font-bold text-emerald-700">{openCount}</p>
                      <p className="text-[10px] text-emerald-500">{t('open', lang)}</p>
                    </div>
                    <div className="bg-[var(--tint)] rounded-lg px-3 py-2">
                      <p className="text-xs font-bold text-[var(--brand-strong)]">{quoteCount}</p>
                      <p className="text-[10px] text-stone-400">{t('quotes', lang)}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--sec)] font-semibold hover:underline">{t('viewProject', lang)} ↗</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
