/**
 * Single point of contact with localStorage for shared app data.
 * Pages/components should import these instead of calling localStorage directly —
 * this is the seam a future backend (Supabase) swaps in behind, without every
 * caller needing to change.
 */

import type { Quote, RequestLike, ActivityLog } from './requestHelpers';
import type { RequestQuestion, QuoteMessage, Rating } from './marketplace';
import type { StoredUser } from './auth';

export type Lang = 'ar' | 'en';

function readArray<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function writeArray<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Generic array accessor for one-off caller-supplied keys that don't have a dedicated helper above. */
export const getJSONArray = <T = any>(key: string): T[] => readArray<T>(key);
export const setJSONArray = <T = any>(key: string, value: T[]): void => writeArray(key, value);

/* Collections are typed generically (default = the canonical lib type) so each page can
   specialize to its own local interface shape, e.g. getRequests<Request>(), without fighting
   the type checker — pages predate this shared layer and don't all share one exact type. */
export const getRequests = <T = RequestLike>(): T[] => readArray<T>('requests');
export const setRequests = <T = RequestLike>(v: T[]): void => writeArray('requests', v);
export const getDeletedRequests = <T = RequestLike>(): T[] => readArray<T>('deletedRequests');
export const setDeletedRequests = <T = RequestLike>(v: T[]): void => writeArray('deletedRequests', v);

export const getRequestDrafts = <T = any>(): T[] => readArray<T>('requestDrafts');
export const setRequestDrafts = <T = any>(v: T[]): void => writeArray('requestDrafts', v);
export const getDeletedDrafts = <T = any>(): T[] => readArray<T>('deletedDrafts');
export const setDeletedDrafts = <T = any>(v: T[]): void => writeArray('deletedDrafts', v);

export const getQuotes = <T = Quote>(): T[] => readArray<T>('quotes');
export const setQuotes = <T = Quote>(v: T[]): void => writeArray('quotes', v);
export const getDeletedQuotes = <T = Quote>(): T[] => readArray<T>('deletedQuotes');
export const setDeletedQuotes = <T = Quote>(v: T[]): void => writeArray('deletedQuotes', v);

export const getUsers = <T = StoredUser>(): T[] => readArray<T>('users');
export const setUsers = <T = StoredUser>(v: T[]): void => writeArray('users', v);

/** Per-user shadow record at `user_<email>` — kept in lockstep with the users[] array. */
export function getUserShadow<T = StoredUser>(email: string): T | null {
  try {
    const raw = localStorage.getItem(`user_${email}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
export function setUserShadow(email: string, user: any): void {
  localStorage.setItem(`user_${email}`, JSON.stringify(user));
}
export function removeUserShadow(email: string): void {
  localStorage.removeItem(`user_${email}`);
}
/** Scans every user_<email> shadow record in storage (e.g. to find suppliers not yet mirrored into users[]). */
export function getAllUserShadows<T = StoredUser>(): T[] {
  const out: T[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('user_')) continue;
    try {
      const raw = localStorage.getItem(key);
      if (raw) out.push(JSON.parse(raw) as T);
    } catch { /* skip corrupt entry */ }
  }
  return out;
}

export const getActivityLogs = <T = ActivityLog>(): T[] => readArray<T>('activityLogs');
export const setActivityLogs = <T = ActivityLog>(v: T[]): void => writeArray('activityLogs', v);

export const getRatings = <T = Rating>(): T[] => readArray<T>('ratings');
export const setRatings = <T = Rating>(v: T[]): void => writeArray('ratings', v);

export const getRequestQuestions = <T = RequestQuestion>(): T[] => readArray<T>('requestQuestions');
export const setRequestQuestions = <T = RequestQuestion>(v: T[]): void => writeArray('requestQuestions', v);

export const getQuoteMessages = <T = QuoteMessage>(): T[] => readArray<T>('quoteMessages');
export const setQuoteMessages = <T = QuoteMessage>(v: T[]): void => writeArray('quoteMessages', v);

/** Parsed session user, or null if absent/corrupt. Never contains credential fields (see auth.ts:setSessionUser). */
export function getCurrentUser<T = StoredUser>(): T | null {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function logout(): void {
  localStorage.removeItem('currentUser');
}

export function getLanguage(): Lang {
  return (localStorage.getItem('language') as Lang) || 'ar';
}
export function setLanguage(lang: Lang): void {
  localStorage.setItem('language', lang);
}

/* ── ephemeral single-value / per-flow keys ── */

export function getQuotePreview<T = any>(): T | null {
  try {
    const raw = localStorage.getItem('quotePreview');
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
export function setQuotePreview(quote: any): void {
  localStorage.setItem('quotePreview', JSON.stringify(quote));
}

export function getCreateRequestDraft<T = any>(): T | null {
  try {
    const raw = localStorage.getItem('createRequestDraft');
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
export function setCreateRequestDraft(draft: any): void {
  localStorage.setItem('createRequestDraft', JSON.stringify(draft));
}
export function clearCreateRequestDraft(): void {
  localStorage.removeItem('createRequestDraft');
}

export function getLoadingFromDraft(): boolean {
  return localStorage.getItem('loadingFromDraft') === 'true';
}
export function setLoadingFromDraft(): void {
  localStorage.setItem('loadingFromDraft', 'true');
}
export function clearLoadingFromDraft(): void {
  localStorage.removeItem('loadingFromDraft');
}

export function getDismissedAutosaveDraftAt(): string | null {
  return localStorage.getItem('dismissedAutosaveDraftAt');
}
export function setDismissedAutosaveDraftAt(ts: string): void {
  localStorage.setItem('dismissedAutosaveDraftAt', ts);
}

export function getNotifSeenIds<T = string>(email: string): T[] {
  try { return JSON.parse(localStorage.getItem(`notifSeen_${email}`) || '[]'); } catch { return []; }
}
export function setNotifSeenIds<T = string>(email: string, ids: T[]): void {
  localStorage.setItem(`notifSeen_${email}`, JSON.stringify(ids));
}

/** Quote ids the buyer/contractor has already seen — ids are numbers (Quote.id). */
export function getSeenQuoteIds(email: string): number[] {
  try { return JSON.parse(localStorage.getItem(`seenQuotes_${email}`) || '[]'); } catch { return []; }
}
export function setSeenQuoteIds(email: string, ids: number[]): void {
  localStorage.setItem(`seenQuotes_${email}`, JSON.stringify(ids));
}

export function getQuoteDraft<T = any>(requestId: number | string): T | null {
  try {
    const raw = localStorage.getItem(`quoteDraft_${requestId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
export function setQuoteDraft(requestId: number | string, draft: any): void {
  localStorage.setItem(`quoteDraft_${requestId}`, JSON.stringify(draft));
}
export function clearQuoteDraft(requestId: number | string): void {
  localStorage.removeItem(`quoteDraft_${requestId}`);
}
