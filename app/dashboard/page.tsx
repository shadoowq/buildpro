'use client';
import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  selectedSuppliers?: string[];
}

interface Quote {
  id: number;
  requestId: number;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  totalPrice: number;
  deliveryDays: number;
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
  createdAt: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [activeRequests, setActiveRequests] = useState(0);
  const [closedRequests, setClosedRequests] = useState(0);
  const [allOpenRequests, setAllOpenRequests] = useState(0);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [newQuotes, setNewQuotes] = useState(0);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);
  const [avgPrice, setAvgPrice] = useState<number | null>(null);
  const [acceptedQuotes, setAcceptedQuotes] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    const allRequests: Request[] = JSON.parse(localStorage.getItem('requests') || '[]');
    const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');

    if (parsedUser.userType === 'contractor') {
      const userRequests = allRequests.filter(req => req.contractorId === parsedUser.email);
      const userRequestIds = userRequests.map(r => r.id);
      const userQuotes = allQuotes.filter(q => userRequestIds.includes(q.requestId));

      setActiveRequests(userRequests.filter(req => req.status === 'open').length);
      setClosedRequests(userRequests.filter(req => req.status === 'closed').length);
      setTotalQuotes(userQuotes.length);
      setAcceptedQuotes(userQuotes.filter(q => q.status === 'accepted').length);

      const seen = JSON.parse(localStorage.getItem(`seenQuotes_${parsedUser.email}`) || '[]');
      const unseenQuotes = userQuotes.filter(q => q.status === 'pending' && !seen.includes(q.id));
      setNewQuotes(unseenQuotes.length);

      const prices = userQuotes.filter(q => q.totalPrice > 0).map(q => q.totalPrice);
      if (prices.length > 0) {
        setLowestPrice(Math.min(...prices));
        setAvgPrice(Math.round(prices.reduce((a, b) => a + b, 0) / prices.length));
      }
    } else {
      setAllOpenRequests(allRequests.filter(req =>
        req.status === 'open' &&
        req.selectedSuppliers &&
        req.selectedSuppliers.includes(parsedUser.email)
      ).length);
    }

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [router, language]);

  if (!user) return <div>جاري التحميل...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #dee2e6' }}>
          <h2 style={{ color: '#333', marginTop: 0 }}>
            {language === 'ar' ? 'مرحباً' : 'Welcome'} {user.name}
          </h2>
          <p style={{ color: '#666', fontSize: '16px', margin: '10px 0' }}>
            <strong>{language === 'ar' ? 'البريد:' : 'Email:'}</strong> {user.email}
          </p>
          <p style={{ color: '#666', fontSize: '16px', margin: '10px 0' }}>
            <strong>{language === 'ar' ? 'نوع الحساب:' : 'Account Type:'}</strong> {user.userType === 'contractor' ? (language === 'ar' ? 'مقاول' : 'Contractor') : (language === 'ar' ? 'مورد' : 'Supplier')}
          </p>
        </div>

        {user.userType === 'contractor' ? (
          <>
            {newQuotes > 0 && (
              <div style={{ backgroundColor: '#d4edda', border: '1px solid #28a745', borderRadius: '8px', padding: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                onClick={() => router.push('/my-requests')}
              >
                <span style={{ fontSize: '20px' }}>🔔</span>
                <p style={{ margin: 0, color: '#155724', fontWeight: 'bold', fontSize: '15px' }}>
                  {language === 'ar'
                    ? `عندك ${newQuotes} عرض سعر جديد — اضغط هنا لعرضه`
                    : `You have ${newQuotes} new quote(s) — click here to view`
                  }
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#e7f3ff', padding: '20px', borderRadius: '8px', border: '2px solid #007bff', cursor: 'pointer' }}
                onClick={() => router.push('/my-requests')}
              >
                <h3 style={{ color: '#333', marginTop: 0, fontSize: '15px' }}>
                  {language === 'ar' ? 'الطلبات النشطة' : 'Active Requests'}
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff', margin: '10px 0' }}>{activeRequests}</p>
                <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>{language === 'ar' ? 'اضغط للعرض' : 'Click to view'}</p>
              </div>

              <div style={{ backgroundColor: '#e7f7f1', padding: '20px', borderRadius: '8px', border: '2px solid #28a745', cursor: 'pointer' }}
                onClick={() => router.push('/my-requests')}
              >
                <h3 style={{ color: '#333', marginTop: 0, fontSize: '15px' }}>
                  {language === 'ar' ? 'الطلبات المغلقة' : 'Closed Requests'}
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745', margin: '10px 0' }}>{closedRequests}</p>
                <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>{language === 'ar' ? 'اضغط للعرض' : 'Click to view'}</p>
              </div>

              <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', border: '2px solid #ffc107', cursor: 'pointer' }}
                onClick={() => router.push('/my-requests')}
              >
                <h3 style={{ color: '#333', marginTop: 0, fontSize: '15px' }}>
                  {language === 'ar' ? 'إجمالي العروض' : 'Total Quotes'}
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#856404', margin: '10px 0' }}>{totalQuotes}</p>
                <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
                  {acceptedQuotes} {language === 'ar' ? 'مقبول' : 'accepted'}
                </p>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '2px solid #6c757d' }}>
                <h3 style={{ color: '#333', marginTop: 0, fontSize: '15px' }}>
                  {language === 'ar' ? 'أقل سعر عرض' : 'Lowest Quote'}
                </h3>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745', margin: '10px 0' }}>
                  {lowestPrice ? `${lowestPrice.toLocaleString()} ${language === 'ar' ? 'ر.س' : 'SAR'}` : (language === 'ar' ? 'لا يوجد' : 'N/A')}
                </p>
                <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
                  {language === 'ar' ? 'متوسط:' : 'Avg:'} {avgPrice ? `${avgPrice.toLocaleString()} ${language === 'ar' ? 'ر.س' : 'SAR'}` : (language === 'ar' ? 'لا يوجد' : 'N/A')}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <a href="/create-request" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}>
                {language === 'ar' ? '+ طلب جديد' : '+ New Request'}
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', border: '2px solid #ffc107', marginBottom: '20px', cursor: 'pointer' }}
              onClick={() => router.push('/supplier-requests')}
            >
              <h3 style={{ color: '#333', marginTop: 0 }}>
                {language === 'ar' ? 'الطلبات المتاحة' : 'Available Requests'}
              </h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107', margin: '10px 0' }}>{allOpenRequests}</p>
              <p style={{ color: '#666', margin: 0 }}>{language === 'ar' ? 'اضغط لعرض الطلبات وتقديم عروض الأسعار' : 'Click to view requests and submit quotes'}</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <a href="/supplier-requests" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#ffc107', color: 'black', textDecoration: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}>
                {language === 'ar' ? 'عرض الطلبات المتاحة' : 'View Available Requests'}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}