export type Lang = 'ar' | 'en';

export const arToEn: Record<string, string> = {
  'سيراميك': 'Ceramic', 'بورسلان': 'Porcelain', 'رخام': 'Marble',
  'جرانيت': 'Granite', 'تيرازو': 'Terrazzo', 'حجر طبيعي': 'Natural Stone',
  'أرضيات': 'Flooring', 'جدران': 'Walls', 'وزر': 'Skirting',
  'درج': 'Stairs', 'مغاسل': 'Sinks', 'واجهات': 'Facades', 'أسطح': 'Surfaces',
  'مصقول': 'Polished', 'مطفي': 'Matte', 'ساتان': 'Satin',
  'بوشهامر': 'Bush-hammered', 'لابراتو': 'Labradorite', 'أنتيك': 'Antique',
  'أبيض': 'White', 'كريمي': 'Cream', 'رمادي فاتح': 'Light Gray',
  'رمادي غامق': 'Dark Gray', 'أسود': 'Black', 'بيج': 'Beige',
  'بني': 'Brown', 'خشبي': 'Wood', 'أزرق': 'Blue', 'أخضر': 'Green',
  'وطني': 'Local', 'صيني': 'Chinese', 'أوروبي': 'European',
  'إيطالي': 'Italian', 'إسباني': 'Spanish', 'تركي': 'Turkish',
  'عماني': 'Omani', 'إماراتي': 'Emirati', 'مصري': 'Egyptian', 'هندي': 'Indian',
  'م²': 'm²', 'م طولي': 'Linear m', 'قطعة': 'Piece', 'حبة': 'Unit',
};

export interface QuoteLineItem {
  id: number;
  type: string; typeOther: string;
  size: string; sizeOther: string;
  thickness: string; thicknessOther: string;
  finish: string; finishOther: string;
  color: string; colorOther: string;
  quantity: number;
  unit: string; unitOther: string;
  unitPrice: number;
  discount: number;
  description: string;
  images: string[];
}

export interface QuoteAttachment { name: string; type: string; data: string; }

export interface Quote {
  id: number; requestId: number; supplierId: string;
  supplierName: string; supplierCompany: string;
  totalPrice: number; deliveryDays: number; description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
  revisionNote?: string; createdAt: string;
  quoteNumber?: string; clientName?: string; location?: string;
  paymentTerms?: string; validUntil?: string; currency?: string;
  lineItems?: QuoteLineItem[]; attachments?: QuoteAttachment[];
  overallDiscount?: number; subtotalBeforeTax?: number; taxAmount?: number;
  deletedAt?: string;
  editRequestStatus?: 'pending' | 'rejected';
  editRequestNote?: string;
  editRequestedAt?: string;
  statusChangedAt?: string;
}

export interface ActivityLog { id: number; requestId: number; action: string; actionEn: string; timestamp: string; }

export interface RequestLike {
  id: number; status: string; location?: string; deadline?: string; description?: string;
  materials?: any[]; ceramic?: number; porcelain?: number; marble?: number; granite?: number; terrazzo?: number;
  [k: string]: any;
}

export function getSupplierData(supplierId: string): any | null {
  const fromKey = localStorage.getItem(`user_${supplierId}`);
  const found = fromKey
    ? JSON.parse(fromKey)
    : (JSON.parse(localStorage.getItem('users') || '[]')).find((u: any) => u.email === supplierId) || null;
  if (!found) return null;
  // never hand credential fields to display surfaces
  const { password: _p, passwordHash: _h, passwordSalt: _s, ...safe } = found;
  return safe;
}

export function formatDate(ts: string, lang: Lang): string {
  return new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
}

export type DeadlineUrgency = 'overdue' | 'soon' | null;

/** Only meaningful while a request still needs a decision — pass hasAcceptedQuote=true (or status closed) to suppress it. */
export function getDeadlineUrgency(deadline: string | undefined, hasAcceptedQuote: boolean): DeadlineUrgency {
  if (!deadline || hasAcceptedQuote) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const diffHours = (d.getTime() - Date.now()) / 3600000;
  if (diffHours < 0) return 'overdue';
  if (diffHours <= 48) return 'soon';
  return null;
}

/** A pending quote whose validity date has passed is no longer binding — decided quotes (accepted/rejected/revision) keep their status. */
export function isQuoteExpired(q: Pick<Quote, 'status' | 'validUntil'>): boolean {
  if (q.status !== 'pending' || !q.validUntil) return false;
  const d = new Date(q.validUntil);
  if (isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999); // the quote stays valid through its last day
  return d.getTime() < Date.now();
}

