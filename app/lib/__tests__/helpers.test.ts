import { describe, it, expect } from 'vitest';
import { getDeadlineUrgency, displayVal } from '../requestHelpers';
import { resolveOther, currencyLabel, OTHER_VALUE } from '../materialOptions';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

describe('getDeadlineUrgency', () => {
  it('flags past deadlines as overdue', () => {
    expect(getDeadlineUrgency(hoursFromNow(-1), false)).toBe('overdue');
  });

  it('flags deadlines within 48h as soon', () => {
    expect(getDeadlineUrgency(hoursFromNow(24), false)).toBe('soon');
  });

  it('returns null for far deadlines', () => {
    expect(getDeadlineUrgency(hoursFromNow(72), false)).toBe(null);
  });

  it('is suppressed once a quote is accepted', () => {
    expect(getDeadlineUrgency(hoursFromNow(-1), true)).toBe(null);
  });

  it('handles missing/garbage deadlines without throwing', () => {
    expect(getDeadlineUrgency(undefined, false)).toBe(null);
    expect(getDeadlineUrgency('not-a-date', false)).toBe(null);
  });
});

describe('displayVal', () => {
  it('returns the Arabic value as-is in Arabic', () => {
    expect(displayVal('بورسلان', 'ar')).toBe('بورسلان');
  });

  it('translates known values to English', () => {
    expect(displayVal('بورسلان', 'en')).toBe('Porcelain');
  });

  it('translates compound "أو" values piecewise', () => {
    expect(displayVal('سيراميك أو رخام', 'en')).toBe('Ceramic / Marble');
  });

  it('falls back to a dash for empty values', () => {
    expect(displayVal(undefined, 'ar')).toBe('—');
    expect(displayVal('', 'en')).toBe('—');
  });

  it('passes unknown values through in English', () => {
    expect(displayVal('مادة نادرة', 'en')).toBe('مادة نادرة');
  });
});

describe('resolveOther', () => {
  it('returns the custom text when "other" is selected', () => {
    expect(resolveOther(OTHER_VALUE, 'مقاس خاص')).toBe('مقاس خاص');
  });

  it('returns the picked option otherwise', () => {
    expect(resolveOther('60×60', 'ignored')).toBe('60×60');
  });
});

describe('currencyLabel', () => {
  it('maps known currencies per language', () => {
    expect(currencyLabel('ر.س', 'ar')).toBe('ريال سعودي');
    expect(currencyLabel('ر.س', 'en')).toBe('SAR');
  });

  it('passes unknown currencies through', () => {
    expect(currencyLabel('€', 'en')).toBe('€');
  });
});
