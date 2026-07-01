'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saudiCities, getCityName } from '@/app/lib/translations';
import Navbar from '../components/Navbar';
import { appendActivityLog } from '../lib/requestHelpers';
import { useToast } from '../components/Toast';

interface MaterialRow {
  id: number;
  type: string; typePending: string;
  usage: string; usagePending: string;
  size: string; sizePending: string;
  thickness: string; thicknessPending: string;
  finish: string; finishPending: string;
  color: string; colorPending: string;
  quantity: string;
  unit: string;
  targetPrice: string;
  currency: string;
  deliveryDate: string;
  origin: string; originPending: string;
  images: string[];
  note: string;
}

interface AttachedFile {
  name: string;
  type: string;
  data: string;
}

const defaultRow = (): MaterialRow => ({
  id: Date.now() + Math.random(),
  type: '', typePending: '',
  usage: '', usagePending: '',
  size: '', sizePending: '',
  thickness: '', thicknessPending: '',
  finish: '', finishPending: '',
  color: '', colorPending: '',
  quantity: '', unit: 'م²',
  targetPrice: '', currency: 'ر.س',
  deliveryDate: '',
  origin: '', originPending: '',
  images: [], note: '',
});

const STORAGE_KEY = 'createRequestDraft';

const arToEn: Record<string, string> = {
  'سيراميك': 'Ceramic', 'بورسلان': 'Porcelain', 'رخام': 'Marble',
  'جرانيت': 'Granite', 'تيرازو': 'Terrazzo', 'حجر طبيعي': 'Natural Stone',
  'أرضيات': 'Flooring', 'جدران': 'Walls', 'وزر': 'Skirting',
  'درج': 'Stairs', 'مغاسل': 'Sinks', 'واجهات': 'Facades', 'أسطح': 'Surfaces',
  'بوليش': 'Polished', 'مات': 'Matte', 'ساتان': 'Satin',
  'بوشهامر': 'Bush-hammered', 'لابراتو': 'Labradorite', 'أنتيك': 'Antique',
  'أبيض': 'White', 'كريمي': 'Cream', 'رمادي فاتح': 'Light Gray',
  'رمادي غامق': 'Dark Gray', 'أسود': 'Black', 'بيج': 'Beige',
  'بني': 'Brown', 'خشبي': 'Wood', 'أزرق': 'Blue', 'أخضر': 'Green',
  'وطني': 'Local', 'صيني': 'Chinese', 'أوروبي': 'European',
  'إيطالي': 'Italian', 'إسباني': 'Spanish', 'تركي': 'Turkish',
  'عماني': 'Omani', 'إماراتي': 'Emirati', 'مصري': 'Egyptian', 'هندي': 'Indian',
  'م²': 'm²', 'م طولي': 'Linear m', 'قطعة': 'Piece', 'حبة': 'Unit',
};

const isRowValid = (m: MaterialRow) =>
  !!(m.type?.trim() || m.typePending?.trim() || m.usage?.trim() || m.size?.trim() || m.quantity?.trim() || m.finish?.trim() || m.color?.trim());

