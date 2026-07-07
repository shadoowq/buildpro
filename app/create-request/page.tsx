'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saudiCities, getCityName } from '@/app/lib/translations';
import ContractorNav from '../components/ContractorNav';
import { appendActivityLog, arToEn } from '../lib/requestHelpers';
import { isValidImageFile, isValidAttachmentFile } from '../lib/auth';
import { MATERIAL_OPTIONS as OPTIONS, OTHER_VALUE, resolveOther, PAYMENT_TERMS_OPTIONS } from '../lib/materialOptions';
import { MATERIAL_CATEGORIES, getCategory, isTilesCategory, specialtyLabel, MaterialCategory } from '../lib/materialCategories';
import { specialtiesCoverCategory } from '../lib/marketplace';
import { Project, ProjectStatus, PROJECT_STATUS_OPTIONS } from '../lib/projects';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import HelpTooltip from '../components/HelpTooltip';
import MapPickerModal from '../components/MapPickerModal';
import {
  getCurrentUser, getAllUserShadows, getUsers,
  getRatings, getQuotes,
  getLanguage, setLanguage as persistLanguage,
  getRequests, setRequests as persistRequests,
  getRequestDrafts, setRequestDrafts as persistRequestDrafts,
  getCreateRequestDraft, setCreateRequestDraft, clearCreateRequestDraft,
  clearLoadingFromDraft,
  getProjects, setProjects,
} from '../lib/store';

interface MaterialRow {
  id: number;
  category: string;
  type: string; typePending: string; typePendingOther: string;
  usage: string; usagePending: string; usagePendingOther: string;
  size: string; sizePending: string; sizePendingOther: string;
  thickness: string; thicknessPending: string; thicknessPendingOther: string;
  finish: string; finishPending: string; finishPendingOther: string;
  color: string; colorPending: string; colorPendingOther: string;
  quantity: string;
  unit: string; unitOther: string;
  targetPrice: string;
  currency: string;
  deliveryDate: string;
  origin: string; originPending: string; originPendingOther: string;
  images: string[];
  note: string;
  /** non-tile categories: generic per-category field bag (select+Other, no multi-token) */
  fields: Record<string, string>;
  fieldsOther: Record<string, string>;
  /** suppliers picked for THIS material — each valid row becomes its own request, so
      matching/selection is scoped per row rather than shared across the whole form */
  selectedSuppliers: string[];
}

interface AttachedFile {
  name: string;
  type: string;
  data: string;
}

const defaultRow = (): MaterialRow => ({
  id: Date.now() + Math.random(),
  category: 'tiles',
  type: '', typePending: '', typePendingOther: '',
  usage: '', usagePending: '', usagePendingOther: '',
  size: '', sizePending: '', sizePendingOther: '',
  thickness: '', thicknessPending: '', thicknessPendingOther: '',
  finish: '', finishPending: '', finishPendingOther: '',
  color: '', colorPending: '', colorPendingOther: '',
  quantity: '', unit: 'م²', unitOther: '',
  targetPrice: '', currency: 'ر.س',
  deliveryDate: '',
  origin: '', originPending: '', originPendingOther: '',
  images: [], note: '',
  fields: {}, fieldsOther: {},
  selectedSuppliers: [],
});

/** Reconstructs the select+Other UI state from a saved flat string — e.g. a saved
    city outside the preset list re-selects "Other" with the value prefilled, instead
    of leaving the dropdown showing nothing selected. */
const applyOtherState = (value: string, presets: string[]): [string, string] =>
  presets.includes(value) ? [value, ''] : [OTHER_VALUE, value];

/** Same idea for a material row loaded back into the form: saved requests store
    resolved flat values, so a custom unit or a custom category-field value that
    isn't in its preset list must be re-split into select="Other" + text, or the
    select renders empty and the value silently disappears on the next save. */
const restoreRowOtherState = (m: any): Partial<MaterialRow> => {
  const cat = getCategory(m.category);
  const units = cat?.units || OPTIONS.units;
  const unitPatch = m.unit && m.unit !== OTHER_VALUE && !units.includes(m.unit) && !m.unitOther
    ? { unit: OTHER_VALUE, unitOther: m.unit } : {};
  if (isTilesCategory(m.category)) return unitPatch;
  if (m.fieldsOther && Object.keys(m.fieldsOther).length) return unitPatch; // draft rows keep live UI state
  const fields: Record<string, string> = {};
  const fieldsOther: Record<string, string> = {};
  Object.entries((m.fields || {}) as Record<string, string>).forEach(([k, v]) => {
    const def = cat?.fields.find(f => f.key === k);
    if (def?.type === 'select' && v && v !== OTHER_VALUE && !(def.options || []).includes(v)) {
      fields[k] = OTHER_VALUE; fieldsOther[k] = v;
    } else {
      fields[k] = v;
    }
  });
  return { ...unitPatch, fields, fieldsOther };
};

const isRowValid = (m: MaterialRow) =>
  isTilesCategory(m.category)
    ? !!(m.type?.trim() || m.typePending?.trim() || m.usage?.trim() || m.size?.trim() || m.quantity?.trim() || m.finish?.trim() || m.color?.trim())
    : !!(m.quantity?.trim() || Object.values(m.fields || {}).some(v => v?.trim()) || Object.values(m.fieldsOther || {}).some(v => v?.trim()));

