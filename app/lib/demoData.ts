/**
 * Seeds a realistic demo dataset (contractor + two suppliers + requests/quotes/
 * ratings in every interesting state). Used from the admin data page so a fresh
 * browser can be populated in one click. Overwrites the domain keys it writes;
 * never touches currentUser.
 */

const DAY = 86400000;

export const DEMO_ACCOUNTS = [
  { role: 'contractor', email: 'contractor@demo.sa', password: '123456', label: 'م. خالد العتيبي — شركة البنيان للمقاولات' },
  { role: 'supplier', email: 'tiles@ceramica.sa', password: '123456', label: 'شريف عبدالله — سيراميكا الخليج للبورسلين' },
  { role: 'supplier', email: 'marble@gulf.sa', password: '123456', label: 'أحمد الغامدي — رخام الخليج' },
] as const;

export function seedDemoData(): void {
  const now = Date.now();
  const iso = (offset: number) => new Date(now + offset).toISOString();
  const dateStr = (offset: number) => new Date(now + offset).toISOString().slice(0, 10);

  const contractor = { email: 'contractor@demo.sa', password: '123456', name: 'م. خالد العتيبي', company: 'شركة البنيان للمقاولات', phone: '+966501234567', userType: 'contractor', verified: true, rating: 0, joinDate: iso(-90 * DAY) };
  const tiles = { email: 'tiles@ceramica.sa', password: '123456', name: 'شريف عبدالله', company: 'سيراميكا الخليج للبورسلين', phone: '+966559876543', userType: 'supplier', verified: true, rating: 0, joinDate: iso(-60 * DAY) };
  const marble = { email: 'marble@gulf.sa', password: '123456', name: 'أحمد الغامدي', company: 'رخام الخليج', phone: '+966551112222', userType: 'supplier', verified: false, rating: 0, joinDate: iso(-45 * DAY) };

  /* keep any existing extra users; replace the demo trio by email */
  const demoEmails = new Set([contractor.email, tiles.email, marble.email]);
  const existing = JSON.parse(localStorage.getItem('users') || '[]').filter((u: any) => !demoEmails.has(u.email));
  localStorage.setItem('users', JSON.stringify([...existing, contractor, tiles, marble]));
  for (const u of [contractor, tiles, marble]) localStorage.setItem('user_' + u.email, JSON.stringify(u));

  const mat = (type: string, usage: string, size: string, qty: number, target: number, extra: Record<string, unknown> = {}) =>
    ({ type, usage, size, thickness: '10mm', finish: 'مصقول', color: 'أبيض', quantity: qty, unit: 'م²', targetPrice: target, currency: 'ر.س', origin: 'صيني', deliveryDate: dateStr(30 * DAY), note: '', images: [], ...extra });

  const requests = [
    { id: 1001, contractorId: contractor.email, projectName: 'برج السلام السكني - المرحلة الأولى', materials: [mat('بورسلان', 'أرضيات', '60×120', 850, 95), mat('سيراميك', 'جدران', '30×60', 400, 45)], location: 'الرياض', deadline: dateStr(1 * DAY), budget: 0, description: 'مطلوب توريد لمشروع برج سكني 12 دور', status: 'open', createdAt: iso(-2 * DAY), selectedSuppliers: [tiles.email, marble.email] },
    { id: 1002, contractorId: contractor.email, projectName: 'فيلا الياسمين - حي النرجس', materials: [mat('بورسلان', 'أرضيات', '120×120', 320, 140, { finish: 'مطفي', color: 'رمادي فاتح' })], location: 'جدة', deadline: dateStr(10 * DAY), budget: 0, description: '', status: 'open', createdAt: iso(-5 * DAY), selectedSuppliers: [tiles.email] },
    { id: 1003, contractorId: contractor.email, projectName: 'مجمع الأعمال التجاري', materials: [mat('سيراميك', 'جدران', '25×75', 600, 38, { color: 'بيج' })], location: 'الدمام', deadline: dateStr(-1 * DAY), budget: 0, description: 'التسليم على دفعات', status: 'open', createdAt: iso(-8 * DAY), selectedSuppliers: [tiles.email, marble.email] },
    { id: 1004, contractorId: contractor.email, projectName: 'فندق الواحة', materials: [mat('بورسلان', 'أرضيات', '80×80', 1500, 88)], location: 'الرياض', deadline: dateStr(20 * DAY), budget: 0, description: '', status: 'open', createdAt: iso(-15 * DAY), selectedSuppliers: [tiles.email] },
  ];
  localStorage.setItem('requests', JSON.stringify(requests));

  const li = (type: string, size: string, qty: number, price: number) =>
    ({ id: Math.random() * 1e9, type, typeOther: '', size, sizeOther: '', thickness: '10mm', thicknessOther: '', finish: 'مصقول', finishOther: '', color: 'أبيض', colorOther: '', quantity: qty, unit: 'م²', unitOther: '', unitPrice: price, discount: 0, description: '', images: [] });

  const quotes = [
    { id: 2001, requestId: 1002, supplierId: tiles.email, supplierName: tiles.name, supplierCompany: tiles.company, totalPrice: 51520, deliveryDays: 14, description: 'بورسلين إسباني درجة أولى', status: 'pending', createdAt: iso(-3 * DAY), statusChangedAt: iso(-3 * DAY), quoteNumber: 'QT-2026-0001', clientName: contractor.name, location: 'جدة', paymentTerms: 'دفعة مقدمة 50% والباقي عند التسليم', validUntil: dateStr(25 * DAY), currency: 'ر.س', lineItems: [li('بورسلان', '120×120', 320, 140)], attachments: [], overallDiscount: 0, subtotalBeforeTax: 44800, taxAmount: 6720 },
    { id: 2002, requestId: 1003, supplierId: tiles.email, supplierName: tiles.name, supplierCompany: tiles.company, totalPrice: 26220, deliveryDays: 10, description: '', status: 'revision', revisionNote: 'السعر أعلى من الميزانية، هل يمكن خصم 10%؟', createdAt: iso(-6 * DAY), statusChangedAt: iso(-1 * DAY), quoteNumber: 'QT-2026-0002', clientName: contractor.name, location: 'الدمام', paymentTerms: 'الدفع الكامل عند التسليم', validUntil: dateStr(20 * DAY), currency: 'ر.س', lineItems: [li('سيراميك', '25×75', 600, 38)], attachments: [], overallDiscount: 0, subtotalBeforeTax: 22800, taxAmount: 3420 },
    { id: 2003, requestId: 1004, supplierId: tiles.email, supplierName: tiles.name, supplierCompany: tiles.company, totalPrice: 151800, deliveryDays: 21, description: '', status: 'accepted', createdAt: iso(-12 * DAY), statusChangedAt: iso(-4 * DAY), quoteNumber: 'QT-2026-0003', clientName: contractor.name, location: 'الرياض', paymentTerms: 'دفعات على 3 مراحل', validUntil: dateStr(15 * DAY), currency: 'ر.س', lineItems: [li('بورسلان', '80×80', 1500, 88)], attachments: [], overallDiscount: 0, subtotalBeforeTax: 132000, taxAmount: 19800 },
    { id: 2004, requestId: 1003, supplierId: marble.email, supplierName: marble.name, supplierCompany: marble.company, totalPrice: 24150, deliveryDays: 7, description: '', status: 'pending', createdAt: iso(-5 * DAY), statusChangedAt: iso(-5 * DAY), quoteNumber: 'QT-2026-0001', clientName: contractor.name, location: 'الدمام', paymentTerms: 'الدفع الكامل عند التسليم', validUntil: dateStr(18 * DAY), currency: 'ر.س', lineItems: [li('سيراميك', '25×75', 600, 35)], attachments: [], overallDiscount: 0, subtotalBeforeTax: 21000, taxAmount: 3150 },
  ];
  localStorage.setItem('quotes', JSON.stringify(quotes));

  localStorage.setItem('ratings', JSON.stringify([
    { id: 3001, requestId: 1004, supplierId: tiles.email, contractorId: contractor.email, rating: 5, comment: 'التزام ممتاز بالمواعيد وجودة عالية', createdAt: iso(-2 * DAY) },
  ]));

  localStorage.setItem('activityLogs', JSON.stringify([
    { id: 4001, requestId: 1004, action: 'تم قبول عرض سيراميكا الخليج للبورسلين بسعر 151800 ر.س', actionEn: 'Accepted quote from Ceramica Gulf at 151,800 SAR', timestamp: iso(-4 * DAY) },
    { id: 4002, requestId: 1003, action: 'طلب تعديل على عرض سيراميكا الخليج للبورسلين', actionEn: 'Revision requested on Ceramica Gulf quote', timestamp: iso(-1 * DAY) },
  ]));
}
