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

export default function MyRequests() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
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

    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const userRequests = allRequests.filter((req: Request) => req.contractorId === parsedUser.email);
    setRequests(userRequests);

    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    setQuotes(allQuotes);

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [router, language]);

  const toggleRequestStatus = (requestId: number) => {
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const updated = allRequests.map((req: Request) => {
      if (req.id === requestId) {
        return { ...req, status: req.status === 'open' ? 'closed' : 'open' };
      }
      return req;
    });
    localStorage.setItem('requests', JSON.stringify(updated));
    const userRequests = updated.filter((req: Request) => req.contractorId === user.email);
    setRequests(userRequests);
  };

  const handleDeleteRequest = (requestId: number) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure?')) {
      const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
      const newAllRequests = allRequests.filter((req: Request) => req.id !== requestId);
      localStorage.setItem('requests', JSON.stringify(newAllRequests));
      setRequests(newAllRequests.filter((req: Request) => req.contractorId === user.email));
      setSelectedRequest(null);
    }
  };

  const handleQuoteAction = (quoteId: number, action: 'accepted' | 'rejected') => {
    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    const updated = allQuotes.map((q: Quote) => {
      if (q.id === quoteId) return { ...q, status: action };
      return q;
    });
    localStorage.setItem('quotes', JSON.stringify(updated));
    setQuotes(updated);
  };

  const getRequestQuotes = (requestId: number) => {
    return quotes.filter(q => q.requestId === requestId);
  };

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#333' }}>
            {language === 'ar' ? 'طلباتي' : 'My Requests'}
          </h1>
          <a href="/create-request" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            {language === 'ar' ? '+ طلب جديد' : '+ New Request'}
          </a>
        </div>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
            <p style={{ fontSize: '18px' }}>{language === 'ar' ? 'لا توجد طلبات بعد' : 'No requests yet'}</p>
            <a href="/create-request" style={{ display: 'inline-block', marginTop: '15px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              {language === 'ar' ? 'إنشاء طلب الآن' : 'Create Request Now'}
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {requests.map(request => {
              const requestQuotes = getRequestQuotes(request.id);
              return (
                <div key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: request.status === 'closed' ? '#f0f0f0' : '#fff' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ color: '#333', margin: 0 }}>
                      {language === 'ar' ? 'طلب #' : 'Request #'}{request.id}
                    </h3>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: request.status === 'open' ? '#d4edda' : '#e2e3e5', color: request.status === 'open' ? '#155724' : '#383d41' }}>
                      {request.status === 'open' ? (language === 'ar' ? 'مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}
                    </span>
                  </div>

                  <p style={{ color: '#666', margin: '5px 0' }}>
                    <strong>{language === 'ar' ? 'الموقع:' : 'Location:'}</strong> {request.location}
                  </p>
                  <p style={{ color: '#666', margin: '5px 0' }}>
                    <strong>{language === 'ar' ? 'الميزانية:' : 'Budget:'}</strong> {request.budget?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                  </p>
                  <p style={{ color: '#666', margin: '5px 0' }}>
                    <strong>{language === 'ar' ? 'الموعد:' : 'Deadline:'}</strong> {request.deadline}
                  </p>

                  <div style={{ marginTop: '10px', padding: '8px', backgroundColor: requestQuotes.length > 0 ? '#fff3cd' : '#f8f9fa', borderRadius: '4px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: requestQuotes.length > 0 ? '#856404' : '#666' }}>
                      {requestQuotes.length} {language === 'ar' ? 'عرض سعر' : 'Quote(s)'}
                    </span>
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleRequestStatus(request.id); }}
                      style={{ flex: 1, padding: '8px', backgroundColor: request.status === 'open' ? '#ffc107' : '#28a745', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                    >
                      {request.status === 'open' ? (language === 'ar' ? 'إغلاق' : 'Close') : (language === 'ar' ? 'فتح' : 'Reopen')}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/edit-request/${request.id}`); }}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                    >
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedRequest && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setSelectedRequest(null)}
          >
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto', direction: language === 'ar' ? 'rtl' : 'ltr' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>
                  {language === 'ar' ? 'تفاصيل الطلب' : 'Request Details'}
                </h2>
                <button onClick={() => setSelectedRequest(null)}
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >✕</button>
              </div>

              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}>
                <strong>{language === 'ar' ? 'رقم الطلب:' : 'Request ID:'}</strong> <span style={{ color: '#007bff' }}>{selectedRequest.id}</span>
              </p>
              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}>
                <strong>{language === 'ar' ? 'الحالة:' : 'Status:'}</strong>
                <span style={{ marginRight: '10px', marginLeft: '10px', padding: '4px 12px', borderRadius: '20px', backgroundColor: selectedRequest.status === 'open' ? '#d4edda' : '#e2e3e5', color: selectedRequest.status === 'open' ? '#155724' : '#383d41' }}>
                  {selectedRequest.status === 'open' ? (language === 'ar' ? 'مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}
                </span>
              </p>
              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}>
                <strong>{language === 'ar' ? 'الموقع:' : 'Location:'}</strong> {selectedRequest.location}
              </p>
              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}>
                <strong>{language === 'ar' ? 'الميزانية:' : 'Budget:'}</strong> {selectedRequest.budget?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
              </p>
              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}>
                <strong>{language === 'ar' ? 'الموعد:' : 'Deadline:'}</strong> {selectedRequest.deadline}
              </p>

              <h3 style={{ marginTop: '20px', color: '#333' }}>
                {language === 'ar' ? 'المواد المطلوبة' : 'Required Materials'}
              </h3>
              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                {selectedRequest.ceramic > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'السيراميك:' : 'Ceramic:'}</strong> {selectedRequest.ceramic} m²</p>}
                {selectedRequest.porcelain > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'البورسلين:' : 'Porcelain:'}</strong> {selectedRequest.porcelain} m²</p>}
                {selectedRequest.marble > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'الرخام:' : 'Marble:'}</strong> {selectedRequest.marble} m²</p>}
                {selectedRequest.granite > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'الجرانيت:' : 'Granite:'}</strong> {selectedRequest.granite} m²</p>}
                {selectedRequest.terrazzo > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'التيرازو:' : 'Terrazzo:'}</strong> {selectedRequest.terrazzo} m²</p>}
              </div>

              {selectedRequest.description && (
                <>
                  <h3 style={{ color: '#333' }}>{language === 'ar' ? 'الوصف' : 'Description'}</h3>
                  <p style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', color: '#333', lineHeight: '1.6' }}>
                    {selectedRequest.description}
                  </p>
                </>
              )}

              <h3 style={{ marginTop: '20px', color: '#333' }}>
                {language === 'ar' ? 'عروض الأسعار' : 'Quotes'} ({getRequestQuotes(selectedRequest.id).length})
              </h3>

              {getRequestQuotes(selectedRequest.id).length === 0 ? (
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', textAlign: 'center', color: '#999', marginBottom: '20px' }}>
                  {language === 'ar' ? 'لا توجد عروض أسعار بعد' : 'No quotes yet'}
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  {getRequestQuotes(selectedRequest.id).map(quote => (
                    <div key={quote.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '10px', backgroundColor: quote.status === 'accepted' ? '#d4edda' : quote.status === 'rejected' ? '#f8d7da' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <p style={{ margin: '0', fontWeight: 'bold', color: '#333' }}>{quote.supplierCompany}</p>
                          <p style={{ margin: '3px 0', color: '#666', fontSize: '14px' }}>{quote.supplierName}</p>
                        </div>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: quote.status === 'accepted' ? '#28a745' : quote.status === 'rejected' ? '#dc3545' : '#ffc107', color: quote.status === 'pending' ? 'black' : 'white' }}>
                          {quote.status === 'accepted' ? (language === 'ar' ? 'مقبول' : 'Accepted') : quote.status === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') : (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                        </span>
                      </div>
                      <p style={{ color: '#333', margin: '5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                        {quote.totalPrice?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                      </p>
                      <p style={{ color: '#666', margin: '5px 0' }}>
                        {language === 'ar' ? 'مدة التوريد:' : 'Delivery:'} {quote.deliveryDays} {language === 'ar' ? 'يوم' : 'days'}
                      </p>
                      {quote.description && (
                        <p style={{ color: '#666', margin: '5px 0', fontSize: '14px' }}>{quote.description}</p>
                      )}

                      {quote.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button onClick={() => handleQuoteAction(quote.id, 'accepted')}
                            style={{ flex: 1, padding: '8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {language === 'ar' ? 'قبول' : 'Accept'}
                          </button>
                          <button onClick={() => handleQuoteAction(quote.id, 'rejected')}
                            style={{ flex: 1, padding: '8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {language === 'ar' ? 'رفض' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => router.push(`/edit-request/${selectedRequest.id}`)}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button
                  onClick={() => { if (selectedRequest.status === 'closed') { toggleRequestStatus(selectedRequest.id); setSelectedRequest(null); } }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedRequest.status === 'closed' ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: selectedRequest.status === 'closed' ? 1 : 0.5 }}
                  disabled={selectedRequest.status === 'open'}
                >
                  {language === 'ar' ? 'فتح' : 'Open'}
                </button>
                <button
                  onClick={() => { if (selectedRequest.status === 'open') { toggleRequestStatus(selectedRequest.id); setSelectedRequest(null); } }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: selectedRequest.status === 'open' ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: selectedRequest.status === 'open' ? 1 : 0.5 }}
                  disabled={selectedRequest.status === 'closed'}
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
                <button onClick={() => handleDeleteRequest(selectedRequest.id)}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}