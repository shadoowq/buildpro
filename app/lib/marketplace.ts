/**
 * Marketplace layer: auto-matching, request Q&A, quote messages, post-acceptance
 * execution status, and mutual ratings. Sits alongside requestHelpers.ts — kept
 * separate because none of this existed before and it's easier to review as one unit.
 */

import { RequestLike, Quote } from './requestHelpers';
import { MATERIAL_OPTIONS } from './materialOptions';

/* ── auto-matching (opens the marketplace beyond hand-picked suppliers) ── */

export interface SupplierMatchProfile {
  email: string;
  autoMatch?: boolean;
  specialties?: string[];
  coverageCities?: string[];
}

/** A supplier's specialty covers a material category if they picked that category
    directly, or — for suppliers who set up their profile before categories existed —
    they picked one of the old tile-type strings, which implicitly covers 'tiles'. */
export function specialtiesCoverCategory(specialties: string[], category: string): boolean {
  if (specialties.includes(category)) return true;
  if (category === 'tiles') return specialties.some(s => MATERIAL_OPTIONS.types.includes(s));
  return false;
}

/** True when an open request's materials+city line up with a supplier's own opted-in profile. */
export function isRequestMatchedToSupplier(request: RequestLike, supplier: SupplierMatchProfile): boolean {
  if (!supplier.autoMatch || request.status !== 'open') return false;
  const specialties = supplier.specialties || [];
  const cities = supplier.coverageCities || [];
  if (specialties.length === 0 || cities.length === 0) return false; // profile must be configured first
  if (!request.location || !cities.includes(request.location)) return false;

  const categories: string[] = request.materials?.length
    ? request.materials.map((m: any) => m.category || 'tiles').filter(Boolean)
    : [];
  return categories.some(c => specialtiesCoverCategory(specialties, c));
}

/** A supplier sees a request if they were hand-picked OR they auto-match it. */
export function getSupplierVisibleRequests<T extends RequestLike & { selectedSuppliers?: string[] }>(
  allRequests: T[],
  supplier: SupplierMatchProfile
): T[] {
  return allRequests.filter(r =>
    r.selectedSuppliers?.includes(supplier.email) || isRequestMatchedToSupplier(r, supplier)
  );
}

/* ── request-level Q&A (visible to the contractor and every invited/matched supplier) ── */

export interface RequestQuestion {
  id: number;
  requestId: number;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  question: string;
  answer?: string;
  createdAt: string;
  answeredAt?: string;
}

export function askRequestQuestion(requestId: number, supplier: { email: string; name: string; company: string }, question: string): RequestQuestion[] {
  const all: RequestQuestion[] = JSON.parse(localStorage.getItem('requestQuestions') || '[]');
  const entry: RequestQuestion = {
    id: Date.now(), requestId,
    supplierId: supplier.email, supplierName: supplier.name, supplierCompany: supplier.company,
    question, createdAt: new Date().toISOString(),
  };
  const updated = [...all, entry];
  localStorage.setItem('requestQuestions', JSON.stringify(updated));
  return updated;
}

export function answerRequestQuestion(questionId: number, answer: string): RequestQuestion[] {
  const all: RequestQuestion[] = JSON.parse(localStorage.getItem('requestQuestions') || '[]');
  const updated = all.map(q => q.id === questionId ? { ...q, answer, answeredAt: new Date().toISOString() } : q);
  localStorage.setItem('requestQuestions', JSON.stringify(updated));
  return updated;
}

/* ── quote-level private messages (contractor <-> the one supplier on that quote) ── */

export interface QuoteMessage {
  id: number;
  quoteId: number;
  requestId: number;
  senderRole: 'contractor' | 'supplier';
  senderName: string;
  text: string;
  createdAt: string;
}

export function sendQuoteMessage(quoteId: number, requestId: number, senderRole: 'contractor' | 'supplier', senderName: string, text: string): QuoteMessage[] {
  const all: QuoteMessage[] = JSON.parse(localStorage.getItem('quoteMessages') || '[]');
  const entry: QuoteMessage = { id: Date.now(), quoteId, requestId, senderRole, senderName, text, createdAt: new Date().toISOString() };
  const updated = [...all, entry];
  localStorage.setItem('quoteMessages', JSON.stringify(updated));
  return updated;
}

/* ── post-acceptance: purchase order + execution status ── */

/** Derives a purchase-order number from the quote number, e.g. QT-2026-0004 -> PO-2026-0004. */
export function generatePoNumber(quoteNumber: string | undefined, quoteId: number): string {
  if (quoteNumber?.startsWith('QT-')) return `PO-${quoteNumber.slice(3)}`;
  return `PO-${quoteId}`;
}

export type ExecutionStatus = 'preparing' | 'delivered';

/** Supplier-only action: marks an accepted quote as delivered. */
export function setQuoteExecutionStatus(quoteId: number, status: ExecutionStatus): { quotes: Quote[]; quote: Quote | undefined } {
  const all: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
  const updated = all.map(q => q.id === quoteId ? { ...q, executionStatus: status, executionStatusChangedAt: new Date().toISOString() } : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote: updated.find(q => q.id === quoteId) };
}

/* ── mutual ratings (contractor rates supplier — already existed; now also supplier rates contractor) ── */

export interface Rating {
  id: number;
  requestId: number;
  supplierId: string;
  supplierCompany: string;
  contractorId?: string;
  contractorName?: string;
  /** absent on legacy rows == 'contractor' (the only direction that used to exist) */
  raterRole?: 'contractor' | 'supplier';
  rating: number;
  comment: string;
  createdAt: string;
}

export function submitRating(entry: Omit<Rating, 'id' | 'createdAt'>): Rating[] {
  const all: Rating[] = JSON.parse(localStorage.getItem('ratings') || '[]');
  const newRating: Rating = { ...entry, id: Date.now(), createdAt: new Date().toISOString() };
  const updated = [...all, newRating];
  localStorage.setItem('ratings', JSON.stringify(updated));
  return updated;
}

/** True once a rater has already rated this specific request+direction — avoids duplicate prompts. */
export function hasRated(ratings: Rating[], requestId: number, raterRole: 'contractor' | 'supplier'): boolean {
  return ratings.some(r => r.requestId === requestId && (r.raterRole || 'contractor') === raterRole);
}

export function ratingsOfContractor(ratings: Rating[], contractorId: string): Rating[] {
  return ratings.filter(r => r.contractorId === contractorId && r.raterRole === 'supplier');
}

export function ratingsOfSupplier(ratings: Rating[], supplierId: string): Rating[] {
  return ratings.filter(r => r.supplierId === supplierId && (r.raterRole || 'contractor') === 'contractor');
}
