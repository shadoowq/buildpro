import { describe, it, expect, beforeEach } from 'vitest';
import {
  isRequestMatchedToSupplier, getSupplierVisibleRequests, generatePoNumber, hasRated,
  ratingsOfContractor, ratingsOfSupplier, Rating,
} from '../marketplace';
import { canUndoQuoteDecisionFreely, UNDO_GRACE_MS } from '../requestHelpers';

function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

const baseRequest = { id: 1, status: 'open', location: 'الرياض', materials: [{ type: 'بورسلان' }] };

describe('isRequestMatchedToSupplier', () => {
  it('is false when the supplier has not opted in', () => {
    expect(isRequestMatchedToSupplier(baseRequest, { email: 's@x.sa', autoMatch: false, specialties: ['بورسلان'], coverageCities: ['الرياض'] })).toBe(false);
  });

  it('is false when specialties or cities are unset (profile not configured)', () => {
    expect(isRequestMatchedToSupplier(baseRequest, { email: 's@x.sa', autoMatch: true })).toBe(false);
    expect(isRequestMatchedToSupplier(baseRequest, { email: 's@x.sa', autoMatch: true, specialties: ['بورسلان'] })).toBe(false);
  });

  it('is false when the city does not match', () => {
    expect(isRequestMatchedToSupplier(baseRequest, { email: 's@x.sa', autoMatch: true, specialties: ['بورسلان'], coverageCities: ['جدة'] })).toBe(false);
  });

  it('is false when no material overlaps', () => {
    expect(isRequestMatchedToSupplier(baseRequest, { email: 's@x.sa', autoMatch: true, specialties: ['رخام'], coverageCities: ['الرياض'] })).toBe(false);
  });

  it('is true when opted in, city and material both match', () => {
    expect(isRequestMatchedToSupplier(baseRequest, { email: 's@x.sa', autoMatch: true, specialties: ['بورسلان'], coverageCities: ['الرياض'] })).toBe(true);
  });

  it('is false for closed requests', () => {
    expect(isRequestMatchedToSupplier({ ...baseRequest, status: 'closed' }, { email: 's@x.sa', autoMatch: true, specialties: ['بورسلان'], coverageCities: ['الرياض'] })).toBe(false);
  });
});

describe('getSupplierVisibleRequests', () => {
  const requests = [
    { ...baseRequest, id: 1, selectedSuppliers: ['other@x.sa'] },       // matched, not hand-picked
    { ...baseRequest, id: 2, location: 'جدة', selectedSuppliers: ['me@x.sa'] }, // hand-picked, doesn't match city
    { ...baseRequest, id: 3, location: 'جدة', selectedSuppliers: ['other@x.sa'] }, // neither
  ];
  const me = { email: 'me@x.sa', autoMatch: true, specialties: ['بورسلان'], coverageCities: ['الرياض'] };

  it('includes both matched and hand-picked requests, and excludes neither', () => {
    const visible = getSupplierVisibleRequests(requests, me).map(r => r.id);
    expect(visible.sort()).toEqual([1, 2]);
  });
});

describe('generatePoNumber', () => {
  it('derives PO- from QT- quote numbers', () => {
    expect(generatePoNumber('QT-2026-0004', 99)).toBe('PO-2026-0004');
  });
  it('falls back to the quote id when there is no quote number', () => {
    expect(generatePoNumber(undefined, 99)).toBe('PO-99');
  });
});

describe('mutual rating helpers', () => {
  const ratings: Rating[] = [
    { id: 1, requestId: 10, supplierId: 'sup@x.sa', supplierCompany: 'Sup Co', rating: 5, comment: '', createdAt: '' }, // legacy, implicit contractor
    { id: 2, requestId: 10, supplierId: 'sup@x.sa', supplierCompany: 'Sup Co', contractorId: 'con@x.sa', contractorName: 'Con', raterRole: 'supplier', rating: 4, comment: '', createdAt: '' },
    { id: 3, requestId: 11, supplierId: 'other@x.sa', supplierCompany: 'Other', rating: 3, comment: '', createdAt: '' },
  ];

  it('hasRated respects direction and treats legacy rows as contractor ratings', () => {
    expect(hasRated(ratings, 10, 'contractor')).toBe(true);
    expect(hasRated(ratings, 10, 'supplier')).toBe(true);
    expect(hasRated(ratings, 11, 'supplier')).toBe(false);
  });

  it('ratingsOfSupplier only returns contractor-direction ratings for that supplier', () => {
    expect(ratingsOfSupplier(ratings, 'sup@x.sa').map(r => r.id)).toEqual([1]);
  });

  it('ratingsOfContractor only returns supplier-direction ratings for that contractor', () => {
    expect(ratingsOfContractor(ratings, 'con@x.sa').map(r => r.id)).toEqual([2]);
  });
});

describe('canUndoQuoteDecisionFreely', () => {
  it('allows free undo with no statusChangedAt (legacy data)', () => {
    expect(canUndoQuoteDecisionFreely({})).toBe(true);
  });
  it('allows free undo within the grace window', () => {
    expect(canUndoQuoteDecisionFreely({ statusChangedAt: new Date(Date.now() - 1000).toISOString() })).toBe(true);
  });
  it('blocks free undo once the grace window has passed', () => {
    expect(canUndoQuoteDecisionFreely({ statusChangedAt: new Date(Date.now() - UNDO_GRACE_MS - 1000).toISOString() })).toBe(false);
  });
});

describe('requestQuestions round-trip via localStorage', () => {
  beforeEach(installLocalStorage);
  it('askRequestQuestion then answerRequestQuestion updates the same entry', async () => {
    const { askRequestQuestion, answerRequestQuestion } = await import('../marketplace');
    const after = askRequestQuestion(5, { email: 'sup@x.sa', name: 'Sup', company: 'Sup Co' }, 'هل يوجد بديل؟');
    expect(after).toHaveLength(1);
    expect(after[0].answer).toBeUndefined();
    const answered = answerRequestQuestion(after[0].id, 'نعم يوجد');
    expect(answered[0].answer).toBe('نعم يوجد');
    expect(answered[0].answeredAt).toBeTruthy();
  });
});