export type EffectiveQuoteStatus = Quote['status'] | 'expired';

/** Display status: same as stored status, except pending-past-validity shows as 'expired'. */
export function getEffectiveQuoteStatus(q: Pick<Quote, 'status' | 'validUntil'>): EffectiveQuoteStatus {
  return isQuoteExpired(q) ? 'expired' : q.status;
}

export function displayVal(val: string | undefined, lang: Lang): string {
  if (!val) return '—';
  if (lang === 'en') return val.split(' أو ').map(p => arToEn[p.trim()] || p.trim()).join(' / ');
  return val;
}

export function appendActivityLog(requestId: number, actionAr: string, actionEn: string): ActivityLog[] {
  const allLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const newLog: ActivityLog = { id, requestId, action: actionAr, actionEn, timestamp: new Date().toISOString() };
  allLogs.push(newLog);
  localStorage.setItem('activityLogs', JSON.stringify(allLogs));
  return allLogs;
}

export function setQuoteStatus(quoteId: number, status: Quote['status'], revisionNote?: string): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const statusChangedAt = new Date().toISOString();
  const updated = allQuotes.map((q: Quote) => q.id === quoteId
    ? (status === 'revision' ? { ...q, status, revisionNote, statusChangedAt } : { ...q, status, statusChangedAt })
    : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
}

/** Soft-deletes: moves the quote into `deletedQuotes` (recoverable trash) instead of erasing it. */
export function withdrawQuote(quoteId: number): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find(q => q.id === quoteId);
  const updated = allQuotes.filter(q => q.id !== quoteId);
  localStorage.setItem('quotes', JSON.stringify(updated));
  if (quote) {
    const deletedQuotes: Quote[] = JSON.parse(localStorage.getItem('deletedQuotes') || '[]');
    localStorage.setItem('deletedQuotes', JSON.stringify([...deletedQuotes, { ...quote, deletedAt: new Date().toISOString() }]));
  }
  return { quotes: updated, quote };
}

export function restoreQuote(quoteId: number): { quotes: Quote[]; deleted: Quote[] } {
  const deletedQuotes: Quote[] = JSON.parse(localStorage.getItem('deletedQuotes') || '[]');
  const found = deletedQuotes.find(q => q.id === quoteId);
  const remainingDeleted = deletedQuotes.filter(q => q.id !== quoteId);
  const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
  const restored = found ? [...allQuotes, { ...found, deletedAt: undefined }] : allQuotes;
  localStorage.setItem('quotes', JSON.stringify(restored));
  localStorage.setItem('deletedQuotes', JSON.stringify(remainingDeleted));
  return { quotes: restored, deleted: remainingDeleted };
}

export function permanentlyDeleteQuote(quoteId: number): { deleted: Quote[] } {
  const deletedQuotes: Quote[] = JSON.parse(localStorage.getItem('deletedQuotes') || '[]');
  const remaining = deletedQuotes.filter(q => q.id !== quoteId);
  localStorage.setItem('deletedQuotes', JSON.stringify(remaining));
  return { deleted: remaining };
}

/** Supplier asks the contractor for permission to edit a quote they already sent. */
export function requestQuoteEdit(quoteId: number, note: string): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const updated = allQuotes.map((q: Quote) => q.id === quoteId
    ? { ...q, editRequestStatus: 'pending' as const, editRequestNote: note, editRequestedAt: new Date().toISOString() }
    : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
}

/** Contractor approves the supplier's edit request — this is equivalent to the contractor requesting a revision themselves. */
export function approveQuoteEdit(quoteId: number): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const updated = allQuotes.map((q: Quote) => q.id === quoteId
    ? { ...q, status: 'revision' as const, revisionNote: q.editRequestNote, editRequestStatus: undefined, editRequestNote: undefined, statusChangedAt: new Date().toISOString() }
    : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
}

/** Contractor declines the supplier's edit request; the quote stays as-is. */
export function declineQuoteEdit(quoteId: number): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const updated = allQuotes.map((q: Quote) => q.id === quoteId
    ? { ...q, editRequestStatus: 'rejected' as const }
    : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
}

/** Supplier dismisses the "your edit request was declined" notice. */
export function clearEditRequestFlag(quoteId: number): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const updated = allQuotes.map((q: Quote) => q.id === quoteId
    ? { ...q, editRequestStatus: undefined, editRequestNote: undefined }
    : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
}

