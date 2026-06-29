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
  status: 'pending' | 'accepted' | 'rejected' | 'revision';
  revisionNote?: string;
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

interface ActivityLog {
  id: number;
  requestId: number;
  action: string;
  actionEn: string;
  timestamp: string;
}

interface Rating {
  id: number;
  requestId: number;
  supplierId: string;
  supplierCompany: string;
  rating: number;
  comment: string;
  createdAt: string;
}
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
export default function MyRequests() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [revisionQuoteId, setRevisionQuoteId] = useState<number | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [compareRequest, setCompareRequest] = useState<Request | null>(null);
  const [seenQuotes, setSeenQuotes] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingRequest, setRatingRequest] = useState<Request | null>(null);
  const [ratingQuote, setRatingQuote] = useState<Quote | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratings, setRatings] = useState<Rating[]>([]);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType === 'supplier') { router.push('/supplier-requests'); return; }
    setUser(parsedUser);

    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const userRequests = allRequests.filter((req: Request) => req.contractorId === parsedUser.email);
    setRequests(userRequests);

    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    setQuotes(allQuotes);

    const seen = JSON.parse(localStorage.getItem(`seenQuotes_${parsedUser.email}`) || '[]');
    setSeenQuotes(seen);

    const allLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
    setActivityLogs(allLogs);

    const allRatings = JSON.parse(localStorage.getItem('ratings') || '[]');
    setRatings(allRatings);

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [router, language]);

  const addActivityLog = (requestId: number, action: string, actionEn: string) => {
    const allLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
    const newLog: ActivityLog = {
      id: Date.now(),
      requestId,
      action,
      actionEn,
      timestamp: new Date().toISOString()
    };
    allLogs.push(newLog);
    localStorage.setItem('activityLogs', JSON.stringify(allLogs));
    setActivityLogs(allLogs);
  };

  const getRequestLogs = (requestId: number) => {
    return activityLogs
      .filter(log => log.requestId === requestId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getRequestRating = (requestId: number) => {
    return ratings.find(r => r.requestId === requestId) || null;
  };

  const getSupplierData = (supplierId: string) => {
    const fromKey = localStorage.getItem(`user_${supplierId}`);
    if (fromKey) return JSON.parse(fromKey);
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find((u: any) => u.email === supplierId) || null;
  };

  const getNewQuotesCount = () => {
    const myRequestIds = requests.map(r => r.id);
    return quotes.filter(q =>
      myRequestIds.includes(q.requestId) &&
      q.status === 'pending' &&
      !seenQuotes.includes(q.id)
    ).length;
  };

  const getRequestNewQuotes = (requestId: number) => {
    return quotes.filter(q =>
      q.requestId === requestId &&
      q.status === 'pending' &&
      !seenQuotes.includes(q.id)
    ).length;
  };

  const markRequestQuotesAsSeen = (requestId: number) => {
    const requestQuoteIds = quotes.filter(q => q.requestId === requestId).map(q => q.id);
    const newSeen = [...new Set([...seenQuotes, ...requestQuoteIds])];
    setSeenQuotes(newSeen);
    if (user) localStorage.setItem(`seenQuotes_${user.email}`, JSON.stringify(newSeen));
  };

  const toggleRequestStatus = (requestId: number) => {
    const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
    const req = allRequests.find((r: Request) => r.id === requestId);
    const newStatus = req?.status === 'open' ? 'closed' : 'open';
    const updated = allRequests.map((r: Request) => {
      if (r.id === requestId) return { ...r, status: newStatus };
      return r;
    });
    localStorage.setItem('requests', JSON.stringify(updated));
    setRequests(updated.filter((r: Request) => r.contractorId === user.email));

    if (newStatus === 'closed') {
      addActivityLog(requestId, 'تم إغلاق الطلب', 'Request closed');
      const acceptedQuote = quotes.find(q => q.requestId === requestId && q.status === 'accepted');
      const alreadyRated = ratings.find(r => r.requestId === requestId);
      if (acceptedQuote && !alreadyRated) {
        const reqData = allRequests.find((r: Request) => r.id === requestId);
        setRatingRequest(reqData || null);
        setRatingQuote(acceptedQuote);
        setShowRatingModal(true);
      }
    } else {
      addActivityLog(requestId, 'تم فتح الطلب', 'Request reopened');
    }
  };

  const handleSubmitRating = () => {
    if (ratingStars === 0) {
      alert(language === 'ar' ? 'من فضلك اختار تقييم' : 'Please select a rating');
      return;
    }
    if (!ratingRequest || !ratingQuote) return;

    const allRatings = JSON.parse(localStorage.getItem('ratings') || '[]');
    const newRating: Rating = {
      id: Date.now(),
      requestId: ratingRequest.id,
      supplierId: ratingQuote.supplierId,
      supplierCompany: ratingQuote.supplierCompany,
      rating: ratingStars,
      comment: ratingComment,
      createdAt: new Date().toISOString()
    };
    allRatings.push(newRating);
    localStorage.setItem('ratings', JSON.stringify(allRatings));
    setRatings(allRatings);
    addActivityLog(ratingRequest.id, `تم تقييم ${ratingQuote.supplierCompany} بـ ${ratingStars} نجوم`, `Rated ${ratingQuote.supplierCompany} ${ratingStars} stars`);

    setShowRatingModal(false);
    setRatingStars(0);
    setRatingComment('');
    setRatingRequest(null);
    setRatingQuote(null);
    alert(language === 'ar' ? 'تم إرسال التقييم بنجاح!' : 'Rating submitted successfully!');
  };

  const handleDeleteRequest = (requestId: number) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure?')) {
      const allRequests = JSON.parse(localStorage.getItem('requests') || '[]');
      const newAll = allRequests.filter((req: Request) => req.id !== requestId);
      localStorage.setItem('requests', JSON.stringify(newAll));
      setRequests(newAll.filter((req: Request) => req.contractorId === user.email));
      setSelectedRequest(null);
    }
  };

  const handleQuoteAction = (quoteId: number, action: 'accepted' | 'rejected' | 'pending') => {
    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    const quote = allQuotes.find((q: Quote) => q.id === quoteId);
    const updated = allQuotes.map((q: Quote) => {
      if (q.id === quoteId) return { ...q, status: action };
      return q;
    });
    localStorage.setItem('quotes', JSON.stringify(updated));
    setQuotes(updated);

    if (quote) {
      if (action === 'accepted') {
        addActivityLog(quote.requestId, `تم قبول عرض ${quote.supplierCompany} بسعر ${quote.totalPrice} ر.س`, `Accepted quote from ${quote.supplierCompany} at ${quote.totalPrice} SAR`);
      } else if (action === 'rejected') {
        addActivityLog(quote.requestId, `تم رفض عرض ${quote.supplierCompany}`, `Rejected quote from ${quote.supplierCompany}`);
      } else if (action === 'pending') {
        addActivityLog(quote.requestId, `تم إلغاء القرار على عرض ${quote.supplierCompany}`, `Undid decision on ${quote.supplierCompany} quote`);
      }
    }
  };

  const handleRevisionSubmit = (quoteId: number) => {
    if (!revisionNote.trim()) {
      alert(language === 'ar' ? 'من فضلك اكتب ملاحظة التعديل' : 'Please write a revision note');
      return;
    }
    const allQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    const quote = allQuotes.find((q: Quote) => q.id === quoteId);
    const updated = allQuotes.map((q: Quote) => {
      if (q.id === quoteId) return { ...q, status: 'revision', revisionNote };
      return q;
    });
    localStorage.setItem('quotes', JSON.stringify(updated));
    setQuotes(updated);
    if (quote) {
      addActivityLog(quote.requestId, `تم طلب تعديل على عرض ${quote.supplierCompany}: "${revisionNote}"`, `Requested revision on ${quote.supplierCompany} quote: "${revisionNote}"`);
    }
    setRevisionQuoteId(null);
    setRevisionNote('');
  };

  const getRequestQuotes = (requestId: number) => quotes.filter(q => q.requestId === requestId);

  const filteredRequests = requests.filter(req => {
  const matchesFilter = filter === 'all' || req.status === filter;
  const q = searchQuery.toLowerCase();
  const matchesSearch = !q ||
    req.location?.toLowerCase().includes(q) ||
    String(req.id).includes(q) ||
    (req.ceramic > 0 && 'سيراميك ceramic'.includes(q)) ||
    (req.porcelain > 0 && 'بورسلين porcelain'.includes(q)) ||
    (req.marble > 0 && 'رخام marble'.includes(q)) ||
    (req.granite > 0 && 'جرانيت granite'.includes(q)) ||
    (req.terrazzo > 0 && 'تيرازو terrazzo'.includes(q)) ||
    req.description?.toLowerCase().includes(q);
  return matchesFilter && matchesSearch;
});

  const getLowestPrice = (requestQuotes: Quote[]) => {
    if (requestQuotes.length === 0) return null;
    return Math.min(...requestQuotes.map(q => q.totalPrice));
  };

  const getFastestDelivery = (requestQuotes: Quote[]) => {
    if (requestQuotes.length === 0) return null;
    return Math.min(...requestQuotes.map(q => q.deliveryDays));
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') + ' ' + date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  const newQuotesCount = getNewQuotesCount();

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* تقييم المورد */}
        {showRatingModal && ratingQuote && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '450px', width: '90%', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
              <h2 style={{ color: '#333', margin: '0 0 8px 0', textAlign: 'center' }}>
                {language === 'ar' ? 'قيّم المورد' : 'Rate Supplier'}
              </h2>
              <p style={{ color: '#666', textAlign: 'center', margin: '0 0 20px 0', fontSize: '14px' }}>
                {language === 'ar' ? 'كيف كانت تجربتك مع' : 'How was your experience with'} {ratingQuote.supplierCompany}؟
              </p>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setRatingStars(star)}
                      style={{ fontSize: '40px', cursor: 'pointer', color: star <= ratingStars ? '#ffc107' : '#ddd', transition: 'color 0.2s' }}
                    >★</span>
                  ))}
                </div>
                <p style={{ color: '#666', fontSize: '13px', marginTop: '8px' }}>
                  {ratingStars === 1 ? (language === 'ar' ? 'سيء' : 'Poor') :
                   ratingStars === 2 ? (language === 'ar' ? 'مقبول' : 'Fair') :
                   ratingStars === 3 ? (language === 'ar' ? 'جيد' : 'Good') :
                   ratingStars === 4 ? (language === 'ar' ? 'جيد جداً' : 'Very Good') :
                   ratingStars === 5 ? (language === 'ar' ? 'ممتاز' : 'Excellent') : ''}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
                  {language === 'ar' ? 'ملاحظات (اختياري)' : 'Comments (Optional)'}
                </label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب تجربتك مع المورد...' : 'Write your experience...'}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '80px', fontSize: '14px', boxSizing: 'border-box', color: '#333', backgroundColor: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSubmitRating}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
                >
                  {language === 'ar' ? 'إرسال التقييم' : 'Submit Rating'}
                </button>
                <button onClick={() => { setShowRatingModal(false); setRatingStars(0); setRatingComment(''); }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
                >
                  {language === 'ar' ? 'تخطي' : 'Skip'}
                </button>
              </div>
            </div>
          </div>
        )}

        {newQuotesCount > 0 && (
          <div style={{ backgroundColor: '#d4edda', border: '1px solid #28a745', borderRadius: '8px', padding: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <p style={{ margin: 0, color: '#155724', fontWeight: 'bold', fontSize: '15px' }}>
              {language === 'ar'
                ? `عندك ${newQuotesCount} عرض سعر جديد على طلباتك — افتح الطلب عشان تشوفه`
                : `You have ${newQuotesCount} new quote(s) on your requests — open the request to view`
              }
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#333' }}>{language === 'ar' ? 'طلباتي' : 'My Requests'}</h1>
          <a href="/create-request" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            {language === 'ar' ? '+ طلب جديد' : '+ New Request'}
          </a>
        </div>

        <div style={{ marginBottom: '15px' }}>
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder={language === 'ar' ? 'ابحث بالمدينة أو المادة أو رقم الطلب...' : 'Search by city, material or request ID...'}
    style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', color: '#333', backgroundColor: '#fff' }}
  />
</div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setFilter('all')}
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: filter === 'all' ? '#007bff' : '#e9ecef', color: filter === 'all' ? 'white' : '#333' }}
          >{language === 'ar' ? 'الكل' : 'All'} ({requests.length})</button>
          <button onClick={() => setFilter('open')}
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: filter === 'open' ? '#28a745' : '#e9ecef', color: filter === 'open' ? 'white' : '#333' }}
          >{language === 'ar' ? 'مفتوح' : 'Open'} ({requests.filter(r => r.status === 'open').length})</button>
          <button onClick={() => setFilter('closed')}
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: filter === 'closed' ? '#6c757d' : '#e9ecef', color: filter === 'closed' ? 'white' : '#333' }}
          >{language === 'ar' ? 'مغلق' : 'Closed'} ({requests.filter(r => r.status === 'closed').length})</button>
        </div>

        {filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
            <p style={{ fontSize: '18px' }}>{language === 'ar' ? 'لا توجد طلبات' : 'No requests'}</p>
            <a href="/create-request" style={{ display: 'inline-block', marginTop: '15px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              {language === 'ar' ? 'إنشاء طلب الآن' : 'Create Request Now'}
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredRequests.map(request => {
              const requestQuotes = getRequestQuotes(request.id);
              const newQuotes = getRequestNewQuotes(request.id);
              const requestRating = getRequestRating(request.id);
              return (
                <div key={request.id} onClick={() => { setSelectedRequest(request); markRequestQuotesAsSeen(request.id); }}
                  style={{ padding: '20px', border: newQuotes > 0 ? '2px solid #28a745' : '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: request.status === 'closed' ? '#f0f0f0' : '#fff', position: 'relative' }}
                >
                  {newQuotes > 0 && (
                    <div style={{ position: 'absolute', top: '-10px', left: language === 'ar' ? 'auto' : '-10px', right: language === 'ar' ? '-10px' : 'auto', backgroundColor: '#28a745', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                      {newQuotes}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ color: '#333', margin: 0 }}>{language === 'ar' ? 'طلب #' : 'Request #'}{request.id}</h3>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: request.status === 'open' ? '#d4edda' : '#e2e3e5', color: request.status === 'open' ? '#155724' : '#383d41' }}>
                      {request.status === 'open' ? (language === 'ar' ? 'مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}
                    </span>
                  </div>
                  <p style={{ color: '#666', margin: '5px 0' }}><strong>{language === 'ar' ? 'الموقع:' : 'Location:'}</strong> {request.location}</p>
                  <p style={{ color: '#666', margin: '5px 0' }}><strong>{language === 'ar' ? 'الميزانية:' : 'Budget:'}</strong> {request.budget?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</p>
                  <p style={{ color: '#666', margin: '5px 0' }}><strong>{language === 'ar' ? 'الموعد:' : 'Deadline:'}</strong> {request.deadline}</p>
                  <div style={{ marginTop: '10px', padding: '8px', backgroundColor: requestQuotes.length > 0 ? '#fff3cd' : '#f8f9fa', borderRadius: '4px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: requestQuotes.length > 0 ? '#856404' : '#666' }}>
                      {requestQuotes.length} {language === 'ar' ? 'عرض سعر' : 'Quote(s)'}
                      {newQuotes > 0 && (
                        <span style={{ marginRight: '8px', marginLeft: '8px', backgroundColor: '#28a745', color: 'white', borderRadius: '10px', padding: '2px 8px', fontSize: '12px' }}>
                          {newQuotes} {language === 'ar' ? 'جديد' : 'new'}
                        </span>
                      )}
                    </span>
                  </div>
                  {requestRating && (
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                      <span style={{ color: '#ffc107', fontSize: '16px' }}>{'★'.repeat(requestRating.rating)}{'☆'.repeat(5 - requestRating.rating)}</span>
                      <span style={{ color: '#666', fontSize: '12px', marginRight: '6px', marginLeft: '6px' }}>{language === 'ar' ? 'تم التقييم' : 'Rated'}</span>
                    </div>
                  )}
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleRequestStatus(request.id); }}
                      style={{ flex: 1, padding: '8px', backgroundColor: request.status === 'open' ? '#ffc107' : '#28a745', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                    >{request.status === 'open' ? (language === 'ar' ? 'إغلاق' : 'Close') : (language === 'ar' ? 'فتح' : 'Reopen')}</button>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/create-request?edit=${request.id}`); }}
                      style={{ flex: 1, padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                    >{language === 'ar' ? 'تعديل' : 'Edit'}</button>
                    {requestQuotes.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); setCompareRequest(request); }}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#6610f2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      >{language === 'ar' ? 'مقارنة العروض' : 'Compare Quotes'}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {compareRequest && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setCompareRequest(null)}
          >
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '900px', width: '95%', maxHeight: '85vh', overflowY: 'auto', direction: language === 'ar' ? 'rtl' : 'ltr' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>
                  {language === 'ar' ? 'مقارنة العروض' : 'Compare Quotes'} — {language === 'ar' ? 'طلب #' : 'Request #'}{compareRequest.id}
                </h2>
                <button onClick={() => setCompareRequest(null)}
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >✕</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: language === 'ar' ? 'right' : 'left', borderBottom: '2px solid #dee2e6', color: '#333' }}>{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#333' }}>{language === 'ar' ? 'السعر' : 'Price'}</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#333' }}>{language === 'ar' ? 'مدة التوريد' : 'Delivery'}</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#333' }}>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#333' }}>{language === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', color: '#333' }}>{language === 'ar' ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRequestQuotes(compareRequest.id).map(quote => {
                      const lowestPrice = getLowestPrice(getRequestQuotes(compareRequest.id));
                      const fastestDelivery = getFastestDelivery(getRequestQuotes(compareRequest.id));
                      const isCheapest = quote.totalPrice === lowestPrice;
                      const isFastest = quote.deliveryDays === fastestDelivery;
                      return (
                        <tr key={quote.id} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: quote.status === 'accepted' ? '#d4edda' : 'white' }}>
                          <td style={{ padding: '12px', color: '#333' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{quote.supplierCompany}</p>
                            <p style={{ margin: '2px 0', color: '#666', fontSize: '12px' }}>{quote.supplierName}</p>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: isCheapest ? '#28a745' : '#333', fontSize: '16px' }}>
                              {quote.totalPrice?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                            </p>
                            {isCheapest && <span style={{ fontSize: '11px', backgroundColor: '#d4edda', color: '#155724', padding: '2px 6px', borderRadius: '10px' }}>{language === 'ar' ? 'الأرخص' : 'Cheapest'}</span>}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: isFastest ? '#007bff' : '#333' }}>
                              {quote.deliveryDays} {language === 'ar' ? 'يوم' : 'days'}
                            </p>
                            {isFastest && <span style={{ fontSize: '11px', backgroundColor: '#cce5ff', color: '#004085', padding: '2px 6px', borderRadius: '10px' }}>{language === 'ar' ? 'الأسرع' : 'Fastest'}</span>}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: quote.status === 'accepted' ? '#28a745' : quote.status === 'rejected' ? '#dc3545' : quote.status === 'revision' ? '#ffc107' : '#6c757d', color: quote.status === 'revision' ? 'black' : 'white' }}>
                              {quote.status === 'accepted' ? (language === 'ar' ? 'مقبول' : 'Accepted') : quote.status === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') : quote.status === 'revision' ? (language === 'ar' ? 'تعديل' : 'Revision') : (language === 'ar' ? 'انتظار' : 'Pending')}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '13px', maxWidth: '150px' }}>{quote.description || '—'}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {quote.status === 'pending' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <button onClick={() => { handleQuoteAction(quote.id, 'accepted'); setCompareRequest(null); }}
                                  style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                >{language === 'ar' ? 'قبول' : 'Accept'}</button>
                                <button onClick={() => handleQuoteAction(quote.id, 'rejected')}
                                  style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                >{language === 'ar' ? 'رفض' : 'Reject'}</button>
                              </div>
                            )}
                            {quote.status === 'accepted' && (
                              <button onClick={() => handleQuoteAction(quote.id, 'pending')}
                                style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                              >{language === 'ar' ? 'إلغاء' : 'Undo'}</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                <p style={{ margin: '0', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>{language === 'ar' ? 'ملخص المقارنة:' : 'Comparison Summary:'}</p>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, color: '#28a745', fontSize: '14px' }}>✅ {language === 'ar' ? 'أقل سعر:' : 'Lowest Price:'} {getLowestPrice(getRequestQuotes(compareRequest.id))?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</p>
                  <p style={{ margin: 0, color: '#007bff', fontSize: '14px' }}>⚡ {language === 'ar' ? 'أسرع توريد:' : 'Fastest Delivery:'} {getFastestDelivery(getRequestQuotes(compareRequest.id))} {language === 'ar' ? 'يوم' : 'days'}</p>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>📊 {language === 'ar' ? 'عدد العروض:' : 'Total Quotes:'} {getRequestQuotes(compareRequest.id).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedRequest && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setSelectedRequest(null)}
          >
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '1200px', width: '98%', maxHeight: '95vh', overflowY: 'auto', direction: language === 'ar' ? 'rtl' : 'ltr' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>{language === 'ar' ? 'تفاصيل الطلب' : 'Request Details'}</h2>
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
              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}><strong>{language === 'ar' ? 'الموقع:' : 'Location:'}</strong> {selectedRequest.location}</p>
              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}><strong>{language === 'ar' ? 'الميزانية:' : 'Budget:'}</strong> {selectedRequest.budget?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</p>
              <p style={{ color: '#333', fontSize: '16px', margin: '10px 0' }}><strong>{language === 'ar' ? 'الموعد:' : 'Deadline:'}</strong> {selectedRequest.deadline}</p>

              <h3 style={{ marginTop: '20px', color: '#333' }}>{language === 'ar' ? 'المواد المطلوبة' : 'Required Materials'}</h3>
              {selectedRequest.materials && selectedRequest.materials.length > 0 ? (
                <div style={{ overflowX: 'auto', marginBottom: '20px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'نوع المادة' : 'Material'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'الاستخدام' : 'Usage'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'المقاس' : 'Size'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'السماكة' : 'Thickness'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'الفنش' : 'Finish'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'اللون' : 'Color'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'السعر المستهدف' : 'Target Price'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'الصناعة' : 'Origin'}</th>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'تاريخ التوريد' : 'Delivery Date'}</th>
<th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'وصف البند' : 'Note'}</th>
<th style={{ padding: '10px 8px', borderBottom: '2px solid #dee2e6', color: '#333', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ar' ? 'الصور' : 'Images'}</th>
                    </thead>
                    <tbody>
                      {selectedRequest.materials.map((m: any, index: number) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#666' }}>{index + 1}</td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#333', fontWeight: 'bold' }}>{language === 'en' ? (arToEn[m.type] || m.type || '—') : (m.type || '—')}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{language === 'en' ? (arToEn[m.usage] || m.usage || '—') : (m.usage || '—')}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{m.size || '—'}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{m.thickness || '—'}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{language === 'en' ? (arToEn[m.finish] || m.finish || '—') : (m.finish || '—')}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{language === 'en' ? (arToEn[m.color] || m.color || '—') : (m.color || '—')}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{m.quantity ? `${m.quantity} ${language === 'en' ? (arToEn[m.unit] || m.unit || 'm²') : (m.unit || 'م²')}` : '—'}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : '—'}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#333' }}>{language === 'en' ? (arToEn[m.origin] || m.origin || '—') : (m.origin || '—')}</td>
<td style={{ padding: '8px', textAlign: 'center', color: '#666', fontSize: '12px' }}>{m.note || '—'}</td>
<td style={{ padding: '8px', textAlign: 'center' }}>
  {m.images && m.images.length > 0 ? (
    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
      {m.images.map((img: string, i: number) => (
        <img key={i} src={img} alt="" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }} />
      ))}
    </div>
  ) : '—'}
</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                  {selectedRequest.ceramic > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'السيراميك:' : 'Ceramic:'}</strong> {selectedRequest.ceramic} m²</p>}
                  {selectedRequest.porcelain > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'البورسلين:' : 'Porcelain:'}</strong> {selectedRequest.porcelain} m²</p>}
                  {selectedRequest.marble > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'الرخام:' : 'Marble:'}</strong> {selectedRequest.marble} m²</p>}
                  {selectedRequest.granite > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'الجرانيت:' : 'Granite:'}</strong> {selectedRequest.granite} m²</p>}
                  {selectedRequest.terrazzo > 0 && <p style={{ color: '#333', margin: '8px 0' }}>• <strong>{language === 'ar' ? 'التيرازو:' : 'Terrazzo:'}</strong> {selectedRequest.terrazzo} m²</p>}
                </div>
              )}

              {selectedRequest.description && (
                <>
                  <h3 style={{ color: '#333' }}>{language === 'ar' ? 'الوصف' : 'Description'}</h3>
                  <p style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', color: '#333', lineHeight: '1.6' }}>{selectedRequest.description}</p>
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
                  {getRequestQuotes(selectedRequest.id).map(quote => {
                    const supplierData = quote.status === 'accepted' ? getSupplierData(quote.supplierId) : null;
                    return (
                      <div key={quote.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '10px', backgroundColor: quote.status === 'accepted' ? '#d4edda' : quote.status === 'rejected' ? '#f8d7da' : quote.status === 'revision' ? '#fff3cd' : '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div>
                            <p style={{ margin: '0', fontWeight: 'bold', color: '#333' }}>{quote.supplierCompany}</p>
                            <p style={{ margin: '3px 0', color: '#666', fontSize: '14px' }}>{quote.supplierName}</p>
                          </div>
                          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: quote.status === 'accepted' ? '#28a745' : quote.status === 'rejected' ? '#dc3545' : quote.status === 'revision' ? '#ffc107' : '#6c757d', color: quote.status === 'revision' ? 'black' : 'white' }}>
                            {quote.status === 'accepted' ? (language === 'ar' ? 'مقبول' : 'Accepted') : quote.status === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') : quote.status === 'revision' ? (language === 'ar' ? 'طلب تعديل' : 'Revision Requested') : (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                          </span>
                        </div>
                        <p style={{ color: '#333', margin: '5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                          {quote.totalPrice?.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                        </p>
                        <p style={{ color: '#666', margin: '5px 0' }}>
                          {language === 'ar' ? 'مدة التوريد:' : 'Delivery:'} {quote.deliveryDays} {language === 'ar' ? 'يوم' : 'days'}
                        </p>
                        {quote.description && <p style={{ color: '#666', margin: '5px 0', fontSize: '14px' }}>{quote.description}</p>}

                        {quote.status === 'accepted' && supplierData && (
                          <div style={{ marginTop: '12px', backgroundColor: '#e8f5e9', border: '1px solid #28a745', borderRadius: '6px', padding: '12px' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#155724', fontSize: '14px' }}>{language === 'ar' ? 'بيانات التواصل مع المورد:' : 'Supplier Contact Info:'}</p>
                            <p style={{ margin: '4px 0', color: '#155724', fontSize: '14px' }}><strong>{language === 'ar' ? 'الاسم:' : 'Name:'}</strong> {supplierData.name}</p>
                            <p style={{ margin: '4px 0', color: '#155724', fontSize: '14px' }}><strong>{language === 'ar' ? 'الشركة:' : 'Company:'}</strong> {supplierData.company}</p>
                            <p style={{ margin: '4px 0', color: '#155724', fontSize: '14px' }}><strong>{language === 'ar' ? 'التليفون:' : 'Phone:'}</strong> {supplierData.phone || (language === 'ar' ? 'غير متوفر' : 'N/A')}</p>
                            <p style={{ margin: '4px 0', color: '#155724', fontSize: '14px' }}><strong>{language === 'ar' ? 'الإيميل:' : 'Email:'}</strong> {supplierData.email}</p>
                          </div>
                        )}

                        {quote.status === 'revision' && quote.revisionNote && (
                          <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '10px', marginTop: '10px' }}>
                            <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                              <strong>{language === 'ar' ? 'ملاحظة التعديل:' : 'Revision Note:'}</strong> {quote.revisionNote}
                            </p>
                          </div>
                        )}

                        {quote.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => handleQuoteAction(quote.id, 'accepted')}
                              style={{ flex: 1, padding: '8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >{language === 'ar' ? 'قبول' : 'Accept'}</button>
                            <button onClick={() => setRevisionQuoteId(quote.id)}
                              style={{ flex: 1, padding: '8px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >{language === 'ar' ? 'طلب تعديل' : 'Request Revision'}</button>
                            <button onClick={() => handleQuoteAction(quote.id, 'rejected')}
                              style={{ flex: 1, padding: '8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >{language === 'ar' ? 'رفض' : 'Reject'}</button>
                          </div>
                        )}

                        {revisionQuoteId === quote.id && (
                          <div style={{ marginTop: '10px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333' }}>
                              {language === 'ar' ? 'اكتب ملاحظة التعديل:' : 'Write revision note:'}
                            </p>
                            <textarea
                              value={revisionNote}
                              onChange={(e) => setRevisionNote(e.target.value)}
                              placeholder={language === 'ar' ? 'مثال: عايز السعر أقل، أو مدة التوريد أسرع...' : 'Example: Need lower price or faster delivery...'}
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px', fontSize: '14px', boxSizing: 'border-box', color: '#333', backgroundColor: '#fff' }}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                              <button onClick={() => handleRevisionSubmit(quote.id)}
                                style={{ flex: 1, padding: '8px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                              >{language === 'ar' ? 'إرسال التعديل' : 'Send Revision'}</button>
                              <button onClick={() => { setRevisionQuoteId(null); setRevisionNote(''); }}
                                style={{ flex: 1, padding: '8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                              >{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                            </div>
                          </div>
                        )}

                        {(quote.status === 'accepted' || quote.status === 'rejected' || quote.status === 'revision') && (
                          <div style={{ marginTop: '10px' }}>
                            <button onClick={() => handleQuoteAction(quote.id, 'pending')}
                              style={{ width: '100%', padding: '8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >{language === 'ar' ? 'إلغاء القرار' : 'Undo Decision'}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {getRequestLogs(selectedRequest.id).length > 0 && (
                <>
                  <h3 style={{ marginTop: '20px', color: '#333' }}>
                    {language === 'ar' ? 'تاريخ النشاط' : 'Activity History'}
                  </h3>
                  <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '20px', border: '1px solid #e9ecef' }}>
                    {getRequestLogs(selectedRequest.id).map((log, index) => (
                      <div key={log.id} style={{ padding: '12px 15px', borderBottom: index < getRequestLogs(selectedRequest.id).length - 1 ? '1px solid #e9ecef' : 'none', backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>
                            {log.action.includes('قبول') || log.action.includes('Accepted') ? '✅' :
                             log.action.includes('رفض') || log.action.includes('Rejected') ? '❌' :
                             log.action.includes('تعديل') || log.action.includes('Revision') ? '✏️' :
                             log.action.includes('إغلاق') || log.action.includes('closed') ? '🔒' :
                             log.action.includes('فتح') || log.action.includes('reopened') ? '🔓' :
                             log.action.includes('تقييم') || log.action.includes('Rated') ? '⭐' : '📋'}
                          </span>
                          <p style={{ margin: 0, color: '#333', fontSize: '13px' }}>
                            {language === 'ar' ? log.action : log.actionEn}
                          </p>
                        </div>
                        <p style={{ margin: 0, color: '#999', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {formatDate(log.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => router.push(`/create-request?edit=${selectedRequest.id}`)}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >{language === 'ar' ? 'تعديل' : 'Edit'}</button>
                <button
                  onClick={() => { if (selectedRequest.status === 'closed') { toggleRequestStatus(selectedRequest.id); setSelectedRequest(null); } }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedRequest.status === 'closed' ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: selectedRequest.status === 'closed' ? 1 : 0.5 }}
                  disabled={selectedRequest.status === 'open'}
                >{language === 'ar' ? 'فتح' : 'Open'}</button>
                <button
                  onClick={() => { if (selectedRequest.status === 'open') { toggleRequestStatus(selectedRequest.id); setSelectedRequest(null); } }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: selectedRequest.status === 'open' ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: selectedRequest.status === 'open' ? 1 : 0.5 }}
                  disabled={selectedRequest.status === 'closed'}
                >{language === 'ar' ? 'إغلاق' : 'Close'}</button>
                <button onClick={() => handleDeleteRequest(selectedRequest.id)}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >{language === 'ar' ? 'حذف' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}