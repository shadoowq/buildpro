'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

interface MaterialRow {
  id: number;
  type: string; typePending: string;
  usage: string; usagePending: string;
  size: string; sizePending: string;
  thickness: string; thicknessPending: string;
  finish: string; finishPending: string;
  color: string; colorPending: string;
  quantity: string;
  unit: string;
  targetPrice: string;
  currency: string;
  deliveryDate: string;
  origin: string; originPending: string;
  images: string[];
  note: string;
}

interface Draft {
  id: number;
  contractorId: string;
  materials: MaterialRow[];
  location: string;
  deadline: string;
  description: string;
  selectedSuppliers: string[];
  savedAt: string;
}

export default function Drafts() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'contractor') { router.push('/dashboard'); return; }
    setUser(parsedUser);

    const allDrafts = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
    const myDrafts = allDrafts.filter((d: Draft) => d.contractorId === parsedUser.email);
    setDrafts(myDrafts.sort((a: Draft, b: Draft) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));

    const savedLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
    setLanguage(savedLang);

    const interval = setInterval(() => {
      const newLang = localStorage.getItem('language') as 'ar' | 'en' || 'ar';
      setLanguage(prev => prev !== newLang ? newLang : prev);
    }, 100);

    return () => clearInterval(interval);
  }, [router]);

 const handleContinue = (draft: Draft) => {
  localStorage.setItem('createRequestDraft', JSON.stringify({
    materials: draft.materials,
    location: draft.location,
    deadline: draft.deadline,
    description: draft.description,
    selectedSuppliers: draft.selectedSuppliers,
    attachedFiles: [],
  }));
  localStorage.setItem('currentDraftId', String(draft.id));
  localStorage.setItem('loadingFromDraft', 'true');
  router.push('/create-request');
};

  const handleDelete = (draftId: number) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه المسودة؟' : 'Are you sure you want to delete this draft?')) return;
    const allDrafts = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
    const updated = allDrafts.filter((d: Draft) => d.id !== draftId);
    localStorage.setItem('requestDrafts', JSON.stringify(updated));
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') + ' ' +
      date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getMaterialsSummary = (materials: MaterialRow[]) => {
    const valid = materials.filter(m => m.type?.trim() || m.typePending?.trim());
    if (valid.length === 0) return language === 'ar' ? 'لا توجد مواد' : 'No materials';
    return valid.map(m => m.type || m.typePending).filter(Boolean).join('، ');
  };

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />
      <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h1 style={{ color: '#333', margin: 0 }}>
            {language === 'ar' ? 'مسوداتي' : 'My Drafts'}
          </h1>
          <a href="/create-request" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}>
            {language === 'ar' ? '+ طلب جديد' : '+ New Request'}
          </a>
        </div>

        {drafts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8f9fa', borderRadius: '12px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ color: '#333', marginBottom: '8px' }}>
              {language === 'ar' ? 'لا توجد مسودات' : 'No Drafts'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px' }}>
              {language === 'ar' ? 'لما تحفظ طلب كمسودة هيظهر هنا' : 'When you save a request as draft it will appear here'}
            </p>
            <a href="/create-request" style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
              {language === 'ar' ? 'إنشاء طلب جديد' : 'Create New Request'}
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {drafts.map(draft => (
              <div key={draft.id} style={{ backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        {language === 'ar' ? 'مسودة' : 'Draft'}
                      </span>
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        {language === 'ar' ? 'حُفظت في:' : 'Saved:'} {formatDate(draft.savedAt)}
                      </span>
                    </div>
                    <h3 style={{ color: '#333', margin: 0, fontSize: '16px' }}>
                      {getMaterialsSummary(draft.materials)}
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
                  <div>
                    <p style={{ margin: 0, color: '#999', fontSize: '11px' }}>{language === 'ar' ? 'المدينة' : 'City'}</p>
                    <p style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: 'bold' }}>{draft.location || (language === 'ar' ? 'غير محدد' : 'Not set')}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#999', fontSize: '11px' }}>{language === 'ar' ? 'الموعد النهائي' : 'Deadline'}</p>
                    <p style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: 'bold' }}>{draft.deadline || (language === 'ar' ? 'غير محدد' : 'Not set')}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#999', fontSize: '11px' }}>{language === 'ar' ? 'عدد المواد' : 'Materials'}</p>
                    <p style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: 'bold' }}>{draft.materials.filter(m => m.type?.trim() || m.typePending?.trim()).length}</p>
                  </div>
                </div>

                {draft.description && (
                  <p style={{ color: '#666', fontSize: '13px', margin: '0 0 12px 0', padding: '8px 12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                    {draft.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleContinue(draft)}
                    style={{ flex: 2, padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                  >{language === 'ar' ? 'استكمال الطلب' : 'Continue Request'}</button>
                  <button onClick={() => handleDelete(draft.id)}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                  >{language === 'ar' ? 'حذف' : 'Delete'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}