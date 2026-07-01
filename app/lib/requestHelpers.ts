export type Lang = 'ar' | 'en';

export const arToEn: Record<string, string> = {
  'سيراميك': 'Ceramic', 'بورسلان': 'Porcelain', 'رخام': 'Marble',
  'جرانيت': 'Granite', 'تيرازو': 'Terrazzo', 'حجر طبيعي': 'Natural Stone',
  'أرضيات': 'Flooring', 'جدران': 'Walls', 'وزر': 'Skirting',
  'درج': 'Stairs', 'مغاسل': 'Sinks', 'واجهات': 'Facades', 'أسطح': 'Surfaces',
  'بوليش': 'Polished', 'مات': 'Matte', 'ساتان': 'Satin',
  'بوشهامر': 'Bush-hammered', 'لابراتو': 'Labradorite', 'أنتيك': 'Antique',
  'أبيض': 'White', 'كريمي': 'Cream', 'رمادي فاتح': 'Light Gray',
  'رمادي غامق': 'Dark Gray', 'أسود': 'Black', 'بيج': 'Beige',
  'بني': 'Brown', 'خشبي': 'Wood', 'أزرق': 'Blue', 'أخضر': 'Green',
  'وطني': 'Local', 'صيني': 'Chinese', 'أوروبي': 'European',
  'إيطالي': 'Italian', 'إسباني': 'Spanish', 'تركي': 'Turkish',
  'عماني': 'Omani', 'إماراتي': 'Emirati', 'مصري': 'Egyptian', 'هندي': 'Indian',
  'م²': 'm²', 'م طولي': 'Linear m', 'قطعة': 'Piece', 'حبة': 'Unit',
};

export interface Quote {
  id: number; requestId: number; supplierId: string;
  supplierName: string; supplierCompany: string;
  totalPrice: number; deliveryDays: number; description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
  revisionNote?: string; createdAt: string;
}

export interface ActivityLog { id: number; requestId: number; action: string; actionEn: string; timestamp: string; }

export interface RequestLike {
  id: number; status: string; location?: string; deadline?: string; description?: string;
  materials?: any[]; ceramic?: number; porcelain?: number; marble?: number; granite?: number; terrazzo?: number;
  [k: string]: any;
}

export function getSupplierData(supplierId: string): any | null {
  const fromKey = localStorage.getItem(`user_${supplierId}`);
  if (fromKey) return JSON.parse(fromKey);
  return (JSON.parse(localStorage.getItem('users') || '[]')).find((u: any) => u.email === supplierId) || null;
}

export function formatDate(ts: string, lang: Lang): string {
  return new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
}

export function displayVal(val: string | undefined, lang: Lang): string {
  if (!val) return '—';
  if (lang === 'en') return val.split(' أو ').map(p => arToEn[p.trim()] || p.trim()).join(' / ');
  return val;
}

export function appendActivityLog(requestId: number, actionAr: string, actionEn: string): ActivityLog[] {
  const allLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
  const newLog: ActivityLog = { id: Date.now(), requestId, action: actionAr, actionEn, timestamp: new Date().toISOString() };
  allLogs.push(newLog);
  localStorage.setItem('activityLogs', JSON.stringify(allLogs));
  return allLogs;
}

export function setQuoteStatus(quoteId: number, status: Quote['status'], revisionNote?: string): { quotes: Quote[]; quote: Quote | undefined } {
  const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
  const quote = allQuotes.find((q: Quote) => q.id === quoteId);
  const updated = allQuotes.map((q: Quote) => q.id === quoteId
    ? (status === 'revision' ? { ...q, status, revisionNote } : { ...q, status })
    : q);
  localStorage.setItem('quotes', JSON.stringify(updated));
  return { quotes: updated, quote };
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

export function permanentlyDeleteRequest(requestId: number): { deleted: RequestLike[] } {
  const deletedRequests: RequestLike[] = JSON.parse(localStorage.getItem('deletedRequests') || '[]');
  const remainingDeleted = deletedRequests.filter(r => r.id !== requestId);
  localStorage.setItem('deletedRequests', JSON.stringify(remainingDeleted));
  const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
  localStorage.setItem('quotes', JSON.stringify(allQuotes.filter(q => q.requestId !== requestId)));
  return { deleted: remainingDeleted };
}

export function purgeExpiredTrash(days = 30): void {
  const deletedRequests: RequestLike[] = JSON.parse(localStorage.getItem('deletedRequests') || '[]');
  const cutoff = Date.now() - days * 86400000;
  const kept = deletedRequests.filter(r => !r.deletedAt || new Date(r.deletedAt).getTime() > cutoff);
  if (kept.length !== deletedRequests.length) {
    const keptIds = new Set(kept.map(r => r.id));
    const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
    const purgedIds = deletedRequests.filter(r => !keptIds.has(r.id)).map(r => r.id);
    localStorage.setItem('quotes', JSON.stringify(allQuotes.filter(q => !purgedIds.includes(q.requestId))));
    localStorage.setItem('deletedRequests', JSON.stringify(kept));
  }
}
