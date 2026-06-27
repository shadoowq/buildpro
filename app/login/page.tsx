'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // جلب بيانات المستخدم من localStorage
    const userData = localStorage.getItem('user_' + email);
    
    if (userData) {
      const user = JSON.parse(userData);
      if (user.password === password) {
        // حفظ المستخدم الحالي
        localStorage.setItem('currentUser', JSON.stringify(user));
        alert('تم تسجيل الدخول بنجاح!');
        router.push('/dashboard');
      } else {
        alert('كلمة المرور غير صحيحة!');
      }
    } else {
      alert('البريد الإلكتروني غير موجود!');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>تسجيل الدخول</h1>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>البريد الإلكتروني:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>كلمة المرور:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          دخول
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        ليس لديك حساب؟ <a href="/signup" style={{ color: '#28a745', textDecoration: 'none' }}>إنشاء حساب</a>
      </p>
    </div>
  );
}