'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { saudiCities, getCityName } from '@/app/lib/translations';
import Navbar from '../../components/Navbar';

interface Request {
  id: number;
  contractorId: string;
  ceramic: number;
  porcelain: number;
  marble: number;
  granite: number;
  terrazzo: number;
  location: string;
  deadline: string;
  budget: number;
  description: string;
  status: 'open' | 'closed' | 'completed';
  createdAt: string;
}

export default function EditRequest() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
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
  const params = useParams();
  const requestId = parseInt(params.id as string);

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));

    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const found = allRequests.find((req: Request) => req.id === requestId);
    
    if (found) {
      setFormData({
        ceramic: found.ceramic,
        porcelain: found.porcelain,
        marble: found.marble,
        granite: found.granite,
        terrazzo: found.terrazzo,
        location: found.location,
        deadline: found.deadline,
       budget: found.budget ? found.budget.toString() : '',
        description: found.description
      });
    } else {
      router.push('/my-requests');
    }

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) {
        setLanguage(newLang);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [router, language, requestId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ceramic' || name === 'porcelain' || name === 'marble' || name === 'granite' || name === 'terrazzo' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const updated = allRequests.map((req: Request) => {
      if (req.id === requestId) {
        return {
          ...req,
          ceramic: formData.ceramic,
          porcelain: formData.porcelain,
          marble: formData.marble,
          granite: formData.granite,
          terrazzo: formData.terrazzo,
          location: formData.location,
          deadline: formData.deadline,
          budget: parseFloat(formData.budget) || 0,
          description: formData.description
        };
      }
      return req;
    });

    localStorage.setItem('requests', JSON.stringify(updated));
    alert(language === 'ar' ? 'تم تحديث الطلب بنجاح!' : 'Request updated successfully!');
    router.push('/my-requests');
  };

  if (!user) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ 
        padding: '20px',
        paddingTop: '80px',
        maxWidth: '800px', 
        margin: '0 auto'
      }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>
          {language === 'ar' ? 'تعديل الطلب' : 'Edit Request'}
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit"
              style={{ flex: 1, padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
            >
              {language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
            </button>

            <button type="button" onClick={() => router.push('/my-requests')}
              style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}