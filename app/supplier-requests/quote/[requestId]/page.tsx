'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SupplierNav from '../../../components/SupplierNav';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';
import { useEscapeKey } from '../../../components/useEscapeKey';
import { saudiCities, getCityName } from '../../../lib/translations';
import {
  MATERIAL_OPTIONS, PAYMENT_TERMS_OPTIONS, currencyLabel, OTHER_VALUE, resolveOther,
  VAT_RATE, lineSubtotal, computeQuoteTotals,
} from '../../../lib/materialOptions';
import {
  appendActivityLog, getSupplierData, generateQuoteNumber, resubmitQuote, updateQuoteFields, displayVal,
  formatDay, getDeadlineUrgency, readQuoteDraft, saveQuoteDraft, removeQuoteDraft,
  Quote, QuoteLineItem, QuoteAttachment,
} from '../../../lib/requestHelpers';
import { isValidImageFile, isValidAttachmentFile } from '../../../lib/auth';
import { getCategory, isTilesCategory } from '../../../lib/materialCategories';
import { isRequestMatchedToSupplier, askRequestQuestion, answerRequestQuestion, RequestQuestion } from '../../../lib/marketplace';
import {
  getCurrentUser, getLanguage, setLanguage as persistLanguage,
  getRequests, getQuotes, setQuotes as persistQuotes,
  getRequestQuestions, setQuotePreview,
} from '../../../lib/store';
import { compressImageToDataUrl, readFileAsDataUrl } from '../../../lib/images';

type Lang = 'ar' | 'en';
const OTHER = OTHER_VALUE;

interface FormLineItem {
  id: number;
  category: string;
  fields: Record<string, string>;
  type: string; typeOther: string;
  size: string; sizeOther: string;
  thickness: string; thicknessOther: string;
  finish: string; finishOther: string;
  color: string; colorOther: string;
  quantity: string;
  unit: string; unitOther: string;
  unitPrice: string;
  discount: string;
  description: string;
  images: string[];
  targetPriceHint?: string;
}

const emptyLineItem = (): FormLineItem => ({
  id: Date.now() + Math.random(),
  category: 'tiles', fields: {},
  type: '', typeOther: '',
  size: '', sizeOther: '',
  thickness: '', thicknessOther: '',
  finish: '', finishOther: '',
  color: '', colorOther: '',
  quantity: '', unit: MATERIAL_OPTIONS.units[0], unitOther: '',
  unitPrice: '', discount: '', description: '', images: [],
});

/** Builds the compact "Category — field: value, field: value" reference string
    shown read-only to suppliers for non-tile materials (they still just quote
    price/qty/delivery; they don't re-enter the buyer's structured spec). */
function buildReferenceLabel(row: { category: string; fields: Record<string, string> }, lang: Lang): string {
  const cat = getCategory(row.category);
  if (!cat) return '';
  const parts = cat.fields
    .map(f => row.fields?.[f.key] && `${lang === 'ar' ? f.labelAr : f.labelEn}: ${row.fields[f.key]}`)
    .filter(Boolean);
  const label = `${cat.icon} ${lang === 'ar' ? cat.labelAr : cat.labelEn}`;
  return parts.length ? `${label} — ${parts.join(', ')}` : label;
}

function legacyMaterialRows(request: any): any[] {
  const rows: any[] = [];
  const map = [
    { key: 'ceramic', ar: 'سيراميك' }, { key: 'porcelain', ar: 'بورسلان' },
    { key: 'marble', ar: 'رخام' }, { key: 'granite', ar: 'جرانيت' }, { key: 'terrazzo', ar: 'تيرازو' },
  ];
  map.forEach(t => { if (request[t.key] > 0) rows.push({ type: t.ar, quantity: request[t.key], unit: 'م²' }); });
  return rows;
}

function pickField(val: string, options: string[]): { value: string; other: string } {
  if (!val) return { value: '', other: '' };
  return options.includes(val) ? { value: val, other: '' } : { value: OTHER, other: val };
}

