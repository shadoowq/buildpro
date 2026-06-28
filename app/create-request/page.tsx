'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saudiCities, getCityName } from '@/app/lib/translations';
import Navbar from '../components/Navbar';

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
  deliveryDate: string;
  origin: string; originPending: string;
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
  targetPrice: '', deliveryDate: '',
  origin: '', originPending: '',
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

const enToAr: Record<string, string> = Object.fromEntries(Object.entries(arToEn).map(([k, v]) => [v, k]));

const translateValue = (value: string, targetLang: 'ar' | 'en'): string => {
  if (!value) return value;
  const map = targetLang === 'en' ? arToEn : enToAr;
  const parts = value.split(/ أو | OR /g);
  const separator = targetLang === 'ar' ? ' أو ' : ' OR ';
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => map[p] !== undefined ? map[p] : p)
    .join(separator);
};

const translateMaterials = (rows: MaterialRow[], targetLang: 'ar' | 'en'): MaterialRow[] => {
  return rows.map(row => ({
    ...row,
    type: translateValue(row.type, targetLang),
    usage: translateValue(row.usage, targetLang),
    finish: translateValue(row.finish, targetLang),
    color: translateValue(row.color, targetLang),
    origin: translateValue(row.origin, targetLang),
    unit: translateValue(row.unit, targetLang) || row.unit,
  }));
};

