'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [language, setLanguage] = useState('ar');
  const [userType, setUserType] = useState('contractor');
  const router = useRouter();

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'ar';
    setLanguage(savedLang);

    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      setUserType(user.userType || 'contractor');
    }

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') || 'ar';
      if (newLang !== language) setLanguage(newLang);
    }, 100);

    return () => clearInterval(interval);
  }, [language]);

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    localStorage.setItem('language', newLang);
    setLanguage(newLang);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  return (
    <div style={{ position: 'fixed', top: '0', left: '0', right: '0', height: '60px', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 999, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>
        BuildPro
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <a href="/dashboard" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </a>

        {userType === 'contractor' && (
          <>
            <a href="/my-requests" style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              {language === 'ar' ? 'طلباتي' : 'My Requests'}
            </a>
            <button onClick={() => { localStorage.removeItem('createRequestDraft'); localStorage.removeItem('currentDraftId'); window.open('/create-request', '_blank'); }}
  style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
  {language === 'ar' ? 'طلب جديد' : 'New Request'}
</button>
            <a href="/drafts" style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: '#333', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              {language === 'ar' ? 'مسوداتي' : 'My Drafts'}
            </a>
          </>
        )}

        {userType === 'supplier' && (
          <>
            <a href="/supplier-requests" style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              {language === 'ar' ? 'الطلبات المتاحة' : 'Available Requests'}
            </a>
            <a href="/my-quotes" style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              {language === 'ar' ? 'عروض أسعاري' : 'My Quotes'}
            </a>
          </>
        )}

        <button onClick={toggleLanguage} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          {language === 'ar' ? 'English' : 'عربي'}
        </button>

        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
          {language === 'ar' ? 'خروج' : 'Logout'}
        </button>
      </div>
    </div>
  );
}