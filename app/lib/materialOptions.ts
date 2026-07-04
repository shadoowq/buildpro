export const MATERIAL_OPTIONS = {
  types: ['سيراميك', 'بورسلان', 'رخام', 'جرانيت', 'تيرازو', 'حجر طبيعي'],
  usages: ['أرضيات', 'جدران', 'وزر', 'درج', 'مغاسل', 'واجهات', 'أسطح'],
  sizes: ['30×30', '40×40', '60×60', '60×120', '80×80', '80×160', '100×100', '120×120', '120×240', '20×60', '25×75', '30×60'],
  thicknesses: ['6mm', '8mm', '10mm', '12mm', '15mm', '18mm', '20mm'],
  finishes: ['مصقول', 'مطفي', 'ساتان', 'بوشهامر', 'لابراتو', 'أنتيك'],
  colors: ['أبيض', 'كريمي', 'رمادي فاتح', 'رمادي غامق', 'أسود', 'بيج', 'بني', 'خشبي', 'أزرق', 'أخضر'],
  units: ['م²', 'م طولي', 'قطعة', 'حبة'],
  origins: ['وطني', 'صيني', 'أوروبي', 'إيطالي', 'إسباني', 'تركي', 'عماني', 'إماراتي', 'مصري', 'هندي'],
};

export const CURRENCY_OPTIONS = [
  { value: 'ر.س', ar: 'ريال سعودي', en: 'SAR' },
  { value: 'د.إ', ar: 'درهم إماراتي', en: 'AED' },
  { value: 'ر.ع', ar: 'ريال عماني', en: 'OMR' },
  { value: '$', ar: 'دولار أمريكي', en: 'USD' },
];

export function currencyLabel(value: string, lang: 'ar' | 'en'): string {
  const found = CURRENCY_OPTIONS.find(c => c.value === value);
  if (found) return lang === 'ar' ? found.ar : found.en;
  return value;
}

export const OTHER_VALUE = '__other__';

export function resolveOther(value: string, other: string): string {
  return value === OTHER_VALUE ? other : value;
}

export const PAYMENT_TERMS_OPTIONS = [
  'دفعة مقدمة 50% والباقي عند التسليم',
  'الدفع الكامل عند التسليم',
  'دفعة مقدمة 100%',
  'آجل 30 يوم من تاريخ الفاتورة',
  'دفعات على 3 مراحل',
];

export const VAT_RATE = 0.15;

export interface QuoteTotals {
  itemsSubtotal: number;
  subtotalBeforeTax: number;
  taxAmount: number;
  grandTotal: number;
}

/** Parses a form value as a non-negative number — garbage and negatives (typed past the min="0" input guard) become 0. */
function nonNegative(value: number | string | undefined): number {
  return Math.max(Number(value) || 0, 0);
}

/** Line total (before tax) = quantity*unitPrice minus that line's own discount, floored at 0. */
export function lineSubtotal(li: { quantity: number | string; unitPrice: number | string; discount?: number | string }): number {
  const raw = nonNegative(li.quantity) * nonNegative(li.unitPrice);
  return Math.max(raw - nonNegative(li.discount), 0);
}

/** Rounds to 2 decimal places, avoiding float noise like 323245.45000000004 in stored totals. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Sums all line subtotals, applies the overall discount, then computes VAT on what remains. All outputs rounded to 2 decimals. */
export function computeQuoteTotals(
  lineItems: { quantity: number | string; unitPrice: number | string; discount?: number | string }[],
  overallDiscount: number | string = 0
): QuoteTotals {
  const itemsSubtotal = roundMoney(lineItems.reduce((s, li) => s + lineSubtotal(li), 0));
  const subtotalBeforeTax = roundMoney(Math.max(itemsSubtotal - nonNegative(overallDiscount), 0));
  const taxAmount = roundMoney(subtotalBeforeTax * VAT_RATE);
  const grandTotal = roundMoney(subtotalBeforeTax + taxAmount);
  return { itemsSubtotal, subtotalBeforeTax, taxAmount, grandTotal };
}