export default function CreateRequest() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([defaultRow()]);
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const prevLangRef = React.useRef<'ar' | 'en'>('ar');
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
    prevLangRef.current = savedLang;

    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      if (parsed.materials) setMaterials(translateMaterials(parsed.materials, savedLang));
      if (parsed.location) setLocation(parsed.location);
      if (parsed.deadline) setDeadline(parsed.deadline);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.selectedSuppliers) setSelectedSuppliers(parsed.selectedSuppliers);
    }

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== prevLangRef.current) {
        setMaterials(prev => translateMaterials(prev, newLang));
        prevLangRef.current = newLang;
        setLanguage(newLang);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      materials, location, deadline, description, selectedSuppliers
    }));
  }, [materials, location, deadline, description, selectedSuppliers]);

  const or = language === 'ar' ? ' أو ' : ' OR ';

  const updateRow = (id: number, field: keyof MaterialRow, value: string) => {
    setMaterials(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addOr = (id: number, valueField: keyof MaterialRow, pendingField: keyof MaterialRow) => {
    setMaterials(prev => prev.map(row => {
      if (row.id !== id) return row;
      const pending = row[pendingField] as string;
      if (!pending) return row;
      const current = row[valueField] as string;
      const newValue = current ? current + or + pending : pending;
      return { ...row, [valueField]: newValue, [pendingField]: '' };
    }));
  };

  const removeToken = (id: number, field: keyof MaterialRow, token: string) => {
    setMaterials(prev => prev.map(row => {
      if (row.id !== id) return row;
      const current = row[field] as string;
      const parts = current.split(/ أو | OR /g).map(p => p.trim()).filter(p => p !== token);
      const separator = language === 'ar' ? ' أو ' : ' OR ';
      return { ...row, [field]: parts.join(separator) };
    }));
  };

  const addRow = () => setMaterials(prev => [...prev, defaultRow()]);

  const removeRow = (id: number) => {
    if (materials.length === 1) return;
    setMaterials(prev => prev.filter(row => row.id !== id));
  };

  const handleSupplierToggle = (email: string) => {
    setSelectedSuppliers(prev => prev.includes(email) ? prev.filter(s => s !== email) : [...prev, email]);
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.length === suppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(suppliers.map(s => s.email));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSuppliers.length === 0) {
      alert(language === 'ar' ? 'الرجاء اختيار مورد واحد على الأقل' : 'Please select at least one supplier');
      return;
    }
    const validMaterials = materials.filter(m => m.type);
    if (validMaterials.length === 0) {
      alert(language === 'ar' ? 'الرجاء إضافة مادة واحدة على الأقل' : 'Please add at least one material');
      return;
    }

    const request = {
      id: Date.now(),
      contractorId: user?.email,
      materials: validMaterials.map(m => ({
        type: m.type, usage: m.usage, size: m.size, thickness: m.thickness,
        finish: m.finish, color: m.color, quantity: m.quantity, unit: m.unit,
        targetPrice: m.targetPrice, deliveryDate: m.deliveryDate, origin: m.origin,
      })),
      ceramic: validMaterials.filter(m => m.type.includes('سيراميك') || m.type.includes('Ceramic')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      porcelain: validMaterials.filter(m => m.type.includes('بورسلان') || m.type.includes('Porcelain')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      marble: validMaterials.filter(m => m.type.includes('رخام') || m.type.includes('Marble')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      granite: validMaterials.filter(m => m.type.includes('جرانيت') || m.type.includes('Granite')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      terrazzo: validMaterials.filter(m => m.type.includes('تيرازو') || m.type.includes('Terrazzo')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      location, deadline, description, selectedSuppliers,
      status: 'open', createdAt: new Date().toISOString()
    };

    const requests = JSON.parse(localStorage.getItem('requests') || '[]');
    requests.push(request);
    localStorage.setItem('requests', JSON.stringify(requests));
    localStorage.removeItem(STORAGE_KEY);
    alert(language === 'ar' ? 'تم إنشاء الطلب بنجاح!' : 'Request created successfully!');
    router.push('/my-requests');
  };

  const translations = {
    ar: {
      title: 'إنشاء طلب جديد', hint: 'اختر من القائمة واضغط "+ أو" لإضافة خيار آخر',
      materials: 'المواد المطلوبة', material: 'نوع المادة', usage: 'الاستخدام',
      size: 'المقاس', thickness: 'السماكة', finish: 'الفنش', color: 'اللون',
      qty: 'الكمية', unit: 'الوحدة', targetPrice: 'السعر المستهدف',
      deliveryDate: 'تاريخ التوريد', origin: 'الصناعة', addMaterial: '+ إضافة مادة',
      city: 'المدينة', selectCity: 'اختر مدينة...',
      deadline: 'الموعد النهائي لتقديم عروض الأسعار',
      desc: 'الوصف (اختياري)', descPlaceholder: 'أضف تفاصيل إضافية...',
      suppliers: 'اختر الموردين', noSuppliers: 'لا يوجد موردين مسجلين بعد',
      selectAll: 'اختيار الكل', deselectAll: 'إلغاء الكل',
      submit: 'إنشاء الطلب', select: 'اختر...', optional: 'اختياري', orBtn: '+ أو',
      types: ['سيراميك', 'بورسلان', 'رخام', 'جرانيت', 'تيرازو', 'حجر طبيعي'],
      usages: ['أرضيات', 'جدران', 'وزر', 'درج', 'مغاسل', 'واجهات', 'أسطح'],
      sizes: ['30×30', '40×40', '60×60', '60×120', '80×80', '80×160', '100×100', '120×120', '120×240', '20×60', '25×75', '30×60'],
      thicknesses: ['6mm', '8mm', '10mm', '12mm', '15mm', '18mm', '20mm'],
      finishes: ['بوليش', 'مات', 'ساتان', 'بوشهامر', 'لابراتو', 'أنتيك'],
      colors: ['أبيض', 'كريمي', 'رمادي فاتح', 'رمادي غامق', 'أسود', 'بيج', 'بني', 'خشبي', 'أزرق', 'أخضر'],
      units: ['م²', 'م طولي', 'قطعة', 'حبة'],
      origins: ['وطني', 'صيني', 'أوروبي', 'إيطالي', 'إسباني', 'تركي', 'عماني', 'إماراتي', 'مصري', 'هندي'],
    },
    en: {
      title: 'Create New Request', hint: 'Select from the list and press "+ OR" to add another option',
      materials: 'Required Materials', material: 'Material', usage: 'Usage',
      size: 'Size', thickness: 'Thickness', finish: 'Finish', color: 'Color',
      qty: 'Qty', unit: 'Unit', targetPrice: 'Target Price',
      deliveryDate: 'Delivery Date', origin: 'Origin', addMaterial: '+ Add Material',
      city: 'City', selectCity: 'Select a city...',
      deadline: 'Quote Submission Deadline',
      desc: 'Description (Optional)', descPlaceholder: 'Add more details...',
      suppliers: 'Select Suppliers', noSuppliers: 'No suppliers registered yet',
      selectAll: 'Select All', deselectAll: 'Deselect All',
      submit: 'Create Request', select: 'Select...', optional: 'Optional', orBtn: '+ OR',
      types: ['Ceramic', 'Porcelain', 'Marble', 'Granite', 'Terrazzo', 'Natural Stone'],
      usages: ['Flooring', 'Walls', 'Skirting', 'Stairs', 'Sinks', 'Facades', 'Surfaces'],
      sizes: ['30×30', '40×40', '60×60', '60×120', '80×80', '80×160', '100×100', '120×120', '120×240', '20×60', '25×75', '30×60'],
      thicknesses: ['6mm', '8mm', '10mm', '12mm', '15mm', '18mm', '20mm'],
      finishes: ['Polished', 'Matte', 'Satin', 'Bush-hammered', 'Labradorite', 'Antique'],
      colors: ['White', 'Cream', 'Light Gray', 'Dark Gray', 'Black', 'Beige', 'Brown', 'Wood', 'Blue', 'Green'],
      units: ['m²', 'Linear m', 'Piece', 'Unit'],
      origins: ['Local', 'Chinese', 'European', 'Italian', 'Spanish', 'Turkish', 'Omani', 'Emirati', 'Egyptian', 'Indian'],
    }
  };

  const tx = language === 'ar' ? translations.ar : translations.en;

  const thStyle: React.CSSProperties = { padding: '10px 6px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6', color: '#333', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', textAlign: 'center' };
  const tdStyle: React.CSSProperties = { padding: '6px 4px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top', minWidth: '130px' };
  const selectStyle: React.CSSProperties = { padding: '5px 4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', color: '#333', backgroundColor: '#fff', flex: 1 };
  const orBtnStyle: React.CSSProperties = { padding: '5px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' };
  const inputStyle: React.CSSProperties = { padding: '5px 6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', color: '#333', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' };

  const TokenDisplay = ({ id, field, value }: { id: number, field: keyof MaterialRow, value: string }) => {
    const tokens = value.split(/ أو | OR /g).map(t => t.trim()).filter(Boolean);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
        {tokens.map((token, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#d4edda', border: '1px solid #28a745', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#155724' }}>
            {token}
            <button type="button" onClick={() => removeToken(id, field, token)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', fontWeight: 'bold', fontSize: '13px', padding: '0', lineHeight: 1 }}
            >×</button>
          </span>
        ))}
      </div>
    );
  };

  const OrField = ({ row, valueField, pendingField, options }: { row: MaterialRow, valueField: keyof MaterialRow, pendingField: keyof MaterialRow, options: string[] }) => (
    <div>
      {(row[valueField] as string) && (
        <TokenDisplay id={row.id} field={valueField} value={row[valueField] as string} />
      )}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <select value={row[pendingField] as string}
          onChange={e => updateRow(row.id, pendingField, e.target.value)}
          style={selectStyle}
        >
          <option value="">{tx.select}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button type="button" onClick={() => addOr(row.id, valueField, pendingField)} style={orBtnStyle}>
          {tx.orBtn}
        </button>
      </div>
    </div>
  );

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>{tx.title}</h1>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>{tx.hint}</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>{tx.materials}</h3>
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
                    <th style={{ ...thStyle, minWidth: '90px' }}>{tx.targetPrice}</th>
                    <th style={{ ...thStyle, minWidth: '130px' }}>{tx.deliveryDate}</th>
                    <th style={thStyle}>{tx.origin}</th>
                    <th style={{ ...thStyle, minWidth: '40px' }}>✕</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(row => (
                    <tr key={row.id}>
                      <td style={tdStyle}><OrField row={row} valueField="type" pendingField="typePending" options={tx.types} /></td>
                      <td style={tdStyle}><OrField row={row} valueField="usage" pendingField="usagePending" options={tx.usages} /></td>
                      <td style={tdStyle}><OrField row={row} valueField="size" pendingField="sizePending" options={tx.sizes} /></td>
                      <td style={tdStyle}><OrField row={row} valueField="thickness" pendingField="thicknessPending" options={tx.thicknesses} /></td>
                      <td style={tdStyle}><OrField row={row} valueField="finish" pendingField="finishPending" options={tx.finishes} /></td>
                      <td style={tdStyle}><OrField row={row} valueField="color" pendingField="colorPending" options={tx.colors} /></td>
                      <td style={{ ...tdStyle, minWidth: '80px' }}>
                        <input type="number" value={row.quantity}
                          onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                          placeholder="0" min="0" style={inputStyle} />
                      </td>
                      <td style={{ ...tdStyle, minWidth: '80px' }}>
                        <select value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)}
                          style={{ ...inputStyle, padding: '5px 4px' }}>
                          {tx.units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tdStyle, minWidth: '90px' }}>
                        <input type="number" value={row.targetPrice}
                          onChange={e => updateRow(row.id, 'targetPrice', e.target.value)}
                          placeholder={tx.optional} min="0" style={inputStyle} />
                      </td>
                      <td style={{ ...tdStyle, minWidth: '130px' }}>
                        <input type="date" value={row.deliveryDate}
                          onChange={e => updateRow(row.id, 'deliveryDate', e.target.value)}
                          style={inputStyle} />
                      </td>
                      <td style={tdStyle}><OrField row={row} valueField="origin" pendingField="originPending" options={tx.origins} /></td>
                      <td style={{ ...tdStyle, textAlign: 'center', minWidth: '40px' }}>
                        <button type="button" onClick={() => removeRow(row.id)}
                          style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addRow}
              style={{ marginTop: '12px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
            >{tx.addMaterial}</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>{tx.city}</label>
              <select value={location} onChange={e => setLocation(e.target.value)} required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', color: '#333', backgroundColor: '#fff' }}
              >
                <option value="">{tx.selectCity}</option>
                {saudiCities.map(city => (
                  <option key={city} value={city}>{language === 'ar' ? city : getCityName(city, 'en')}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>{tx.deadline}</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', color: '#333', fontSize: '16px', backgroundColor: '#fff' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>{tx.desc}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder={tx.descPlaceholder}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', color: '#333', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>{tx.suppliers}</label>
              {suppliers.length > 0 && (
                <button type="button" onClick={handleSelectAll}
                  style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >{selectedSuppliers.length === suppliers.length ? tx.deselectAll : tx.selectAll}</button>
              )}
            </div>
            {suppliers.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px', color: '#666', textAlign: 'center' }}>{tx.noSuppliers}</div>
            ) : (
              <div style={{ border: '1px solid #ddd', borderRadius: '4px', maxHeight: '250px', overflowY: 'auto' }}>
                {suppliers.map((supplier, index) => (
                  <div key={supplier.email} onClick={() => handleSupplierToggle(supplier.email)}
                    style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', borderBottom: index < suppliers.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer', backgroundColor: selectedSuppliers.includes(supplier.email) ? '#e7f3ff' : '#fff', gap: '12px' }}
                  >
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
            <p style={{ color: selectedSuppliers.length > 0 ? '#007bff' : '#666', fontSize: '13px', marginTop: '8px', fontWeight: selectedSuppliers.length > 0 ? 'bold' : 'normal' }}>
              {language === 'ar' ? `تم اختيار ${selectedSuppliers.length} مورد` : `${selectedSuppliers.length} supplier(s) selected`}
            </p>
          </div>

          <button type="submit"
            style={{ width: '100%', padding: '14px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
          >{tx.submit}</button>
        </form>
      </div>
    </div>
  );
}