const STATUS_COLOR_STYLES: Record<string, React.CSSProperties> = {
  amber:   { backgroundColor: '#FFFBEB', color: '#92400E', borderColor: '#FDE68A' },
  emerald: { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' },
  stone:   { backgroundColor: 'var(--bg-soft)', color: '#57534E', borderColor: 'var(--line)' },
  sky:     { backgroundColor: '#F0F9FF', color: '#0369A1', borderColor: '#BAE6FD' },
};
const statusBadgeInlineStyle = (status: ProjectStatus | undefined): React.CSSProperties => {
  const color = PROJECT_STATUS_OPTIONS.find(o => o.value === status)?.color || 'stone';
  return STATUS_COLOR_STYLES[color];
};

export default function CreateRequest() {
  const showToast = useToast();
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierRatings, setSupplierRatings] = useState<any[]>([]);
  const [supplierQuotes, setSupplierQuotes] = useState<any[]>([]);
  const [rowShowAll, setRowShowAll] = useState<Record<number, boolean>>({});
  const [projectName, setProjectName] = useState('');
  const [projectStatusChoice, setProjectStatusChoice] = useState<ProjectStatus>('tender');
  const [addToProjectId, setAddToProjectId] = useState<number | null>(null);
  const [existingProject, setExistingProject] = useState<Project | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([defaultRow()]);
  const [location, setLocation] = useState('');
  const [locationOther, setLocationOther] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentTermsOther, setPaymentTermsOther] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editRequestId, setEditRequestId] = useState<number | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pageTitle, setPageTitle] = useState('إنشاء مشروع جديد');
  const [isDraftEdit, setIsDraftEdit] = useState(false);
  const [existingQuotesCount, setExistingQuotesCount] = useState(0);
  const [originalSuppliers, setOriginalSuppliers] = useState<string[] | null>(null);
  const [draftIdToRemove, setDraftIdToRemove] = useState<number | null>(null);
  const skipSaveRef = useRef(false);
  const router = useRouter();
  const confirmDialog = useConfirm();

  /** Shared restore path for the in-progress autosave and a resumed saved draft —
      both store the exact same shape (one project name/status + N material rows). */
  const restoreFormState = (parsed: any) => {
    if (parsed.projectName) setProjectName(parsed.projectName);
    if (parsed.projectStatus) setProjectStatusChoice(parsed.projectStatus);
    if (parsed.materials) setMaterials(parsed.materials.map((m: any) => ({
      ...defaultRow(),
      ...m,
      category: m.category || 'tiles',
      fields: m.fields || {},
      fieldsOther: m.fieldsOther || {},
      ...restoreRowOtherState(m),
      images: m.images ? [...m.images] : [],
      selectedSuppliers: m.selectedSuppliers || parsed.selectedSuppliers || [],
    })));
    if (parsed.location) { const [loc, other] = applyOtherState(parsed.location, saudiCities); setLocation(loc); setLocationOther(other); }
    if (parsed.locationCoords) setLocationCoords(parsed.locationCoords);
    if (parsed.deadline) setDeadline(parsed.deadline);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.paymentTerms) { const [pt, other] = applyOtherState(parsed.paymentTerms, PAYMENT_TERMS_OPTIONS); setPaymentTerms(pt); setPaymentTermsOther(other); }
    if (parsed.attachedFiles) setAttachedFiles(parsed.attachedFiles);
  };

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
    const projParam = params.get('projectId');

    if (editId) {
      skipSaveRef.current = true;
      const allRequests: any[] = getRequests();
      const req = allRequests.find((r: any) => r.id === parseInt(editId));
      if (req) {
        setEditMode(true);
        setEditRequestId(req.id);
        setPageTitle(savedLang === 'en' ? 'Edit Request' : 'تعديل الطلب');

        let linkedProject: Project | null = null;
        if (req.projectId) {
          linkedProject = getProjects<Project>().find(p => p.id === req.projectId) || null;
          setExistingProject(linkedProject);
        }

        if (req.materials && req.materials.length > 0) {
          setMaterials(req.materials.map((m: any) => ({
            ...defaultRow(),
            ...m,
            id: Date.now() + Math.random(),
            category: m.category || 'tiles',
            fields: m.fields || {},
            fieldsOther: {},
            ...restoreRowOtherState(m),
            images: m.images ? [...m.images] : [],
            selectedSuppliers: req.selectedSuppliers || [],
          })));
        }
        setProjectName(linkedProject?.name || req.projectName || '');
        if (req.location) { const [loc, other] = applyOtherState(req.location, saudiCities); setLocation(loc); setLocationOther(other); }
        if (req.locationCoords) setLocationCoords(req.locationCoords);
        if (req.deadline) setDeadline(req.deadline);
        if (req.description) setDescription(req.description);
        if (req.paymentTerms) { const [pt, other] = applyOtherState(req.paymentTerms, PAYMENT_TERMS_OPTIONS); setPaymentTerms(pt); setPaymentTermsOther(other); }
        if (req.selectedSuppliers) setOriginalSuppliers(req.selectedSuppliers);
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
      if (parsed) restoreFormState(parsed);
      clearLoadingFromDraft();
    } else if (projParam) {
      const proj = getProjects<Project>().find(p => p.id === Number(projParam) && p.contractorId === parsedUser.email);
      if (proj) {
        setAddToProjectId(proj.id);
        setExistingProject(proj);
        setProjectName(proj.name);
        setPageTitle(savedLang === 'en' ? `Add Material — ${proj.name}` : `إضافة مادة — ${proj.name}`);
      }
    } else {
      const parsed = getCreateRequestDraft<any>();
      if (parsed) {
        restoreFormState(parsed);
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
        projectName, materials: lightMaterials,
        projectStatus: projectStatusChoice,
        addToProjectId: addToProjectId ?? undefined,
        location: resolveOther(location, locationOther), locationCoords,
        deadline, description,
        paymentTerms: resolveOther(paymentTerms, paymentTermsOther),
        attachedFiles: [],
        savedAt: new Date().toISOString(), hadAttachments,
      });
    } catch (e) { /* ignore */ }
  }, [projectName, projectStatusChoice, addToProjectId, materials, location, locationOther, locationCoords, deadline, description, paymentTerms, paymentTermsOther, attachedFiles]);

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

  const changeRowCategory = (id: number, category: string) => {
    const defaultUnit = getCategory(category)?.units?.[0] || OPTIONS.units[0];
    setMaterials(prev => prev.map(row => row.id === id ? { ...row, category, fields: {}, fieldsOther: {}, unit: defaultUnit, unitOther: '' } : row));
  };

  const updateRowField = (id: number, key: string, value: string) => {
    setMaterials(prev => prev.map(row => row.id === id ? { ...row, fields: { ...row.fields, [key]: value } } : row));
  };

  const updateRowFieldOther = (id: number, key: string, value: string) => {
    setMaterials(prev => prev.map(row => row.id === id ? { ...row, fieldsOther: { ...row.fieldsOther, [key]: value } } : row));
  };

  const addOr = (id: number, valueField: keyof MaterialRow, pendingField: keyof MaterialRow, pendingOtherField: keyof MaterialRow) => {
    setMaterials(prev => prev.map(row => {
      if (row.id !== id) return row;
      const pending = resolveOther(row[pendingField] as string, row[pendingOtherField] as string);
      if (!pending) return row;
      const current = row[valueField] as string;
      const newValue = current ? current + ' أو ' + pending : pending;
      return { ...row, [valueField]: newValue, [pendingField]: '', [pendingOtherField]: '' };
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

  /* per-row supplier matching/selection — each material row is about to become its own
     request, so a supplier "matches" a row based only on that row's own category, and
     the checkbox selection lives on the row itself rather than one shared list. */
  const toggleRowSupplier = (rowId: number, email: string) => {
    setMaterials(prev => prev.map(row => row.id !== rowId ? row : {
      ...row,
      selectedSuppliers: row.selectedSuppliers.includes(email)
        ? row.selectedSuppliers.filter(e => e !== email)
        : [...row.selectedSuppliers, email],
    }));
  };
  const toggleRowShowAll = (rowId: number) => setRowShowAll(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  const rowMatchingSuppliers = (row: MaterialRow) => suppliers.filter(s => specialtiesCoverCategory(s.specialties || [], row.category || 'tiles'));
  const rowSelectAll = (row: MaterialRow, visible: any[]) => {
    const emails = visible.map(s => s.email);
    const allSelected = emails.length > 0 && emails.every(e => row.selectedSuppliers.includes(e));
    setMaterials(prev => prev.map(r => r.id !== row.id ? r : {
      ...r,
      selectedSuppliers: allSelected ? r.selectedSuppliers.filter(e => !emails.includes(e)) : [...new Set([...r.selectedSuppliers, ...emails])],
    }));
  };

  const mapMaterialForSave = (m: MaterialRow) => ({
    category: m.category || 'tiles',
    type: m.type || resolveOther(m.typePending, m.typePendingOther),
    usage: m.usage || resolveOther(m.usagePending, m.usagePendingOther),
    size: m.size || resolveOther(m.sizePending, m.sizePendingOther),
    thickness: m.thickness || resolveOther(m.thicknessPending, m.thicknessPendingOther),
    finish: m.finish || resolveOther(m.finishPending, m.finishPendingOther),
    color: m.color || resolveOther(m.colorPending, m.colorPendingOther),
    quantity: m.quantity,
    unit: resolveOther(m.unit, m.unitOther),
    targetPrice: m.targetPrice,
    currency: m.currency,
    deliveryDate: m.deliveryDate,
    origin: m.origin || resolveOther(m.originPending, m.originPendingOther),
    images: m.images,
    note: m.note,
    fields: Object.fromEntries(Object.entries(m.fields || {}).map(([k, v]) => [k, resolveOther(v, m.fieldsOther?.[k] || '')]).filter(([, v]) => v)),
  });

  const computeLegacyQuantities = (rows: MaterialRow[]) => {
    const sumFor = (needle: string) => rows.filter(m => (m.type || resolveOther(m.typePending, m.typePendingOther)).includes(needle)).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0);
    return { ceramic: sumFor('سيراميك'), porcelain: sumFor('بورسلان'), marble: sumFor('رخام'), granite: sumFor('جرانيت'), terrazzo: sumFor('تيرازو') };
  };

  const validate = (): boolean => {
    setMaterials(prev => prev.map(row => ({
      ...row,
      type: row.type || resolveOther(row.typePending, row.typePendingOther),
      usage: row.usage || resolveOther(row.usagePending, row.usagePendingOther),
      size: row.size || resolveOther(row.sizePending, row.sizePendingOther),
      thickness: row.thickness || resolveOther(row.thicknessPending, row.thicknessPendingOther),
      finish: row.finish || resolveOther(row.finishPending, row.finishPendingOther),
      color: row.color || resolveOther(row.colorPending, row.colorPendingOther),
      origin: row.origin || resolveOther(row.originPending, row.originPendingOther),
      fields: Object.fromEntries(Object.entries(row.fields || {}).map(([k, v]) => [k, resolveOther(v, row.fieldsOther?.[k] || '')])),
    })));
    const valid = materials.filter(isRowValid);
    if (valid.length === 0) {
      showToast(language === 'ar' ? 'الرجاء إضافة بيانات في مادة واحدة على الأقل' : 'Please fill at least one material row', 'error');
      return false;
    }
    if (editMode) {
      const unionSuppliers = [...new Set(valid.flatMap(m => m.selectedSuppliers || []))];
      if (unionSuppliers.length === 0) {
        showToast(language === 'ar' ? 'الرجاء اختيار مورد واحد على الأقل' : 'Please select at least one supplier', 'error');
        return false;
      }
    } else {
      const emptyRowIdx = valid.findIndex(m => (m.selectedSuppliers || []).length === 0);
      if (emptyRowIdx !== -1) {
        showToast(language === 'ar' ? `اختر موردًا واحدًا على الأقل للمادة رقم ${emptyRowIdx + 1}` : `Select at least one supplier for material #${emptyRowIdx + 1}`, 'error');
        return false;
      }
      if (!addToProjectId && !projectName.trim()) {
        showToast(language === 'ar' ? 'الرجاء إدخال اسم المشروع' : 'Please enter a project name', 'error');
        return false;
      }
    }
    if (!resolveOther(location, locationOther)) {
      showToast(language === 'ar' ? 'الرجاء اختيار المدينة' : 'Please select a city', 'error');
      return false;
    }
    return true;
  };

  /** Edit-mode-only: recombines every current material row back into ONE request object,
      exactly like before this feature — editing never splits an existing request. */
  const buildRequest = () => {
    const valid = materials.filter(isRowValid);
    return {
      id: Date.now(),
      contractorId: user?.email,
      projectId: existingProject?.id,
      materials: valid.map(mapMaterialForSave),
      attachedFiles,
      ...computeLegacyQuantities(valid),
      projectName,
      location: resolveOther(location, locationOther),
      locationCoords: locationCoords ?? undefined,
      deadline, description,
      paymentTerms: resolveOther(paymentTerms, paymentTermsOther) || undefined,
      selectedSuppliers: [...new Set(valid.flatMap(m => m.selectedSuppliers || []))],
      status: 'open', createdAt: new Date().toISOString(),
    };
  };

  /** New-submission-only: one independent single-material request per valid row. */
  const buildSingleMaterialRequest = (m: MaterialRow, idOffset: number, projectId: number, projectNameFinal: string) => ({
    id: Date.now() + idOffset,
    contractorId: user?.email,
    projectId,
    materials: [mapMaterialForSave(m)],
    attachedFiles,
    ...computeLegacyQuantities([m]),
    projectName: projectNameFinal,
    location: resolveOther(location, locationOther),
    locationCoords: locationCoords ?? undefined,
    deadline, description,
    paymentTerms: resolveOther(paymentTerms, paymentTermsOther) || undefined,
    selectedSuppliers: m.selectedSuppliers || [],
    status: 'open', createdAt: new Date().toISOString(),
  });

  const submitRequest = () => {
    if (editMode && editRequestId) {
      const allRequests = getRequests();
      const updated = allRequests.map((r: any) => r.id === editRequestId ? { ...buildRequest(), id: editRequestId, createdAt: r.createdAt } : r);
      persistRequests(updated);
      appendActivityLog(editRequestId, 'تم تعديل الطلب', 'Request edited');
      showToast(language === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Changes saved successfully!');
      router.push('/my-requests');
      return;
    }

    const valid = materials.filter(isRowValid);
    let projectId: number;
    let projectNameFinal: string;

    if (addToProjectId && existingProject) {
      projectId = addToProjectId;
      projectNameFinal = existingProject.name;
    } else {
      const newProject: Project = {
        id: Date.now(),
        contractorId: user?.email,
        name: projectName.trim(),
        status: projectStatusChoice,
        createdAt: new Date().toISOString(),
      };
      setProjects([...getProjects<Project>(), newProject]);
      projectId = newProject.id;
      projectNameFinal = newProject.name;
    }

    try {
      const newRequests = valid.map((m, i) => buildSingleMaterialRequest(m, i, projectId, projectNameFinal));
      persistRequests([...getRequests(), ...newRequests]);
      newRequests.forEach(r => appendActivityLog(r.id, 'تم إنشاء الطلب', 'Request created'));
      clearCreateRequestDraft();
      if (draftIdToRemove !== null) {
        persistRequestDrafts(getRequestDrafts().filter((d: any) => d.id !== draftIdToRemove));
      }
      showToast(language === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Request sent successfully!');
      router.push(`/projects/${projectId}`);
    } catch {
      showToast(language === 'ar' ? 'حجم الملفات كبير جداً' : 'Files too large', 'error');
    }
  };

  const handleDirectSend = async () => {
    if (!validate()) return;
    if (!editMode) {
      const valid = materials.filter(isRowValid);
      const totalSuppliers = new Set(valid.flatMap(m => m.selectedSuppliers || [])).size;
      const msg = language === 'ar'
        ? `سيتم إنشاء ${valid.length} طلب تسعير مستقل وإرسالها لعدد ${totalSuppliers} مورد. هل تريد المتابعة؟`
        : `This will create ${valid.length} independent request(s) sent to ${totalSuppliers} supplier(s). Continue?`;
      if (!(await confirmDialog(msg, { confirmText: language === 'ar' ? 'إرسال' : 'Send' }))) return;
    }
    submitRequest();
  };

  const handleReview = () => { if (validate()) setShowPreview(true); };

  const handleConfirmSubmit = () => { submitRequest(); };

  const handlePrint = () => { window.print(); };

  const handleSaveDraft = () => {
    const draftData = {
      id: draftIdToRemove ?? Date.now(),
      contractorId: user?.email,
      projectName, materials,
      projectStatus: projectStatusChoice,
      addToProjectId: addToProjectId ?? undefined,
      location: resolveOther(location, locationOther), locationCoords: locationCoords ?? undefined,
      deadline, description,
      paymentTerms: resolveOther(paymentTerms, paymentTermsOther) || undefined,
      attachedFiles,
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
    hint: editMode ? 'اختر من القائمة واضغط "+ أو" لإضافة خيار آخر' : 'كل مادة أدناه ستتحول لطلب تسعير مستقل داخل هذا المشروع — اختر من القائمة واضغط "+ أو" لإضافة خيار آخر لنفس البند.',
    projectNameLabel: 'اسم المشروع', projectNamePlaceholder: 'مثال: فيلا الرياض - الدور الأول',
    projectStatusLabel: 'حالة المشروع',
    belongsToProjectAdd: 'ستُضاف المادة الجديدة لهذا المشروع',
    belongsToProjectEdit: 'هذا الطلب جزء من هذا المشروع',
    materials: 'المواد المطلوبة', categoryLabel: 'المجال', material: 'نوع المادة', usage: 'الاستخدام',
    size: 'المقاس', thickness: 'السماكة', finish: 'الفنش', color: 'اللون',
    qty: 'الكمية', unit: 'الوحدة', targetPrice: 'السعر المستهدف',
    deliveryDate: 'تاريخ التوريد', origin: 'الصناعة', image: 'صور', rowNote: 'وصف البند',
    addMaterial: '+ إضافة مادة', city: 'المدينة', selectCity: 'اختر مدينة...',
    deadline: 'الموعد النهائي لتقديم عروض الأسعار',
    attachments: 'مرفقات (مواصفات، جداول كميات...)',
    attachHint: 'يمكنك رفع ملفات PDF أو Word أو Excel أو ملفات مضغوطة',
    uploadFiles: 'رفع ملفات', uploadImage: '+ صورة',
    notes: 'ملاحظات عامة (اختياري)', notesPlaceholder: 'أضف ملاحظات أو تفاصيل إضافية...',
    rowSuppliers: 'الموردون لهذه المادة', noSuppliers: 'لا يوجد موردين مسجلين بعد',
    selectAll: 'اختيار الكل', deselectAll: 'إلغاء الكل',
    noMatchWarning: 'لا يوجد موردون متخصصون في هذا المجال حتى الآن.',
    noMatchEmpty: 'لا يوجد موردون متخصصون في هذا المجال — لن يظهر أي مورد هنا حتى تختار "عرض كل الموردين" أدناه.',
    showAllNoMatch: 'عرض كل الموردين',
    categoryMatch: 'مطابق للمجال', outsideSpecialty: 'خارج التخصص',
    noRating: 'لا يوجد تقييم', pastQuotes: 'عرض سابق',
    showOutside: 'عرض باقي الموردين خارج التخصص', hideOutside: 'إخفاء الموردين خارج التخصص',
    materialsSummary: (n: number) => `سيتم إنشاء ${n} طلب تسعير مستقل داخل هذا المشروع`,
    reviewBtn: 'مراجعة الطلب', sendBtn: editRequestId ? 'حفظ التعديلات' : 'إرسال الطلب', draftBtn: 'حفظ مسودة',
    select: 'اختر...', optional: 'اختياري', orBtn: '+ أو',
    otherOption: 'أخرى (اكتب يدويًا)', specify: 'حدد...',
    previewTitle: 'مراجعة الطلب قبل الإرسال', submittedBy: 'مقدم الطلب', dateTime: 'تاريخ ووقت المراجعة',
    confirm: 'تأكيد وإرسال الطلب', print: 'طباعة', back: 'رجوع للتعديل', noValue: '—',
    attachedFilesLabel: 'الملفات المرفقة', selectedSuppliersLabel: 'الموردون المختارون لكل مادة',
    maxImages: 'وصلت للحد الأقصى (صورتين)',
    zoomReset: 'إعادة ضبط', download: 'تحميل', close: 'إغلاق',
    zoomHint: 'استخدم عجلة الفأرة للتكبير والتصغير',
    pinLocation: '📍 حدد الموقع على الخريطة (اختياري)', locationPinned: 'تم تحديد الموقع على الخريطة',
    viewOnMap: 'عرض على الخريطة', paymentTermsLabel: 'شروط الدفع المفضلة (اختياري)',
    selectOption: 'اختر...',
    quotesExistWarning: (n: number) => `⚠ هذا الطلب عليه بالفعل ${n} عرض سعر — تعديل المواد أو الكميات لن يغيّر الأسعار المقدَّمة بالفعل`,
    suppliersChangedWarning: "⚠ لقد غيّرت قائمة الموردين على طلب لديه عروض بالفعل — الموردون الذين أزلتهم يحتفظون بعروضهم السابقة، والموردون الجدد لن يروا الطلب إلا إذا كان لا يزال مطابقًا لتخصصهم.",
  } : {
    hint: editMode ? 'Select from the list and press "+ OR" to add another option' : 'Each material below will become its own independent pricing request inside this project — select from the list and press "+ OR" to add another option to the same item.',
    projectNameLabel: 'Project Name', projectNamePlaceholder: 'e.g. Riyadh Villa - Ground Floor',
    projectStatusLabel: 'Project Status',
    belongsToProjectAdd: 'This new material will be added to this project',
    belongsToProjectEdit: 'This request belongs to this project',
    materials: 'Required Materials', categoryLabel: 'Category', material: 'Material', usage: 'Usage',
    size: 'Size', thickness: 'Thickness', finish: 'Finish', color: 'Color',
    qty: 'Qty', unit: 'Unit', targetPrice: 'Target Price',
    deliveryDate: 'Delivery Date', origin: 'Origin', image: 'Images', rowNote: 'Item Note',
    addMaterial: '+ Add Material', city: 'City', selectCity: 'Select a city...',
    deadline: 'Quote Submission Deadline',
    attachments: 'Attachments (Specs, BOQ...)',
    attachHint: 'You can upload PDF, Word, Excel, or compressed files',
    uploadFiles: 'Upload Files', uploadImage: '+ Image',
    notes: 'General Notes (Optional)', notesPlaceholder: 'Add notes or extra details...',
    rowSuppliers: 'Suppliers for this material', noSuppliers: 'No suppliers registered yet',
    selectAll: 'Select All', deselectAll: 'Deselect All',
    noMatchWarning: "No suppliers specialize in this category yet.",
    noMatchEmpty: 'No suppliers specialize in this category — none will show here unless you choose "Show all suppliers" below.',
    showAllNoMatch: 'Show all suppliers',
    categoryMatch: 'Category match', outsideSpecialty: 'Outside specialty',
    noRating: 'No rating', pastQuotes: 'past quote(s)',
    showOutside: 'Show suppliers outside the specialty', hideOutside: 'Hide suppliers outside the specialty',
    materialsSummary: (n: number) => `${n} independent pricing request(s) will be created inside this project`,
    reviewBtn: 'Review Request', sendBtn: editRequestId ? 'Save Changes' : 'Send Request', draftBtn: 'Save Draft',
    select: 'Select...', optional: 'Optional', orBtn: '+ OR',
    otherOption: 'Other (type manually)', specify: 'Specify...',
    previewTitle: 'Review Request Before Sending', submittedBy: 'Submitted By', dateTime: 'Review Date & Time',
    confirm: 'Confirm & Send Request', print: 'Print', back: 'Back to Edit', noValue: '—',
    attachedFilesLabel: 'Attached Files', selectedSuppliersLabel: 'Suppliers Selected Per Material',
    maxImages: 'Max 2 images reached',
    zoomReset: 'Reset', download: 'Download', close: 'Close',
    zoomHint: 'Use mouse wheel to zoom in/out',
    pinLocation: '📍 Pin location on map (optional)', locationPinned: 'Location pinned on map',
    viewOnMap: 'View on map', paymentTermsLabel: 'Preferred Payment Terms (optional)',
    selectOption: 'Select...',
    quotesExistWarning: (n: number) => `⚠ This request already has ${n} quote(s) — editing materials or quantities won't change prices already submitted`,
    suppliersChangedWarning: "⚠ You've changed the supplier list on a request that already has quotes — removed suppliers keep their existing quotes, and newly added suppliers will only see this request if it still matches their specialty.",
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

  const OrField = ({ row, valueField, pendingField, pendingOtherField, options }: { row: MaterialRow, valueField: keyof MaterialRow, pendingField: keyof MaterialRow, pendingOtherField: keyof MaterialRow, options: string[] }) => (
    <div>
      {(row[valueField] as string) && <TokenDisplay id={row.id} field={valueField} value={row[valueField] as string} />}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <select value={row[pendingField] as string} onChange={e => updateRow(row.id, pendingField, e.target.value)} style={selectStyle}>
          <option value="">{tx.select}</option>
          {options.map(o => <option key={o} value={o}>{display(o)}</option>)}
          <option value={OTHER_VALUE}>{tx.otherOption}</option>
        </select>
        <button type="button" onClick={() => addOr(row.id, valueField, pendingField, pendingOtherField)} style={orBtnStyle}>{tx.orBtn}</button>
      </div>
      {row[pendingField] === OTHER_VALUE && (
        <input type="text" value={row[pendingOtherField] as string} onChange={e => updateRow(row.id, pendingOtherField, e.target.value)}
          placeholder={tx.specify} style={{ ...inputStyle, marginTop: '4px' }} />
      )}
    </div>
  );

  const GenericCategoryFields = ({ row, category }: { row: MaterialRow; category: MaterialCategory }) => (
    <>
      {category.fields.map(field => (
        <div key={field.key}>
          <label style={cardFieldLabelStyle}>{language === 'ar' ? field.labelAr : field.labelEn}</label>
          {field.type === 'select' ? (
            <>
              <select value={row.fields[field.key] || ''} onChange={e => updateRowField(row.id, field.key, e.target.value)} style={{ ...inputStyle, padding: '5px 4px' }}>
                <option value="">{tx.select}</option>
                {(field.options || []).map(o => <option key={o} value={o}>{display(o)}</option>)}
                <option value={OTHER_VALUE}>{tx.otherOption}</option>
              </select>
              {row.fields[field.key] === OTHER_VALUE && (
                <input type="text" value={row.fieldsOther[field.key] || ''} onChange={e => updateRowFieldOther(row.id, field.key, e.target.value)}
                  placeholder={tx.specify} style={{ ...inputStyle, marginTop: '4px' }} />
              )}
            </>
          ) : (
            <input type={field.type} value={row.fields[field.key] || ''} onChange={e => updateRowField(row.id, field.key, e.target.value)} style={inputStyle} />
          )}
        </div>
      ))}
    </>
  );

  const RowSupplierPicker = ({ row }: { row: MaterialRow }) => {
    const matching = rowMatchingSuppliers(row);
    const nonMatching = suppliers.filter(s => !matching.includes(s));
    /* Only ever show matched suppliers by default — a category with zero matches
       shows zero suppliers, not a silent fallback to everyone. The contractor can
       still deliberately reveal the full list via the toggle below if they want to
       hand-pick someone outside their specialty. */
    const visible = rowShowAll[row.id] ? [...matching, ...nonMatching] : matching;
    return (
      <div style={{ marginTop: '14px', borderTop: '1px dashed var(--line)', paddingTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ ...cardFieldLabelStyle, marginBottom: 0 }}>{tx.rowSuppliers}</label>
          {visible.length > 0 && (
            <button type="button" onClick={() => rowSelectAll(row, visible)}
              style={{ padding: '3px 10px', backgroundColor: 'var(--sec)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
              {visible.every(s => row.selectedSuppliers.includes(s.email)) ? tx.deselectAll : tx.selectAll}
            </button>
          )}
        </div>
        {suppliers.length === 0 ? (
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-soft)', borderRadius: '4px', color: '#666', textAlign: 'center', fontSize: '12px' }}>{tx.noSuppliers}</div>
        ) : (
          <>
          {matching.length === 0 && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '6px 10px', marginBottom: '8px', color: '#92400E', fontSize: '11px' }}>
              {tx.noMatchWarning}
            </div>
          )}
          {visible.length === 0 ? (
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-soft)', borderRadius: '4px', color: '#666', textAlign: 'center', fontSize: '12px' }}>{tx.noMatchEmpty}</div>
          ) : (
          <div style={{ border: '1px solid var(--line)', borderRadius: '4px', maxHeight: '220px', overflowY: 'auto', backgroundColor: '#fff' }}>
            {visible.map((supplier, index) => {
              const { avgRating, quoteCount } = getSupplierStats(supplier.email);
              const matches = matching.includes(supplier);
              const specialtyChips = (supplier.specialties || []).map((s: string) => specialtyLabel(s, language) || display(s)).filter(Boolean);
              return (
                <div key={supplier.email} onClick={() => toggleRowSupplier(row.id, supplier.email)}
                  style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: index < visible.length - 1 ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer', backgroundColor: row.selectedSuppliers.includes(supplier.email) ? 'var(--tint)' : '#fff', gap: '10px', opacity: matches || matching.length === 0 ? 1 : 0.6 }}>
                  <input type="checkbox" checked={row.selectedSuppliers.includes(supplier.email)} onChange={() => toggleRowSupplier(row.id, supplier.email)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#333', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      {supplier.company}
                      {matching.length > 0 && (
                        matches ? (
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '999px', padding: '1px 7px' }}>✓ {tx.categoryMatch}</span>
                        ) : (
                          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#78716C', backgroundColor: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: '999px', padding: '1px 7px' }}>{tx.outsideSpecialty}</span>
                        )
                      )}
                    </p>
                    <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>{supplier.name} - {supplier.phone}</p>
                    {specialtyChips.length > 0 && <p style={{ margin: '2px 0 0', color: '#999', fontSize: '10px' }}>{specialtyChips.join(' · ')}</p>}
                  </div>
                  <div style={{ textAlign: language === 'ar' ? 'left' : 'right', flexShrink: 0 }}>
                    {avgRating > 0 ? <p style={{ margin: 0, color: '#D97706', fontSize: '12px', fontWeight: 'bold' }}>★ {avgRating.toFixed(1)}</p> : <p style={{ margin: 0, color: '#aaa', fontSize: '10px' }}>{tx.noRating}</p>}
                    <p style={{ margin: 0, color: '#999', fontSize: '10px' }}>{quoteCount} {tx.pastQuotes}</p>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          {nonMatching.length > 0 && (
            <button type="button" onClick={() => toggleRowShowAll(row.id)}
              style={{ marginTop: '6px', padding: '4px 10px', backgroundColor: 'transparent', color: 'var(--sec)', border: '1px dashed var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
              {rowShowAll[row.id] ? tx.hideOutside : matching.length === 0 ? `${tx.showAllNoMatch} (${nonMatching.length})` : `${tx.showOutside} (${nonMatching.length})`}
            </button>
          )}
          </>
        )}
        <p style={{ color: row.selectedSuppliers.length > 0 ? 'var(--chrome)' : '#aaa', fontSize: '12px', marginTop: '6px', fontWeight: row.selectedSuppliers.length > 0 ? 'bold' : 'normal' }}>
          {language === 'ar' ? `تم اختيار ${row.selectedSuppliers.length} مورد لهذه المادة` : `${row.selectedSuppliers.length} supplier(s) selected for this material`}
        </p>
      </div>
    );
  };

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  const validMaterials = materials.filter(isRowValid);
  const tileMaterials = validMaterials.filter(m => isTilesCategory(m.category));
  const otherMaterials = validMaterials.filter(m => !isTilesCategory(m.category));
  const now = new Date();
  const dateStr = now.toLocaleDateString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US');
  const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  const allSelectedSuppliers = [...new Set(materials.flatMap(m => m.selectedSuppliers || []))];

  return (
    <div className="bp-page md:ps-[190px]" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <ContractorNav lang={language} setLang={handleLangChange} userName={user?.name || ''} active="/create-request" />
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: '#1C1917', marginBottom: '10px' }}>{pageTitle}</h1>
        <p style={{ color: '#78716C', fontSize: '13px', marginBottom: '20px' }}>{tx.hint}</p>

        {editMode && !isDraftEdit && existingQuotesCount > 0 && (
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '12px 16px', marginBottom: '10px', color: '#92400E', fontSize: '13px' }}>
            {tx.quotesExistWarning(existingQuotesCount)}
          </div>
        )}
        {editMode && !isDraftEdit && existingQuotesCount > 0 && originalSuppliers !== null &&
          (allSelectedSuppliers.length !== originalSuppliers.length || allSelectedSuppliers.some(e => !originalSuppliers.includes(e))) && (
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', color: '#92400E', fontSize: '13px' }}>
            {tx.suppliersChangedWarning}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>{tx.projectNameLabel}</label>
          {existingProject ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', backgroundColor: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--chrome)', fontSize: '15px' }}>📁 {existingProject.name}</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 10px', borderRadius: '999px', border: '1px solid', ...statusBadgeInlineStyle(existingProject.status) }}>
                {language === 'ar'
                  ? PROJECT_STATUS_OPTIONS.find(o => o.value === existingProject.status)?.labelAr
                  : PROJECT_STATUS_OPTIONS.find(o => o.value === existingProject.status)?.labelEn}
              </span>
              <span style={{ color: '#78716C', fontSize: '12px' }}>
                {addToProjectId ? tx.belongsToProjectAdd : tx.belongsToProjectEdit}
              </span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder={tx.projectNamePlaceholder}
                style={{ ...fieldStyle, border: '2px solid var(--sec)', borderRadius: '8px', fontSize: '15px' }}
              />
              {!editMode && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ ...cardFieldLabelStyle, marginBottom: '6px' }}>{tx.projectStatusLabel}</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {PROJECT_STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setProjectStatusChoice(opt.value)}
                        style={{
                          padding: '6px 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 'bold', cursor: 'pointer',
                          border: projectStatusChoice === opt.value ? '2px solid var(--brand-strong)' : '1px solid var(--line)',
                          backgroundColor: projectStatusChoice === opt.value ? 'var(--tint)' : '#fff',
                          color: projectStatusChoice === opt.value ? 'var(--brand-strong)' : '#57534E',
                        }}>
                        {language === 'ar' ? opt.labelAr : opt.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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

                <div style={{ marginBottom: '14px', maxWidth: '260px' }}>
                  <label style={cardFieldLabelStyle}>{tx.categoryLabel}</label>
                  <select value={row.category || 'tiles'} onChange={e => changeRowCategory(row.id, e.target.value)} style={{ ...inputStyle, padding: '6px 8px', fontWeight: 'bold' }}>
                    {MATERIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {language === 'ar' ? c.labelAr : c.labelEn}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                  {isTilesCategory(row.category) && (
                    <>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.material}</label>
                    <OrField row={row} valueField="type" pendingField="typePending" pendingOtherField="typePendingOther" options={OPTIONS.types} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.usage}
                      <HelpTooltip lang={language}
                        textAr="استخدام المادة في المشروع (أرضيات، جدران، درج...)"
                        textEn="Where this material will be used in the project (flooring, walls, stairs...)" />
                    </label>
                    <OrField row={row} valueField="usage" pendingField="usagePending" pendingOtherField="usagePendingOther" options={OPTIONS.usages} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.size}</label>
                    <OrField row={row} valueField="size" pendingField="sizePending" pendingOtherField="sizePendingOther" options={OPTIONS.sizes} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.thickness}
                      <HelpTooltip lang={language}
                        textAr="سمك البلاطة أو المادة بالمليمتر"
                        textEn="The tile/material thickness in millimeters" />
                    </label>
                    <OrField row={row} valueField="thickness" pendingField="thicknessPending" pendingOtherField="thicknessPendingOther" options={OPTIONS.thicknesses} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.finish}
                      <HelpTooltip lang={language}
                        textAr="طريقة تشطيب سطح المادة (مصقول، مطفي، ساتان...)"
                        textEn="The surface finish of the material (polished, matte, satin...)" />
                    </label>
                    <OrField row={row} valueField="finish" pendingField="finishPending" pendingOtherField="finishPendingOther" options={OPTIONS.finishes} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.color}</label>
                    <OrField row={row} valueField="color" pendingField="colorPending" pendingOtherField="colorPendingOther" options={OPTIONS.colors} />
                  </div>
                    </>
                  )}
                  {!isTilesCategory(row.category) && (
                    <GenericCategoryFields row={row} category={getCategory(row.category)!} />
                  )}
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.qty}</label>
                    <input type="number" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', e.target.value)} placeholder="0" min="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={cardFieldLabelStyle}>{tx.unit}</label>
                    <select value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)} style={{ ...inputStyle, padding: '5px 4px' }}>
                      {(getCategory(row.category)?.units || OPTIONS.units).map(u => <option key={u} value={u}>{display(u)}</option>)}
                      <option value={OTHER_VALUE}>{tx.otherOption}</option>
                    </select>
                    {row.unit === OTHER_VALUE && (
                      <input type="text" value={row.unitOther} onChange={e => updateRow(row.id, 'unitOther', e.target.value)}
                        placeholder={tx.specify} style={{ ...inputStyle, marginTop: '4px' }} />
                    )}
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
                  {isTilesCategory(row.category) && (
                  <div>
                    <label style={cardFieldLabelStyle}>
                      {tx.origin}
                      <HelpTooltip lang={language}
                        textAr="بلد المنشأ أو نوع الصناعة المفضلة للمادة (محلي، إيطالي، تركي...)"
                        textEn="Preferred country of manufacture for the material (local, Italian, Turkish...)" />
                    </label>
                    <OrField row={row} valueField="origin" pendingField="originPending" pendingOtherField="originPendingOther" options={OPTIONS.origins} />
                  </div>
                  )}
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

                <RowSupplierPicker row={row} />
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow}
            style={{ marginTop: '12px', padding: '10px 20px', backgroundColor: 'var(--sec)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            {tx.addMaterial}
          </button>
          {!editMode && validMaterials.length > 0 && (
            <p style={{ marginTop: '10px', color: '#78716C', fontSize: '12.5px' }}>
              {tx.materialsSummary(validMaterials.length)}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>{tx.city}</label>
            <select value={location} onChange={e => setLocation(e.target.value)} style={fieldStyle}>
              <option value="">{tx.selectCity}</option>
              {saudiCities.map(city => (
                <option key={city} value={city}>{language === 'ar' ? city : getCityName(city, 'en')}</option>
              ))}
              <option value={OTHER_VALUE}>{tx.otherOption}</option>
            </select>
            {location === OTHER_VALUE && (
              <input type="text" value={locationOther} onChange={e => setLocationOther(e.target.value)}
                placeholder={tx.specify} style={{ ...fieldStyle, marginTop: '6px' }} />
            )}
            <div style={{ marginTop: '8px' }}>
              {locationCoords ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--tint)', border: '1px solid var(--brand-strong)', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', color: 'var(--brand-strong)', fontWeight: 'bold' }}>
                    📍 {tx.locationPinned}
                  </span>
                  <button type="button" onClick={() => setShowMapPicker(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--sec)', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                    {tx.viewOnMap}
                  </button>
                  <button type="button" onClick={() => setLocationCoords(null)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowMapPicker(true)}
                  style={{ padding: '7px 12px', backgroundColor: 'transparent', color: 'var(--sec)', border: '1px solid var(--line)', borderRadius: '4px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600 }}>
                  {tx.pinLocation}
                </button>
              )}
            </div>
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
          <div>
            <label style={labelStyle}>{tx.paymentTermsLabel}</label>
            <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={fieldStyle}>
              <option value="">{tx.selectOption}</option>
              {PAYMENT_TERMS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              <option value={OTHER_VALUE}>{tx.otherOption}</option>
            </select>
            {paymentTerms === OTHER_VALUE && (
              <input type="text" value={paymentTermsOther} onChange={e => setPaymentTermsOther(e.target.value)}
                placeholder={tx.specify} style={{ ...fieldStyle, marginTop: '6px' }} />
            )}
          </div>
        </div>

        {showMapPicker && (
          <MapPickerModal
            lang={language}
            initial={locationCoords}
            onConfirm={(coords) => { setLocationCoords(coords); setShowMapPicker(false); }}
            onCancel={() => setShowMapPicker(false)}
          />
        )}

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
            <div className="print-area request-review-print-area" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto', direction: language === 'ar' ? 'rtl' : 'ltr' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>{tx.previewTitle}</h2>
                <button onClick={() => setShowPreview(false)} className="no-print"
                  style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', backgroundColor: 'var(--bg-soft)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                {(existingProject?.name || projectName) && <p style={{ margin: 0, color: 'var(--chrome)', fontSize: '15px', fontWeight: 'bold', gridColumn: '1 / -1' }}>📁 {existingProject?.name || projectName}</p>}
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.submittedBy}:</strong> {user.name} ({user.email})</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.dateTime}:</strong> {dateStr} - {timeStr}</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.city}:</strong> {(() => { const loc = resolveOther(location, locationOther); return loc ? (language === 'ar' ? loc : getCityName(loc, 'en')) : tx.noValue; })()}</p>
                <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.deadline}:</strong> {deadline || tx.noValue}</p>
                {locationCoords && (
                  <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                    <strong>{tx.viewOnMap}:</strong>{' '}
                    <a href={`https://www.openstreetmap.org/?mlat=${locationCoords.lat}&mlon=${locationCoords.lng}#map=15/${locationCoords.lat}/${locationCoords.lng}`} target="_blank" rel="noreferrer" className="no-print">
                      {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
                    </a>
                  </p>
                )}
                {(paymentTerms || paymentTermsOther) && (
                  <p style={{ margin: 0, color: '#333', fontSize: '14px' }}><strong>{tx.paymentTermsLabel}:</strong> {resolveOther(paymentTerms, paymentTermsOther)}</p>
                )}
                {description && <p style={{ margin: 0, color: '#333', fontSize: '14px', gridColumn: '1 / -1' }}><strong>{tx.notes}:</strong> {description}</p>}
              </div>
              {tileMaterials.length > 0 && (
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
                    {tileMaterials.map((m, index) => (
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
              )}
              {otherMaterials.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {otherMaterials.map((m, index) => {
                    const cat = getCategory(m.category);
                    return (
                      <div key={m.id} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 14px', backgroundColor: 'var(--bg-soft)' }}>
                        <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '13px', color: 'var(--brand-strong)' }}>
                          {cat?.icon} {language === 'ar' ? cat?.labelAr : cat?.labelEn} — #{tileMaterials.length + index + 1}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: '13px', color: '#333' }}>
                          {cat?.fields.map(f => m.fields?.[f.key] && (
                            <span key={f.key}><strong>{language === 'ar' ? f.labelAr : f.labelEn}:</strong> {display(m.fields[f.key])}</span>
                          ))}
                          {m.quantity && <span><strong>{tx.qty}:</strong> {m.quantity} {display(m.unit)}</span>}
                          {m.targetPrice && <span><strong>{tx.targetPrice}:</strong> {m.targetPrice} {displayCurrency(m.currency || 'ر.س')}</span>}
                          {m.deliveryDate && <span><strong>{tx.deliveryDate}:</strong> {m.deliveryDate}</span>}
                          {m.note && <span><strong>{tx.rowNote}:</strong> {m.note}</span>}
                        </div>
                        {m.images && m.images.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            {m.images.map((img, i) => (
                              <img key={i} src={img} alt="" onClick={() => { setLightboxImg(img); setZoomLevel(1); }}
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {attachedFiles.length > 0 && (
                <div style={{ marginBottom: '16px', backgroundColor: 'var(--bg-soft)', padding: '12px', borderRadius: '6px' }}>
                  <p style={{ color: '#333', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>{tx.attachedFilesLabel}:</p>
                  <ul style={{ margin: 0, paddingInlineStart: '20px', color: '#333', fontSize: '13px' }}>
                    {attachedFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ marginBottom: '20px', backgroundColor: 'var(--bg-soft)', padding: '12px', borderRadius: '6px' }}>
                <p style={{ color: '#333', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>{tx.selectedSuppliersLabel}</p>
                {validMaterials.map((m, i) => {
                  const cat = getCategory(m.category);
                  const names = (m.selectedSuppliers || []).map(email => {
                    const s = suppliers.find(x => x.email === email);
                    return s ? s.company : email;
                  });
                  return (
                    <p key={m.id} style={{ margin: '0 0 4px 0', color: '#333', fontSize: '13px' }}>
                      <strong>#{i + 1} {cat?.icon} {language === 'ar' ? cat?.labelAr : cat?.labelEn}:</strong>{' '}
                      {names.length > 0 ? names.join('، ') : tx.noValue}
                    </p>
                  );
                })}
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
