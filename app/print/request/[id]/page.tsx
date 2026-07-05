'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCurrentUser, getLanguage, getRequests } from '../../../lib/store';
import { getCategory, isTilesCategory } from '../../../lib/materialCategories';
import { displayVal } from '../../../lib/requestHelpers';

type Lang = 'ar' | 'en';

interface Request {
  id: number;
  contractorId: string;
  projectName?: string;
  materials?: any[];
  ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number;
  location: string; deadline: string;
  locationCoords?: { lat: number; lng: number };
  paymentTerms?: string;
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
    try {
      setLang(getLanguage());
      const currentUser = getCurrentUser<any>();
      if (currentUser) setUser(currentUser);
      const allReqs: Request[] = getRequests<Request>();
      const found = allReqs.find(r => r.id === id);
      const owned = found && currentUser && found.contractorId === currentUser.email;
      setReq(owned ? found! : null);
    } catch {
      setReq(null);
    }
    setReady(true);
  }, [id]);

  useEffect(() => {
    if (ready && req) setTimeout(() => window.print(), 600);
  }, [ready, req]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!ready) return null;

  if (!req) return (
    <div className="print-area" style={{ padding: 40, fontFamily: 'Cairo, sans-serif', textAlign: 'center', color: '#A8A29E' }}>
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

  const isMaterialFilled = (m: any) => m.type?.trim() || m.typePending?.trim() || Object.values(m.fields || {}).some((v: any) => v?.trim?.());
  const allMaterials = req.materials?.filter(isMaterialFilled).length
    ? req.materials.filter(isMaterialFilled)
    : getLegacyMaterials();
  const materials = allMaterials.filter((m: any) => isTilesCategory(m.category));
  const otherMaterials = allMaterials.filter((m: any) => !isTilesCategory(m.category));

  const reqName   = req.projectName?.trim() || `${lang === 'ar' ? 'طلب تسعير' : 'RFQ'} #${req.id}`;
  const printDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const colsAr = ['#', 'المادة', 'الاستخدام', 'المقاس', 'السماكة', 'الفنش', 'اللون', 'الكمية', 'السعر المستهدف', 'الصناعة', 'تاريخ التوريد', 'ملاحظات', 'الصور'];
  const colsEn = ['#', 'Material', 'Usage', 'Size', 'Thickness', 'Finish', 'Color', 'Qty', 'Target Price', 'Origin', 'Delivery Date', 'Notes', 'Images'];
  const cols   = lang === 'ar' ? colsAr : colsEn;
  const fields = ['type', 'usage', 'size', 'thickness', 'finish', 'color', 'quantity', 'targetPrice', 'origin', 'deliveryDate', 'note'];

  const cellVal = (m: any, f: string) => {
    if (f === 'quantity')    return m.quantity    ? `${m.quantity} ${displayVal(m.unit, lang) !== '—' ? displayVal(m.unit, lang) : 'م²'}` : '—';
    if (f === 'targetPrice') return m.targetPrice ? `${m.targetPrice} ${m.currency || 'ر.س'}` : '—';
    if (f === 'type')        return displayVal(m.type || m.typePending, lang);
    if (f === 'size' || f === 'thickness' || f === 'deliveryDate' || f === 'note') return m[f] || '—';
    return displayVal(m[f], lang);
  };

  const S = {
    th:  { background: 'var(--chrome)', color: '#fff', fontWeight: 700, padding: '7px 8px', textAlign: (lang === 'ar' ? 'right' : 'left') as 'right' | 'left', border: '1px solid var(--chrome-line)', whiteSpace: 'nowrap' as const, fontSize: 11 },
    tdE: { border: '1px solid var(--line)', padding: '6px 8px', color: '#44403C', fontSize: 11 },
    tdO: { border: '1px solid var(--line)', padding: '6px 8px', color: '#44403C', fontSize: 11, background: 'var(--bg-soft)' },
  };

  return (
    <>
      {/* ── controls (hidden on print) ── */}
      <div className="no-print" style={{ display: 'flex', padding: '10px 16px', background: 'var(--chrome)', gap: 12, alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
        <button onClick={() => window.print()} style={{ color: '#fff', background: 'var(--sec)', border: 'none', borderRadius: 8, padding: '6px 18px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      {/* ── printable area ── */}
      <div className="print-area" dir={dir} style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto', fontFamily: 'Cairo, sans-serif', background: '#ffffff', minHeight: '100vh' }}>

        {/* HEADER */}
        <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--chrome)' }}>Build<span style={{ color: 'var(--sec)' }}>Pro</span></div>
              <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>{lang === 'ar' ? 'منصة تسعير مواد البناء' : 'Construction Materials Pricing Platform'}</div>
            </td>
            <td style={{ textAlign: lang === 'ar' ? 'left' : 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--chrome)' }}>{lang === 'ar' ? 'طلب تسعير' : 'REQUEST FOR QUOTATION'}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 3 }}>{lang === 'ar' ? 'رقم الطلب:' : 'RFQ No:'} <strong style={{ color: 'var(--chrome)' }}>#{req.id}</strong></div>
              <div style={{ fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'تاريخ الإصدار:' : 'Date:'} {printDate}</div>
            </td>
          </tr></tbody>
        </table>

        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--brand-strong), var(--sec))', borderRadius: 2, marginBottom: 16 }} />

        {/* INFO BOX */}
        <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: lang === 'ar' ? 12 : 0, paddingRight: lang === 'ar' ? 0 : 12 }}>
              <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sec)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'بيانات المقاول' : 'CONTRACTOR INFO'}</div>
                {user && <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--chrome)', marginBottom: 3 }}>{user.name}</div>
                  {user.company && <div style={{ fontSize: 11, color: '#57534E' }}>{user.company}</div>}
                  {user.phone   && <div style={{ fontSize: 11, color: '#57534E' }}>{user.phone}</div>}
                  {user.city    && <div style={{ fontSize: 11, color: '#57534E' }}>📍 {user.city}</div>}
                  <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 3 }}>{user.email}</div>
                </>}
              </div>
            </td>
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ background: 'var(--tint)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--chrome)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'تفاصيل الطلب' : 'REQUEST DETAILS'}</div>
                {req.projectName && <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--chrome)', marginBottom: 5 }}>{req.projectName}</div>}
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <tbody>
                    {req.location && <tr><td style={{ color: '#78716C', paddingBottom: 3 }}>{lang === 'ar' ? 'المدينة:' : 'City:'}</td><td style={{ fontWeight: 600, color: '#292524', paddingBottom: 3 }}>{req.location}</td></tr>}
                    {req.locationCoords && <tr><td style={{ color: '#78716C', paddingBottom: 3 }}>{lang === 'ar' ? 'الموقع:' : 'Location:'}</td><td style={{ fontWeight: 600, color: '#292524', paddingBottom: 3 }}>{req.locationCoords.lat.toFixed(5)}, {req.locationCoords.lng.toFixed(5)}</td></tr>}
                    {req.deadline && <tr><td style={{ color: '#78716C', paddingBottom: 3 }}>{lang === 'ar' ? 'الموعد النهائي:' : 'Deadline:'}</td><td style={{ fontWeight: 600, color: '#292524', paddingBottom: 3 }}>{req.deadline}</td></tr>}
                    {req.paymentTerms && <tr><td style={{ color: '#78716C', paddingBottom: 3 }}>{lang === 'ar' ? 'شروط الدفع:' : 'Payment Terms:'}</td><td style={{ fontWeight: 600, color: '#292524', paddingBottom: 3 }}>{req.paymentTerms}</td></tr>}
                    {req.budget   && <tr><td style={{ color: '#78716C', paddingBottom: 3 }}>{lang === 'ar' ? 'الميزانية:' : 'Budget:'}</td><td style={{ fontWeight: 600, color: 'var(--chrome)', paddingBottom: 3 }}>{Number(req.budget).toLocaleString()} {lang === 'ar' ? 'ر.س' : 'SAR'}</td></tr>}
                    <tr><td style={{ color: '#78716C' }}>{lang === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}</td><td style={{ fontWeight: 600, color: '#292524' }}>{new Date(req.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}</td></tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* MATERIALS TABLE */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--chrome)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'المواد المطلوبة' : 'REQUIRED MATERIALS'}</div>
        {materials.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>{cols.map((c, i) => <th key={i} style={S.th}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {materials.map((m: any, i: number) => {
              const td = i % 2 === 0 ? S.tdE : S.tdO;
              return (
                <tr key={i}>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: 'var(--chrome)' }}>{i + 1}</td>
                  {fields.map(f => <td key={f} style={td}>{cellVal(m, f)}</td>)}
                  {/* images cell */}
                  <td style={td}>
                    {m.images?.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.images.map((img: string, j: number) => (
                          <img key={j} src={img} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--line)' }} />
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
        {otherMaterials.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {otherMaterials.map((m: any, i: number) => {
              const cat = getCategory(m.category);
              return (
                <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '8px 12px', background: 'var(--bg-soft)', fontSize: 11 }}>
                  <div style={{ fontWeight: 700, color: 'var(--chrome)', marginBottom: 4 }}>{cat?.icon} {lang === 'ar' ? cat?.labelAr : cat?.labelEn} — #{materials.length + i + 1}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', color: '#44403C' }}>
                    {cat?.fields.map(f => m.fields?.[f.key] && (
                      <span key={f.key}><strong>{lang === 'ar' ? f.labelAr : f.labelEn}:</strong> {displayVal(m.fields[f.key], lang)}</span>
                    ))}
                    {m.quantity && <span><strong>{lang === 'ar' ? 'الكمية' : 'Qty'}:</strong> {m.quantity} {displayVal(m.unit, lang) !== '—' ? displayVal(m.unit, lang) : 'م²'}</span>}
                    {m.targetPrice && <span><strong>{lang === 'ar' ? 'السعر المستهدف' : 'Target Price'}:</strong> {m.targetPrice} {m.currency || 'ر.س'}</span>}
                    {m.deliveryDate && <span><strong>{lang === 'ar' ? 'تاريخ التوريد' : 'Delivery Date'}:</strong> {m.deliveryDate}</span>}
                    {m.note && <span><strong>{lang === 'ar' ? 'ملاحظات' : 'Notes'}:</strong> {m.note}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {materials.length === 0 && otherMaterials.length === 0 && (
          <div style={{ ...S.tdE, textAlign: 'center', color: '#A8A29E', padding: 16, marginBottom: 16 }}>{lang === 'ar' ? 'لا توجد مواد مفصلة' : 'No detailed materials'}</div>
        )}

        {/* DESCRIPTION */}
        {req.description && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--chrome)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'ملاحظات إضافية' : 'ADDITIONAL NOTES'}</div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#78350F', lineHeight: 1.7 }}>{req.description}</div>
          </div>
        )}

        {/* SIGNATURES */}
        <div style={{ marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <table style={{ width: '100%' }}>
            <tbody><tr>
              {[lang === 'ar' ? 'توقيع المقاول' : 'Contractor Signature', lang === 'ar' ? 'الختم الرسمي' : 'Official Stamp', lang === 'ar' ? 'تاريخ التوقيع' : 'Date'].map((lbl, i) => (
                <td key={i} style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #D6D3D1', marginTop: 32, paddingTop: 5, fontSize: 11, color: '#78716C' }}>{lbl}</div>
                </td>
              ))}
            </tr></tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#A8A29E', borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          {lang === 'ar' ? `تم إنشاء هذا الطلب عبر منصة BuildPro · ${printDate}` : `Generated via BuildPro platform · ${printDate}`}
        </div>
      </div>
    </>
  );
}