function prefillFromRequest(request: any): FormLineItem[] {
  const materials = request.materials?.length ? request.materials : legacyMaterialRows(request);
  if (!materials.length) return [emptyLineItem()];
  return materials.map((m: any) => {
    if (m.category && m.category !== 'tiles') {
      return {
        id: Date.now() + Math.random(),
        category: m.category, fields: m.fields || {},
        type: '', typeOther: '', size: '', sizeOther: '', thickness: '', thicknessOther: '',
        finish: '', finishOther: '', color: '', colorOther: '',
        quantity: m.quantity != null ? String(m.quantity) : '',
        unit: m.unit || MATERIAL_OPTIONS.units[0], unitOther: '',
        unitPrice: '', discount: '', description: '', images: [],
        targetPriceHint: m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : '',
      };
    }
    const type = pickField(m.type || m.typePending || '', MATERIAL_OPTIONS.types);
    const size = pickField(m.size || m.sizePending || '', MATERIAL_OPTIONS.sizes);
    const thickness = pickField(m.thickness || m.thicknessPending || '', MATERIAL_OPTIONS.thicknesses);
    const finish = pickField(m.finish || m.finishPending || '', MATERIAL_OPTIONS.finishes);
    const color = pickField(m.color || m.colorPending || '', MATERIAL_OPTIONS.colors);
    const unit = pickField(m.unit || '', MATERIAL_OPTIONS.units);
    return {
      id: Date.now() + Math.random(),
      category: 'tiles', fields: {},
      type: type.value, typeOther: type.other,
      size: size.value, sizeOther: size.other,
      thickness: thickness.value, thicknessOther: thickness.other,
      finish: finish.value, finishOther: finish.other,
      color: color.value, colorOther: color.other,
      quantity: m.quantity != null ? String(m.quantity) : '',
      unit: unit.value || MATERIAL_OPTIONS.units[0], unitOther: unit.other,
      unitPrice: '', discount: '', description: '', images: [],
      targetPriceHint: m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : '',
    };
  });
}

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const T = {
  title:        { ar: 'تقديم عرض سعر',          en: 'Submit Price Quote' },
  editTitle:    { ar: 'تعديل عرض السعر',        en: 'Edit Price Quote' },
  back:         { ar: '← رجوع',                 en: '← Back' },
  quoteNumber:  { ar: 'رقم العرض',              en: 'Quote Number' },
  refCard:      { ar: 'مرجع الطلب',             en: 'Request Reference' },
  project:      { ar: 'المشروع',                en: 'Project' },
  city:         { ar: 'المدينة',                en: 'City' },
  deadline:     { ar: 'الموعد النهائي',          en: 'Deadline' },
  requestedMaterials: { ar: 'المواد المطلوبة',   en: 'Requested Materials' },
  buyerPaymentTerms: { ar: 'شروط الدفع المفضلة للمقاول', en: "Contractor's Preferred Payment Terms" },
  viewOnMap:    { ar: 'عرض على الخريطة',          en: 'View on map' },
  quoteDetails: { ar: 'تفاصيل العرض',            en: 'Quote Details' },
  clientName:   { ar: 'اسم العميل',              en: 'Client Name' },
  location:     { ar: 'الموقع',                 en: 'Location' },
  selectCity:   { ar: 'اختر مدينة...',           en: 'Select a city...' },
  deliveryDays: { ar: 'مدة التوريد (أيام)',      en: 'Delivery Time (days)' },
  currency:     { ar: 'العملة',                 en: 'Currency' },
  paymentTerms: { ar: 'شروط الدفع',              en: 'Payment Terms' },
  selectOption: { ar: 'اختر...',                en: 'Select...' },
  otherOption:  { ar: 'أخرى...',                en: 'Other...' },
  specify:      { ar: 'حدد...',                 en: 'Specify...' },
  validUntil:   { ar: 'صالح حتى',                en: 'Valid Until' },
  lineItems:    { ar: 'بنود العرض',              en: 'Quote Line Items' },
  material:     { ar: 'المادة',                  en: 'Material' },
  size:         { ar: 'المقاس',                  en: 'Size' },
  thickness:    { ar: 'السماكة',                 en: 'Thickness' },
  finish:       { ar: 'الفنش',                   en: 'Finish' },
  color:        { ar: 'اللون',                   en: 'Color' },
  qty:          { ar: 'الكمية',                  en: 'Qty' },
  unit:         { ar: 'الوحدة',                  en: 'Unit' },
  unitPrice:    { ar: 'سعر الوحدة',              en: 'Unit Price' },
  itemDiscount: { ar: 'الخصم',                   en: 'Discount' },
  beforeTax:    { ar: 'قبل الضريبة',             en: 'Before Tax' },
  taxCol:       { ar: 'الضريبة (15%)',           en: 'Tax (15%)' },
  lineTotal:    { ar: 'الإجمالي',                en: 'Total' },
  itemNote:     { ar: 'وصف البند',               en: 'Item Description' },
  targetHint:   { ar: 'سعر المقاول المستهدف',    en: 'Contractor target' },
  image:        { ar: 'صورة',                   en: 'Image' },
  uploadImage:  { ar: '+ صورة',                  en: '+ Image' },
  maxImages:    { ar: 'وصلت للحد الأقصى (صورتين)', en: 'Max 2 images reached' },
  zoomReset:    { ar: 'إعادة ضبط',               en: 'Reset' },
  download:     { ar: 'تحميل',                   en: 'Download' },
  close:        { ar: 'إغلاق',                   en: 'Close' },
  zoomHint:     { ar: 'استخدم عجلة الفأرة للتكبير والتصغير', en: 'Use mouse wheel to zoom in/out' },
  addItem:      { ar: '+ إضافة بند',             en: '+ Add Item' },
  removeItem:   { ar: 'حذف',                     en: 'Remove' },
  overallDiscount: { ar: 'خصم على الإجمالي',     en: 'Discount on Total' },
  subtotalBeforeTax: { ar: 'الإجمالي قبل الضريبة', en: 'Subtotal Before Tax' },
  totalTax:     { ar: 'إجمالي الضريبة (15%)',    en: 'Total Tax (15%)' },
  grandTotal:   { ar: 'الإجمالي مع الضريبة',     en: 'Total (incl. Tax)' },
  attachments:  { ar: 'مرفقات (كتالوج، عينات، شهادات...)', en: 'Attachments (Catalog, Samples, Certificates...)' },
  uploadFiles:  { ar: 'رفع ملفات',               en: 'Upload Files' },
  notes:        { ar: 'ملاحظات عامة (اختياري)',  en: 'General Notes (Optional)' },
  notesPh:      { ar: 'أي تفاصيل إضافية...',     en: 'Any additional details...' },
  reviewBtn:    { ar: 'مراجعة العرض',            en: 'Review Quote' },
  submitBtn:    { ar: 'إرسال العرض',             en: 'Submit Quote' },
  updateBtn:    { ar: 'حفظ وإرسال',              en: 'Save & Send' },
  saveOnlyBtn:  { ar: 'حفظ فقط',                en: 'Save Only' },
  savedOnly:    { ar: 'تم حفظ التعديلات — لم يتم إرسالها للمقاول بعد', en: "Changes saved — not yet sent to the contractor" },
  saveDraftBtn: { ar: 'حفظ كمسودة',              en: 'Save as Draft' },
  printPreview: { ar: 'معاينة الطباعة',          en: 'Print Preview' },
  draftSaved:   { ar: 'تم حفظ المسودة — يمكنك إكمالها لاحقًا من نفس الطلب', en: 'Draft saved — you can continue it later from the same request' },
  previewTitle: { ar: 'مراجعة العرض قبل الإرسال', en: 'Review Quote Before Sending' },
  confirm:      { ar: 'تأكيد وإرسال العرض',      en: 'Confirm & Submit Quote' },
  editBack:     { ar: 'رجوع للتعديل',            en: 'Back to Edit' },
  noValue:      { ar: '—',                       en: '—' },
  legacyToast:  { ar: 'هذا عرض قديم — الرجاء إعادة إدخال أسعار البنود', en: 'This is a legacy quote — please re-enter item prices' },
  overdueWarn:  { ar: 'انتهى الموعد النهائي لهذا الطلب — ننصح بالتواصل مع المقاول للتأكد أنه ما زال بحاجة للتوريد قبل إرسال العرض.', en: "This request's deadline has passed — check with the contractor that they still need the supply before sending a quote." },
  qaTitle:      { ar: 'أسئلة وأجوبة',            en: 'Questions & Answers' },
  qaNote:       { ar: 'أسئلتك وإجاباتها تظهر لكل الموردين المدعوين على هذا الطلب', en: 'Your questions and their answers are visible to every supplier invited on this request' },
  qaPlaceholder:{ ar: 'اسأل المقاول عن أي تفصيلة في الطلب...', en: 'Ask the contractor about any detail in the request...' },
  qaSend:       { ar: 'إرسال السؤال',            en: 'Send Question' },
  qaWaiting:    { ar: 'بانتظار رد المقاول...',    en: "Waiting for the contractor's reply..." },
  qaNone:       { ar: 'لا توجد أسئلة بعد — كن أول من يسأل',  en: 'No questions yet — be the first to ask' },
  questionSent: { ar: 'تم إرسال سؤالك للمقاول',   en: 'Your question was sent to the contractor' },
  cannotEdit:   { ar: 'لا يمكن تعديل هذا العرض',  en: 'This quote cannot be edited' },
  notAvailable: { ar: 'الطلب غير متاح',          en: 'Request not available' },
  alreadyQuoted:{ ar: 'لقد قدمت عرض سعر لهذا الطلب من قبل', en: 'You already submitted a quote for this request' },
  needItem:     { ar: 'أضف بندًا واحدًا على الأقل مع سعر', en: 'Add at least one priced line item' },
  needDelivery: { ar: 'أدخل مدة التوريد',        en: 'Enter delivery time' },
  needClient:   { ar: 'أدخل اسم العميل',         en: 'Enter client name' },
  needLocation: { ar: 'اختر الموقع',             en: 'Select a location' },
  needTerms:    { ar: 'أدخل شروط الدفع',         en: 'Enter payment terms' },
  updated:      { ar: 'تم تحديث العرض بنجاح!',   en: 'Quote updated successfully!' },
  submitted:    { ar: 'تم إرسال عرض السعر بنجاح!', en: 'Quote submitted successfully!' },
  tooLarge:     { ar: 'حجم المرفقات كبير جداً — احذف بعضها وحاول مرة أخرى', en: 'Attachments are too large — remove some and try again' },
  confirmSend:  { ar: 'هل أنت متأكد من إرسال عرض السعر؟ لن تتمكن من تعديله بعد الإرسال — لو احتجت لتعديله لاحقًا فسيتطلب الأمر عرضًا جديدًا.', en: "Are you sure you want to send this quote? You won't be able to edit it after sending — changing it later will require a new quote." },
  confirmUpdate:{ ar: 'هل أنت متأكد من إرسال التعديل؟', en: 'Are you sure you want to send this update?' },
  sendConfirmBtn:{ ar: 'نعم، إرسال', en: 'Yes, Send' },
};
function tx(key: keyof typeof T, lang: Lang): string { return T[key][lang]; }