/** Saves in-progress edits to a quote (e.g. during a revision) without resubmitting it — status and revisionNote are left untouched. */
export function updateQuoteFields(
  quoteId: number,
  updates: Partial<Omit<Quote, 'id' | 'requestId' | 'supplierId' | 'createdAt' | 'status' | 'revisionNote'>>
): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const updated = allQuotes.map((q: Quote) => q.id === quoteId ? { ...q, ...updates } : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
}

export function resubmitQuote(
  quoteId: number,
  updates: Partial<Omit<Quote, 'id' | 'requestId' | 'supplierId' | 'createdAt'>>
): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const updated = allQuotes.map((q: Quote) => q.id === quoteId
    ? { ...q, ...updates, status: 'pending' as const, revisionNote: undefined, statusChangedAt: new Date().toISOString() }
    : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
}

/** Merges `updates` into the current user and writes all three localStorage copies (currentUser, users[], user_<email>) in lockstep. Returns the merged user, or null if no user is logged in. */
export function persistUserUpdate(updates: Record<string, any>): any {
  const curRaw = localStorage.getItem('currentUser');
  const cur = curRaw ? JSON.parse(curRaw) : null;
  if (!cur) return null;
  // the session copy must never carry credential fields (legacy sessions may still have them)
  const { password: _p, passwordHash: _h, passwordSalt: _s, ...merged } = { ...cur, ...updates };
  localStorage.setItem('currentUser', JSON.stringify(merged));

  const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
  localStorage.setItem('users', JSON.stringify(
    allUsers.map((u: any) => u.email === cur.email ? { ...u, ...updates } : u)
  ));

  const userKey = `user_${cur.email}`;
  const keyData = localStorage.getItem(userKey);
  if (keyData) {
    try { localStorage.setItem(userKey, JSON.stringify({ ...JSON.parse(keyData), ...updates })); } catch {}
  }
  return merged;
}

/** Sequential-looking quote number, e.g. QT-2026-0007. Purely client-side/localStorage-derived. */
export function generateQuoteNumber(supplierId: string): string {
  const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
  const count = allQuotes.filter(q => q.supplierId === supplierId).length;
  const seq = String(count + 1).padStart(4, '0');
  return `QT-${new Date().getFullYear()}-${seq}`;
}


/* ── trash (soft-delete) ── */

export function softDeleteRequest(requestId: number): RequestLike[] {
  return softDeleteRequests([requestId]);
}

export function softDeleteRequests(requestIds: number[]): RequestLike[] {
  const idSet = new Set(requestIds);
  const allRequests: RequestLike[] = JSON.parse(localStorage.getItem('requests') || '[]');
  const toTrash = allRequests.filter(r => idSet.has(r.id)).map(r => ({ ...r, deletedAt: new Date().toISOString() }));
  const remaining = allRequests.filter(r => !idSet.has(r.id));
  const deletedRequests: RequestLike[] = JSON.parse(localStorage.getItem('deletedRequests') || '[]');
  localStorage.setItem('deletedRequests', JSON.stringify([...deletedRequests, ...toTrash]));
  localStorage.setItem('requests', JSON.stringify(remaining));
  return remaining;
}

export function restoreRequest(requestId: number): { requests: RequestLike[]; deleted: RequestLike[] } {
  const deletedRequests: RequestLike[] = JSON.parse(localStorage.getItem('deletedRequests') || '[]');
  const found = deletedRequests.find(r => r.id === requestId);
  const remainingDeleted = deletedRequests.filter(r => r.id !== requestId);
  const allRequests: RequestLike[] = JSON.parse(localStorage.getItem('requests') || '[]');
  const restored = found ? [...allRequests, { ...found, deletedAt: undefined }] : allRequests;
  localStorage.setItem('requests', JSON.stringify(restored));
  localStorage.setItem('deletedRequests', JSON.stringify(remainingDeleted));
  return { requests: restored, deleted: remainingDeleted };
}

function purgeRequestTraces(requestIds: number[]): void {
  if (requestIds.length === 0) return;
  const idSet = new Set(requestIds);
  const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
  localStorage.setItem('quotes', JSON.stringify(allQuotes.filter(q => !idSet.has(q.requestId))));
  const allLogs: ActivityLog[] = JSON.parse(localStorage.getItem('activityLogs') || '[]');
  localStorage.setItem('activityLogs', JSON.stringify(allLogs.filter(l => !idSet.has(l.requestId))));
  const allRatings: any[] = JSON.parse(localStorage.getItem('ratings') || '[]');
  localStorage.setItem('ratings', JSON.stringify(allRatings.filter(r => !idSet.has(r.requestId))));
}

