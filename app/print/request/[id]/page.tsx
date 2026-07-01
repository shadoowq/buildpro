'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Lang = 'ar' | 'en';

interface Request {
  id: number;
  contractorId: string;
  projectName?: string;
  materials?: any[];
  ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  location: string; deadline: string;
  budget?: number; description?: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export default function PrintRequest() {
  const params = useParams();
  const id = Number(params.id);
  const [lang, setLang] = useState<Lang>('ar');
  const [req, setReq]   = useState<Request | null>(null);
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Lang || 'ar';
    setLang(savedLang);
    const userData = localStorage.getItem('currentUser');
    const currentUser = userData ? JSON.parse(userData) : null;
    if (currentUser) setUser(currentUser);
    const allReqs: Request[] = JSON.parse(localStorage.getItem('requests') || '[]');
    const found = allReqs.find(r => r.id === id);
    const owned = found && currentUser && found.contractorId === currentUser.email;
    setReq(owned ? found! : null);
    setReady(true);
  }, [id]);

  useEffect(() => {
    if (ready && req) setTimeout(() => window.print(), 600);
  }, [ready, req]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!ready) return null;

  if (!req) return (
    <div className="print-area" style={{ padding: 40, fontFamily: 'Cairo, sans-serif', textAlign: 'center', color: '#94a3b8' }}>
      {lang === 'ar' ? 'الطلب غير موجود' : 'Request not found'}
    </div>
  );

  const getLegacyMaterials = () => {
    const rows: any[] = [];
    const types = [
      { key: 'ceramic',   ar: 'سيراميك',  en: 'Ceramic'   },
      { key: 'porcelain', ar: 'بورسلان',  en: 'Porcelain' },
      { key: 'marble',    ar: 'رخام',     en: 'Marble'    },
      { key: 'granite',   ar: 'جرانيت',   en: 'Granite'   },
      { key: 'terrazzo',  ar: 'تيرازو',   en: 'Terrazzo'  },
    ];
    types.forEach(t => { if ((req as any)[t.key] > 0) rows.push({ type: lang === 'ar' ? t.ar : t.en, quantity: (req as any)[t.key], unit: 'م²' }); });
    return rows;
  };

  const materials = req.materials?.filter((m: any) => m.type?.trim() || m.typePending?.trim()).length
    ? req.materials.filter((m: any) => m.type?.trim() || m.typePending?.trim())
    : getLegacyMaterials();

  const reqName   = req.projectName?.trim() || `${lang === 'ar' ? 'طلب تسعير' : 'RFQ'} #${req.id}`;
  const printDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const colsAr = ['#', 'المادة', 'الاستخدام', 'المقاس', 'السماكة', 'الفنش', 'اللون', 'الكمية', 'السعر المستهدف', 'الصناعة', 'تاريخ التوريد', 'ملاحظات', 'الصور'];
  const colsEn = ['#', 'Material', 'Usage', 'Size', 'Thickness', 'Finish', 'Color', 'Qty', 'Target Price', 'Origin', 'Delivery Date', 'Notes', 'Images'];
  const cols   = lang === 'ar' ? colsAr : colsEn;
  const fields = ['type', 'usage', 'size', 'thickness', 'finish', 'color', 'quantity', 'targetPrice', 'origin', 'deliveryDate', 'note'];

  const cellVal = (m: any, f: string) => {
    if (f === 'quantity')    return m.quantity    ? `${m.quantity} ${m.unit || 'م²'}` : '—';
    if (f === 'targetPrice') return m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : '—';
    if (f === 'type')        return m.type || m.typePending || '—';
    return m[f] || '—';
  };

  const S = {
    th:  { background: '#0F4C75', color: '#fff', fontWeight: 700, padding: '7px 8px', textAlign: (lang === 'ar' ? 'right' : 'left') as 'right' | 'left', border: '1px solid #0D3F63', whiteSpace: 'nowrap' as const, fontSize: 11 },
    tdE: { border: '1px solid #E2EAF2', padding: '6px 8px', color: '#334155', fontSize: 11 },
    tdO: { border: '1px solid #E2EAF2', padding: '6px 8px', color: '#334155', fontSize: 11, background: '#F8FAFC' },
  };

  return (
    <>
      {/* ── controls (hidden on print) ── */}
      <div className="no-print" style={{ display: 'flex', padding: '10px 16px', background: '#0F4C75', gap: 12, alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
        <button onClick={() => window.print()} style={{ color: '#fff', background: '#1B9AAA', border: 'none', borderRadius: 8, padding: '6px 18px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      {/* ── printable area ── */}
      <div className="print-area" dir={dir} style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto', fontFamily: 'Cairo, sans-serif', background: '#ffffff', minHeight: '100vh' }}>

        {/* HEADER */}
        <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F4C75' }}>Build<span style={{ color: '#1B9AAA' }}>Pro</span></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{lang === 'ar' ? 'منصة تسعير مواد البناء' : 'Construction Materials Pricing Platform'}</div>
            </td>
            <td style={{ textAlign: lang === 'ar' ? 'left' : 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F4C75' }}>{lang === 'ar' ? 'طلب تسعير' : 'REQUEST FOR QUOTATION'}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{lang === 'ar' ? 'رقم الطلب:' : 'RFQ No:'} <strong style={{ color: '#0F4C75' }}>#{req.id}</strong></div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{lang === 'ar' ? 'تاريخ الإصدار:' : 'Date:'} {printDate}</div>
            </td>
          </tr></tbody>
        </table>

        <div style={{ height: 3, background: 'linear-gradient(90deg, #0F4C75, #1B9AAA)', borderRadius: 2, marginBottom: 16 }} />

        {/* INFO BOX */}
        <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: lang === 'ar' ? 12 : 0, paddingRight: lang === 'ar' ? 0 : 12 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2EAF2', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#1B9AAA', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'بيانات المقاول' : 'CONTRACTOR INFO'}</div>
                {user && <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0F4C75', marginBottom: 3 }}>{user.name}</div>
                  {user.company && <div style={{ fontSize: 11, color: '#475569' }}>{user.company}</div>}
                  {user.phone   && <div style={{ fontSize: 11, color: '#475569' }}>{user.phone}</div>}
                  {user.city    && <div style={{ fontSize: 11, color: '#475569' }}>📍 {user.city}</div>}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{user.email}</div>
                </>}
              </div>
            </td>
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0F4C75', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'تفاصيل الطلب' : 'REQUEST DETAILS'}</div>
                {req.projectName && <div style={{ fontWeight: 700, fontSize: 13, color: '#0F4C75', marginBottom: 5 }}>{req.projectName}</div>}
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <tbody>
                    {req.location && <tr><td style={{ color: '#64748b', paddingBottom: 3 }}>{lang === 'ar' ? 'المدينة:' : 'City:'}</td><td style={{ fontWeight: 600, color: '#1e293b', paddingBottom: 3 }}>{req.location}</td></tr>}
                    {req.deadline && <tr><td style={{ color: '#64748b', paddingBottom: 3 }}>{lang === 'ar' ? 'الموعد النهائي:' : 'Deadline:'}</td><td style={{ fontWeight: 600, color: '#1e293b', paddingBottom: 3 }}>{req.deadline}</td></tr>}
                    {req.budget   && <tr><td style={{ color: '#64748b', paddingBottom: 3 }}>{lang === 'ar' ? 'الميزانية:' : 'Budget:'}</td><td style={{ fontWeight: 600, color: '#0F4C75', paddingBottom: 3 }}>{Number(req.budget).toLocaleString()} {lang === 'ar' ? 'ر.س' : 'SAR'}</td></tr>}
                    <tr><td style={{ color: '#64748b' }}>{lang === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}</td><td style={{ fontWeight: 600, color: '#1e293b' }}>{new Date(req.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td></tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* MATERIALS TABLE */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#0F4C75', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'المواد المطلوبة' : 'REQUIRED MATERIALS'}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>{cols.map((c, i) => <th key={i} style={S.th}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {materials.length > 0 ? materials.map((m: any, i: number) => {
              const td = i % 2 === 0 ? S.tdE : S.tdO;
              return (
                <tr key={i}>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#0F4C75' }}>{i + 1}</td>
                  {fields.map(f => <td key={f} style={td}>{cellVal(m, f)}</td>)}
                  {/* images cell */}
                  <td style={td}>
                    {m.images?.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.images.map((img: string, j: number) => (
                          <img key={j} src={img} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid #E2EAF2' }} />
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={cols.length} style={{ ...S.tdE, textAlign: 'center', color: '#94a3b8', padding: 16 }}>{lang === 'ar' ? 'لا توجد مواد مفصلة' : 'No detailed materials'}</td></tr>
            )}
          </tbody>
        </table>

        {/* DESCRIPTION */}
        {req.description && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0F4C75', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'ملاحظات إضافية' : 'ADDITIONAL NOTES'}</div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#78350F', lineHeight: 1.7 }}>{req.description}</div>
          </div>
        )}

        {/* SIGNATURES */}
        <div style={{ marginTop: 24, borderTop: '1px solid #E2EAF2', paddingTop: 14 }}>
          <table style={{ width: '100%' }}>
            <tbody><tr>
              {[lang === 'ar' ? 'توقيع المقاول' : 'Contractor Signature', lang === 'ar' ? 'الختم الرسمي' : 'Official Stamp', lang === 'ar' ? 'تاريخ التوقيع' : 'Date'].map((lbl, i) => (
                <td key={i} style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #CBD5E1', marginTop: 32, paddingTop: 5, fontSize: 11, color: '#64748b' }}>{lbl}</div>
                </td>
              ))}
            </tr></tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
          {lang === 'ar' ? `تم إنشاء هذا الطلب عبر منصة BuildPro · ${printDate}` : `Generated via BuildPro platform · ${printDate}`}
        </div>
      </div>
    </>
  );
}
