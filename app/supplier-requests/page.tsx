'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

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
  selectedSuppliers: string[];
}

export default function SupplierRequests() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    totalPrice: '',
    deliveryDays: '',
    description: ''
  });
  const [showQuoteForm, setShowQuoteForm] = useState(false);
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

    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const myRequests = allRequests.filter((req: Request) =>
      req.status === 'open' &&
      req.selectedSuppliers &&
      req.selectedSuppliers.includes(parsedUser.email)
    );
    setRequests(myRequests);

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [router, language]);

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    const alreadyQuoted = allQuotes.find((q: any) => 
      q.requestId === selectedRequest.id && q.supplierId === user.email
    );

    if (alreadyQuoted) {
      alert(language === 'ar' ? 'لقد قدمت عرض سعر لهذا الطلب من قبل' : 'You already submitted a quote for this request');
      return;
    }

    const quote = {
      id: Date.now(),
      requestId: selectedRequest.id,
      supplierId: user.email,
      supplierName: user.name,
      supplierCompany: user.company,
      totalPrice: parseFloat(quoteForm.totalPrice),
      deliveryDays: parseInt(quoteForm.deliveryDays),
      description: quoteForm.description,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    allQuotes.push(quote);
    localStorage.setItem('quotes', JSON.stringify(allQuotes));

    alert(language === 'ar' ? 'تم إرسال عرض السعر بنجاح!' : 'Quote submitted successfully!');
    setShowQuoteForm(false);
    setSelectedRequest(null);
    setQuoteForm({ totalPrice: '', deliveryDays: '', description: '' });
  };

  const hasQuoted = (requestId: number) => {
    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    return allQuotes.some((q: any) => q.requestId === requestId && q.supplierId === user?.email);
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>
          {language === 'ar' ? 'الطلبات المتاحة لك' : 'Available Requests'}
        </h1>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
            <p style={{ fontSize: '18px' }}>
              {language === 'ar' ? 'لا توجد طلبات متاحة لك الآن' : 'No available requests for you now'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {requests.map(request => (
              <div key={request.id}
                style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', cursor: 'pointer' }}
                onClick={() => { setSelectedRequest(request); setShowQuoteForm(false); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3 style={{ color: '#333', margin: 0 }}>
                    {language === 'ar' ? 'طلب #' : 'Request #'}{request.id}
                  </h3>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#d4edda', color: '#155724' }}>
                    {language === 'ar' ? 'مفتوح' : 'Open'}
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

                <div style={{ marginTop: '10px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                  {request.ceramic > 0 && <p style={{ margin: '3px 0', color: '#333', fontSize: '14px' }}>• {language === 'ar' ? 'سيراميك' : 'Ceramic'}: {request.ceramic} m²</p>}
                  {request.porcelain > 0 && <p style={{ margin: '3px 0', color: '#333', fontSize: '14px' }}>• {language === 'ar' ? 'بورسلين' : 'Porcelain'}: {request.porcelain} m²</p>}
                  {request.marble > 0 && <p style={{ margin: '3px 0', color: '#333', fontSize: '14px' }}>• {language === 'ar' ? 'رخام' : 'Marble'}: {request.marble} m²</p>}
                  {request.granite > 0 && <p style={{ margin: '3px 0', color: '#333', fontSize: '14px' }}>• {language === 'ar' ? 'جرانيت' : 'Granite'}: {request.granite} m²</p>}
                  {request.terrazzo > 0 && <p style={{ margin: '3px 0', color: '#333', fontSize: '14px' }}>• {language === 'ar' ? 'تيرازو' : 'Terrazzo'}: {request.terrazzo} m²</p>}
                </div>

                {hasQuoted(request.id) ? (
                  <div style={{ marginTop: '15px', width: '100%', padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {language === 'ar' ? '✓ تم تقديم عرض السعر' : '✓ Quote Submitted'}
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setShowQuoteForm(true); }}
                    style={{ marginTop: '15px', width: '100%', padding: '10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                  >
                    {language === 'ar' ? 'تقديم عرض سعر' : 'Submit Quote'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedRequest && showQuoteForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => { setShowQuoteForm(false); setSelectedRequest(null); }}
          >
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%', direction: language === 'ar' ? 'rtl' : 'ltr' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>
                  {language === 'ar' ? 'تقديم عرض سعر' : 'Submit Quote'}
                </h2>
                <button onClick={() => { setShowQuoteForm(false); setSelectedRequest(null); }}
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >✕</button>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
                <p style={{ margin: '3px 0', color: '#333', fontWeight: 'bold' }}>
                  {language === 'ar' ? 'طلب #' : 'Request #'}{selectedRequest.id}
                </p>
                <p style={{ margin: '3px 0', color: '#666', fontSize: '14px' }}>
                  {language === 'ar' ? 'الموقع:' : 'Location:'} {selectedRequest.location}
                </p>
                <p style={{ margin: '3px 0', color: '#666', fontSize: '14px' }}>
                  {language === 'ar' ? 'الميزانية:' : 'Budget:'} {selectedRequest.budget?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                </p>
              </div>

              <form onSubmit={handleSubmitQuote}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    {language === 'ar' ? 'السعر الإجمالي (ريال)' : 'Total Price (SAR)'}
                  </label>
                  <input type="number" value={quoteForm.totalPrice}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, totalPrice: e.target.value }))} required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
                    placeholder={language === 'ar' ? 'أدخل السعر الإجمالي' : 'Enter total price'}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    {language === 'ar' ? 'مدة التوريد (أيام)' : 'Delivery Days'}
                  </label>
                  <input type="number" value={quoteForm.deliveryDays}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, deliveryDays: e.target.value }))} required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
                    placeholder={language === 'ar' ? 'عدد الأيام' : 'Number of days'}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    {language === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                  </label>
                  <textarea value={quoteForm.description}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, description: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', fontSize: '16px' }}
                    placeholder={language === 'ar' ? 'أي تفاصيل إضافية...' : 'Any additional details...'}
                  />
                </div>

                <button type="submit"
                  style={{ width: '100%', padding: '12px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                >
                  {language === 'ar' ? 'إرسال العرض' : 'Submit Quote'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}