export function permanentlyDeleteRequest(requestId: number): { deleted: RequestLike[] } {
  const deletedRequests: RequestLike[] = JSON.parse(localStorage.getItem('deletedRequests') || '[]');
  const remainingDeleted = deletedRequests.filter(r => r.id !== requestId);
  localStorage.setItem('deletedRequests', JSON.stringify(remainingDeleted));
  purgeRequestTraces([requestId]);
  return { deleted: remainingDeleted };
}

export function purgeExpiredTrash(days = 30): void {
  const deletedRequests: RequestLike[] = JSON.parse(localStorage.getItem('deletedRequests') || '[]');
  const cutoff = Date.now() - days * 86400000;
  const kept = deletedRequests.filter(r => !r.deletedAt || new Date(r.deletedAt).getTime() > cutoff);
  if (kept.length !== deletedRequests.length) {
    const keptIds = new Set(kept.map(r => r.id));
    const purgedIds = deletedRequests.filter(r => !keptIds.has(r.id)).map(r => r.id);
    purgeRequestTraces(purgedIds);
    localStorage.setItem('deletedRequests', JSON.stringify(kept));
  }

  const deletedDrafts: any[] = JSON.parse(localStorage.getItem('deletedDrafts') || '[]');
  const keptDrafts = deletedDrafts.filter(d => !d.deletedAt || new Date(d.deletedAt).getTime() > cutoff);
  if (keptDrafts.length !== deletedDrafts.length) {
    localStorage.setItem('deletedDrafts', JSON.stringify(keptDrafts));
  }

  const deletedQuotes: Quote[] = JSON.parse(localStorage.getItem('deletedQuotes') || '[]');
  const keptQuotes = deletedQuotes.filter(q => !q.deletedAt || new Date(q.deletedAt).getTime() > cutoff);
  if (keptQuotes.length !== deletedQuotes.length) {
    localStorage.setItem('deletedQuotes', JSON.stringify(keptQuotes));
  }
}

/* ── drafts trash (soft-delete) ── */

export function softDeleteDraft(draftId: number): void {
  softDeleteDrafts([draftId]);
}

export function softDeleteDrafts(draftIds: number[]): void {
  const idSet = new Set(draftIds);
  const allDrafts: any[] = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
  const toTrash = allDrafts.filter(d => idSet.has(d.id)).map(d => ({ ...d, deletedAt: new Date().toISOString() }));
  const remaining = allDrafts.filter(d => !idSet.has(d.id));
  const deletedDrafts: any[] = JSON.parse(localStorage.getItem('deletedDrafts') || '[]');
  localStorage.setItem('deletedDrafts', JSON.stringify([...deletedDrafts, ...toTrash]));
  localStorage.setItem('requestDrafts', JSON.stringify(remaining));
}

export function restoreDraft(draftId: number): void {
  const deletedDrafts: any[] = JSON.parse(localStorage.getItem('deletedDrafts') || '[]');
  const found = deletedDrafts.find(d => d.id === draftId);
  const remainingDeleted = deletedDrafts.filter(d => d.id !== draftId);
  const allDrafts: any[] = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
  const restored = found ? [...allDrafts, { ...found, deletedAt: undefined }] : allDrafts;
  localStorage.setItem('requestDrafts', JSON.stringify(restored));
  localStorage.setItem('deletedDrafts', JSON.stringify(remainingDeleted));
}

export function permanentlyDeleteDraft(draftId: number): void {
  const deletedDrafts: any[] = JSON.parse(localStorage.getItem('deletedDrafts') || '[]');
  localStorage.setItem('deletedDrafts', JSON.stringify(deletedDrafts.filter(d => d.id !== draftId)));
}

/* ── in-progress autosave (unsaved, unfinished create-request form) ── */

export function getUnfinishedAutosave(): { projectName?: string; materials?: any[]; savedAt?: string; hadAttachments?: boolean } | null {
  const raw = localStorage.getItem('createRequestDraft');
  if (!raw) return null;
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return null; }
  const hasContent =
    parsed.projectName?.trim() ||
    parsed.materials?.some((m: any) => m.type?.trim() || m.typePending?.trim()) ||
    parsed.description?.trim();
  return hasContent ? parsed : null;
}
