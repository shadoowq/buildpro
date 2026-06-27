'use client';

import { useState, useEffect } from 'react';
import LanguageSwitcher from './components/LanguageSwitcher';
import { getTranslation } from './lib/translations';

export default function Home() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      setLanguage(savedLang);
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <LanguageSwitcher />
      
      <h1>{getTranslation('home_title', language)}</h1>
      <p>{getTranslation('home_subtitle', language)}</p>
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <a href="/login" style={{ 
          display: 'inline-block',
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          textDecoration: 'none',
          borderRadius: '4px'
        }}>
          {getTranslation('home_login', language)}
        </a>
        
        <a href="/signup" style={{ 
          display: 'inline-block',
          padding: '10px 20px', 
          backgroundColor: '#28a745', 
          color: 'white', 
          textDecoration: 'none',
          borderRadius: '4px'
        }}>
          {getTranslation('home_signup', language)}
        </a>
      </div>
    </div>
  );
}