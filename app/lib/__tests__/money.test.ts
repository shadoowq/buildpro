import { describe, it, expect } from 'vitest';
import { lineSubtotal, computeQuoteTotals, roundMoney, VAT_RATE } from '../materialOptions';

describe('roundMoney', () => {
  it('rounds to 2 decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10.0);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('kills float noise', () => {
    expect(roundMoney(323245.45000000004)).toBe(323245.45);
  });
});

describe('lineSubtotal', () => {
  it('computes quantity × unit price', () => {
    expect(lineSubtotal({ quantity: 10, unitPrice: 5 })).toBe(50);
  });

  it('accepts string form values', () => {
    expect(lineSubtotal({ quantity: '10', unitPrice: '5.5' })).toBe(55);
  });

  it('subtracts the per-line discount', () => {
    expect(lineSubtotal({ quantity: 10, unitPrice: 5, discount: 10 })).toBe(40);
  });

  it('floors at 0 when the discount exceeds the line total', () => {
    expect(lineSubtotal({ quantity: 2, unitPrice: 5, discount: 100 })).toBe(0);
  });

  it('treats empty/garbage inputs as 0', () => {
    expect(lineSubtotal({ quantity: '', unitPrice: '' })).toBe(0);
    expect(lineSubtotal({ quantity: 'abc', unitPrice: '5' })).toBe(0);
  });

  it('ignores negative inputs instead of inflating the total', () => {
    // a negative discount must never ADD money to the line
    expect(lineSubtotal({ quantity: 10, unitPrice: 5, discount: -20 })).toBe(50);
    // negative qty × negative price must not produce a positive total
    expect(lineSubtotal({ quantity: -4, unitPrice: -25 })).toBe(0);
    expect(lineSubtotal({ quantity: -4, unitPrice: 25 })).toBe(0);
  });
});

describe('computeQuoteTotals', () => {
  it('returns all zeros for an empty quote', () => {
    expect(computeQuoteTotals([])).toEqual({ itemsSubtotal: 0, subtotalBeforeTax: 0, taxAmount: 0, grandTotal: 0 });
  });

  it('sums lines and applies 15% VAT', () => {
    const t = computeQuoteTotals([{ quantity: 10, unitPrice: 10 }]); // 100
    expect(t.itemsSubtotal).toBe(100);
    expect(t.subtotalBeforeTax).toBe(100);
    expect(t.taxAmount).toBe(15);
    expect(t.grandTotal).toBe(115);
    expect(VAT_RATE).toBe(0.15);
  });

  it('applies the overall discount BEFORE VAT', () => {
    const t = computeQuoteTotals([{ quantity: 10, unitPrice: 10 }], 20); // 100 - 20 = 80
    expect(t.subtotalBeforeTax).toBe(80);
    expect(t.taxAmount).toBe(12);
    expect(t.grandTotal).toBe(92);
  });

  it('floors at 0 when the overall discount exceeds the subtotal', () => {
    const t = computeQuoteTotals([{ quantity: 1, unitPrice: 50 }], 500);
    expect(t.subtotalBeforeTax).toBe(0);
    expect(t.taxAmount).toBe(0);
    expect(t.grandTotal).toBe(0);
  });

  it('ignores a negative overall discount', () => {
    const t = computeQuoteTotals([{ quantity: 1, unitPrice: 100 }], -50);
    expect(t.grandTotal).toBe(115);
  });

  it('matches the real quote from the app (4444×22 + 7777×22)', () => {
    const t = computeQuoteTotals([
      { quantity: 4444, unitPrice: 22 },
      { quantity: 7777, unitPrice: 22 },
    ]);
    expect(t.itemsSubtotal).toBe(268862);
    expect(t.taxAmount).toBe(40329.3);
    expect(t.grandTotal).toBe(309191.3);
  });

  it('stores clean 2-decimal values (no float noise)', () => {
    const t = computeQuoteTotals([{ quantity: 3, unitPrice: 0.1 }]);
    expect(t.itemsSubtotal).toBe(0.3);
    expect(t.grandTotal).toBe(0.35); // 0.3 + 0.045 → rounded
    // every output must survive a round-trip through roundMoney unchanged
    for (const v of Object.values(t)) expect(roundMoney(v)).toBe(v);
  });

  it('accepts string form values throughout', () => {
    const t = computeQuoteTotals([{ quantity: '10', unitPrice: '10', discount: '10' }], '10');
    expect(t.itemsSubtotal).toBe(90);
    expect(t.subtotalBeforeTax).toBe(80);
    expect(t.grandTotal).toBe(92);
  });
});
