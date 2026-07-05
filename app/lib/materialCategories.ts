import { MATERIAL_OPTIONS } from './materialOptions';

export interface CategoryField {
  key: string;
  labelAr: string;
  labelEn: string;
  type: 'select' | 'text' | 'number';
  options?: string[];
}

export interface MaterialCategory {
  id: string;
  icon: string;
  labelAr: string;
  labelEn: string;
  fields: CategoryField[];
}

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  {
    id: 'tiles', icon: '🧱', labelAr: 'البلاط والسيراميك', labelEn: 'Tiles & Ceramics',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: MATERIAL_OPTIONS.types },
      { key: 'usage', labelAr: 'الاستخدام', labelEn: 'Usage', type: 'select', options: MATERIAL_OPTIONS.usages },
      { key: 'size', labelAr: 'المقاس', labelEn: 'Size', type: 'select', options: MATERIAL_OPTIONS.sizes },
      { key: 'thickness', labelAr: 'السماكة', labelEn: 'Thickness', type: 'select', options: MATERIAL_OPTIONS.thicknesses },
      { key: 'finish', labelAr: 'الفنش', labelEn: 'Finish', type: 'select', options: MATERIAL_OPTIONS.finishes },
      { key: 'color', labelAr: 'اللون', labelEn: 'Color', type: 'select', options: MATERIAL_OPTIONS.colors },
      { key: 'origin', labelAr: 'الصناعة', labelEn: 'Origin', type: 'select', options: MATERIAL_OPTIONS.origins },
    ],
  },
  {
    id: 'paint', icon: '🎨', labelAr: 'الدهانات ومواد التشطيب', labelEn: 'Paints & Finishes',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['معجون', 'برايمر', 'بلاستيك مطفي', 'نصف لامع', 'لامع', 'زيتي', 'إيبوكسي', 'عازل مائي'] },
      { key: 'finish', labelAr: 'الفنش', labelEn: 'Finish', type: 'select', options: ['مطفي', 'ساتان', 'لامع', 'مطاطي'] },
      { key: 'color', labelAr: 'اللون', labelEn: 'Color', type: 'select', options: ['أبيض', 'بيج', 'رمادي', 'أزرق', 'أخضر', 'أسود'] },
      { key: 'coverage', labelAr: 'التغطية (م²/لتر)', labelEn: 'Coverage (m²/L)', type: 'number' },
      { key: 'brand', labelAr: 'الماركة', labelEn: 'Brand', type: 'text' },
    ],
  },
  {
    id: 'concrete', icon: '🏗️', labelAr: 'الخرسانة والأسمنت', labelEn: 'Concrete & Cement',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['إسمنت بورتلاندي', 'خرسانة جاهزة', 'مقاوم للكبريتات', 'سريع التصلب'] },
      { key: 'grade', labelAr: 'درجة المقاومة', labelEn: 'Grade', type: 'select', options: ['C20', 'C25', 'C30', 'C35', 'C40', 'C45', 'C50'] },
      { key: 'usage', labelAr: 'الاستخدام', labelEn: 'Usage', type: 'select', options: ['أساسات', 'أعمدة', 'أسقف', 'أرضيات'] },
      { key: 'additive', labelAr: 'الإضافات', labelEn: 'Additive', type: 'select', options: ['بدون', 'مانع تسرب', 'مسرع تصلب', 'مؤخر شك'] },
    ],
  },
  {
    id: 'rebar', icon: '🔩', labelAr: 'حديد التسليح', labelEn: 'Rebar / Steel',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['عادي', 'مبروم', 'مقاوم للصدأ'] },
      { key: 'diameter', labelAr: 'القطر', labelEn: 'Diameter', type: 'select', options: ['8mm', '10mm', '12mm', '14mm', '16mm', '18mm', '20mm', '25mm', '32mm'] },
      { key: 'grade', labelAr: 'الدرجة', labelEn: 'Grade', type: 'select', options: ['Grade 60', 'Grade 40', 'B500B'] },
      { key: 'shape', labelAr: 'الشكل', labelEn: 'Shape', type: 'select', options: ['مستقيم', 'ملفوف', 'مشكل حسب المخطط'] },
    ],
  },
  {
    id: 'blocks', icon: '🧊', labelAr: 'البلوك والطوب', labelEn: 'Blocks & Bricks',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['بلوك أسمنتي', 'طوب أحمر', 'بلوك خفيف AAC', 'بلوك عازل'] },
      { key: 'size', labelAr: 'المقاس', labelEn: 'Size', type: 'select', options: ['20×20×40', '15×20×40', '10×20×40', 'هوردي'] },
      { key: 'usage', labelAr: 'الاستخدام', labelEn: 'Usage', type: 'select', options: ['جدران حاملة', 'جدران فاصلة', 'عزل حراري'] },
    ],
  },
  {
    id: 'electrical', icon: '⚡', labelAr: 'الكهرباء', labelEn: 'Electrical',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['كابل نحاس', 'كابل ألمنيوم', 'قاطع', 'لوحة توزيع', 'مفتاح وبرايز'] },
      { key: 'cableSection', labelAr: 'مقطع الكابل', labelEn: 'Cable Section', type: 'select', options: ['1.5mm²', '2.5mm²', '4mm²', '6mm²', '10mm²', '16mm²', '25mm²'] },
      { key: 'amperage', labelAr: 'الأمبير', labelEn: 'Amperage', type: 'select', options: ['16A', '20A', '32A', '63A', '100A'] },
      { key: 'standard', labelAr: 'المواصفة', labelEn: 'Standard', type: 'select', options: ['SASO', 'IEC', 'UL'] },
    ],
  },
  {
    id: 'ac', icon: '❄️', labelAr: 'التكييف والتبريد', labelEn: 'AC & Cooling',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['سبليت', 'شباك', 'دكت', 'باكدج', 'مركزي VRF'] },
      { key: 'capacity', labelAr: 'قدرة التبريد', labelEn: 'Cooling Capacity', type: 'select', options: ['1 طن', '1.5 طن', '2 طن', '3 طن', '5 طن', '10 طن'] },
      { key: 'efficiency', labelAr: 'كفاءة الطاقة', labelEn: 'Efficiency', type: 'select', options: ['عادي', 'انفرتر توفير عالي'] },
      { key: 'brand', labelAr: 'الماركة', labelEn: 'Brand', type: 'text' },
    ],
  },
  {
    id: 'plumbing', icon: '🚿', labelAr: 'السباكة', labelEn: 'Plumbing',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['أنابيب PPR', 'أنابيب PVC', 'أنابيب نحاس', 'خلاطات', 'سخانات'] },
      { key: 'diameter', labelAr: 'القطر', labelEn: 'Diameter', type: 'select', options: ['½"', '¾"', '1"', '1½"', '2"', '4"'] },
      { key: 'usage', labelAr: 'الاستخدام', labelEn: 'Usage', type: 'select', options: ['مياه باردة', 'مياه ساخنة', 'صرف صحي'] },
    ],
  },
  {
    id: 'aluminum_glass', icon: '🪟', labelAr: 'الألومنيوم والزجاج', labelEn: 'Aluminum & Glass',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['ألومنيوم عادي', 'ألومنيوم حراري', 'زجاج سيكوريت', 'زجاج مزدوج', 'زجاج ملون'] },
      { key: 'thickness', labelAr: 'السماكة', labelEn: 'Thickness', type: 'select', options: ['4mm', '6mm', '8mm', '10mm', '12mm'] },
      { key: 'usage', labelAr: 'الاستخدام', labelEn: 'Usage', type: 'select', options: ['نوافذ', 'واجهات', 'أبواب', 'فواصل'] },
      { key: 'color', labelAr: 'اللون', labelEn: 'Color', type: 'select', options: ['أبيض', 'برونزي', 'أسود', 'طبيعي'] },
    ],
  },
  {
    id: 'insulation', icon: '💧', labelAr: 'العزل', labelEn: 'Insulation',
    fields: [
      { key: 'type', labelAr: 'النوع', labelEn: 'Type', type: 'select', options: ['عزل مائي', 'عزل حراري', 'رغوة بولي يوريثان', 'ألواح فوم', 'صوف صخري'] },
      { key: 'thickness', labelAr: 'السماكة', labelEn: 'Thickness', type: 'select', options: ['25mm', '50mm', '75mm', '100mm'] },
      { key: 'usage', labelAr: 'الاستخدام', labelEn: 'Usage', type: 'select', options: ['أسطح', 'جدران', 'أساسات'] },
    ],
  },
];

export const getCategory = (id: string | undefined): MaterialCategory | undefined =>
  MATERIAL_CATEGORIES.find(c => c.id === id);

export const isTilesCategory = (id: string | undefined): boolean => !id || id === 'tiles';