function SelectOther({ value, other, onValue, onOther, options, lang }: {
  value: string; other: string; onValue: (v: string) => void; onOther: (v: string) => void;
  options: string[]; lang: Lang;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      <select value={value} onChange={e => onValue(e.target.value)}
        className="text-xs border border-[var(--line)] rounded-lg px-2 py-1.5 bg-white text-stone-700 outline-none focus:border-[var(--sec)]">
        <option value="">{tx('selectOption', lang)}</option>
        {options.map(o => <option key={o} value={o}>{displayVal(o, lang)}</option>)}
        <option value={OTHER}>{tx('otherOption', lang)}</option>
      </select>
      {value === OTHER && (
        <input value={other} onChange={e => onOther(e.target.value)} placeholder={tx('specify', lang)}
          className="text-xs border border-[var(--line)] rounded-lg px-2 py-1.5 bg-white text-stone-700 outline-none focus:border-[var(--sec)]" />
      )}
    </div>
  );
}

export default function SupplierQuoteBuilder() {
  const router = useRouter();
  const params = useParams();
  const requestId = Number(params.requestId);
  const showToast = useToast();
  const confirmDialog = useConfirm();

  const [language, setLanguage] = useState<Lang>('ar');
  const [user, setUser] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [editQuoteId, setEditQuoteId] = useState<number | null>(null);

  const [quoteNumber, setQuoteNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentTermsOther, setPaymentTermsOther] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [currency, setCurrency] = useState('ر.س');
  const [overallDiscount, setOverallDiscount] = useState('');
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [questions, setQuestions] = useState<RequestQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const skipSaveRef = useRef(false);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEscapeKey(() => {
    if (lightboxImg) { setLightboxImg(null); setZoomLevel(1); return; }
    if (showPreview) setShowPreview(false);
  });

  useEffect(() => {
    const parsedUser = getCurrentUser<any>();
    if (!parsedUser) { router.push('/login'); return; }
    if (parsedUser.userType !== 'supplier') { router.push('/dashboard'); return; }
    setUser(parsedUser);

    const savedLang = getLanguage();
    setLanguage(savedLang);

    const allRequests = getRequests();
    const req = allRequests.find((r: any) => r.id === requestId);
    const visible = req && (req.selectedSuppliers?.includes(parsedUser.email) || isRequestMatchedToSupplier(req, parsedUser));
    if (!visible) {
      showToast(tx('notAvailable', savedLang), 'error');
      router.push('/supplier-requests');
      return;
    }
    setRequest(req);

    const allQuestions: RequestQuestion[] = getRequestQuestions<RequestQuestion>();
    setQuestions(allQuestions.filter(q => q.requestId === requestId));

    const contractor = getSupplierData(req.contractorId);
    const searchParams = new URLSearchParams(window.location.search);
    const editIdParam = searchParams.get('editQuoteId');
    const allQuotes: Quote[] = getQuotes<Quote>();

    if (editIdParam) {
      const existing = allQuotes.find(q => q.id === Number(editIdParam) && q.supplierId === parsedUser.email && q.status === 'revision');
      if (!existing) {
        showToast(tx('cannotEdit', savedLang), 'error');
        router.push('/my-quotes');
        return;
      }
      skipSaveRef.current = true;
      setEditQuoteId(existing.id);
      setQuoteNumber(existing.quoteNumber || generateQuoteNumber(parsedUser.email));
      setClientName(existing.clientName || contractor?.name || '');
      setLocation(existing.location || req.location || '');
      setDeliveryDays(String(existing.deliveryDays ?? ''));
      setValidUntil(existing.validUntil || defaultValidUntil());
      setCurrency(existing.currency || 'ر.س');
      setOverallDiscount(existing.overallDiscount ? String(existing.overallDiscount) : '');
      setDescription(existing.description || '');
      if (existing.paymentTerms && PAYMENT_TERMS_OPTIONS.includes(existing.paymentTerms)) {
        setPaymentTerms(existing.paymentTerms); setPaymentTermsOther('');
      } else if (existing.paymentTerms) {
        setPaymentTerms(OTHER); setPaymentTermsOther(existing.paymentTerms);
      }
      if (existing.lineItems?.length) {
        setLineItems(existing.lineItems.map((li, i) => ({
          ...li, quantity: String(li.quantity), unitPrice: String(li.unitPrice), discount: li.discount ? String(li.discount) : '',
          thickness: li.thickness || '', thicknessOther: li.thicknessOther || '', images: li.images || [],
          category: li.category || 'tiles',
          fields: req.materials?.[i]?.fields || {},
        })));
      } else {
        setLineItems(prefillFromRequest(req));
        showToast(tx('legacyToast', savedLang));
      }
      setAttachments(existing.attachments || []);
    } else {
      const alreadyQuoted = allQuotes.some(q => q.requestId === requestId && q.supplierId === parsedUser.email);
      if (alreadyQuoted) {
        showToast(tx('alreadyQuoted', savedLang), 'error');
        router.push('/supplier-requests');
        return;
      }
      const draft: any = readQuoteDraft(parsedUser.email, requestId);
      setQuoteNumber(generateQuoteNumber(parsedUser.email));
      setClientName(draft?.clientName ?? contractor?.name ?? '');
      setLocation(draft?.location ?? req.location ?? '');
      setDeliveryDays(draft?.deliveryDays ?? '');
      setPaymentTerms(draft?.paymentTerms ?? '');
      setPaymentTermsOther(draft?.paymentTermsOther ?? '');
      setValidUntil(draft?.validUntil ?? defaultValidUntil());
      setCurrency(draft?.currency ?? 'ر.س');
      setOverallDiscount(draft?.overallDiscount ?? '');
      setDescription(draft?.description ?? '');
      setLineItems(draft?.lineItems?.length
        ? draft.lineItems.map((li: FormLineItem) => ({ ...li, category: li.category || 'tiles', fields: li.fields || {} }))
        : prefillFromRequest(req));
    }

    setReady(true);
  }, [requestId, router]);

  useEffect(() => {
    if (skipSaveRef.current || !ready || !user?.email) return;
    try {
      const lightLineItems = lineItems.map(li => ({ ...li, images: [] }));
      saveQuoteDraft(user.email, requestId, {
        clientName, location, deliveryDays, paymentTerms, paymentTermsOther, validUntil, currency, overallDiscount,
        lineItems: lightLineItems, description, savedAt: new Date().toISOString(),
      });
    } catch { /* draft autosave is best-effort; ignore quota errors silently */ }
  }, [ready, user, requestId, clientName, location, deliveryDays, paymentTerms, paymentTermsOther, validUntil, currency, overallDiscount, lineItems, description]);

  const handleLangChange = (l: Lang) => { setLanguage(l); persistLanguage(l); };

  const updateRow = (id: number, field: keyof FormLineItem, value: string) => {
    setLineItems(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const addRow = () => setLineItems(prev => [...prev, emptyLineItem()]);
  const removeRow = (id: number) => setLineItems(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));

  const handleRowImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const row = lineItems.find(r => r.id === id);
    if (!row) return;
    const valid = files.filter(isValidImageFile);
    if (valid.length < files.length) {
      showToast(language === 'ar' ? 'صور PNG/JPG/WebP فقط وبحد أقصى 1.5MB للصورة' : 'PNG/JPG/WebP images only, max 1.5MB each', 'error');
    }
    const remaining = 2 - row.images.length;
    valid.slice(0, remaining).forEach(async file => {
      // compress before storing — base64 photos eat the shared localStorage quota fast
      let dataUrl: string;
      try { dataUrl = await compressImageToDataUrl(file); }
      catch { try { dataUrl = await readFileAsDataUrl(file); } catch { return; } }
      setLineItems(prev => prev.map(r => (r.id === id && r.images.length < 2) ? { ...r, images: [...r.images, dataUrl] } : r));
    });
    e.target.value = '';
  };
  const removeRowImage = (id: number, index: number) => {
    setLineItems(prev => prev.map(r => (r.id === id ? { ...r, images: r.images.filter((_, i) => i !== index) } : r)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(isValidAttachmentFile);
    if (valid.length < files.length) {
      showToast(language === 'ar' ? 'الحد الأقصى لحجم المرفق 3MB' : 'Attachments are limited to 3MB each', 'error');
    }
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setAttachments(prev => [...prev, { name: file.name, type: file.type, data: reader.result as string }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };
  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  const handleAskQuestion = () => {
    if (!newQuestion.trim() || !user) return;
    const updated = askRequestQuestion(requestId, { email: user.email, name: user.name, company: user.company }, newQuestion.trim());
    setQuestions(updated.filter(q => q.requestId === requestId));
    setNewQuestion('');
    showToast(tx('questionSent', language));
  };

  const rowSubtotal = (li: FormLineItem) => lineSubtotal(li);
  const rowTax = (li: FormLineItem) => rowSubtotal(li) * VAT_RATE;
  const rowTotal = (li: FormLineItem) => rowSubtotal(li) + rowTax(li);
  const totals = computeQuoteTotals(lineItems, overallDiscount);

  const isValidLineItem = (li: FormLineItem) =>
    (isTilesCategory(li.category) ? resolveOther(li.type, li.typeOther).trim() : true)
    && Number(li.unitPrice) > 0 && Number(li.quantity) > 0;

  const validate = (): boolean => {
    const valid = lineItems.filter(isValidLineItem);
    if (valid.length === 0) { showToast(tx('needItem', language), 'error'); return false; }
    if (!deliveryDays || Number(deliveryDays) <= 0) { showToast(tx('needDelivery', language), 'error'); return false; }
    if (!clientName.trim()) { showToast(tx('needClient', language), 'error'); return false; }
    if (!location) { showToast(tx('needLocation', language), 'error'); return false; }
    if (!paymentTerms || (paymentTerms === OTHER && !paymentTermsOther.trim())) { showToast(tx('needTerms', language), 'error'); return false; }
    return true;
  };

  const handleReview = () => { if (validate()) setShowPreview(true); };

  const buildQuotePayload = () => {
    const resolvedItems: QuoteLineItem[] = lineItems
      .filter(isValidLineItem)
      .map(li => ({
        id: li.id, category: li.category,
        type: li.type, typeOther: li.typeOther,
        size: li.size, sizeOther: li.sizeOther,
        thickness: li.thickness, thicknessOther: li.thicknessOther,
        finish: li.finish, finishOther: li.finishOther,
        color: li.color, colorOther: li.colorOther,
        quantity: Number(li.quantity) || 0,
        unit: li.unit, unitOther: li.unitOther,
        unitPrice: Number(li.unitPrice) || 0,
        discount: Number(li.discount) || 0,
        description: li.description,
        images: li.images,
      }));
    const finalTotals = computeQuoteTotals(resolvedItems, overallDiscount);
    const finalPaymentTerms = paymentTerms === OTHER ? paymentTermsOther : paymentTerms;
    return {
      totalPrice: finalTotals.grandTotal, deliveryDays: parseInt(deliveryDays) || 0, description,
      quoteNumber, clientName, location, paymentTerms: finalPaymentTerms, validUntil, currency,
      lineItems: resolvedItems, attachments,
      overallDiscount: Number(overallDiscount) || 0,
      subtotalBeforeTax: finalTotals.subtotalBeforeTax, taxAmount: finalTotals.taxAmount,
    };
  };

  const handlePrintPreview = () => {
    const previewQuote: Quote = {
      id: 0, requestId, supplierId: user.email,
      supplierName: user.name, supplierCompany: user.company,
      status: 'pending', createdAt: new Date().toISOString(),
      ...buildQuotePayload(),
    };
    setQuotePreview(previewQuote);
    window.open('/print/quote/preview', '_blank');
  };

  const handleConfirmSubmit = () => {
    const commonFields = buildQuotePayload();

    if (editQuoteId) {
      try {
        resubmitQuote(editQuoteId, commonFields);
      } catch {
        showToast(tx('tooLarge', language), 'error');
        return;
      }
      appendActivityLog(requestId, 'تم تعديل عرض السعر', 'Quote edited');
      removeQuoteDraft(user.email, requestId);
      showToast(tx('updated', language));
      router.push('/my-quotes');
      return;
    }

    const newQuote: Quote = {
      id: Date.now(), requestId, supplierId: user.email,
      supplierName: user.name, supplierCompany: user.company,
      status: 'pending', createdAt: new Date().toISOString(), statusChangedAt: new Date().toISOString(),
      ...commonFields,
    };
    try {
      const allQuotes = getQuotes();
      persistQuotes([...allQuotes, newQuote]);
    } catch {
      showToast(tx('tooLarge', language), 'error');
      return;
    }
    appendActivityLog(requestId, 'تم تقديم عرض سعر', 'Quote submitted');
    removeQuoteDraft(user.email, requestId);
    showToast(tx('submitted', language));
    router.push('/supplier-requests');
  };

  const handleSaveOnly = () => {
    if (!editQuoteId) return;
    const commonFields = buildQuotePayload();
    try {
      updateQuoteFields(editQuoteId, commonFields);
    } catch {
      showToast(tx('tooLarge', language), 'error');
      return;
    }
    showToast(tx('savedOnly', language));
  };

  const confirmAndSubmit = async () => {
    const msg = editQuoteId ? tx('confirmUpdate', language) : tx('confirmSend', language);
    if (!(await confirmDialog(msg, { confirmText: tx('sendConfirmBtn', language) }))) return;
    handleConfirmSubmit();
  };

  const handleSaveDraft = () => {
    try {
      const lightLineItems = lineItems.map(li => ({ ...li, images: [] }));
      saveQuoteDraft(user.email, requestId, {
        clientName, location, deliveryDays, paymentTerms, paymentTermsOther, validUntil, currency, overallDiscount,
        lineItems: lightLineItems, description, savedAt: new Date().toISOString(),
      });
    } catch {
      showToast(tx('tooLarge', language), 'error');
      return;
    }
    showToast(tx('draftSaved', language));
    router.push('/supplier-requests');
  };

  if (!ready || !request || !user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-cairo">
      <div className="text-stone-500 text-sm">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
    </div>
  );

  const reqName = request.projectName?.trim() || `#${String(request.id).slice(-6)}`;
  const reqMaterialLines: string[] = (request.materials?.length ? request.materials : legacyMaterialRows(request))
    .map((m: any) => isTilesCategory(m.category)
      ? `${displayVal(m.type || m.typePending, language)} — ${m.quantity ?? 0} ${displayVal(m.unit, language) !== '—' ? displayVal(m.unit, language) : 'm²'}`
      : `${buildReferenceLabel(m, language)} — ${m.quantity ?? 0} ${m.unit || ''}`);

  /* shared between the desktop table cell and the mobile card */
  const renderRowImages = (row: FormLineItem) => (
    <>
      <div className="flex gap-1 flex-wrap mb-1">
        {row.images.map((img, i) => (
          <div key={i} className="relative inline-block">
            <img src={img} alt="" onClick={() => { setLightboxImg(img); setZoomLevel(1); }}
              className="w-9 h-9 object-cover rounded border border-[var(--line)] cursor-zoom-in" />
            <button type="button" onClick={() => removeRowImage(row.id, i)}
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center leading-none">✕</button>
          </div>
        ))}
      </div>
      {row.images.length < 2 ? (
        <label className="inline-block px-1.5 py-1 bg-[var(--sec)] text-white rounded text-[11px] font-bold cursor-pointer">
          {tx('uploadImage', language)}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => handleRowImageUpload(row.id, e)} />
        </label>
      ) : (
        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{tx('maxImages', language)}</span>
      )}
    </>
  );

  const inputCls = 'w-full text-sm border border-[var(--line)] rounded-xl px-4 py-2.5 outline-none font-cairo bg-white text-stone-800 placeholder-stone-300 focus:border-[var(--sec)] focus:ring-2 focus:ring-[var(--sec)]/10 transition-all';
  const labelCls = 'block text-xs font-semibold text-stone-600 mb-1.5';
  const th = 'px-3 py-2 text-xs font-semibold text-stone-500 whitespace-nowrap text-center bg-[var(--bg-soft)] border-b border-[var(--line-soft)]';
  const td = 'px-2 py-2 align-top border-b border-[var(--line-soft)]';

  return (
    <div className="min-h-screen bg-[var(--bg)] font-cairo md:ps-[190px]" dir={dir}>
      <SupplierNav lang={language} setLang={handleLangChange} userName={user.name || ''} active="/supplier-requests" />

      {/* HERO */}
      <div className="bg-[var(--chrome)] px-4 md:px-7 pt-6 pb-6">
        <button onClick={() => router.push('/supplier-requests')} className="text-white/70 hover:text-white text-xs mb-2">
          {tx('back', language)}
        </button>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="text-white text-xl font-bold">{editQuoteId ? tx('editTitle', language) : tx('title', language)}</h1>
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs font-semibold">
            {tx('quoteNumber', language)}: {quoteNumber}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-7 py-6 max-w-5xl mx-auto space-y-5">

        {/* OVERDUE WARNING */}
        {getDeadlineUrgency(request.deadline, false) === 'overdue' && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">⚠️</span>
            <p className="text-sm text-amber-800 font-semibold">{tx('overdueWarn', language)}</p>
          </div>
        )}

        {/* REQUEST REFERENCE */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-stone-900 mb-3">{tx('refCard', language)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <p className="text-xs text-stone-600"><span className="font-semibold text-stone-700">{tx('project', language)}:</span> {reqName}</p>
            <p className="text-xs text-stone-600"><span className="font-semibold text-stone-700">{tx('city', language)}:</span> {getCityName(request.location, language)}</p>
            <p className="text-xs text-stone-600"><span className="font-semibold text-stone-700">{tx('deadline', language)}:</span> {formatDay(request.deadline, language)}</p>
            {request.paymentTerms && (
              <p className="text-xs text-stone-600"><span className="font-semibold text-stone-700">{tx('buyerPaymentTerms', language)}:</span> {request.paymentTerms}</p>
            )}
            {request.locationCoords && (
              <p className="text-xs text-stone-600">
                📍 <a href={`https://www.openstreetmap.org/?mlat=${request.locationCoords.lat}&mlon=${request.locationCoords.lng}#map=15/${request.locationCoords.lat}/${request.locationCoords.lng}`} target="_blank" rel="noreferrer" className="underline">
                  {tx('viewOnMap', language)}
                </a>
              </p>
            )}
          </div>
          {reqMaterialLines.length > 0 && (
            <div className="bg-[var(--bg-soft)] rounded-lg p-3">
              <p className="text-xs font-semibold text-stone-500 mb-1">{tx('requestedMaterials', language)}</p>
              {reqMaterialLines.map((line, i) => <p key={i} className="text-xs text-stone-700 my-0.5">• {line}</p>)}
            </div>
          )}
        </div>

        {/* Q&A */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-stone-900 mb-1">{tx('qaTitle', language)}</h2>
          <p className="text-[11px] text-stone-400 mb-3">{tx('qaNote', language)}</p>
          {questions.length === 0 ? (
            <p className="text-xs text-stone-400 mb-3">{tx('qaNone', language)}</p>
          ) : (
            <div className="space-y-2 mb-3">
              {questions.map(q => (
                <div key={q.id} className="bg-[var(--bg-soft)] rounded-lg p-3">
                  <p className="text-xs text-stone-700"><span className="font-semibold text-stone-500">{q.supplierCompany}:</span> {q.question}</p>
                  {q.answer ? (
                    <p className="text-xs text-emerald-700 mt-1.5">💬 {q.answer}</p>
                  ) : (
                    <p className="text-[11px] text-amber-600 mt-1.5">⏳ {tx('qaWaiting', language)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAskQuestion(); } }}
              placeholder={tx('qaPlaceholder', language)} className={inputCls} />
            <button type="button" onClick={handleAskQuestion}
              className="shrink-0 text-xs font-bold px-4 rounded-xl bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white transition-colors">
              {tx('qaSend', language)}
            </button>
          </div>
        </div>

        {/* QUOTE META */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-stone-900 mb-4">{tx('quoteDetails', language)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{tx('clientName', language)}</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tx('location', language)}</label>
              <select value={location} onChange={e => setLocation(e.target.value)} className={inputCls}>
                <option value="">{tx('selectCity', language)}</option>
                {saudiCities.map(c => <option key={c} value={c}>{getCityName(c, language)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{tx('deliveryDays', language)}</label>
              <input type="number" min="0" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tx('paymentTerms', language)}</label>
              <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className={inputCls}>
                <option value="">{tx('selectOption', language)}</option>
                {PAYMENT_TERMS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                <option value={OTHER}>{tx('otherOption', language)}</option>
              </select>
              {paymentTerms === OTHER && (
                <input type="text" value={paymentTermsOther} onChange={e => setPaymentTermsOther(e.target.value)}
                  placeholder={tx('specify', language)} className={`${inputCls} mt-2`} />
              )}
            </div>
            <div>
              <label className={labelCls}>{tx('validUntil', language)}</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* LINE ITEMS */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-sm font-bold text-stone-900">{tx('lineItems', language)}</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-stone-600">{tx('currency', language)}</label>
              {/* Fixed to SAR for now: the contractor-side comparisons ("cheapest" badge,
                  lowest-price stats) compare raw numbers, so mixed currencies would mislead. */}
              <span className="text-xs font-semibold text-stone-700 bg-[var(--bg-soft)] border border-[var(--line)] rounded-lg px-3 py-1.5">
                {currencyLabel(currency, language)}
              </span>
            </div>
          </div>
          {/* One card per line item — a 15-column table forced horizontal scroll on every screen size */}
          <div className="flex flex-col gap-3">
            {lineItems.map((row, idx) => (
              <div key={row.id} className="border border-[var(--line)] rounded-xl bg-[var(--bg-soft2)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--brand-strong)]">{tx('lineItems', language)} #{idx + 1}</span>
                  <button type="button" onClick={() => removeRow(row.id)}
                    className="w-6 h-6 rounded-md bg-red-50 text-red-500 hover:bg-red-100 text-xs">✕</button>
                </div>
                {isTilesCategory(row.category) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('material', language)}</label>
                    <SelectOther value={row.type} other={row.typeOther}
                      onValue={v => updateRow(row.id, 'type', v)} onOther={v => updateRow(row.id, 'typeOther', v)}
                      options={MATERIAL_OPTIONS.types} lang={language} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('size', language)}</label>
                    <SelectOther value={row.size} other={row.sizeOther}
                      onValue={v => updateRow(row.id, 'size', v)} onOther={v => updateRow(row.id, 'sizeOther', v)}
                      options={MATERIAL_OPTIONS.sizes} lang={language} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('thickness', language)}</label>
                    <SelectOther value={row.thickness} other={row.thicknessOther}
                      onValue={v => updateRow(row.id, 'thickness', v)} onOther={v => updateRow(row.id, 'thicknessOther', v)}
                      options={MATERIAL_OPTIONS.thicknesses} lang={language} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('finish', language)}</label>
                    <SelectOther value={row.finish} other={row.finishOther}
                      onValue={v => updateRow(row.id, 'finish', v)} onOther={v => updateRow(row.id, 'finishOther', v)}
                      options={MATERIAL_OPTIONS.finishes} lang={language} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('color', language)}</label>
                    <SelectOther value={row.color} other={row.colorOther}
                      onValue={v => updateRow(row.id, 'color', v)} onOther={v => updateRow(row.id, 'colorOther', v)}
                      options={MATERIAL_OPTIONS.colors} lang={language} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('unit', language)}</label>
                    <SelectOther value={row.unit} other={row.unitOther}
                      onValue={v => updateRow(row.id, 'unit', v)} onOther={v => updateRow(row.id, 'unitOther', v)}
                      options={MATERIAL_OPTIONS.units} lang={language} />
                  </div>
                </div>
                ) : (
                  <div className="mb-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 italic">
                    {buildReferenceLabel(row, language)}
                    {row.quantity && <span> — {tx('qty', language)}: {row.quantity} {row.unit}</span>}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('qty', language)}</label>
                    <input type="number" min="0" inputMode="decimal" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                      className="w-full text-sm border border-[var(--line)] rounded-lg px-2 py-2 outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('unitPrice', language)}</label>
                    <input type="number" min="0" inputMode="decimal" value={row.unitPrice} onChange={e => updateRow(row.id, 'unitPrice', e.target.value)}
                      className="w-full text-sm border border-[var(--line)] rounded-lg px-2 py-2 outline-none bg-white" />
                    {row.targetPriceHint && (
                      <p className="text-[11px] text-stone-500 mt-0.5">{tx('targetHint', language)}: {row.targetPriceHint}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('itemDiscount', language)}</label>
                    <input type="number" min="0" inputMode="decimal" value={row.discount} onChange={e => updateRow(row.id, 'discount', e.target.value)}
                      className="w-full text-sm border border-[var(--line)] rounded-lg px-2 py-2 outline-none bg-white" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[var(--tint)] rounded-lg px-3 py-2 mb-2 text-xs">
                  <span className="text-stone-600">{tx('beforeTax', language)}: <b>{rowSubtotal(row).toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></span>
                  <span className="text-stone-500">{tx('taxCol', language)}: {rowTax(row).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className="font-bold text-[var(--brand-strong)]">{tx('lineTotal', language)}: {rowTotal(row).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">{tx('itemNote', language)}</label>
                <textarea value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)}
                  rows={2} className="w-full text-sm border border-[var(--line)] rounded-lg px-2 py-1.5 outline-none resize-none bg-white mb-2" />
                {renderRowImages(row)}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 mb-4">
            <button type="button" onClick={addRow}
              className="text-xs font-semibold px-4 py-2 bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white rounded-lg transition-colors">
              {tx('addItem', language)}
            </button>
          </div>

          {/* TOTALS SUMMARY */}
          <div className="bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-2 max-w-sm ms-auto">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-stone-600">{tx('overallDiscount', language)}</label>
              <input type="number" min="0" value={overallDiscount} onChange={e => setOverallDiscount(e.target.value)}
                className="w-28 text-xs border border-[var(--line)] rounded-lg px-2 py-1.5 bg-white outline-none text-end" />
            </div>
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>{tx('subtotalBeforeTax', language)}</span>
              <span className="font-semibold">{totals.subtotalBeforeTax.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(currency, language)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>{tx('totalTax', language)}</span>
              <span className="font-semibold">{totals.taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(currency, language)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-stone-900 pt-2 border-t border-[var(--line)]">
              <span>{tx('grandTotal', language)}</span>
              <span className="text-[var(--brand-strong)]">{totals.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(currency, language)}</span>
            </div>
          </div>
        </div>

        {/* ATTACHMENTS */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <label className={labelCls}>{tx('attachments', language)}</label>
          <label className="inline-block cursor-pointer text-xs font-semibold px-4 py-2.5 bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white rounded-xl transition-colors">
            {tx('uploadFiles', language)}
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileUpload} />
          </label>
          {attachments.length > 0 && (
            <div className="mt-3 border border-[var(--line)] rounded-xl overflow-hidden">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line-soft)] last:border-0">
                  <span className="text-xs text-stone-700">📎 {f.name}</span>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-red-500 hover:text-red-600 text-xs font-semibold">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NOTES */}
        <div className="bg-white border border-[var(--line)] rounded-2xl p-5">
          <label className={labelCls}>{tx('notes', language)}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder={tx('notesPh', language)} className={`${inputCls} resize-none`} />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          {!editQuoteId && (
            <button type="button" onClick={handleSaveDraft}
              className="px-6 py-3 bg-transparent text-[var(--sec)] border border-[var(--line)] rounded-xl font-bold text-sm hover:bg-[var(--bg-soft)] transition-colors">
              {tx('saveDraftBtn', language)}
            </button>
          )}
          {editQuoteId && (
            <button type="button" onClick={() => { if (validate()) handleSaveOnly(); }}
              className="px-6 py-3 bg-transparent text-[var(--sec)] border border-[var(--line)] rounded-xl font-bold text-sm hover:bg-[var(--bg-soft)] transition-colors">
              {tx('saveOnlyBtn', language)}
            </button>
          )}
          <button type="button" onClick={handlePrintPreview}
            className="px-6 py-3 bg-transparent text-stone-500 border border-[var(--line)] rounded-xl font-bold text-sm hover:bg-[var(--bg-soft)] transition-colors">
            🖨 {tx('printPreview', language)}
          </button>
          <button type="button" onClick={handleReview}
            className="px-6 py-3 bg-white text-[var(--brand-strong)] border-2 border-[var(--brand-strong)] rounded-xl font-bold text-sm hover:bg-[var(--bg-soft)] transition-colors">
            {tx('reviewBtn', language)}
          </button>
          <button type="button" onClick={() => { if (validate()) confirmAndSubmit(); }}
            className="flex-1 py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-xl font-bold text-sm transition-colors">
            {editQuoteId ? tx('updateBtn', language) : tx('submitBtn', language)}
          </button>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" dir={dir} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-stone-900">{tx('previewTitle', language)}</h2>
              <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500">✕</button>
            </div>

            <div className="bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl p-4 mb-4 grid grid-cols-2 gap-2 text-xs text-stone-700">
              <p><strong>{tx('quoteNumber', language)}:</strong> {quoteNumber}</p>
              <p><strong>{tx('clientName', language)}:</strong> {clientName}</p>
              <p><strong>{tx('location', language)}:</strong> {getCityName(location, language)}</p>
              <p><strong>{tx('deliveryDays', language)}:</strong> {deliveryDays}</p>
              <p><strong>{tx('paymentTerms', language)}:</strong> {paymentTerms === OTHER ? paymentTermsOther : paymentTerms || tx('noValue', language)}</p>
              <p><strong>{tx('validUntil', language)}:</strong> {formatDay(validUntil, language)}</p>
            </div>

            <div className="overflow-x-auto border border-[var(--line)] rounded-xl mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>{tx('material', language)}</th>
                    <th className={th}>{tx('size', language)}</th>
                    <th className={th}>{tx('thickness', language)}</th>
                    <th className={th}>{tx('finish', language)}</th>
                    <th className={th}>{tx('color', language)}</th>
                    <th className={th}>{tx('qty', language)}</th>
                    <th className={th}>{tx('unit', language)}</th>
                    <th className={th}>{tx('unitPrice', language)}</th>
                    <th className={th}>{tx('itemDiscount', language)}</th>
                    <th className={th}>{tx('beforeTax', language)}</th>
                    <th className={th}>{tx('taxCol', language)}</th>
                    <th className={th}>{tx('lineTotal', language)}</th>
                    <th className={th}>{tx('itemNote', language)}</th>
                    <th className={th}>{tx('image', language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.filter(isValidLineItem).map((li, i) => (
                    <tr key={li.id}>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)] font-bold text-[var(--brand-strong)]">{i + 1}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{displayVal(resolveOther(li.type, li.typeOther), language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{resolveOther(li.size, li.sizeOther) || tx('noValue', language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{resolveOther(li.thickness, li.thicknessOther) || tx('noValue', language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{displayVal(resolveOther(li.finish, li.finishOther), language) || tx('noValue', language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{displayVal(resolveOther(li.color, li.colorOther), language) || tx('noValue', language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{li.quantity || tx('noValue', language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{displayVal(resolveOther(li.unit, li.unitOther), language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{li.unitPrice} {currencyLabel(currency, language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{Number(li.discount) || 0}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{rowSubtotal(li).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">{rowTax(li).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)] font-bold">{rowTotal(li).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)] max-w-[140px]">{li.description || tx('noValue', language)}</td>
                      <td className="px-3 py-2 text-center border-b border-[var(--line-soft)]">
                        {li.images.length > 0 ? (
                          <div className="flex gap-1 justify-center">
                            {li.images.map((img, imgI) => (
                              <img key={imgI} src={img} alt="" onClick={() => { setLightboxImg(img); setZoomLevel(1); }}
                                className="w-8 h-8 object-cover rounded border border-[var(--line)] cursor-zoom-in" />
                            ))}
                          </div>
                        ) : tx('noValue', language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-2 max-w-sm ms-auto mb-4">
              {Number(overallDiscount) > 0 && (
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>{tx('overallDiscount', language)}</span>
                  <span className="font-semibold">{Number(overallDiscount).toLocaleString()} {currencyLabel(currency, language)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>{tx('subtotalBeforeTax', language)}</span>
                <span className="font-semibold">{totals.subtotalBeforeTax.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(currency, language)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>{tx('totalTax', language)}</span>
                <span className="font-semibold">{totals.taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(currency, language)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-stone-900 pt-2 border-t border-[var(--line)]">
                <span>{tx('grandTotal', language)}</span>
                <span className="text-[var(--brand-strong)]">{totals.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(currency, language)}</span>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="mb-4 bg-[var(--bg-soft)] rounded-lg p-3">
                <p className="text-xs font-bold text-stone-700 mb-1">{tx('attachments', language)}:</p>
                {attachments.map((f, i) => <p key={i} className="text-xs text-stone-600">📎 {f.name}</p>)}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={confirmAndSubmit}
                className="flex-[2] py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-xl font-bold text-sm transition-colors">
                {tx('confirm', language)}
              </button>
              <button onClick={handlePrintPreview}
                className="flex-1 py-3 bg-white text-stone-500 border border-[var(--line)] rounded-xl font-bold text-sm hover:bg-[var(--bg-soft)] transition-colors">
                🖨 {tx('printPreview', language)}
              </button>
              <button onClick={() => setShowPreview(false)}
                className="flex-1 py-3 bg-white text-[var(--sec)] border-2 border-[var(--sec)] rounded-xl font-bold text-sm transition-colors">
                {tx('editBack', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX */}
      {lightboxImg && (
        <div onClick={() => { setLightboxImg(null); setZoomLevel(1); }}
          onWheel={e => { e.preventDefault(); setZoomLevel(prev => Math.min(Math.max(e.deltaY < 0 ? prev + 0.1 : prev - 0.1, 0.5), 4)); }}
          className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center">
          <div onClick={e => e.stopPropagation()} className="flex flex-col items-center gap-4">
            <div className="overflow-hidden flex items-center justify-center" style={{ maxWidth: '90vw', maxHeight: '75vh' }}>
              <img src={lightboxImg} alt="" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center', transition: 'transform 0.15s ease', maxWidth: '85vw', maxHeight: '72vh' }}
                className="object-contain rounded-md block" />
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={e => { e.stopPropagation(); setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); }}
                className="w-9 h-9 bg-stone-700 text-white rounded-full text-lg font-bold flex items-center justify-center">−</button>
              <span className="text-white text-xs min-w-[50px] text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={e => { e.stopPropagation(); setZoomLevel(prev => Math.min(prev + 0.2, 4)); }}
                className="w-9 h-9 bg-stone-700 text-white rounded-full text-lg font-bold flex items-center justify-center">+</button>
              <button onClick={e => { e.stopPropagation(); setZoomLevel(1); }}
                className="px-3 py-1.5 bg-stone-600 text-white rounded-lg text-xs">{tx('zoomReset', language)}</button>
              <a href={lightboxImg} download="buildpro-image.jpg" onClick={e => e.stopPropagation()}
                className="px-3.5 py-1.5 bg-[var(--sec)] text-white rounded-lg text-xs font-bold no-underline">{tx('download', language)}</a>
              <button onClick={e => { e.stopPropagation(); setLightboxImg(null); setZoomLevel(1); }}
                className="px-3.5 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold">{tx('close', language)}</button>
            </div>
            <p className="text-stone-500 text-xs">{tx('zoomHint', language)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
