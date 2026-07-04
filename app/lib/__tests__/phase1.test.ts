import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateQuoteNumber, quoteDraftKey, readQuoteDraft, removeQuoteDraft,
  formatDay, formatDate, getRequestDisplayName, withdrawQuote,
} from '../requestHelpers';

/* minimal in-memory localStorage (same shape as expiry-backup.test.ts) */
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

const YEAR = new Date().getFullYear();
const me = 'tiles@ceramica.sa';

describe('generateQuoteNumber', () => {
  beforeEach(installLocalStorage);

  it('starts at 0001 and increments per call', () => {
    expect(generateQuoteNumber(me)).toBe(`QT-${YEAR}-0001`);
    expect(generateQuoteNumber(me)).toBe(`QT-${YEAR}-0002`);
  });

  it('never reuses a number after a quote is withdrawn to trash', () => {
    const n1 = generateQuoteNumber(me);
    localStorage.setItem('quotes', JSON.stringify([{ id: 7, supplierId: me, quoteNumber: n1 }]));
    withdrawQuote(7); // moves it into deletedQuotes
    expect(generateQuoteNumber(me)).not.toBe(n1);
  });

  it('reconciles with existing stored quotes even without a counter', () => {
    localStorage.setItem('quotes', JSON.stringify([{ id: 1, supplierId: me, quoteNumber: `QT-${YEAR}-0042` }]));
    expect(generateQuoteNumber(me)).toBe(`QT-${YEAR}-0043`);
  });

  it('keeps sequences separate per supplier', () => {
    generateQuoteNumber(me);
    expect(generateQuoteNumber('other@x.sa')).toBe(`QT-${YEAR}-0001`);
  });
});

describe('quote drafts (per-supplier scoping)', () => {
  beforeEach(installLocalStorage);

  it('scopes the key by supplier email', () => {
    expect(quoteDraftKey(me, 9)).toBe(`quoteDraft_${me}_9`);
  });

  it('migrates a legacy unscoped draft on first read', () => {
    localStorage.setItem('quoteDraft_9', JSON.stringify({ deliveryDays: '7' }));
    expect(readQuoteDraft(me, 9)).toEqual({ deliveryDays: '7' });
    expect(localStorage.getItem('quoteDraft_9')).toBeNull();
    expect(localStorage.getItem(quoteDraftKey(me, 9))).not.toBeNull();
  });

  it('keeps two suppliers’ drafts for the same request independent', () => {
    localStorage.setItem(quoteDraftKey(me, 9), JSON.stringify({ deliveryDays: '7' }));
    localStorage.setItem(quoteDraftKey('other@x.sa', 9), JSON.stringify({ deliveryDays: '21' }));
    expect(readQuoteDraft(me, 9)).toEqual({ deliveryDays: '7' });
    expect(readQuoteDraft('other@x.sa', 9)).toEqual({ deliveryDays: '21' });
  });

  it('removes both scoped and legacy keys', () => {
    localStorage.setItem(quoteDraftKey(me, 9), '{}');
    localStorage.setItem('quoteDraft_9', '{}');
    removeQuoteDraft(me, 9);
    expect(readQuoteDraft(me, 9)).toBeNull();
  });
});

describe('date formatting', () => {
  it('formats a date-only string in both languages (Gregorian)', () => {
    expect(formatDay('2026-07-05', 'en')).toBe('5 July 2026');
    expect(formatDay('2026-07-05', 'ar')).toContain('يوليو');
  });

  it('falls back gracefully on missing/garbage input', () => {
    expect(formatDay(undefined, 'ar')).toBe('—');
    expect(formatDate('not-a-date', 'en')).toBe('not-a-date');
    expect(formatDate('', 'en')).toBe('—');
  });
});

describe('getRequestDisplayName', () => {
  it('prefers the project name', () => {
    expect(getRequestDisplayName({ id: 1, status: 'open', projectName: 'برج السلام' }, 'ar')).toBe('برج السلام');
  });

  it('falls back to material types, translated per language', () => {
    const req = { id: 1, status: 'open', materials: [{ type: 'بورسلان' }, { type: 'سيراميك' }] };
    expect(getRequestDisplayName(req, 'ar')).toBe('بورسلان — سيراميك');
    expect(getRequestDisplayName(req, 'en')).toBe('Porcelain — Ceramic');
  });

  it('falls back to the id when the request is unknown', () => {
    expect(getRequestDisplayName(null, 'ar', 1003)).toBe('#1003');
  });
});
