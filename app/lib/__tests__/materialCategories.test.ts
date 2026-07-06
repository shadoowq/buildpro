import { describe, it, expect } from 'vitest';
import { MATERIAL_CATEGORIES, categoryFieldsSummary, getCategory, specialtyLabel } from '../materialCategories';
import { MATERIAL_OPTIONS } from '../materialOptions';
import { arToEn, displayVal } from '../requestHelpers';

const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

describe('English translation coverage across the 10 categories', () => {
  // displayVal looks values up as whole strings, so every Arabic-containing option
  // must have its own arToEn entry or it leaks untranslated into English mode.
  it('every select option of every category field is translatable', () => {
    const missing: string[] = [];
    MATERIAL_CATEGORIES.forEach(cat => {
      cat.fields.forEach(field => {
        (field.options || []).forEach(opt => {
          if (hasArabic(opt) && !arToEn[opt]) missing.push(`${cat.id}.${field.key}: "${opt}"`);
        });
      });
    });
    expect(missing).toEqual([]);
  });

  it('every category unit is translatable', () => {
    const missing: string[] = [];
    MATERIAL_CATEGORIES.forEach(cat => {
      (cat.units || []).forEach(u => {
        if (hasArabic(u) && !arToEn[u]) missing.push(`${cat.id}: "${u}"`);
      });
    });
    expect(missing).toEqual([]);
  });

  it('every tiles option list (MATERIAL_OPTIONS) is translatable', () => {
    const missing: string[] = [];
    Object.entries(MATERIAL_OPTIONS).forEach(([listName, opts]) => {
      opts.forEach(opt => {
        if (hasArabic(opt) && !arToEn[opt]) missing.push(`${listName}: "${opt}"`);
      });
    });
    expect(missing).toEqual([]);
  });
});

describe('categoryFieldsSummary', () => {
  it('renders filled fields in schema order with translated labels and values', () => {
    const summary = categoryFieldsSummary('paint', { brand: 'Jotun', type: 'معجون', color: 'أبيض' }, 'en');
    expect(summary).toBe('Type: Putty, Color: White, Brand: Jotun');
  });

  it('renders Arabic labels and the Arabic comma in ar mode', () => {
    const summary = categoryFieldsSummary('paint', { type: 'معجون', color: 'أبيض' }, 'ar');
    expect(summary).toBe('النوع: معجون، اللون: أبيض');
  });

  it('skips empty/whitespace values and returns empty string for nothing filled', () => {
    expect(categoryFieldsSummary('rebar', { type: '  ', diameter: '' }, 'ar')).toBe('');
    expect(categoryFieldsSummary('rebar', undefined, 'ar')).toBe('');
  });

  it('returns empty string for unknown or tiles-less category ids', () => {
    expect(categoryFieldsSummary('no-such-category', { type: 'x' }, 'en')).toBe('');
    expect(categoryFieldsSummary(undefined, { type: 'x' }, 'en')).toBe('');
  });

  it('keeps custom "Other" values (not in the preset list) as-is', () => {
    const summary = categoryFieldsSummary('paint', { type: 'دهان خاص جدًا' }, 'ar');
    expect(summary).toBe('النوع: دهان خاص جدًا');
  });
});

describe('registry sanity', () => {
  it('has exactly 10 categories with unique ids and a leading type field', () => {
    expect(MATERIAL_CATEGORIES).toHaveLength(10);
    const ids = MATERIAL_CATEGORIES.map(c => c.id);
    expect(new Set(ids).size).toBe(10);
    MATERIAL_CATEGORIES.forEach(cat => {
      expect(cat.fields[0]?.key, `${cat.id} first field`).toBe('type');
    });
  });

  it('every non-tile category declares its own units', () => {
    MATERIAL_CATEGORIES.filter(c => c.id !== 'tiles').forEach(cat => {
      expect(cat.units?.length, `${cat.id} units`).toBeGreaterThan(0);
    });
  });

  it('getCategory and specialtyLabel resolve every registered id', () => {
    MATERIAL_CATEGORIES.forEach(cat => {
      expect(getCategory(cat.id)?.labelAr).toBe(cat.labelAr);
      expect(specialtyLabel(cat.id, 'ar')).toContain(cat.labelAr);
      expect(specialtyLabel(cat.id, 'en')).toContain(cat.labelEn);
    });
    expect(specialtyLabel('سيراميك', 'ar')).toBeNull(); // legacy tile-type strings pass through
  });

  it('displayVal round-trips a sample of category values into English', () => {
    expect(displayVal('1.5 طن', 'en')).toBe('1.5 Ton');
    expect(displayVal('نوافذ', 'en')).toBe('Windows');
    expect(displayVal('شيكارة', 'en')).toBe('Bag');
  });
});
