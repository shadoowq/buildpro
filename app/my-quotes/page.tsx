'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

interface Quote {
  id: number;
  requestId: number;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  totalPrice: number;
  deliveryDays: number;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface Request {
  id: number;
  location: string;
  ceramic: number;
  porcelain: number;
  marble: number;
  granite: number;
  terrazzo: number;
  deadline: string;
  budget: number;
  status: string;
}

export default function MyQuotes() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    setUser(parsedUser);

    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    const myQuotes = allQuotes.filter((q: Quote) => q.supplierId === parsedUser.email);
    setQuotes(myQuotes);

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [router, language]);

  const getRequest = (requestId: number): Request | null => {
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    return allRequests.find((r: Request) => r.id === requestId) || null;
  };

  const getStatusColor = (status: string) => {
    if (status === 'accepted') return { bg: '#d4edda', color: '#155724' };
    if (status === 'rejected') return { bg: '#f8d7da', color: '#721c24' };
    return { bg: '#fff3cd', color: '#856404' };
  };

  const getStatusText = (status: string) => {
    if (status === 'accepted') return language === 'ar' ? 'مقبول' : 'Accepted';
    if (status === 'rejected') return language === 'ar' ? 'مرفوض' : 'Rejected';
    return language === 'ar' ? 'قيد الانتظار' : 'Pending';
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>
          {language === 'ar' ? 'عروض أسعاري' : 'My Quotes'}
        </h1>

        {quotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
            <p style={{ fontSize: '18px' }}>
              {language === 'ar' ? 'لم تقدم أي عروض أسعار بعد' : 'No quotes submitted yet'}
            </p>
            <a href="/supplier-requests" style={{ display: 'inline-block', marginTop: '15px', padding: '10px 20px', backgroundColor: '#ffc107', color: 'black', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              {language === 'ar' ? 'تصفح الطلبات المتاحة' : 'Browse Available Requests'}
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {quotes.map(quote => {
              const request = getRequest(quote.requestId);
              const statusStyle = getStatusColor(quote.status);
              return (
                <div key={quote.id} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3 style={{ color: '#333', margin: 0 }}>
                      {language === 'ar' ? 'طلب #' : 'Request #'}{quote.requestId}
                    </h3>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: statusStyle.bg, color: statusStyle.color, fontWeight: 'bold' }}>
                      {getStatusText(quote.status)}
                    </span>
                  </div>

                  {request && (
                    <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                      <p style={{ color: '#666', margin: '3px 0', fontSize: '14px' }}>
                        <strong>{language === 'ar' ? 'الموقع:' : 'Location:'}</strong> {request.location}
                      </p>
                      <p style={{ color: '#666', margin: '3px 0', fontSize: '14px' }}>
                        <strong>{language === 'ar' ? 'الموعد:' : 'Deadline:'}</strong> {request.deadline}
                      </p>
                    </div>
                  )}

                  <p style={{ color: '#333', margin: '8px 0', fontSize: '16px' }}>
                    <strong>{language === 'ar' ? 'سعرك:' : 'Your Price:'}</strong> {quote.totalPrice?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                  </p>
                  <p style={{ color: '#333', margin: '8px 0', fontSize: '16px' }}>
                    <strong>{language === 'ar' ? 'مدة التوريد:' : 'Delivery:'}</strong> {quote.deliveryDays} {language === 'ar' ? 'يوم' : 'days'}
                  </p>
                  {quote.description && (
                    <p style={{ color: '#666', margin: '8px 0', fontSize: '14px' }}>
                      <strong>{language === 'ar' ? 'ملاحظات:' : 'Notes:'}</strong> {quote.description}
                    </p>
                  )}
                  <p style={{ color: '#999', margin: '8px 0', fontSize: '12px' }}>
                    {language === 'ar' ? 'تاريخ التقديم:' : 'Submitted:'} {new Date(quote.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}