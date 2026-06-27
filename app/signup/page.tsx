'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [language, setLanguage] = useState('ar');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    phone: '',
    userType: 'contractor'
  });
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language');
      if (newLang && newLang !== language) {
        setLanguage(newLang);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [language]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.name || !formData.company) {
      setError(language === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields required');
      return;
    }

    if (formData.password.length < 6) {
      setError(language === 'ar' ? 'كلمة المرور 6 أحرف على الأقل' : 'Min 6 characters');
      return;
    }

    const existingUser = localStorage.getItem(`user_${formData.email}`);
    if (existingUser) {
      setError(language === 'ar' ? 'البريد مستخدم بالفعل' : 'Email exists');
      return;
    }

    const userData = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      company: formData.company,
      phone: formData.phone,
      userType: formData.userType,
      verified: false,
      rating: 0,
      joinDate: new Date().toISOString()
    };

    localStorage.setItem(`user_${formData.email}`, JSON.stringify(userData));

const users = JSON.parse(localStorage.getItem('users') || '[]');
const alreadyExists = users.find((u: any) => u.email === formData.email);
if (!alreadyExists) {
  users.push(userData);
  localStorage.setItem('users', JSON.stringify(users));
}

alert(language === 'ar' ? 'تم الإنشاء بنجاح' : 'Created successfully');
    router.push('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      direction: language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px', fontSize: '28px' }}>
          {language === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
              {language === 'ar' ? 'نوع الحساب' : 'Account Type'}
            </label>
            <select 
              name="userType" 
              value={formData.userType} 
              onChange={handleChange} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd', 
                borderRadius: '4px', 
                color: '#333',
                fontSize: '16px',
                backgroundColor: '#fff',
                fontWeight: '500'
              }}
            >
              <option value="contractor" style={{ color: '#333', fontSize: '16px' }}>
                {language === 'ar' ? 'مقاول' : 'Contractor'}
              </option>
              <option value="supplier" style={{ color: '#333', fontSize: '16px' }}>
                {language === 'ar' ? 'مورد' : 'Supplier'}
              </option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
              {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
            </label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd', 
                borderRadius: '4px', 
                color: '#333',
                fontSize: '16px',
                boxSizing: 'border-box'
              }} 
              placeholder={language === 'ar' ? 'أدخل اسمك' : 'Your name'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
              {language === 'ar' ? 'اسم الشركة' : 'Company Name'}
            </label>
            <input 
              type="text" 
              name="company" 
              value={formData.company} 
              onChange={handleChange} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd', 
                borderRadius: '4px', 
                color: '#333',
                fontSize: '16px',
                boxSizing: 'border-box'
              }} 
              placeholder={language === 'ar' ? 'اسم الشركة' : 'Company name'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
              {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
            </label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd', 
                borderRadius: '4px', 
                color: '#333',
                fontSize: '16px',
                boxSizing: 'border-box'
              }} 
              placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
              {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd', 
                borderRadius: '4px', 
                color: '#333',
                fontSize: '16px',
                boxSizing: 'border-box'
              }} 
              placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
              {language === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #ddd', 
                borderRadius: '4px', 
                color: '#333',
                fontSize: '16px',
                boxSizing: 'border-box'
              }} 
              placeholder={language === 'ar' ? 'كلمة المرور' : 'Password'}
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '16px',
              marginBottom: '15px'
            }}
          >
            {language === 'ar' ? 'إنشاء الحساب' : 'Create Account'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666', margin: '0' }}>
              {language === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
              <a 
                href="/login" 
                style={{ 
                  color: '#007bff', 
                  textDecoration: 'none',
                  marginLeft: '5px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                {language === 'ar' ? 'دخول' : 'Login'}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}