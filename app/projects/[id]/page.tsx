'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import ContractorNav from '../../components/ContractorNav';
import { useToast } from '../../components/Toast';
import { Project, ProjectStatus, PROJECT_STATUS_OPTIONS, getProjectStatusClasses, setProjectStatus as persistProjectStatus } from '../../lib/projects';
import { displayVal, formatDay, getDeadlineUrgency, getRequestDisplayName } from '../../lib/requestHelpers';
import { getCategory } from '../../lib/materialCategories';
import { getCityName } from '../../lib/translations';
import {
  getCurrentUser, getLanguage, setLanguage,
  getProjects, getRequests, getQuotes,
} from '../../lib/store';

type Lang = 'ar' | 'en';

interface RequestRow {
  id: number; projectId?: number; status: 'open' | 'closed'; location?: string; deadline?: string;
  projectName?: string; materials?: any[];
}
interface QuoteRow { id: number; requestId: number; status: string; }

const T = {
  back:        { ar: '← المشاريع',              en: '← Projects'             },
  status:      { ar: 'حالة المشروع',            en: 'Project Status'         },
  createdOn:   { ar: 'أُنشئ في',                 en: 'Created'                },
  addMaterial: { ar: '+ إضافة مادة لهذا المشروع', en: '+ Add Material to Project' },
  requestsTitle: { ar: 'طلبات التسعير في هذا المشروع', en: 'Pricing Requests in This Project' },
  empty:       { ar: 'لا توجد طلبات في هذا المشروع بعد', en: 'No requests in this project yet' },
  colId:       { ar: '#',                       en: '#'                      },
  colMaterial: { ar: 'المادة',                   en: 'Material'               },
  colStatus:   { ar: 'الحالة',                   en: 'Status'                 },
  colQuotes:   { ar: 'العروض',                   en: 'Quotes'                 },
  colCity:     { ar: 'المدينة',                  en: 'City'                   },
  colDeadline: { ar: 'الموعد النهائي',            en: 'Deadline'               },
  colActions:  { ar: 'إجراء',                    en: 'Action'                 },
  view:        { ar: 'عرض',                      en: 'View'                   },
  edit:        { ar: 'تعديل',                    en: 'Edit'                   },
  open:        { ar: 'مفتوح',                    en: 'Open'                   },
  closed:      { ar: 'مغلق',                     en: 'Closed'                 },
  notFound:    { ar: 'المشروع غير موجود',         en: 'Project not found'      },
  statusUpdated:{ ar: 'تم تحديث حالة المشروع',    en: 'Project status updated' },
  overdue:     { ar: 'متأخر',                    en: 'Overdue'                },
  soon:        { ar: 'قريب',                     en: 'Soon'                   },
};
function t(key: keyof typeof T, lang: Lang): string { return T[key][lang]; }

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const showToast = useToast();
  const [lang, setLangState] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [ready, setReady] = useState(false);

  const projectId = Number(params.id);

  useEffect(() => {
    const parsedUser = getCurrentUser<any>();
    if (!parsedUser) { router.push('/login'); return; }
    if (parsedUser.userType === 'supplier') { router.push('/supplier-requests'); return; }
    setUser(parsedUser);
    setLangState(getLanguage());

    const proj = getProjects<Project>().find(p => p.id === projectId && p.contractorId === parsedUser.email);
    setProject(proj || null);
    setRequests(getRequests<RequestRow>().filter(r => r.projectId === projectId));
    setQuotes(getQuotes<QuoteRow>());
    setReady(true);
  }, [router, projectId]);

  const handleLangChange = (l: Lang) => { setLangState(l); setLanguage(l); };

  const handleStatusChange = (status: ProjectStatus) => {
    const { project: updated } = persistProjectStatus(projectId, status);
    if (updated) setProject(updated);
    showToast(t('statusUpdated', lang));
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!ready || !user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-500 text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <ContractorNav lang={lang} setLang={handleLangChange} userName={user?.name || ''} active="/projects" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-7 py-10">
        <p className="text-stone-500 text-sm">{t('notFound', lang)}</p>
        <Link href="/projects" className="text-[var(--sec)] text-sm font-semibold hover:underline">{t('back', lang)}</Link>
      </div>
    </div>
  );

  const getReqSummary = (req: RequestRow): string => {
    const m = req.materials?.[0];
    if (m) {
      const cat = getCategory(m.category);
      const typeLabel = displayVal(m.type || m.fields?.type, lang);
      const label = typeLabel !== '—' ? typeLabel : (cat ? (lang === 'ar' ? cat.labelAr : cat.labelEn) : '');
      return `${cat?.icon || ''} ${label}`.trim();
    }
    return getRequestDisplayName(req, lang);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <ContractorNav lang={lang} setLang={handleLangChange} userName={user?.name || ''} active="/projects" />

      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-6">
        <Link href="/projects" className="text-white/70 hover:text-white text-xs mb-2 inline-block">{t('back', lang)}</Link>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-bold mb-1">📁 {project.name}</h1>
            <p className="text-white/70 text-xs">{t('createdOn', lang)} {new Date(project.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}</p>
          </div>
          <Link href={`/create-request?projectId=${project.id}`}
            className="bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
            {t('addMaterial', lang)}
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-7 py-6 space-y-5">
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <label className="block text-xs font-semibold text-stone-600 mb-2">{t('status', lang)}</label>
          <div className="flex gap-2 flex-wrap">
            {PROJECT_STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
                className={`text-xs font-bold px-3.5 py-2 rounded-full border transition-colors ${
                  project.status === opt.value ? getProjectStatusClasses(opt.value) + ' ring-2 ring-offset-1 ring-[var(--brand-strong)]/30' : 'bg-white text-stone-500 border-[var(--line)] hover:bg-[var(--bg-soft)]'
                }`}>
                {lang === 'ar' ? opt.labelAr : opt.labelEn}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[var(--line)] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--line-soft)]">
            <p className="text-sm font-bold text-stone-900">{t('requestsTitle', lang)}</p>
          </div>
          {requests.length === 0 ? (
            <div className="p-10 text-center text-sm text-stone-400">{t('empty', lang)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-soft)]">
                    <th className={`px-4 py-2.5 font-semibold text-stone-500 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t('colId', lang)}</th>
                    <th className={`px-4 py-2.5 font-semibold text-stone-500 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t('colMaterial', lang)}</th>
                    <th className="px-4 py-2.5 font-semibold text-stone-500 text-center">{t('colStatus', lang)}</th>
                    <th className="px-4 py-2.5 font-semibold text-stone-500 text-center">{t('colQuotes', lang)}</th>
                    <th className="px-4 py-2.5 font-semibold text-stone-500 text-center">{t('colCity', lang)}</th>
                    <th className="px-4 py-2.5 font-semibold text-stone-500 text-center">{t('colDeadline', lang)}</th>
                    <th className="px-4 py-2.5 font-semibold text-stone-500 text-center">{t('colActions', lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req, i) => {
                    const quoteCount = quotes.filter(q => q.requestId === req.id).length;
                    const urgency = getDeadlineUrgency(req.deadline, false);
                    return (
                      <tr key={req.id} className={`border-t border-[var(--line-soft)] ${i % 2 === 1 ? 'bg-[var(--bg-soft)]/40' : ''}`}>
                        <td className="px-4 py-3 font-bold text-[var(--brand-strong)]">#{String(req.id).slice(-4)}</td>
                        <td className="px-4 py-3 text-stone-800 font-semibold">{getReqSummary(req)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${req.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                            {req.status === 'open' ? t('open', lang) : t('closed', lang)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-stone-700">{quoteCount}</td>
                        <td className="px-4 py-3 text-center text-stone-600">{req.location ? getCityName(req.location, lang) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={urgency === 'overdue' ? 'text-red-600 font-semibold' : urgency === 'soon' ? 'text-amber-600 font-semibold' : 'text-stone-600'}>
                            {formatDay(req.deadline, lang)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/request/${req.id}`} className="text-[11px] font-semibold text-[var(--sec)] hover:underline">{t('view', lang)}</Link>
                            <Link href={`/create-request?edit=${req.id}`} className="text-[11px] font-semibold text-stone-500 hover:underline">{t('edit', lang)}</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
