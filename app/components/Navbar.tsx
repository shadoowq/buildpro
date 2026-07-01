'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

type Lang = 'ar' | 'en';

export default function Navbar() {
  const [lang, setLang] = useState<Lang>('ar');
  const [userType, setUserType] = useState('contractor');
  const [userName, setUserName] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      setUserType(user.userType || 'contractor');
      if (user.name) setUserName(user.name);
    }
    const interval = setInterval(() => {
      const nl = localStorage.getItem('language') as Lang || 'ar';
      setLang(prev => prev !== nl ? nl : prev);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const contractorLinks = [
    { labelAr: 'لوحة التحكم',  labelEn: 'Dashboard',   href: '/dashboard'   },
    { labelAr: 'طلباتي',       labelEn: 'My Requests', href: '/my-requests' },
    { labelAr: 'عروض الأسعار', labelEn: 'Quotes',      href: '/my-quotes'   },
    { labelAr: 'الموردون',     labelEn: 'Suppliers',   href: '/suppliers'   },
    { labelAr: 'المسودات',     labelEn: 'Drafts',      href: '/drafts'      },
  ];

  const supplierLinks = [
    { labelAr: 'الطلبات المتاحة', labelEn: 'Available Requests', href: '/supplier-requests' },
    { labelAr: 'عروض أسعاري',    labelEn: 'My Quotes',           href: '/my-quotes'         },
  ];

  const links = userType === 'supplier' ? supplierLinks : contractorLinks;

  return (
    <nav
      className="bg-white border-b border-[#E8DFD3] px-7 flex items-center justify-between h-14 sticky top-0 z-20 font-cairo"
      dir={dir}
    >
      {/* logo */}
      <div className="text-[17px] font-bold text-[#C0603E]">
        Build<span className="text-[#8A7B6C]">Pro</span>
      </div>

      {/* nav links */}
      <div className="flex gap-1">
        {links.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              pathname === item.href
                ? 'bg-[#F3EAE0] text-[#C0603E] font-semibold'
                : 'text-stone-600 hover:bg-[#F7F2EC] hover:text-[#C0603E]'
            }`}
          >
            {lang === 'ar' ? item.labelAr : item.labelEn}
          </Link>
        ))}

        {userType === 'contractor' && (
          <button
            onClick={() => {
              localStorage.removeItem('createRequestDraft');
              router.push('/create-request');
            }}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-[#8A7B6C] text-white hover:bg-[#6F6255] transition-colors"
          >
            {lang === 'ar' ? '+ طلب جديد' : '+ New Request'}
          </button>
        )}

      </div>

      {/* right section */}
      <div className="flex items-center gap-2">
        {/* language toggle */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
          {(['ar', 'en'] as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => { localStorage.setItem('language', l); setLang(l); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lang === l ? 'bg-white text-[#C0603E] shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <img
                src={l === 'ar' ? 'https://flagcdn.com/w20/sa.png' : 'https://flagcdn.com/w20/us.png'}
                width="20" height="14" alt={l} className="rounded-sm"
              />
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* user avatar */}
        <div className="w-9 h-9 rounded-lg bg-[#C0603E] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          {userName.charAt(0) || 'م'}
        </div>

        {/* logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {lang === 'ar' ? 'خروج' : 'Logout'}
        </button>
      </div>
    </nav>
  );
}
