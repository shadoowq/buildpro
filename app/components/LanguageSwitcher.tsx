'use client';

import { useState, useEffect } from 'react';

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    // جلب اللغة المحفوظة من localStorage
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    // تحديث اتجاه الصفحة
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  return (
    <button
      onClick={toggleLanguage}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        padding: '8px 16px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        zIndex: 1000
      }}
    >
      {language === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}