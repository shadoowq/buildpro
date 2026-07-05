'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saudiCities, getCityName } from '@/app/lib/translations';
import ContractorNav from '../components/ContractorNav';
import { appendActivityLog, arToEn } from '../lib/requestHelpers';
import { isValidImageFile, isValidAttachmentFile } from '../lib/auth';
import { MATERIAL_OPTIONS as OPTIONS } from '../lib/materialOptions';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import HelpTooltip from '../components/HelpTooltip';
import {
  getCurrentUser, getAllUserShadows, getUsers,
  getRatings, getQuotes,
  getLanguage, setLanguage as persistLanguage,
  getRequests, setRequests as persistRequests,
  getRequestDrafts, setRequestDrafts as persistRequestDrafts,
  getCreateRequestDraft, setCreateRequestDraft, clearCreateRequestDraft,
  clearLoadingFromDraft,
} from '../lib/store';

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

const isRowValid = (m: MaterialRow) =>
  !!(m.type?.trim() || m.typePending?.trim() || m.usage?.trim() || m.size?.trim() || m.quantity?.trim() || m.finish?.trim() || m.color?.trim());

export default function CreateRequest() {
  const showToast = useToast();
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierRatings, setSupplierRatings] = useState<any[]>([]);
  const [supplierQuotes, setSupplierQuotes] = useState<any[]>([]);
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
  const [originalSuppliers, setOriginalSuppliers] = useState<string[] | null>(null);
  const [draftIdToRemove, setDraftIdToRemove] = useState<number | null>(null);
  const skipSaveRef = useRef(false);
  const router = useRouter();
  const confirmDialog = useConfirm();

  useEffect(() => {
    const parsedUser = getCurrentUser<any>();
    if (!parsedUser) { router.push('/login'); return; }
    if (parsedUser.userType === 'supplier') { router.push('/supplier-requests'); return; }
    setUser(parsedUser);

    try {
      const allSuppliers = getAllUserShadows<any>().filter(u => u.userType === 'supplier');
      const usersArr = getUsers().filter((u: any) => u.userType === 'supplier');
      const combined = [...allSuppliers, ...usersArr].filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
      setSuppliers(combined);
    } catch {}

    setSupplierRatings(getRatings());
    setSupplierQuotes(getQuotes());

    const savedLang = getLanguage();
    setLanguage(savedLang);

    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    const draftId = params.get('draft');

    if (editId) {
      skipSaveRef.current = true;
      const allRequests: any[] = getRequests();
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
        if (req.selectedSuppliers) { setSelectedSuppliers(req.selectedSuppliers); setOriginalSuppliers(req.selectedSuppliers); }
        if (req.attachedFiles) setAttachedFiles(req.attachedFiles);

        const allQuotes = getQuotes();
        setExistingQuotesCount(allQuotes.filter((q: any) => q.requestId === req.id).length);
      }
    } else if (draftId) {
      skipSaveRef.current = true;
      setEditMode(true);
      setIsDraftEdit(true);
      setDraftIdToRemove(parseInt(draftId));
      setPageTitle(savedLang === 'en' ? 'Edit Draft' : 'تعديل المسودة');
      const parsed = getCreateRequestDraft<any>();
      if (parsed) {
        if (parsed.projectName) setProjectName(parsed.projectName);
        if (parsed.materials) setMaterials(parsed.materials.map((m: any) => ({ ...m, images: m.images ? [...m.images] : [] })));
        if (parsed.location) setLocation(parsed.location);
        if (parsed.deadline) setDeadline(parsed.deadline);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.selectedSuppliers) setSelectedSuppliers(parsed.selectedSuppliers);
        if (parsed.attachedFiles) setAttachedFiles(parsed.attachedFiles);
      }
      clearLoadingFromDraft();
    } else {
      const parsed = getCreateRequestDraft<any>();
      if (parsed) {
        if (parsed.projectName) setProjectName(parsed.projectName);
        if (parsed.materials) setMaterials(parsed.materials.map((m: any) => ({ ...m, images: m.images ? [...m.images] : [] })));
        if (parsed.location) setLocation(parsed.location);
        if (parsed.deadline) setDeadline(parsed.deadline);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.selectedSuppliers) setSelectedSuppliers(parsed.selectedSuppliers);
        if (parsed.attachedFiles) setAttachedFiles(parsed.attachedFiles);
        if (parsed.hadAttachments) {
          showToast(savedLang === 'en'
            ? 'Restored your unfinished request — note: attached photos/files were not auto-saved and need to be re-added'
            : 'تم استرجاع طلبك غير المكتمل — ملاحظة: الصور والملفات المرفقة لم تُحفظ تلقائيًا ويجب إعادة إضافتها');
        }
      }
    }

    const onStorage = (e: StorageEvent) => { if (e.key === 'language' && e.newValue) setLanguage(e.newValue as 'ar' | 'en'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router]);

  const handleLangChange = (l: 'ar' | 'en') => { setLanguage(l); persistLanguage(l); };

  useEffect(() => {
    if (skipSaveRef.current) return;
    try {
      const lightMaterials = materials.map(m => ({ ...m, images: [] }));
      const hadAttachments = materials.some(m => m.images && m.images.length > 0) || attachedFiles.length > 0;
      setCreateRequestDraft({
        projectName, materials: lightMaterials, location, deadline, description, selectedSuppliers, attachedFiles: [],
        savedAt: new Date().toISOString(), hadAttachments,
      });
    } catch (e) { /* ignore */ }
  }, [projectName, materials, location, deadline, description, selectedSuppliers, attachedFiles]);

  const getSupplierStats = (email: string) => {
    const rs = supplierRatings.filter((r: any) => r.supplierId === email);
    const avgRating = rs.length > 0 ? rs.reduce((s: number, r: any) => s + r.rating, 0) / rs.length : 0;
    const quoteCount = supplierQuotes.filter((q: any) => q.supplierId === email).length;
    return { avgRating, quoteCount };
  };

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
    const valid = files.filter(isValidImageFile);
    if (valid.length < files.length) {
      showToast(language === 'ar' ? 'صور PNG/JPG/WebP فقط وبحد أقصى 1.5MB للصورة' : 'PNG/JPG/WebP images only, max 1.5MB each', 'error');
    }
    const remaining = 2 - row.images.length;
    const filesToProcess = valid.slice(0, remaining);
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
    const files = Array.from(e.target.files || []);
    const valid = files.filter(isValidAttachmentFile);
    if (valid.length < files.length) {
      showToast(language === 'ar' ? 'الحد الأقصى لحجم المرفق 3MB' : 'Attachments are limited to 3MB each', 'error');
    }
    valid.forEach(file => {
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
      const requests = getRequests();
      requests.push(req);
      persistRequests(requests);
      clearCreateRequestDraft();
      if (draftIdToRemove !== null) {
        const allDrafts = getRequestDrafts();
        const updated = allDrafts.filter((d: any) => d.id !== draftIdToRemove);
        persistRequestDrafts(updated);
      }
      return true;
    } catch {
      showToast(language === 'ar' ? 'حجم الملفات كبير جداً' : 'Files too large', 'error');
      return false;
    }
  };

  const submitRequest = () => {
    if (editMode && editRequestId) {
      const allRequests = getRequests();
      const updated = allRequests.map((r: any) => r.id === editRequestId ? { ...buildRequest(), id: editRequestId, createdAt: r.createdAt } : r);
      persistRequests(updated);
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

  const handleDirectSend = async () => {
    if (!validate()) return;
    if (!editMode) {
      const msg = language === 'ar'
        ? `سيتم إرسال هذا الطلب إلى ${selectedSuppliers.length} مورد. هل تريد المتابعة؟`
        : `This request will be sent to ${selectedSuppliers.length} supplier(s). Continue?`;
      if (!(await confirmDialog(msg, { confirmText: language === 'ar' ? 'إرسال' : 'Send' }))) return;
    }
    submitRequest();
  };

  const handleReview = () => { if (validate()) setShowPreview(true); };

  const handleConfirmSubmit = () => { submitRequest(); };

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
    const draftData = {
      id: draftIdToRemove ?? Date.now(),
      contractorId: user?.email,
      projectName, materials, location, deadline, description,
      selectedSuppliers, attachedFiles,
      savedAt: new Date().toISOString(),
    };
    try {
      const allDrafts = getRequestDrafts();
      const exists = allDrafts.find((d: any) => d.id === draftData.id);
      const updated = exists
        ? allDrafts.map((d: any) => d.id === draftData.id ? draftData : d)
        : [...allDrafts, draftData];
      persistRequestDrafts(updated);
      clearCreateRequestDraft();
      showToast(language === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Changes saved successfully!');
      router.push('/drafts');
    } catch {
      showToast(language === 'ar' ? 'حجم الملفات كبير جداً' : 'Files too large', 'error');
    }
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
    zoomHint: 'استخدم عجلة الفأرة للتكبير والتصغير',
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
  const selectStyle: React.CSSProperties = { padding: '5px 4px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '12px', color: '#333', backgroundColor: '#fff', flex: 1 };
  const orBtnStyle: React.CSSProperties = { padding: '5px 8px', backgroundColor: 'var(--sec)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' };
  const inputStyle: React.CSSProperties = { padding: '5px 6px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '13px', color: '#333', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' };
  const fieldStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '16px', color: '#333', backgroundColor: '#fff', boxSizing: 'border-box' };
  const pvTh: React.CSSProperties = { padding: '8px 6px', backgroundColor: 'var(--bg-soft)', borderBottom: '2px solid var(--line)', color: '#333', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', textAlign: 'center' };
  const pvTd: React.CSSProperties = { padding: '8px 6px', borderBottom: '1px solid var(--line-soft)', color: '#333', fontSize: '13px', textAlign: 'center' };
  const cardFieldLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px', fontWeight: 'bold', color: '#57534E', fontSize: '11.5px' };

  const TokenDisplay = ({ id, field, value }: { id: number, field: keyof MaterialRow, value: string }) => {
    const tokens = value.split(' أو ').map(t => t.trim()).filter(Boolean);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
        {tokens.map((token, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: 'var(--tint)', border: '1px solid var(--brand-strong)', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#2B2420' }}>
            {display(token)}
            <button type="button" onClick={() => removeToken(id, field, token)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '13px', padding: '0', lineHeight: 1 }}>×</button>
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
  const dateStr = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
  const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bp-page md:ps-[190px]" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <ContractorNav lang={language} setLang={handleLangChange} userName={user?.name || ''} active="/create-request" />
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
            style={{ ...fieldStyle, border: '2px solid var(--sec)', borderRadius: '8px', fontSize: '15px' }}
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1C1917', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {tx.materials}
            <HelpTooltip lang={language}
              textAr="أضف كل مادة كبند مستقل. إذا كان لأحد الحقول أكثر من خيار مقبول (مثلاً لونان)، اختر الأول ثم اضغط «+أو» لإضافة خيار آخر لنفس البند."
              textEn='Add each material as its own row. If a field has more than one acceptable option (e.g. two colors), pick one and press "+OR" to add another option to the same item.' />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {materials.map((row, idx) => (
              <div key={row.id} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12.5px', color: 'var(--brand-strong)', backgroundColor: 'var(--tint)', padding: '3px 10px', borderRadius: '999px' }}>
                    {language === 'ar' ? `مادة ${idx + 1}` : `Material ${idx + 1}`}
                  </span>
                  <button type="button" onClick={() => removeRow(row.id)}
                    style={{ padding: '4px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    ✕ {language === 'ar' ? 'حذف' : 'Remove'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.material}</label>
                    <OrField row={row} valueField="type" pendingField="typePending" options={OPTIONS.types} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.usage}
                      <HelpTooltip lang={language}
                        textAr="استخدام المادة في المشروع (أرضيات، جدران، درج...)"
                        textEn="Where this material will be used in the project (flooring, walls, stairs...)" />
                    </label>
                    <OrField row={row} valueField="usage" pendingField="usagePending" options={OPTIONS.usages} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.size}</label>
                    <OrField row={row} valueField="size" pendingField="sizePending" options={OPTIONS.sizes} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.thickness}
                      <HelpTooltip lang={language}
                        textAr="سمك البلاطة أو المادة بالمليمتر"
                        textEn="The tile/material thickness in millimeters" />
                    </label>
                    <OrField row={row} valueField="thickness" pendingField="thicknessPending" options={OPTIONS.thicknesses} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.finish}
                      <HelpTooltip lang={language}
                        textAr="طريقة تشطيب سطح المادة (مصقول، مطفي، ساتان...)"
                        textEn="The surface finish of the material (polished, matte, satin...)" />
                    </label>
                    <OrField row={row} valueField="finish" pendingField="finishPending" options={OPTIONS.finishes} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.color}</label>
                    <OrField row={row} valueField="color" pendingField="colorPending" options={OPTIONS.colors} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.qty}</label>
                    <input type="number" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', e.target.value)} placeholder="0" min="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.unit}</label>
                    <select value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)} style={{ ...inputStyle, padding: '5px 4px' }}>
                      {OPTIONS.units.map(u => <option key={u} value={u}>{display(u)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.targetPrice}
                      <HelpTooltip lang={language}
                        textAr="السعر الذي ترغب في الوصول إليه لكل وحدة بالريال السعودي (اختياري) — يساعد الموردين على معرفة ميزانيتك. جميع العروض الواردة تكون بالريال السعودي أيضًا."
                        textEn="The price per unit you're aiming for in Saudi Riyal (optional) — helps suppliers understand your budget. All incoming quotes are also in Saudi Riyal." />
                    </label>
                    <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                      <input type="number" value={row.targetPrice} onChange={e => updateRow(row.id, 'targetPrice', e.target.value)}
                        placeholder={tx.optional} min="0"
                        style={{ flex: 1, padding: '5px 6px', border: 'none', fontSize: '13px', color: '#333', backgroundColor: '#fff', outline: 'none', minWidth: '60px' }} />
                      <span style={{ padding: '5px 8px', borderLeft: '1px solid #eee', fontSize: '11px', color: '#666', backgroundColor: 'var(--bg-soft)', whiteSpace: 'nowrap' }}>
                        {language === 'ar' ? 'ر.س' : 'SAR'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.deliveryDate}</label>
                    <input type="date" value={row.deliveryDate} onChange={e => updateRow(row.id, 'deliveryDate', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.origin}
                      <HelpTooltip lang={language}
                        textAr="بلد المنشأ أو نوع الصناعة المفضلة للمادة (محلي، إيطالي، تركي...)"
                        textEn="Preferred country of manufacture for the material (local, Italian, Turkish...)" />
                    </label>
                    <OrField row={row} valueField="origin" pendingField="originPending" options={OPTIONS.origins} />
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <label style={cardFieldLabelStyle}>{tx.rowNote}</label>
                  <textarea value={row.note} onChange={e => updateRow(row.id, 'note', e.target.value)}
                    placeholder={language === 'ar' ? 'وصف إضافي...' : 'Extra description...'}
                    style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} />
                </div>

                <div style={{ marginTop: '14px' }}>
                  <label style={cardFieldLabelStyle}>{tx.image}</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {row.images.map((img, i) => (
                      <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={img} alt="" onClick={() => { setLightboxImg(img); setZoomLevel(1); }}
                          style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)', cursor: 'zoom-in' }} />
                        <button type="button" onClick={() => removeImage(row.id, i)}
                          style={{ position: 'absolute', top: '-5px', right: '-5px', width: '16px', height: '16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                      </div>
                    ))}
                    {row.images.length < 2 ? (
                      <label style={{ display: 'inline-block', padding: '5px 10px', backgroundColor: 'var(--sec)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                        {tx.uploadImage}
                        <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={e => handleImageUpload(row.id, e)} />
                      </label>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#856404', backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '4px' }}>{tx.maxImages}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow}
            style={{ marginTop: '12px', padding: '10px 20px', backgroundColor: 'var(--sec)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
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
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {tx.deadline}
              <HelpTooltip lang={language}
                textAr="آخر تاريخ يمكن للموردين خلاله إرسال عروض أسعار على هذا الطلب."
                textEn="The last date suppliers can submit price quotes for this request." />
            </label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>{tx.attachments}</label>
          <p style={{ color: '#78716C', fontSize: '12px', margin: '0 0 8px 0' }}>{tx.attachHint}</p>
          <label style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: 'var(--sec)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            {tx.uploadFiles}
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          {attachedFiles.length > 0 && (
            <div style={{ marginTop: '12px', border: '1px solid var(--line)', borderRadius: '6px', backgroundColor: '#fff', overflow: 'hidden' }}>
              {attachedFiles.map((file, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: index < attachedFiles.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ color: '#333', fontSize: '13px' }}>{file.name}</span>
                  <button type="button" onClick={() => removeFile(index)}
                    style={{ padding: '4px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={labelStyle}>{tx.notes}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder={tx.notesPlaceholder}
            style={{ width: '100%', padding: '10px', border: '1px solid var(--line)', borderRadius: '4px', color: '#333', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' }} />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontWeight: 'bold', color: '#1C1917', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {tx.suppliers}
              <HelpTooltip lang={language}
                textAr="سيُرسَل الطلب فقط إلى الموردين الذين تحددهم هنا. يمكنك اختيار مورد واحد أو أكثر."
                textEn="Your request will only be sent to the suppliers you select here. You can choose one or more." />
            </label>
            {suppliers.length > 0 && (
              <button type="button" onClick={handleSelectAll}
                style={{ padding: '6px 12px', backgroundColor: 'var(--sec)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                {selectedSuppliers.length === suppliers.length ? tx.deselectAll : tx.selectAll}
              </button>
            )}
          </div>
          {suppliers.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-soft)', borderRadius: '4px', color: '#666', textAlign: 'center' }}>{tx.noSuppliers}</div>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: '4px', maxHeight: '250px', overflowY: 'auto', backgroundColor: '#fff' }}>
              {suppliers.map((supplier, index) => {
                const { avgRating, quoteCount } = getSupplierStats(supplier.email);
                return (
                  <div key={supplier.email} onClick={() => handleSupplierToggle(supplier.email)}
                    style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', borderBottom: index < suppliers.length - 1 ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer', backgroundColor: selectedSuppliers.includes(supplier.email) ? 'var(--tint)' : '#fff', gap: '12px' }}>
                    <input type="checkbox" checked={selectedSuppliers.includes(supplier.email)} onChange={() => handleSupplierToggle(supplier.email)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#333', fontSize: '15px' }}>{supplier.company}</p>
                      <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>{supplier.name} - {supplier.phone}</p>
                    </div>
                    <div style={{ textAlign: language === 'ar' ? 'left' : 'right', flexShrink: 0 }}>
                      {avgRating > 0 ? (
                        <p style={{ margin: 0, color: '#D97706', fontSize: '13px', fontWeight: 'bold' }}>★ {avgRating.toFixed(1)}</p>
                      ) : (
                        <p style={{ margin: 0, color: '#aaa', fontSize: '11px' }}>{language === 'ar' ? 'لا يوجد تقييم' : 'No rating'}</p>
                      )}
                      <p style={{ margin: 0, color: '#999', fontSize: '11px' }}>
                        {quoteCount} {language === 'ar' ? 'عرض سابق' : 'past quote(s)'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ color: selectedSuppliers.length > 0 ? 'var(--chrome)' : '#aaa', fontSize: '13px', marginTop: '8px', fontWeight: selectedSuppliers.length > 0 ? 'bold' : 'normal' }}>
            {language === 'ar' ? `تم اختيار ${selectedSuppliers.length} مورد` : `${selectedSuppliers.length} supplier(s) selected`}
          </p>
          {editMode && !isDraftEdit && existingQuotesCount > 0 && originalSuppliers !== null &&
            (selectedSuppliers.length !== originalSuppliers.length || selectedSuppliers.some(e => !originalSuppliers.includes(e))) && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', marginTop: '10px', color: '#92400E', fontSize: '13px' }}>
              {language === 'ar'
                ? '⚠ لقد غيّرت قائمة الموردين على طلب لديه عروض بالفعل — الموردون الذين أزلتهم يحتفظون بعروضهم السابقة، والموردون الجدد لن يروا الطلب إلا إذا كان لا يزال مطابقًا لتخصصهم.'
                : "⚠ You've changed the supplier list on a request that already has quotes — removed suppliers keep their existing quotes, and newly added suppliers will only see this request if it still matches their specialty."}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
          {(!editMode || isDraftEdit) && (
            <button type="button" onClick={handleSaveDraft}
              style={{ padding: '0 20px', backgroundColor: 'transparent', color: 'var(--sec)', border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              {tx.draftBtn}
            </button>
          )}
          <button type="button" onClick={handleReview}
            style={{ padding: '0 24px', backgroundColor: 'var(--bg-soft2)', color: 'var(--chrome)', border: '2px solid var(--brand-strong)', borderRadius: '4px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
            {tx.reviewBtn}
          </button>
          <button type="button" onClick={handleDirectSend}
            style={{ flex: 1, padding: '14px', backgroundColor: 'var(--chrome)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            {tx.sendBtn}
          </button>
        </div>

        {showPreview && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
            onClick={() => setShowPreview(false)}>
            <div className="print-area" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto', direction: language === 'ar' ? 'rtl' : 'ltr' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>{tx.previewTitle}</h2>
                <button onClick={() => setShowPreview(false)} className="no-print"
                  style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', backgroundColor: 'var(--bg-soft)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                {projectName && <p style={{ margin: 0, color: 'var(--chrome)', fontSize: '15px', fontWeight: 'bold', gridColumn: '1 / -1' }}>📁 {projectName}</p>}
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.submittedBy}:</strong> {user.name} ({user.email})</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.dateTime}:</strong> {dateStr} - {timeStr}</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.city}:</strong> {location ? (language === 'ar' ? location : getCityName(location, 'en')) : tx.noValue}</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.deadline}:</strong> {deadline || tx.noValue}</p>
                {description && <p style={{ margin: 0, color: '#333', fontSize: '14px', gridColumn: '1 / -1' }}><strong>{tx.notes}:</strong> {description}</p>}
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '8px', marginBottom: '20px' }}>
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
                <div style={{ marginBottom: '16px', backgroundColor: 'var(--bg-soft)', padding: '12px', borderRadius: '6px' }}>
                  <p style={{ color: '#333', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>{tx.attachedFilesLabel}:</p>
                  <ul style={{ margin: 0, paddingInlineStart: '20px', color: '#333', fontSize: '13px' }}>
                    {attachedFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ marginBottom: '20px', backgroundColor: 'var(--bg-soft)', padding: '12px', borderRadius: '6px' }}>
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
                  style={{ flex: 2, padding: '14px', backgroundColor: 'var(--chrome)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  {tx.confirm}
                </button>
                <button onClick={handlePrint}
                  style={{ flex: 1, padding: '14px', backgroundColor: 'var(--sec)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  {tx.print}
                </button>
                <button onClick={() => setShowPreview(false)}
                  style={{ flex: 1, padding: '14px', backgroundColor: 'var(--bg-soft2)', color: 'var(--sec)', border: '2px solid var(--sec)', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
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
                  style={{ padding: '6px 14px', backgroundColor: 'var(--sec)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>{tx.download}</a>
                <button onClick={e => { e.stopPropagation(); setLightboxImg(null); setZoomLevel(1); }}
                  style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>{tx.close}</button>
              </div>
              <p style={{ color: '#aaa', fontSize: '12px', margin: 0 }}>{tx.zoomHint}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}