'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saudiCities, getCityName } from '@/app/lib/translations';
import Navbar from '../components/Navbar';

export default function CreateRequest() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    ceramic: 0,
    porcelain: 0,
    marble: 0,
    granite: 0,
    terrazzo: 0,
    location: '',
    deadline: '',
    budget: '',
    description: ''
  });
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType === 'supplier') {
      router.push('/supplier-requests');
      return;
    }
    setUser(parsedUser);

    const allSuppliers = Object.keys(localStorage)
      .filter(key => key.startsWith('user_'))
      .map(key => JSON.parse(localStorage.getItem(key) || '{}'))
      .filter(u => u.userType === 'supplier');
    setSuppliers(allSuppliers);

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [router, language]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ceramic' || name === 'porcelain' || name === 'marble' || name === 'granite' || name === 'terrazzo' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSupplierToggle = (email: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(email) ? prev.filter(s => s !== email) : [...prev, email]
    );
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

    const request = {
      id: Date.now(),
      contractorId: user?.email,
      ceramic: formData.ceramic,
      porcelain: formData.porcelain,
      marble: formData.marble,
      granite: formData.granite,
      terrazzo: formData.terrazzo,
      location: formData.location,
      deadline: formData.deadline,
      budget: formData.budget,
      description: formData.description,
      selectedSuppliers: selectedSuppliers,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    const requests = JSON.parse(localStorage.getItem('requests') || '[]');
    requests.push(request);
    localStorage.setItem('requests', JSON.stringify(requests));

    alert(language === 'ar' ? 'تم إنشاء الطلب بنجاح!' : 'Request created successfully!');
    router.push('/my-requests');
  };

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>
          {language === 'ar' ? 'إنشاء طلب جديد' : 'Create New Request'}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'السيراميك (م²)' : 'Ceramic (m²)'}
              </label>
              <input type="number" name="ceramic" value={formData.ceramic} onChange={handleChange} min="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'البورسلين (م²)' : 'Porcelain (m²)'}
              </label>
              <input type="number" name="porcelain" value={formData.porcelain} onChange={handleChange} min="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'الرخام (م²)' : 'Marble (m²)'}
              </label>
              <input type="number" name="marble" value={formData.marble} onChange={handleChange} min="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'الجرانيت (م²)' : 'Granite (m²)'}
              </label>
              <input type="number" name="granite" value={formData.granite} onChange={handleChange} min="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'التيرازو (م²)' : 'Terrazzo (m²)'}
              </label>
              <input type="number" name="terrazzo" value={formData.terrazzo} onChange={handleChange} min="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
                {language === 'ar' ? 'الميزانية (ريال)' : 'Budget (SAR)'}
              </label>
              <input type="number" name="budget" value={formData.budget} onChange={handleChange} min="0"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
              {language === 'ar' ? 'المدينة' : 'City'}
            </label>
            <select name="location" value={formData.location} onChange={handleChange} required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '16px', color: '#333', backgroundColor: '#fff' }}
            >
              <option value="">{language === 'ar' ? 'اختر مدينة...' : 'Select a city...'}</option>
              {saudiCities.map(city => (
                <option key={city} value={city} style={{ color: '#333' }}>
                  {language === 'ar' ? city : getCityName(city, 'en')}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
              {language === 'ar' ? 'تاريخ الموعد النهائي' : 'Deadline'}
            </label>
            <input type="date" name="deadline" value={formData.deadline} onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
              {language === 'ar' ? 'الوصف (اختياري)' : 'Description (Optional)'}
            </label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
              placeholder={language === 'ar' ? 'أضف تفاصيل إضافية...' : 'Add more details...'}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
                {language === 'ar' ? 'اختر الموردين' : 'Select Suppliers'}
              </label>
              {suppliers.length > 0 && (
                <button type="button" onClick={handleSelectAll}
                  style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  {selectedSuppliers.length === suppliers.length
                    ? (language === 'ar' ? 'إلغاء الكل' : 'Deselect All')
                    : (language === 'ar' ? 'اختيار الكل' : 'Select All')}
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
                  <div key={supplier.email}
                    onClick={() => handleSupplierToggle(supplier.email)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 15px',
                      borderBottom: index < suppliers.length - 1 ? '1px solid #f0f0f0' : 'none',
                      cursor: 'pointer',
                      backgroundColor: selectedSuppliers.includes(supplier.email) ? '#e7f3ff' : '#fff',
                      gap: '12px'
                    }}
                  >
                    <input type="checkbox" checked={selectedSuppliers.includes(supplier.email)}
                      onChange={() => handleSupplierToggle(supplier.email)}
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
              {language === 'ar'
                ? `تم اختيار ${selectedSuppliers.length} مورد`
                : `${selectedSuppliers.length} supplier(s) selected`}
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