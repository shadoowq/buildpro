'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Lang = 'ar' | 'en';

interface MaterialRow { id: number; type: string; typePending: string; usage: string; quantity: string; unit: string; [key: string]: any; }
interface Draft { id: number; contractorId: string; projectName?: string; materials: MaterialRow[]; location: string; deadline: string; description: string; selectedSuppliers: string[]; savedAt: string; }

export default function PrintDraft() {
  const params = useParams();
  const id = Number(params.id);
  const [lang, setLang] = useState<Lang>('ar');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [user, setUser]   = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('language') as Lang || 'ar';
      setLang(savedLang);
      const userData = localStorage.getItem('currentUser');
      const currentUser = userData ? JSON.parse(userData) : null;
      if (currentUser) setUser(currentUser);
      const allDrafts: Draft[] = JSON.parse(localStorage.getItem('requestDrafts') || '[]');
      const found = allDrafts.find(d => d.id === id);
      const owned = found && currentUser && found.contractorId === currentUser.email;
      setDraft(owned ? found! : null);
    } catch {
      setDraft(null);
    }
    setReady(true);
  }, [id]);

  useEffect(() => {
    if (ready && draft) setTimeout(() => window.print(), 600);
  }, [ready, draft]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!ready) return null;

  if (!draft) return (
    <div className="print-area" style={{ padding: 40, fontFamily: 'Cairo, sans-serif', textAlign: 'center', color: '#A8A29E' }}>
      {lang === 'ar' ? 'المسودة غير موجودة' : 'Draft not found'}
    </div>
  );

  const materials = draft.materials.filter((m: MaterialRow) => m.type?.trim() || m.typePending?.trim());
  const draftName = draft.projectName?.trim() || (materials.length > 0 ? materials.map(m => m.type || m.typePending).join('، ') : (lang === 'ar' ? 'مسودة' : 'Draft'));
  const printDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const savedDate = new Date(draft.savedAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as any);

  const cols   = lang === 'ar' ? ['#', 'المادة', 'الاستخدام', 'المقاس', 'السماكة', 'الفنش', 'اللون', 'الكمية', 'السعر المستهدف', 'الصناعة', 'تاريخ التوريد', 'ملاحظات', 'الصور'] : ['#', 'Material', 'Usage', 'Size', 'Thickness', 'Finish', 'Color', 'Qty', 'Target Price', 'Origin', 'Delivery Date', 'Notes', 'Images'];
  const fields = ['type', 'usage', 'size', 'thickness', 'finish', 'color', 'quantity', 'targetPrice', 'origin', 'deliveryDate', 'note'];

  const cellVal = (m: any, f: string) => {
    if (f === 'quantity')    return m.quantity    ? `${m.quantity} ${m.unit || 'م²'}` : '—';
    if (f === 'targetPrice') return m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : '—';
    if (f === 'type')        return m.type || m.typePending || '—';
    return m[f] || '—';
  };

  const S = {
    th:  { background: '#57534E', color: '#fff', fontWeight: 700, padding: '7px 8px', textAlign: (lang === 'ar' ? 'right' : 'left') as 'right' | 'left', border: '1px solid #44403C', whiteSpace: 'nowrap' as const, fontSize: 11 },
    tdE: { border: '1px solid #E8DFD3', padding: '6px 8px', color: '#44403C', fontSize: 11 },
    tdO: { border: '1px solid #E8DFD3', padding: '6px 8px', color: '#44403C', fontSize: 11, background: '#FAF7F2' },
  };

  return (
    <>
      <div className="no-print" style={{ display: 'flex', padding: '10px 16px', background: '#57534E', gap: 12, alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
        <button onClick={() => window.print()} style={{ color: '#fff', background: '#8A7B6C', border: 'none', borderRadius: 8, padding: '6px 18px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      <div className="print-area" dir={dir} style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto', fontFamily: 'Cairo, sans-serif', background: '#ffffff', minHeight: '100vh' }}>

        {/* DRAFT BANNER */}
        <div style={{ background: '#FFF7ED', border: '2px dashed #F97316', borderRadius: 8, padding: '8px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📝</span>
            <div>
              <div style={{ fontWeight: 800, color: '#C2410C', fontSize: 13 }}>{lang === 'ar' ? 'مسودة غير مرسلة' : 'DRAFT — NOT SUBMITTED'}</div>
              <div style={{ fontSize: 10, color: '#9A3412' }}>{lang === 'ar' ? 'هذه المسودة لم تُرسل للموردين بعد' : 'This draft has not been sent to suppliers yet'}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#9A3412', textAlign: lang === 'ar' ? 'left' : 'right' }}>
            {lang === 'ar' ? 'آخر حفظ:' : 'Last saved:'} {savedDate}
          </div>
        </div>

        {/* HEADER */}
        <table style={{ width: '100%', marginBottom: 14, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#C0603E' }}>Build<span style={{ color: '#8A7B6C' }}>Pro</span></div>
              <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>{lang === 'ar' ? 'منصة تسعير مواد البناء' : 'Construction Materials Pricing Platform'}</div>
            </td>
            <td style={{ textAlign: lang === 'ar' ? 'left' : 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#57534E' }}>{lang === 'ar' ? 'مسودة طلب تسعير' : 'DRAFT RFQ'}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 3 }}>{lang === 'ar' ? 'رقم المسودة:' : 'Draft No:'} <strong style={{ color: '#57534E' }}>#{draft.id}</strong></div>
              <div style={{ fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'تاريخ الطباعة:' : 'Printed:'} {printDate}</div>
            </td>
          </tr></tbody>
        </table>

        <div style={{ height: 3, background: 'linear-gradient(90deg, #57534E, #A8A29E)', borderRadius: 2, marginBottom: 14 }} />

        {/* INFO */}
        <table style={{ width: '100%', marginBottom: 14, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: lang === 'ar' ? 12 : 0, paddingRight: lang === 'ar' ? 0 : 12 }}>
              <div style={{ background: '#FAF7F2', border: '1px solid #E8DFD3', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8A7B6C', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'بيانات المقاول' : 'CONTRACTOR INFO'}</div>
                {user && <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#C0603E', marginBottom: 3 }}>{user.name}</div>
                  {user.company && <div style={{ fontSize: 11, color: '#57534E' }}>{user.company}</div>}
                  {user.phone   && <div style={{ fontSize: 11, color: '#57534E' }}>{user.phone}</div>}
                  {user.city    && <div style={{ fontSize: 11, color: '#57534E' }}>📍 {user.city}</div>}
                </>}
              </div>
            </td>
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ background: '#FAF7F2', border: '1px solid #E8DFD3', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#57534E', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'تفاصيل المسودة' : 'DRAFT DETAILS'}</div>
                {draft.projectName && <div style={{ fontWeight: 700, fontSize: 13, color: '#44403C', marginBottom: 5 }}>{draft.projectName}</div>}
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <tbody>
                    {draft.location && <tr><td style={{ color: '#78716C', paddingBottom: 3 }}>{lang === 'ar' ? 'المدينة:' : 'City:'}</td><td style={{ fontWeight: 600, paddingBottom: 3 }}>{draft.location}</td></tr>}
                    {draft.deadline && <tr><td style={{ color: '#78716C', paddingBottom: 3 }}>{lang === 'ar' ? 'الموعد النهائي:' : 'Deadline:'}</td><td style={{ fontWeight: 600, paddingBottom: 3 }}>{draft.deadline}</td></tr>}
                    <tr><td style={{ color: '#78716C' }}>{lang === 'ar' ? 'عدد المواد:' : 'Materials:'}</td><td style={{ fontWeight: 600 }}>{materials.length}</td></tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* MATERIALS TABLE */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#57534E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'المواد المطلوبة' : 'REQUIRED MATERIALS'}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>{cols.map((c, i) => <th key={i} style={S.th}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {materials.length > 0 ? materials.map((m: any, i: number) => {
              const td = i % 2 === 0 ? S.tdE : S.tdO;
              return (
                <tr key={i}>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#57534E' }}>{i + 1}</td>
                  {fields.map(f => <td key={f} style={td}>{cellVal(m, f)}</td>)}
                  <td style={td}>
                    {m.images?.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.images.map((img: string, j: number) => (
                          <img key={j} src={img} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid #E8DFD3' }} />
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={cols.length} style={{ ...S.tdE, textAlign: 'center', color: '#A8A29E', padding: 16 }}>{lang === 'ar' ? 'لا توجد مواد' : 'No materials'}</td></tr>
            )}
          </tbody>
        </table>

        {draft.description && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#57534E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'ملاحظات' : 'NOTES'}</div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#78350F', lineHeight: 1.7 }}>{draft.description}</div>
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#A8A29E', borderTop: '1px solid #F1EAE0', paddingTop: 8 }}>
          {lang === 'ar' ? `مسودة — تم إنشاؤها عبر BuildPro · ${printDate}` : `Draft — Created via BuildPro · ${printDate}`}
        </div>
      </div>
    </>
  );
}
