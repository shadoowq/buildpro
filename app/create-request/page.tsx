'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saudiCities, getCityName } from '@/app/lib/translations';
import Navbar from '../components/Navbar';

interface MaterialRow {
  id: number;
  type: string;
  typeCustom: string;
  usage: string;
  usageCustom: string;
  size: string;
  sizeCustom: string;
  thickness: string;
  thicknessCustom: string;
  finish: string;
  finishCustom: string;
  color: string;
  colorCustom: string;
  quantity: string;
  unit: string;
  targetPrice: string;
  origin: string;
  originCustom: string;
}

const defaultRow = (): MaterialRow => ({
  id: Date.now() + Math.random(),
  type: '',
  typeCustom: '',
  usage: '',
  usageCustom: '',
  size: '',
  sizeCustom: '',
  thickness: '',
  thicknessCustom: '',
  finish: '',
  finishCustom: '',
  color: '',
  colorCustom: '',
  quantity: '',
  unit: 'م²',
  targetPrice: '',
  origin: '',
  originCustom: '',
});

export default function CreateRequest() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([defaultRow()]);
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
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

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [router, language]);

  const updateRow = (id: number, field: keyof MaterialRow, value: string) => {
    setMaterials(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
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
    const validMaterials = materials.filter(m => m.type || m.typeCustom);
    if (validMaterials.length === 0) {
      alert(language === 'ar' ? 'الرجاء إضافة مادة واحدة على الأقل' : 'Please add at least one material');
      return;
    }

    const request = {
      id: Date.now(),
      contractorId: user?.email,
      materials: validMaterials.map(m => ({
        type: m.type === 'other' ? m.typeCustom : m.type,
        usage: m.usage === 'other' ? m.usageCustom : m.usage,
        size: m.size === 'other' ? m.sizeCustom : m.size,
        thickness: m.thickness === 'other' ? m.thicknessCustom : m.thickness,
        finish: m.finish === 'other' ? m.finishCustom : m.finish,
        color: m.color === 'other' ? m.colorCustom : m.color,
        quantity: m.quantity,
        unit: m.unit,
        targetPrice: m.targetPrice,
        origin: m.origin === 'other' ? m.originCustom : m.origin,
      })),
      ceramic: validMaterials.filter(m => (m.type === 'سيراميك' || m.typeCustom === 'سيراميك')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      porcelain: validMaterials.filter(m => (m.type === 'بورسلان')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      marble: validMaterials.filter(m => (m.type === 'رخام')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      granite: validMaterials.filter(m => (m.type === 'جرانيت')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      terrazzo: validMaterials.filter(m => (m.type === 'تيرازو')).reduce((s, m) => s + (parseFloat(m.quantity) || 0), 0),
      location,
      deadline,
      description,
      selectedSuppliers,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    const requests = JSON.parse(localStorage.getItem('requests') || '[]');
    requests.push(request);
    localStorage.setItem('requests', JSON.stringify(requests));
    alert(language === 'ar' ? 'تم إنشاء الطلب بنجاح!' : 'Request created successfully!');
    router.push('/my-requests');
  };

  const selectStyle = { padding: '6px 4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', color: '#333', backgroundColor: '#fff', width: '100%' };
  const inputStyle = { padding: '6px 4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', color: '#333', width: '100%', boxSizing: 'border-box' as const };
  const thStyle = { padding: '10px 6px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6', color: '#333', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' as const, textAlign: 'center' as const };
  const tdStyle = { padding: '6px 4px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' as const, minWidth: '100px' };

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>
          {language === 'ar' ? 'إنشاء طلب جديد' : 'Create New Request'}
        </h1>

        <form onSubmit={handleSubmit}>

          {/* جدول المواد */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>
              {language === 'ar' ? 'المواد المطلوبة' : 'Required Materials'}
            </h3>
            <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{language === 'ar' ? 'نوع المادة' : 'Material'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'الاستخدام' : 'Usage'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'المقاس' : 'Size'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'السماكة' : 'Thickness'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'الفنش' : 'Finish'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'اللون' : 'Color'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'الوحدة' : 'Unit'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'السعر المستهدف' : 'Target Price'}</th>
                    <th style={thStyle}>{language === 'ar' ? 'الصناعة' : 'Origin'}</th>
                    <th style={thStyle}>✕</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(row => (
                    <tr key={row.id}>

                      {/* نوع المادة */}
                      <td style={tdStyle}>
                        <select value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)} style={selectStyle}>
                          <option value="">اختر...</option>
                          <option value="سيراميك">سيراميك</option>
                          <option value="بورسلان">بورسلان</option>
                          <option value="رخام">رخام</option>
                          <option value="جرانيت">جرانيت</option>
                          <option value="تيرازو">تيرازو</option>
                          <option value="حجر طبيعي">حجر طبيعي</option>
                          <option value="other">أخرى...</option>
                        </select>
                        {row.type === 'other' && <input value={row.typeCustom} onChange={e => updateRow(row.id, 'typeCustom', e.target.value)} placeholder="اكتب النوع" style={{ ...inputStyle, marginTop: '4px' }} />}
                      </td>

                      {/* الاستخدام */}
                      <td style={tdStyle}>
                        <select value={row.usage} onChange={e => updateRow(row.id, 'usage', e.target.value)} style={selectStyle}>
                          <option value="">اختر...</option>
                          <option value="أرضيات">أرضيات</option>
                          <option value="جدران">جدران</option>
                          <option value="وزر">وزر</option>
                          <option value="درج">درج</option>
                          <option value="مغاسل">مغاسل</option>
                          <option value="واجهات">واجهات</option>
                          <option value="أسطح">أسطح</option>
                          <option value="other">أخرى...</option>
                        </select>
                        {row.usage === 'other' && <input value={row.usageCustom} onChange={e => updateRow(row.id, 'usageCustom', e.target.value)} placeholder="اكتب الاستخدام" style={{ ...inputStyle, marginTop: '4px' }} />}
                      </td>

                      {/* المقاس */}
                      <td style={tdStyle}>
                        <select value={row.size} onChange={e => updateRow(row.id, 'size', e.target.value)} style={selectStyle}>
                          <option value="">اختر...</option>
                          <option value="30×30">30×30</option>
                          <option value="40×40">40×40</option>
                          <option value="60×60">60×60</option>
                          <option value="60×120">60×120</option>
                          <option value="80×80">80×80</option>
                          <option value="80×160">80×160</option>
                          <option value="100×100">100×100</option>
                          <option value="120×120">120×120</option>
                          <option value="120×240">120×240</option>
                          <option value="20×60">20×60</option>
                          <option value="25×75">25×75</option>
                          <option value="30×60">30×60</option>
                          <option value="other">مقاس آخر...</option>
                        </select>
                        {row.size === 'other' && <input value={row.sizeCustom} onChange={e => updateRow(row.id, 'sizeCustom', e.target.value)} placeholder="مثال: 45×90" style={{ ...inputStyle, marginTop: '4px' }} />}
                      </td>

                      {/* السماكة */}
                      <td style={tdStyle}>
                        <select value={row.thickness} onChange={e => updateRow(row.id, 'thickness', e.target.value)} style={selectStyle}>
                          <option value="">اختر...</option>
                          <option value="6mm">6mm</option>
                          <option value="8mm">8mm</option>
                          <option value="10mm">10mm</option>
                          <option value="12mm">12mm</option>
                          <option value="15mm">15mm</option>
                          <option value="18mm">18mm</option>
                          <option value="20mm">20mm</option>
                          <option value="other">أخرى...</option>
                        </select>
                        {row.thickness === 'other' && <input value={row.thicknessCustom} onChange={e => updateRow(row.id, 'thicknessCustom', e.target.value)} placeholder="مثال: 14mm" style={{ ...inputStyle, marginTop: '4px' }} />}
                      </td>

                      {/* الفنش */}
                      <td style={tdStyle}>
                        <select value={row.finish} onChange={e => updateRow(row.id, 'finish', e.target.value)} style={selectStyle}>
                          <option value="">اختر...</option>
                          <option value="بوليش (مصقول لامع)">بوليش (مصقول لامع)</option>
                          <option value="مات (غير لامع)">مات (غير لامع)</option>
                          <option value="ساتان (نص لمعة)">ساتان (نص لمعة)</option>
                          <option value="بوشهامر (خشن)">بوشهامر (خشن)</option>
                          <option value="لابراتو">لابراتو</option>
                          <option value="أنتيك (كلاسيك)">أنتيك (كلاسيك)</option>
                          <option value="other">أخرى...</option>
                        </select>
                        {row.finish === 'other' && <input value={row.finishCustom} onChange={e => updateRow(row.id, 'finishCustom', e.target.value)} placeholder="اكتب الفنش" style={{ ...inputStyle, marginTop: '4px' }} />}
                      </td>

                      {/* اللون */}
                      <td style={tdStyle}>
                        <select value={row.color} onChange={e => updateRow(row.id, 'color', e.target.value)} style={selectStyle}>
                          <option value="">اختر...</option>
                          <option value="أبيض">أبيض</option>
                          <option value="كريمي">كريمي</option>
                          <option value="رمادي فاتح">رمادي فاتح</option>
                          <option value="رمادي غامق">رمادي غامق</option>
                          <option value="أسود">أسود</option>
                          <option value="بيج">بيج</option>
                          <option value="بني">بني</option>
                          <option value="خشبي">خشبي</option>
                          <option value="أزرق">أزرق</option>
                          <option value="أخضر">أخضر</option>
                          <option value="other">لون آخر...</option>
                        </select>
                        {row.color === 'other' && <input value={row.colorCustom} onChange={e => updateRow(row.id, 'colorCustom', e.target.value)} placeholder="اكتب اللون" style={{ ...inputStyle, marginTop: '4px' }} />}
                      </td>

                      {/* الكمية */}
                      <td style={tdStyle}>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                          placeholder="0"
                          min="0"
                          style={inputStyle}
                        />
                      </td>

                      {/* الوحدة */}
                      <td style={tdStyle}>
                        <select value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)} style={selectStyle}>
                          <option value="م²">م²</option>
                          <option value="م طولي">م طولي</option>
                          <option value="قطعة">قطعة</option>
                          <option value="حبة">حبة</option>
                        </select>
                      </td>

                      {/* السعر المستهدف */}
                      <td style={tdStyle}>
                        <input
                          type="number"
                          value={row.targetPrice}
                          onChange={e => updateRow(row.id, 'targetPrice', e.target.value)}
                          placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                          min="0"
                          style={inputStyle}
                        />
                      </td>

                      {/* الصناعة */}
                      <td style={tdStyle}>
                        <select value={row.origin} onChange={e => updateRow(row.id, 'origin', e.target.value)} style={selectStyle}>
                          <option value="">اختر...</option>
                          <option value="وطني">وطني</option>
                          <option value="صيني">صيني</option>
                          <option value="أوروبي">أوروبي</option>
                          <option value="إيطالي">إيطالي</option>
                          <option value="إسباني">إسباني</option>
                          <option value="تركي">تركي</option>
                          <option value="عماني">عماني</option>
                          <option value="إماراتي">إماراتي</option>
                          <option value="مصري">مصري</option>
                          <option value="هندي">هندي</option>
                          <option value="other">أخرى...</option>
                        </select>
                        {row.origin === 'other' && <input value={row.originCustom} onChange={e => updateRow(row.id, 'originCustom', e.target.value)} placeholder="اكتب الصناعة" style={{ ...inputStyle, marginTop: '4px' }} />}
                      </td>

                      {/* حذف */}
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
            >
              {language === 'ar' ? '+ إضافة مادة' : '+ Add Material'}
            </button>
          </div>

          {/* المدينة والموعد والوصف */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'المدينة' : 'City'}
              </label>
              <select value={location} onChange={e => setLocation(e.target.value)} required
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', color: '#333', backgroundColor: '#fff' }}
              >
                <option value="">{language === 'ar' ? 'اختر مدينة...' : 'Select a city...'}</option>
                {saudiCities.map(city => (
                  <option key={city} value={city}>{language === 'ar' ? city : getCityName(city, 'en')}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'تاريخ الموعد النهائي' : 'Deadline'}
              </label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', color: '#333', fontSize: '16px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
              {language === 'ar' ? 'الوصف (اختياري)' : 'Description (Optional)'}
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder={language === 'ar' ? 'أضف تفاصيل إضافية...' : 'Add more details...'}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', color: '#333', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>

          {/* الموردين */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
                {language === 'ar' ? 'اختر الموردين' : 'Select Suppliers'}
              </label>
              {suppliers.length > 0 && (
                <button type="button" onClick={handleSelectAll}
                  style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  {selectedSuppliers.length === suppliers.length ? (language === 'ar' ? 'إلغاء الكل' : 'Deselect All') : (language === 'ar' ? 'اختيار الكل' : 'Select All')}
                </button>
              )}
            </div>

            {suppliers.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px', color: '#666', textAlign: 'center' }}>
                {language === 'ar' ? 'لا يوجد موردين مسجلين بعد' : 'No suppliers registered yet'}
              </div>
            ) : (
              <div style={{ border: '1px solid #ddd', borderRadius: '4px', maxHeight: '250px', overflowY: 'auto' }}>
                {suppliers.map((supplier, index) => (
                  <div key={supplier.email} onClick={() => handleSupplierToggle(supplier.email)}
                    style={{ display: 'flex', alignItems: 'center', padding: '12px 15px', borderBottom: index < suppliers.length - 1 ? '1px solid #f0f0f0' : 'none', cursor: 'pointer', backgroundColor: selectedSuppliers.includes(supplier.email) ? '#e7f3ff' : '#fff', gap: '12px' }}
                  >
                    <input type="checkbox" checked={selectedSuppliers.includes(supplier.email)} onChange={() => handleSupplierToggle(supplier.email)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
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
          >
            {language === 'ar' ? 'إنشاء الطلب' : 'Create Request'}
          </button>
        </form>
      </div>
    </div>
  );
}