import { describe, it, expect } from 'vitest';
import { quoteValidityDaysLeft } from '../requestHelpers';
import { csvEscape, buildCsv } from '../exportCsv';

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

describe('quoteValidityDaysLeft', () => {
  it('counts whole days until the end of the validity date', () => {
    expect(quoteValidityDaysLeft({ validUntil: daysFromNow(0) })).toBe(0);  // ends today, still valid
    expect(quoteValidityDaysLeft({ validUntil: daysFromNow(3) })).toBe(3);
  });

  it('goes negative once the quote has lapsed', () => {
    expect(quoteValidityDaysLeft({ validUntil: daysFromNow(-2) })).toBeLessThan(0);
  });

  it('returns null for missing or garbage dates', () => {
    expect(quoteValidityDaysLeft({})).toBeNull();
    expect(quoteValidityDaysLeft({ validUntil: 'not-a-date' })).toBeNull();
  });
});

describe('csv building', () => {
  it('escapes commas, quotes, and newlines', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
    expect(csvEscape(undefined)).toBe('');
  });

  it('prefixes a BOM so Excel reads Arabic as UTF-8', () => {
    const csv = buildCsv(['رقم العرض', 'السعر'], [['QT-2026-0001', 51520]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('QT-2026-0001,51520');
  });

  it('joins rows with CRLF', () => {
    const csv = buildCsv(['a'], [['1'], ['2']]);
    expect(csv.split('\r\n')).toHaveLength(3);
  });
});
