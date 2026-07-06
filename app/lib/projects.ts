/**
 * Project layer: a contractor-owned folder that groups one or more single-material
 * Requests together and tracks its own lifecycle status, independent of any child
 * request's open/closed state or any quote's accepted/rejected state.
 */

import { RequestLike } from './requestHelpers';
import { getProjects as storeGetProjects, setProjects as storeSetProjects, getRequests, setRequests } from './store';

export type ProjectStatus = 'tender' | 'ongoing' | 'onhold' | 'completed';

export interface Project {
  id: number;
  contractorId: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  statusChangedAt?: string;
}

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; labelAr: string; labelEn: string; color: string }[] = [
  { value: 'tender',    labelAr: 'تحت الترشيح',  labelEn: 'Tender',    color: 'amber'   },
  { value: 'ongoing',   labelAr: 'جارٍ التنفيذ',  labelEn: 'Ongoing',   color: 'emerald' },
  { value: 'onhold',    labelAr: 'متوقف مؤقتاً',  labelEn: 'On Hold',   color: 'stone'   },
  { value: 'completed', labelAr: 'مكتمل',         labelEn: 'Completed', color: 'sky'     },
];

export function getProjectStatusOption(status: ProjectStatus | undefined) {
  return PROJECT_STATUS_OPTIONS.find(o => o.value === status) || PROJECT_STATUS_OPTIONS[0];
}

export function getProjectStatusLabel(status: ProjectStatus | undefined, lang: 'ar' | 'en'): string {
  const opt = getProjectStatusOption(status);
  return lang === 'ar' ? opt.labelAr : opt.labelEn;
}

/** Tailwind class tokens for a status badge, keyed off PROJECT_STATUS_OPTIONS' color name. */
export function getProjectStatusClasses(status: ProjectStatus | undefined): string {
  const color = getProjectStatusOption(status).color;
  const map: Record<string, string> = {
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    stone:   'bg-stone-100 text-stone-600 border-stone-200',
    sky:     'bg-sky-50 text-sky-700 border-sky-200',
  };
  return map[color] || map.stone;
}

export function getProjectById(projectId: number | undefined): Project | undefined {
  if (projectId == null) return undefined;
  return storeGetProjects<Project>().find(p => p.id === projectId);
}

/** Contractor-only action: updates a project's status and stamps statusChangedAt. */
export function setProjectStatus(projectId: number, status: ProjectStatus): { projects: Project[]; project: Project | undefined } {
  const all = storeGetProjects<Project>();
  const updated = all.map(p => p.id === projectId ? { ...p, status, statusChangedAt: new Date().toISOString() } : p);
  storeSetProjects(updated);
  return { projects: updated, project: updated.find(p => p.id === projectId) };
}

/** Renames a project and cascades the new name onto every request's denormalized
    projectName copy, so the many pages that read req.projectName directly (rather
    than resolving it through the project) keep showing the current name. */
export function renameProject(projectId: number, name: string): { projects: Project[]; requests: RequestLike[] } {
  const all = storeGetProjects<Project>();
  const updatedProjects = all.map(p => p.id === projectId ? { ...p, name } : p);
  storeSetProjects(updatedProjects);

  const allRequests = getRequests<RequestLike>();
  const updatedRequests = allRequests.map(r => r.projectId === projectId ? { ...r, projectName: name } : r);
  setRequests(updatedRequests);

  return { projects: updatedProjects, requests: updatedRequests };
}

/** Requests belonging to a project, for stats/detail views. */
export function getProjectRequests<T extends RequestLike = RequestLike>(projectId: number, allRequests: T[]): T[] {
  return allRequests.filter(r => r.projectId === projectId);
}
