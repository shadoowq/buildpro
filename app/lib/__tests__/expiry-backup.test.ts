import { describe, it, expect, beforeEach } from 'vitest';
import { isQuoteExpired, getEffectiveQuoteStatus } from '../requestHelpers';
import { buildBackup, parseBackup, restoreBackup } from '../backup';

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

describe('isQuoteExpired', () => {
  it('marks a pending quote past its validity date as expired', () => {
    expect(isQuoteExpired({ status: 'pending', validUntil: daysFromNow(-2) })).toBe(true);
  });

  it('keeps a quote valid through the whole of its last day', () => {
    expect(isQuoteExpired({ status: 'pending', validUntil: daysFromNow(0) })).toBe(false);
    expect(isQuoteExpired({ status: 'pending', validUntil: daysFromNow(5) })).toBe(false);
  });

  it('never expires decided quotes — decisions stand', () => {
    for (const status of ['accepted', 'rejected', 'revision'] as const) {
      expect(isQuoteExpired({ status, validUntil: daysFromNow(-30) })).toBe(false);
    }
  });

  it('treats missing/garbage validity dates as non-expiring', () => {
    expect(isQuoteExpired({ status: 'pending' })).toBe(false);
    expect(isQuoteExpired({ status: 'pending', validUntil: 'not-a-date' })).toBe(false);
  });
});

describe('getEffectiveQuoteStatus', () => {
  it('maps expired-pending to "expired" and passes everything else through', () => {
    expect(getEffectiveQuoteStatus({ status: 'pending', validUntil: daysFromNow(-1) })).toBe('expired');
    expect(getEffectiveQuoteStatus({ status: 'pending', validUntil: daysFromNow(1) })).toBe('pending');
    expect(getEffectiveQuoteStatus({ status: 'accepted', validUntil: daysFromNow(-1) })).toBe('accepted');
  });
});

/* minimal in-memory localStorage for the backup round-trip */
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

describe('backup', () => {
  beforeEach(installLocalStorage);

  it('round-trips every key except the live session', () => {
    localStorage.setItem('requests', '[{"id":1}]');
    localStorage.setItem('quotes', '[{"id":2}]');
    localStorage.setItem('currentUser', '{"email":"me@x.c"}');

    const backup = buildBackup();
    expect(backup.app).toBe('buildpro');
    expect(backup.data.requests).toBe('[{"id":1}]');
    expect(backup.data.currentUser).toBeDefined(); // exported for completeness…

    // wipe and restore into a fresh store
    installLocalStorage();
    localStorage.setItem('currentUser', '{"email":"other@x.c"}');
    const written = restoreBackup(backup);

    expect(written).toBe(2); // requests + quotes, NOT currentUser
    expect(localStorage.getItem('requests')).toBe('[{"id":1}]');
    expect(localStorage.getItem('quotes')).toBe('[{"id":2}]');
    // …but never restored over the active session
    expect(localStorage.getItem('currentUser')).toBe('{"email":"other@x.c"}');
  });

  it('parseBackup validates the file shape', () => {
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('{"app":"something-else","data":{}}')).toThrow();
    expect(() => parseBackup('{"app":"buildpro"}')).toThrow();
    const ok = parseBackup(JSON.stringify(buildBackup()));
    expect(ok.app).toBe('buildpro');
  });
});
