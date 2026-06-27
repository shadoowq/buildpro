'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getTranslation } from '@/app/lib/translations';

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

export default function RequestDetails() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const requestId = parseInt(params.id as string);

  useEffect(() => {
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const found = allRequests.find((req: Request) => req.id === requestId);
    
    if (found) {
      setRequest(found);
    }
    setLoading(false);

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) {
        setLanguage(newLang);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [requestId, language]);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!request) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>{language === 'ar' ? 'الطلب غير موجود' : 'Request not found'}</h1>
        <button
          onClick={() => router.push('/my-requests')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          {language === 'ar' ? 'العودة للطلبات' : 'Back to Requests'}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      direction: language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <button
        onClick={() => router.push('/my-requests')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        ← {language === 'ar' ? 'العودة' : 'Back'}
      </button>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h1 style={{ color: '#333', margin: 0 }}>
            {language === 'ar' ? 'طلب #' : 'Request #'}{request.id}
          </h1>
          <span style={{
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: request.status === 'open' ? '#d4edda' : '#e2e3e5',
            color: request.status === 'open' ? '#155724' : '#383d41',
            fontWeight: 'bold'
          }}>
            {request.status === 'open' ? (language === 'ar' ? 'مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}
          </span>
        </div>

        <h2 style={{ color: '#555', marginTop: 0 }}>
          {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>{language === 'ar' ? 'الموقع:' : 'Location:'}</strong> {request.location}
            </p>
          </div>
          <div>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>{language === 'ar' ? 'الميزانية:' : 'Budget:'}</strong> {request.budget.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
            </p>
          </div>
          <div>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>{language === 'ar' ? 'الموعد:' : 'Deadline:'}</strong> {request.deadline}
            </p>
          </div>
          <div>
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>{language === 'ar' ? 'التاريخ:' : 'Created:'}</strong> {new Date(request.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </p>
          </div>
        </div>

        <h2 style={{ color: '#555' }}>
          {language === 'ar' ? 'المواد المطلوبة' : 'Required Materials'}
        </h2>
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
          {request.ceramic > 0 && <p style={{ margin: '8px 0', color: '#666' }}>• {language === 'ar' ? 'السيراميك' : 'Ceramic'}: <strong>{request.ceramic} m²</strong></p>}
          {request.porcelain > 0 && <p style={{ margin: '8px 0', color: '#666' }}>• {language === 'ar' ? 'البورسلين' : 'Porcelain'}: <strong>{request.porcelain} m²</strong></p>}
          {request.marble > 0 && <p style={{ margin: '8px 0', color: '#666' }}>• {language === 'ar' ? 'الرخام' : 'Marble'}: <strong>{request.marble} m²</strong></p>}
          {request.granite > 0 && <p style={{ margin: '8px 0', color: '#666' }}>• {language === 'ar' ? 'الجرانيت' : 'Granite'}: <strong>{request.granite} m²</strong></p>}
          {request.terrazzo > 0 && <p style={{ margin: '8px 0', color: '#666' }}>• {language === 'ar' ? 'التيرازو' : 'Terrazzo'}: <strong>{request.terrazzo} m²</strong></p>}
        </div>

        {request.description && (
          <>
            <h2 style={{ color: '#555' }}>
              {language === 'ar' ? 'الوصف' : 'Description'}
            </h2>
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginBottom: '20px', color: '#666' }}>
              {request.description}
            </div>
          </>
        )}

        <h2 style={{ color: '#555' }}>
          {language === 'ar' ? 'الاقتباسات' : 'Quotes'}
        </h2>
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', textAlign: 'center', color: '#999' }}>
          {language === 'ar' ? 'لا توجد اقتباسات بعد' : 'No quotes yet'}
        </div>
      </div>

      <button
        onClick={() => router.push('/my-requests')}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {language === 'ar' ? 'العودة للطلبات' : 'Back to Requests'}
      </button>
    </div>
  );
}