export default function CreateRequest() {
  const showToast = useToast();
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [materials, setMaterials] = useState<MaterialRow[]>([defaultRow()]);
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editRequestId, setEditRequestId] = useState<number | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pageTitle, setPageTitle] = useState('إنشاء طلب جديد');
const [isDraftEdit, setIsDraftEdit] = useState(false);
  const [existingQuotesCount, setExistingQuotesCount] = useState(0);
  const skipSaveRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType === 'supplier') { router.push('/supplier-requests'); return; }
    setUser(parsedUser);

    const allSuppliers = Object.keys(localStorage)
      .filter(key => key.startsWith('user_'))
      .map(key => JSON.parse(localStorage.getItem(key) || '{}'))
      .filter(u => u.userType === 'supplier');
    const usersArr = JSON.parse(localStorage.getItem('users') || '[]').filter((u: any) => u.userType === 'supplier');
    const combined = [...allSuppliers, ...usersArr].filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
    setSuppliers(combined);

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    const draftId = params.get('draft');

    if (editId) {
      skipSaveRef.current = true;
      const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
      const req = allRequests.find((r: any) => r.id === parseInt(editId));
      if (req) {
        setEditMode(true);
        setEditRequestId(req.id);
        setPageTitle(savedLang === 'en' ? 'Edit Request' : 'تعديل الطلب');
        if (req.materials && req.materials.length > 0) {
          setMaterials(req.materials.map((m: any) => ({
            ...m,
            id: Date.now() + Math.random(),
            images: m.images ? [...m.images] : [],
          })));
        }
        if (req.projectName) setProjectName(req.projectName);
        if (req.location) setLocation(req.location);
        if (req.deadline) setDeadline(req.deadline);
        if (req.description) setDescription(req.description);
        if (req.selectedSuppliers) setSelectedSuppliers(req.selectedSuppliers);
        if (req.attachedFiles) setAttachedFiles(req.attachedFiles);

        const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
        setExistingQuotesCount(allQuotes.filter((q: any) => q.requestId === req.id).length);
      }
    } else if (draftId) {
      skipSaveRef.current = true;
      setEditMode(true);
      setIsDraftEdit(true);
      setPageTitle(savedLang === 'en' ? 'Edit Draft' : 'تعديل المسودة');
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.projectName) setProjectName(parsed.projectName);
        if (parsed.materials) setMaterials(parsed.materials);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.deadline) setDeadline(parsed.deadline);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.selectedSuppliers) setSelectedSuppliers(parsed.selectedSuppliers);
        if (parsed.attachedFiles) setAttachedFiles(parsed.attachedFiles);
      }
      localStorage.removeItem('loadingFromDraft');
    } else {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.projectName) setProjectName(parsed.projectName);
        if (parsed.materials) setMaterials(parsed.materials);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.deadline) setDeadline(parsed.deadline);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.selectedSuppliers) setSelectedSuppliers(parsed.selectedSuppliers);
        if (parsed.attachedFiles) setAttachedFiles(parsed.attachedFiles);
      }
    }

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      setLanguage(prev => prev !== newLang ? newLang : prev);
    }, 100);

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (skipSaveRef.current) return;
    try {
      const lightMaterials = materials.map(m => ({ ...m, images: [] }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        projectName, materials: lightMaterials, location, deadline, description, selectedSuppliers, attachedFiles: []
      }));
    } catch (e) { /* ignore */ }
  }, [projectName, materials, location, deadline, description, selectedSuppliers, attachedFiles]);

  const display = (value: string): string => {
    if (!value) return value;
    if (language === 'ar') return value;
    const currencyMap: Record<string, string> = { 'ر.س': 'SAR', 'د.إ': 'AED' };
    if (currencyMap[value]) return currencyMap[value];
    return value.split(' أو ').map(p => arToEn[p.trim()] || p.trim()).join(' OR ');
  };

  const displayCurrency = (currency: string): string => {
    if (language === 'ar') return currency;
    if (currency === 'ر.س') return 'SAR';
    if (currency === 'د.إ') return 'AED';
    return currency;
  };

  const updateRow = (id: number, field: keyof MaterialRow, value: any) => {
    setMaterials(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addOr = (id: number, valueField: keyof MaterialRow, pendingField: keyof MaterialRow) => {
    setMaterials(prev => prev.map(row => {
      if (row.id !== id) return row;
      const pending = row[pendingField] as string;
      if (!pending) return row;
      const current = row[valueField] as string;
      const newValue = current ? current + ' أو ' + pending : pending;
      return { ...row, [valueField]: newValue, [pendingField]: '' };
    }));
  };

  const removeToken = (id: number, field: keyof MaterialRow, token: string) => {
    setMaterials(prev => prev.map(row => {
      if (row.id !== id) return row;
      const current = row[field] as string;
      const parts = current.split(' أو ').map(p => p.trim()).filter(p => p !== token);
      return { ...row, [field]: parts.join(' أو ') };
    }));
  };

  const handleImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const row = materials.find(r => r.id === id);
    if (!row) return;
    const remaining = 2 - row.images.length;
    const filesToProcess = files.slice(0, remaining);
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setMaterials(prev => prev.map(r => {
          if (r.id !== id) return r;
          if (r.images.length >= 2) return r;
          return { ...r, images: [...r.images, result] };
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (id: number, index: number) => {
    setMaterials(prev => prev.map(r => r.id !== id ? r : { ...r, images: r.images.filter((_, i) => i !== index) }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setAttachedFiles(prev => [...prev, { name: file.name, type: file.type, data: reader.result as string }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  const addRow = () => setMaterials(prev => [...prev, defaultRow()]);
  const removeRow = (id: number) => { if (materials.length > 1) setMaterials(prev => prev.filter(row => row.id !== id)); };

  const handleSupplierToggle = (email: string) => {
    setSelectedSuppliers(prev => prev.includes(email) ? prev.filter(s => s !== email) : [...prev, email]);
  };
  const handleSelectAll = () => {
    if (selectedSuppliers.length === suppliers.length) setSelectedSuppliers([]);
    else setSelectedSuppliers(suppliers.map(s => s.email));
  };

  const validate = (): boolean => {
    setMaterials(prev => prev.map(row => ({
      ...row,
      type: row.type || row.typePending,
      usage: row.usage || row.usagePending,
      size: row.size || row.sizePending,
      thickness: row.thickness || row.thicknessPending,
      finish: row.finish || row.finishPending,
      color: row.color || row.colorPending,
      origin: row.origin || row.originPending,
    })));
    const valid = materials.filter(isRowValid);
    if (selectedSuppliers.length === 0) {
      showToast(language === 'ar' ? 'الرجاء اختيار مورد واحد على الأقل' : 'Please select at least one supplier', 'error');
      return false;
    }
    if (valid.length === 0) {
      showToast(language === 'ar' ? 'الرجاء إضافة بيانات في مادة واحدة على الأقل' : 'Please fill at least one material row', 'error');
      return false;
    }
    if (!location) {
      showToast(language === 'ar' ? 'الرجاء اختيار المدينة' : 'Please select a city', 'error');
      return false;
    }
    return true;
  };

  const buildRequest = () => {
    const valid = materials.filter(isRowValid);
    return {
      id: Date.now(),
      contractorId: user?.email,
      materials: valid.map(m => ({
        type: m.type || m.typePending,
        usage: m.usage || m.usagePending,
        size: m.size || m.sizePending,
        thickness: m.thickness || m.thicknessPending,
        finish: m.finish || m.finishPending,
        color: m.color || m.colorPending,
        quantity: m.quantity,
        unit: m.unit,
        targetPrice: m.targetPrice,
        currency: m.currency,
        deliveryDate: m.deliveryDate,
        origin: m.origin || m.originPending,
        images: m.images,
        note: m.note,
      })),
      attachedFiles,
      ceramic: valid.filter(m => (m.type || m.typePending).includes('سيراميك')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      porcelain: valid.filter(m => (m.type || m.typePending).includes('بورسلان')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      marble: valid.filter(m => (m.type || m.typePending).includes('رخام')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      granite: valid.filter(m => (m.type || m.typePending).includes('جرانيت')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      terrazzo: valid.filter(m => (m.type || m.typePending).includes('تيرازو')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      projectName, location, deadline, description, selectedSuppliers,
      status: 'open', createdAt: new Date().toISOString()
    };
  };

  const saveRequest = (req: any): boolean => {
    try {
      const requests = JSON.parse(localStorage.getItem('requests') || '[]');
      requests.push(req);
      localStorage.setItem('requests', JSON.stringify(requests));
      localStorage.removeItem(STORAGE_KEY);
      const draftId = localStorage.getItem('currentDraftId');
      if (draftId) {
        const allDrafts = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
        const updated = allDrafts.filter((d: any) => d.id !== parseInt(draftId));
        localStorage.setItem('requestDrafts', JSON.stringify(updated));
        localStorage.removeItem('currentDraftId');
      }
      return true;
    } catch {
      showToast(language === 'ar' ? 'حجم الملفات كبير جداً' : 'Files too large', 'error');
      return false;
    }
  };

  const handleDirectSend = () => {
    if (!validate()) return;
    if (editMode && editRequestId) {
      const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
      const updated = allRequests.map((r: any) => r.id === editRequestId ? { ...buildRequest(), id: editRequestId, createdAt: r.createdAt } : r);
      localStorage.setItem('requests', JSON.stringify(updated));
      appendActivityLog(editRequestId, 'تم تعديل الطلب', 'Request edited');
      showToast(language === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Changes saved successfully!');
      router.push('/my-requests');
    } else {
      const newReq = buildRequest();
      if (saveRequest(newReq)) {
        appendActivityLog(newReq.id, 'تم إنشاء الطلب', 'Request created');
        showToast(language === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Request sent successfully!');
        router.push('/my-requests');
      }
    }
  };

  const handleReview = () => { if (validate()) setShowPreview(true); };

  const handleConfirmSubmit = () => {
    if (editMode && editRequestId) {
      const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
      const updated = allRequests.map((r: any) => r.id === editRequestId ? { ...buildRequest(), id: editRequestId, createdAt: r.createdAt } : r);
      localStorage.setItem('requests', JSON.stringify(updated));
      appendActivityLog(editRequestId, 'تم تعديل الطلب', 'Request edited');
      showToast(language === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Changes saved successfully!');
      router.push('/my-requests');
    } else {
      const newReq = buildRequest();
      if (saveRequest(newReq)) {
        appendActivityLog(newReq.id, 'تم إنشاء الطلب', 'Request created');
        showToast(language === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Request sent successfully!');
        router.push('/my-requests');
      }
    }
  };

  const handlePrint = () => {
    const printArea = document.querySelector('.print-area');
    if (!printArea) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>BuildPro - طلب تسعير</title>
      <style>
        body { font-family: Arial, sans-serif; direction: ${language === 'ar' ? 'rtl' : 'ltr'}; padding: 20px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
        th { background-color: #f1f3f5; padding: 8px 6px; border: 1px solid #ccc; font-weight: bold; text-align: center; }
        td { padding: 7px 6px; border: 1px solid #ccc; text-align: center; }
        h2 { color: #333; margin-bottom: 15px; }
        ul { font-size: 13px; }
        img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
        .no-print { display: none; }
        @page { margin: 1cm; size: A4 landscape; }
      </style></head>
      <body>${printArea.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleSaveDraft = () => {
    const currentDraftId = localStorage.getItem('currentDraftId');
    const draftData = {
      id: currentDraftId ? parseInt(currentDraftId) : Date.now(),
      contractorId: user?.email,
      projectName, materials, location, deadline, description,
      selectedSuppliers, attachedFiles,
      savedAt: new Date().toISOString(),
    };
    try {
      const allDrafts = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
      const exists = allDrafts.find((d: any) => d.id === draftData.id);
      const updated = exists
        ? allDrafts.map((d: any) => d.id === draftData.id ? draftData : d)
        : [...allDrafts, draftData];
      localStorage.setItem('requestDrafts', JSON.stringify(updated));
      localStorage.removeItem(STORAGE_KEY);
      showToast(language === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Changes saved successfully!');
      router.push('/drafts');
    } catch {
      showToast(language === 'ar' ? 'حجم الملفات كبير جداً' : 'Files too large', 'error');
    }
  };

  const OPTIONS = {
    types: ['سيراميك', 'بورسلان', 'رخام', 'جرانيت', 'تيرازو', 'حجر طبيعي'],
    usages: ['أرضيات', 'جدران', 'وزر', 'درج', 'مغاسل', 'واجهات', 'أسطح'],
    sizes: ['30×30', '40×40', '60×60', '60×120', '80×80', '80×160', '100×100', '120×120', '120×240', '20×60', '25×75', '30×60'],
    thicknesses: ['6mm', '8mm', '10mm', '12mm', '15mm', '18mm', '20mm'],
    finishes: ['بوليش', 'مات', 'ساتان', 'بوشهامر', 'لابراتو', 'أنتيك'],
    colors: ['أبيض', 'كريمي', 'رمادي فاتح', 'رمادي غامق', 'أسود', 'بيج', 'بني', 'خشبي', 'أزرق', 'أخضر'],
    units: ['م²', 'م طولي', 'قطعة', 'حبة'],
    origins: ['وطني', 'صيني', 'أوروبي', 'إيطالي', 'إسباني', 'تركي', 'عماني', 'إماراتي', 'مصري', 'هندي'],
  };

  const tx = language === 'ar' ? {
    hint: 'اختر من القائمة واضغط "+ أو" لإضافة خيار آخر',
    projectNameLabel: 'اسم المشروع', projectNamePlaceholder: 'مثال: فيلا الرياض - الدور الأول',
    materials: 'المواد المطلوبة', material: 'نوع المادة', usage: 'الاستخدام',
    size: 'المقاس', thickness: 'السماكة', finish: 'الفنش', color: 'اللون',
    qty: 'الكمية', unit: 'الوحدة', targetPrice: 'السعر المستهدف',
    deliveryDate: 'تاريخ التوريد', origin: 'الصناعة', image: 'صور', rowNote: 'وصف البند',
    addMaterial: '+ إضافة مادة', city: 'المدينة', selectCity: 'اختر مدينة...',
    deadline: 'الموعد النهائي لتقديم عروض الأسعار',
    attachments: 'مرفقات (مواصفات، جداول كميات...)',
    attachHint: 'يمكنك رفع ملفات PDF أو Word أو Excel أو ملفات مضغوطة',
    uploadFiles: 'رفع ملفات', uploadImage: '+ صورة',
    notes: 'ملاحظات عامة (اختياري)', notesPlaceholder: 'أضف ملاحظات أو تفاصيل إضافية...',
    suppliers: 'اختر الموردين', noSuppliers: 'لا يوجد موردين مسجلين بعد',
    selectAll: 'اختيار الكل', deselectAll: 'إلغاء الكل',
    reviewBtn: 'مراجعة الطلب', sendBtn: editRequestId ? 'حفظ التعديلات' : 'إرسال الطلب', draftBtn: 'حفظ مسودة',
    select: 'اختر...', optional: 'اختياري', orBtn: '+ أو',
    previewTitle: 'مراجعة الطلب قبل الإرسال', submittedBy: 'مقدم الطلب', dateTime: 'تاريخ ووقت المراجعة',
    confirm: 'تأكيد وإرسال الطلب', print: 'طباعة', back: 'رجوع للتعديل', noValue: '—',
    attachedFilesLabel: 'الملفات المرفقة', selectedSuppliersLabel: 'الموردين المختارين',
    maxImages: 'وصلت للحد الأقصى (صورتين)',
    zoomReset: 'إعادة ضبط', download: 'تحميل', close: 'إغلاق',
    zoomHint: 'استخدم عجلة الموس للتكبير والتصغير',
  } : {
    hint: 'Select from the list and press "+ OR" to add another option',
    projectNameLabel: 'Project Name', projectNamePlaceholder: 'e.g. Riyadh Villa - Ground Floor',
    materials: 'Required Materials', material: 'Material', usage: 'Usage',
    size: 'Size', thickness: 'Thickness', finish: 'Finish', color: 'Color',
    qty: 'Qty', unit: 'Unit', targetPrice: 'Target Price',
    deliveryDate: 'Delivery Date', origin: 'Origin', image: 'Images', rowNote: 'Item Note',
    addMaterial: '+ Add Material', city: 'City', selectCity: 'Select a city...',
    deadline: 'Quote Submission Deadline',
    attachments: 'Attachments (Specs, BOQ...)',
    attachHint: 'You can upload PDF, Word, Excel, or compressed files',
    uploadFiles: 'Upload Files', uploadImage: '+ Image',
    notes: 'General Notes (Optional)', notesPlaceholder: 'Add notes or extra details...',
    suppliers: 'Select Suppliers', noSuppliers: 'No suppliers registered yet',
    selectAll: 'Select All', deselectAll: 'Deselect All',
    reviewBtn: 'Review Request', sendBtn: editRequestId ? 'Save Changes' : 'Send Request', draftBtn: 'Save Draft',
    select: 'Select...', optional: 'Optional', orBtn: '+ OR',
    previewTitle: 'Review Request Before Sending', submittedBy: 'Submitted By', dateTime: 'Review Date & Time',
    confirm: 'Confirm & Send Request', print: 'Print', back: 'Back to Edit', noValue: '—',
    attachedFilesLabel: 'Attached Files', selectedSuppliersLabel: 'Selected Suppliers',
    maxImages: 'Max 2 images reached',
    zoomReset: 'Reset', download: 'Download', close: 'Close',
    zoomHint: 'Use mouse wheel to zoom in/out',
  };

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#1C1917', fontSize: '15px' };
  const thStyle: React.CSSProperties = { padding: '10px 6px', backgroundColor: '#FAF7F2', borderBottom: '2px solid #dee2e6', color: '#333', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', textAlign: 'center' };
  const tdStyle: React.CSSProperties = { padding: '6px 4px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top', minWidth: '130px' };
  const selectStyle: React.CSSProperties = { padding: '5px 4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', color: '#333', backgroundColor: '#fff', flex: 1 };
  const orBtnStyle: React.CSSProperties = { padding: '5px 8px', backgroundColor: '#8A7B6C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' };
  const inputStyle: React.CSSProperties = { padding: '5px 6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', color: '#333', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' };
  const fieldStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', color: '#333', backgroundColor: '#fff', boxSizing: 'border-box' };
  const pvTh: React.CSSProperties = { padding: '8px 6px', backgroundColor: '#FAF7F2', borderBottom: '2px solid #dee2e6', color: '#333', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', textAlign: 'center' };
  const pvTd: React.CSSProperties = { padding: '8px 6px', borderBottom: '1px solid #f0f0f0', color: '#333', fontSize: '13px', textAlign: 'center' };

  const TokenDisplay = ({ id, field, value }: { id: number, field: keyof MaterialRow, value: string }) => {
    const tokens = value.split(' أو ').map(t => t.trim()).filter(Boolean);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
        {tokens.map((token, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#F3EAE0', border: '1px solid #C0603E', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#2B2420' }}>
            {display(token)}
            <button type="button" onClick={() => removeToken(id, field, token)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontWeight: 'bold', fontSize: '13px', padding: '0', lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
    );
  };

  const OrField = ({ row, valueField, pendingField, options }: { row: MaterialRow, valueField: keyof MaterialRow, pendingField: keyof MaterialRow, options: string[] }) => (
    <div>
      {(row[valueField] as string) && <TokenDisplay id={row.id} field={valueField} value={row[valueField] as string} />}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <select value={row[pendingField] as string} onChange={e => updateRow(row.id, pendingField, e.target.value)} style={selectStyle}>
          <option value="">{tx.select}</option>
          {options.map(o => <option key={o} value={o}>{display(o)}</option>)}
        </select>
        <button type="button" onClick={() => addOr(row.id, valueField, pendingField)} style={orBtnStyle}>{tx.orBtn}</button>
      </div>
    </div>
  );

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  const validMaterials = materials.filter(isRowValid);
  const now = new Date();
  const dateStr = now.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
  const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bp-page" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: '#1C1917', marginBottom: '10px' }}>{pageTitle}</h1>
        <p style={{ color: '#78716C', fontSize: '13px', marginBottom: '20px' }}>{tx.hint}</p>

        {editMode && !isDraftEdit && existingQuotesCount > 0 && (
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#92400E', fontSize: '13px' }}>
            {language === 'ar'
              ? `⚠ هذا الطلب عليه بالفعل ${existingQuotesCount} عرض سعر — تعديل المواد أو الكميات لن يغيّر الأسعار المقدَّمة بالفعل`
              : `⚠ This request already has ${existingQuotesCount} quote(s) — editing materials or quantities won't change prices already submitted`}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>{tx.projectNameLabel}</label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder={tx.projectNamePlaceholder}
            style={{ ...fieldStyle, border: '2px solid #8A7B6C', borderRadius: '8px', fontSize: '15px' }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1C1917', marginBottom: '15px' }}>{tx.materials}</h3>
          <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>{tx.material}</th>
                  <th style={thStyle}>{tx.usage}</th>
                  <th style={thStyle}>{tx.size}</th>
                  <th style={thStyle}>{tx.thickness}</th>
                  <th style={thStyle}>{tx.finish}</th>
                  <th style={thStyle}>{tx.color}</th>
                  <th style={{ ...thStyle, minWidth: '80px' }}>{tx.qty}</th>
                  <th style={{ ...thStyle, minWidth: '80px' }}>{tx.unit}</th>
                  <th style={{ ...thStyle, minWidth: '150px' }}>{tx.targetPrice}</th>
                  <th style={{ ...thStyle, minWidth: '130px' }}>{tx.deliveryDate}</th>
                  <th style={thStyle}>{tx.origin}</th>
                  <th style={{ ...thStyle, minWidth: '150px' }}>{tx.rowNote}</th>
                  <th style={{ ...thStyle, minWidth: '110px' }}>{tx.image}</th>
                  <th style={{ ...thStyle, minWidth: '40px' }}>✕</th>
                </tr>
              </thead>
              <tbody>
                {materials.map(row => (
                  <tr key={row.id}>
                    <td style={tdStyle}><OrField row={row} valueField="type" pendingField="typePending" options={OPTIONS.types} /></td>
                    <td style={tdStyle}><OrField row={row} valueField="usage" pendingField="usagePending" options={OPTIONS.usages} /></td>
                    <td style={tdStyle}><OrField row={row} valueField="size" pendingField="sizePending" options={OPTIONS.sizes} /></td>
                    <td style={tdStyle}><OrField row={row} valueField="thickness" pendingField="thicknessPending" options={OPTIONS.thicknesses} /></td>
                    <td style={tdStyle}><OrField row={row} valueField="finish" pendingField="finishPending" options={OPTIONS.finishes} /></td>
                    <td style={tdStyle}><OrField row={row} valueField="color" pendingField="colorPending" options={OPTIONS.colors} /></td>
                    <td style={{ ...tdStyle, minWidth: '80px' }}>
                      <input type="number" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', e.target.value)} placeholder="0" min="0" style={inputStyle} />
                    </td>
                    <td style={{ ...tdStyle, minWidth: '80px' }}>
                      <select value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)} style={{ ...inputStyle, padding: '5px 4px' }}>
                        {OPTIONS.units.map(u => <option key={u} value={u}>{display(u)}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, minWidth: '150px' }}>
                      <div style={{ display: 'flex', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                        <input type="number" value={row.targetPrice} onChange={e => updateRow(row.id, 'targetPrice', e.target.value)}
                          placeholder={tx.optional} min="0"
                          style={{ flex: 1, padding: '5px 6px', border: 'none', fontSize: '13px', color: '#333', backgroundColor: '#fff', outline: 'none', minWidth: '60px' }} />
                        <select value={row.currency} onChange={e => updateRow(row.id, 'currency', e.target.value)}
                          style={{ padding: '5px 3px', border: 'none', borderLeft: '1px solid #eee', fontSize: '11px', color: '#333', backgroundColor: '#FAF7F2', cursor: 'pointer', outline: 'none' }}>
                          <option value="ر.س">{language === 'ar' ? 'ر.س' : 'SAR'}</option>
                          <option value="$">$</option>
                          <option value="€">€</option>
                          <option value="د.إ">{language === 'ar' ? 'د.إ' : 'AED'}</option>
                          <option value="£">£</option>
                        </select>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, minWidth: '130px' }}>
                      <input type="date" value={row.deliveryDate} onChange={e => updateRow(row.id, 'deliveryDate', e.target.value)} style={inputStyle} />
                    </td>
                    <td style={tdStyle}><OrField row={row} valueField="origin" pendingField="originPending" options={OPTIONS.origins} /></td>
                    <td style={{ ...tdStyle, minWidth: '150px' }}>
                      <textarea value={row.note} onChange={e => updateRow(row.id, 'note', e.target.value)}
                        placeholder={language === 'ar' ? 'وصف إضافي...' : 'Extra description...'}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                    </td>
                    <td style={{ ...tdStyle, minWidth: '110px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {row.images.map((img, i) => (
                          <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                            <img src={img} alt="" onClick={() => { setLightboxImg(img); setZoomLevel(1); }}
                              style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc', cursor: 'zoom-in' }} />
                            <button type="button" onClick={() => removeImage(row.id, i)}
                              style={{ position: 'absolute', top: '-5px', right: '-5px', width: '16px', height: '16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                      {row.images.length < 2 ? (
                        <label style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#8A7B6C', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                          {tx.uploadImage}
                          <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => handleImageUpload(row.id, e)} />
                        </label>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#856404', backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '4px' }}>{tx.maxImages}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', minWidth: '40px' }}>
                      <button type="button" onClick={() => removeRow(row.id)}
                        style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addRow}
            style={{ marginTop: '12px', padding: '10px 20px', backgroundColor: '#8A7B6C', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            {tx.addMaterial}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>{tx.city}</label>
            <select value={location} onChange={e => setLocation(e.target.value)} style={fieldStyle}>
              <option value="">{tx.selectCity}</option>
              {saudiCities.map(city => (
                <option key={city} value={city}>{language === 'ar' ? city : getCityName(city, 'en')}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{tx.deadline}</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>{tx.attachments}</label>
          <p style={{ color: '#78716C', fontSize: '12px', margin: '0 0 8px 0' }}>{tx.attachHint}</p>
          <label style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#8A7B6C', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            {tx.uploadFiles}
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          {attachedFiles.length > 0 && (
            <div style={{ marginTop: '12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff', overflow: 'hidden' }}>
              {attachedFiles.map((file, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: index < attachedFiles.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <span style={{ color: '#333', fontSize: '13px' }}>{file.name}</span>
                  <button type="button" onClick={() => removeFile(index)}
                    style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={labelStyle}>{tx.notes}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder={tx.notesPlaceholder}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', color: '#333', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' }} />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontWeight: 'bold', color: '#1C1917', fontSize: '16px' }}>{tx.suppliers}</label>
            {suppliers.length > 0 && (
              <button type="button" onClick={handleSelectAll}
                style={{ padding: '6px 12px', backgroundColor: '#8A7B6C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                {selectedSuppliers.length === suppliers.length ? tx.deselectAll : tx.selectAll}
              </button>
            )}
          </div>
          {suppliers.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#FAF7F2', borderRadius: '4px', color: '#666', textAlign: 'center' }}>{tx.noSuppliers}</div>
          ) : (
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', maxHeight: '250px', overflowY: 'auto', backgroundColor: '#fff' }}>
              {suppliers.map((supplier, index) => (
                <div key={supplier.email} onClick={() => handleSupplierToggle(supplier.email)}
                  style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', borderBottom: index < suppliers.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer', backgroundColor: selectedSuppliers.includes(supplier.email) ? '#e7f3ff' : '#fff', gap: '12px' }}>
                  <input type="checkbox" checked={selectedSuppliers.includes(supplier.email)} onChange={() => handleSupplierToggle(supplier.email)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#333', fontSize: '15px' }}>{supplier.company}</p>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>{supplier.name} - {supplier.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p style={{ color: selectedSuppliers.length > 0 ? '#4dabf7' : '#aaa', fontSize: '13px', marginTop: '8px', fontWeight: selectedSuppliers.length > 0 ? 'bold' : 'normal' }}>
            {language === 'ar' ? `تم اختيار ${selectedSuppliers.length} مورد` : `${selectedSuppliers.length} supplier(s) selected`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={handleReview}
            style={{ flex: 1, padding: '14px', backgroundColor: '#FFFDF9', color: '#C0603E', border: '2px solid #C0603E', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            {tx.reviewBtn}
          </button>
         <button type="button" onClick={handleDirectSend}
            style={{ flex: 1, padding: '14px', backgroundColor: '#C0603E', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            {tx.sendBtn}
          </button>
          {(!editMode || isDraftEdit) && (
            <button type="button" onClick={handleSaveDraft}
              style={{ flex: 1, padding: '14px', backgroundColor: '#8A7B6C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
              {tx.draftBtn}
            </button>
          )}
        </div>

        {showPreview && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
            onClick={() => setShowPreview(false)}>
            <div className="print-area" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto', direction: language === 'ar' ? 'rtl' : 'ltr' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>{tx.previewTitle}</h2>
                <button onClick={() => setShowPreview(false)} className="no-print"
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', backgroundColor: '#FAF7F2', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                {projectName && <p style={{ margin: 0, color: '#C0603E', fontSize: '15px', fontWeight: 'bold', gridColumn: '1 / -1' }}>📁 {projectName}</p>}
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.submittedBy}:</strong> {user.name} ({user.email})</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.dateTime}:</strong> {dateStr} - {timeStr}</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.city}:</strong> {location ? (language === 'ar' ? location : getCityName(location, 'en')) : tx.noValue}</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.deadline}:</strong> {deadline || tx.noValue}</p>
                {description && <p style={{ margin: 0, color: '#333', fontSize: '14px', gridColumn: '1 / -1' }}><strong>{tx.notes}:</strong> {description}</p>}
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={pvTh}>#</th>
                      <th style={pvTh}>{tx.material}</th>
                      <th style={pvTh}>{tx.usage}</th>
                      <th style={pvTh}>{tx.size}</th>
                      <th style={pvTh}>{tx.thickness}</th>
                      <th style={pvTh}>{tx.finish}</th>
                      <th style={pvTh}>{tx.color}</th>
                      <th style={pvTh}>{tx.qty}</th>
                      <th style={pvTh}>{tx.unit}</th>
                      <th style={pvTh}>{tx.targetPrice}</th>
                      <th style={pvTh}>{tx.deliveryDate}</th>
                      <th style={pvTh}>{tx.origin}</th>
                      <th style={pvTh}>{tx.rowNote}</th>
                      <th style={pvTh}>{tx.image}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validMaterials.map((m, index) => (
                      <tr key={m.id}>
                        <td style={pvTd}>{index + 1}</td>
                        <td style={pvTd}>{display(m.type || m.typePending) || tx.noValue}</td>
                        <td style={pvTd}>{display(m.usage || m.usagePending) || tx.noValue}</td>
                        <td style={pvTd}>{m.size || m.sizePending || tx.noValue}</td>
                        <td style={pvTd}>{m.thickness || m.thicknessPending || tx.noValue}</td>
                        <td style={pvTd}>{display(m.finish || m.finishPending) || tx.noValue}</td>
                        <td style={pvTd}>{display(m.color || m.colorPending) || tx.noValue}</td>
                        <td style={pvTd}>{m.quantity || tx.noValue}</td>
                        <td style={pvTd}>{display(m.unit)}</td>
                        <td style={pvTd}>{m.targetPrice ? `${m.targetPrice} ${displayCurrency(m.currency || 'ر.س')}` : tx.noValue}</td>
                        <td style={pvTd}>{m.deliveryDate || tx.noValue}</td>
                        <td style={pvTd}>{display(m.origin || m.originPending) || tx.noValue}</td>
                        <td style={{ ...pvTd, maxWidth: '120px', fontSize: '12px' }}>{m.note || tx.noValue}</td>
                        <td style={pvTd}>
                          {m.images && m.images.length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              {m.images.map((img, i) => (
                                <img key={i} src={img} alt="" onClick={() => { setLightboxImg(img); setZoomLevel(1); }}
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in' }} />
                              ))}
                            </div>
                          ) : tx.noValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {attachedFiles.length > 0 && (
                <div style={{ marginBottom: '16px', backgroundColor: '#FAF7F2', padding: '12px', borderRadius: '6px' }}>
                  <p style={{ color: '#333', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>{tx.attachedFilesLabel}:</p>
                  <ul style={{ margin: 0, paddingInlineStart: '20px', color: '#333', fontSize: '13px' }}>
                    {attachedFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ marginBottom: '20px', backgroundColor: '#FAF7F2', padding: '12px', borderRadius: '6px' }}>
                <p style={{ color: '#333', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>{tx.selectedSuppliersLabel}: {selectedSuppliers.length}</p>
                <ul style={{ margin: 0, paddingInlineStart: '20px', color: '#333', fontSize: '13px' }}>
                  {selectedSuppliers.map(email => {
                    const s = suppliers.find(x => x.email === email);
                    return <li key={email}>{s ? `${s.company} (${s.name})` : email}</li>;
                  })}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '12px' }} className="no-print">
                <button onClick={handleConfirmSubmit}
                  style={{ flex: 2, padding: '14px', backgroundColor: '#C0603E', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  {tx.confirm}
                </button>
                <button onClick={handlePrint}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#8A7B6C', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  {tx.print}
                </button>
                <button onClick={() => setShowPreview(false)}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#FFFDF9', color: '#8A7B6C', border: '2px solid #8A7B6C', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  {tx.back}
                </button>
              </div>
            </div>
          </div>
        )}

        {lightboxImg && (
          <div onClick={() => { setLightboxImg(null); setZoomLevel(1); }}
            onWheel={e => {
              e.preventDefault();
              setZoomLevel(prev => Math.min(Math.max(e.deltaY < 0 ? prev + 0.1 : prev - 0.1, 0.5), 4));
            }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ overflow: 'hidden', maxWidth: '90vw', maxHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={lightboxImg} alt=""
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center', transition: 'transform 0.15s ease', maxWidth: '85vw', maxHeight: '72vh', objectFit: 'contain', borderRadius: '6px', display: 'block' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={e => { e.stopPropagation(); setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); }}
                  style={{ width: '36px', height: '36px', backgroundColor: '#44403C', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>−</button>
                <span style={{ color: 'white', fontSize: '13px', minWidth: '50px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</span>
                <button onClick={e => { e.stopPropagation(); setZoomLevel(prev => Math.min(prev + 0.2, 4)); }}
                  style={{ width: '36px', height: '36px', backgroundColor: '#44403C', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>+</button>
                <button onClick={e => { e.stopPropagation(); setZoomLevel(1); }}
                  style={{ padding: '6px 12px', backgroundColor: '#78716C', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>{tx.zoomReset}</button>
                <a href={lightboxImg} download="buildpro-image.jpg" onClick={e => e.stopPropagation()}
                  style={{ padding: '6px 14px', backgroundColor: '#8A7B6C', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>{tx.download}</a>
                <button onClick={e => { e.stopPropagation(); setLightboxImg(null); setZoomLevel(1); }}
                  style={{ padding: '6px 14px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>{tx.close}</button>
              </div>
              <p style={{ color: '#aaa', fontSize: '12px', margin: 0 }}>{tx.zoomHint}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}