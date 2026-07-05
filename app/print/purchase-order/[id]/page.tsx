'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Quote, displayVal } from '../../../lib/requestHelpers';
import { currencyLabel } from '../../../lib/materialOptions';
import { generatePoNumber } from '../../../lib/marketplace';

type Lang = 'ar' | 'en';
interface Request { id: number; contractorId: string; projectName?: string; location: string; deadline: string; }

export default function PrintPurchaseOrder() {
  const params = useParams();
  const [lang, setLang] = useState<Lang>('ar');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [req, setReq] = useState<Request | null>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('language') as Lang || 'ar';
      setLang(savedLang);

      const cu = localStorage.getItem('currentUser');
      const currentUser = cu ? JSON.parse(cu) : null;

      const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
      const found = allQuotes.find(q => q.id === Number(params.id)) || null;

      const allReqs: Request[] = JSON.parse(localStorage.getItem('requests') || '[]');
      const foundReq = found ? allReqs.find(r => r.id === found.requestId) : undefined;

      const isContractor = !!(found && foundReq && currentUser && foundReq.contractorId === currentUser.email);
      const isSupplier = !!(found && currentUser && found.supplierId === currentUser.email);
      const owned = !!found && found.status === 'accepted' && (isContractor || isSupplier);

      setQuote(owned ? found : null);
      if (owned && found) {
        setReq(foundReq || null);
        if (foundReq) {
          const contractorStored = localStorage.getItem(`user_${foundReq.contractorId}`);
          setContractor(contractorStored ? JSON.parse(contractorStored) : null);
        }
        const supStored = localStorage.getItem(`user_${found.supplierId}`);
        setSupplier(supStored ? JSON.parse(supStored) : { name: found.supplierName, company: found.supplierCompany, email: found.supplierId });
      }
    } catch {
      setQuote(null);
    }
    setReady(true);
  }, [params.id]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (!ready) return null;

  if (!quote) return (
    <div className="print-area" style={{ padding: 40, fontFamily: 'Cairo, sans-serif', textAlign: 'center', color: '#A8A29E' }}>
      {lang === 'ar' ? 'أمر الشراء غير متاح — يظهر فقط للعروض المقبولة' : 'Purchase order unavailable — only shown for accepted quotes'}
    </div>
  );

  const poNumber = generatePoNumber(quote.quoteNumber, quote.id);
  const printDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const acceptDate = new Date(quote.statusChangedAt || quote.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reqName = req?.projectName?.trim() || `${lang === 'ar' ? 'طلب' : 'Request'} #${quote.requestId}`;
  const executionLabel = quote.executionStatus === 'delivered'
    ? (lang === 'ar' ? 'تم التوريد' : 'Delivered')
    : (lang === 'ar' ? 'قيد التجهيز' : 'Preparing');

  return (
    <>
      <div className="no-print" style={{ display: 'flex', padding: '10px 16px', background: 'var(--chrome)', gap: 12, alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
        <button onClick={() => window.print()} style={{ color: '#fff', background: 'var(--sec)', border: 'none', borderRadius: 8, padding: '6px 18px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
        </button>
      </div>

      <div className="print-area" dir={dir} style={{ padding: '28px 32px', maxWidth: 760, margin: '0 auto', fontFamily: 'Cairo, sans-serif', background: '#fff', minHeight: '100vh' }}>

        <table style={{ width: '100%', marginBottom: 14, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--chrome)' }}>Build<span style={{ color: 'var(--sec)' }}>Pro</span></div>
              <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>{lang === 'ar' ? 'منصة تسعير مواد البناء' : 'Construction Materials Pricing Platform'}</div>
            </td>
            <td style={{ textAlign: lang === 'ar' ? 'left' : 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--chrome)' }}>{lang === 'ar' ? 'أمر شراء' : 'PURCHASE ORDER'}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 3 }}>{lang === 'ar' ? 'رقم أمر الشراء:' : 'PO No:'} <strong style={{ color: 'var(--chrome)' }}>{poNumber}</strong></div>
              <div style={{ fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'تاريخ القبول:' : 'Accepted:'} {acceptDate}</div>
              <div style={{ fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'تاريخ الطباعة:' : 'Printed:'} {printDate}</div>
              <div style={{ marginTop: 6, display: 'inline-block', background: '#05966918', border: '1px solid #05966950', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#059669' }}>
                {executionLabel}
              </div>
            </td>
          </tr></tbody>
        </table>

        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--brand-strong), var(--sec))', borderRadius: 2, marginBottom: 16 }} />

        <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ width: '48%', verticalAlign: 'top', paddingInlineEnd: 12 }}>
              <div style={{ background: 'var(--tint)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--chrome)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'المورد' : 'SUPPLIER'}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--chrome)', marginBottom: 3 }}>{quote.supplierCompany}</div>
                <div style={{ fontSize: 11, color: '#57534E' }}>{quote.supplierName}</div>
                {supplier?.phone && <div style={{ fontSize: 11, color: '#57534E', marginTop: 2 }} dir="ltr">{supplier.phone}</div>}
                <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 3 }}>{quote.supplierId}</div>
              </div>
            </td>
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'المقاول' : 'CONTRACTOR'}</div>
                {contractor ? <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#44403C', marginBottom: 3 }}>{contractor.name}</div>
                  {contractor.company && <div style={{ fontSize: 11, color: '#57534E' }}>{contractor.company}</div>}
                  {contractor.phone && <div style={{ fontSize: 11, color: '#57534E' }} dir="ltr">{contractor.phone}</div>}
                </> : <div style={{ fontSize: 11, color: '#A8A29E' }}>{req?.contractorId}</div>}
                {req && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 11 }}>
                    <span style={{ color: '#78716C' }}>{lang === 'ar' ? 'المشروع:' : 'Project:'} </span>
                    <span style={{ fontWeight: 600, color: '#44403C' }}>{reqName}</span>
                    {req.location && <div style={{ color: '#78716C', marginTop: 2 }}>📍 {displayVal(req.location, lang) === '—' ? req.location : req.location}</div>}
                  </div>
                )}
              </div>
            </td>
          </tr></tbody>
        </table>

        <div style={{ background: 'linear-gradient(135deg, var(--brand-strong), var(--sec))', borderRadius: 12, padding: '18px 22px', marginBottom: 16, color: '#fff', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{lang === 'ar' ? 'إجمالي أمر الشراء' : 'PO TOTAL'}</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{Number(quote.totalPrice).toLocaleString()}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{quote.currency ? currencyLabel(quote.currency, lang) : (lang === 'ar' ? 'ريال سعودي' : 'SAR')}</div>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{lang === 'ar' ? 'مدة التوريد' : 'DELIVERY TIME'}</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{quote.deliveryDays}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{lang === 'ar' ? 'يوم عمل' : 'Business Days'}</div>
          </div>
        </div>

        {quote.paymentTerms && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--chrome)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'شروط الدفع' : 'PAYMENT TERMS'}</div>
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#44403C' }}>{quote.paymentTerms}</div>
          </div>
        )}

        <div style={{ marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <table style={{ width: '100%' }}>
            <tbody><tr>
              {[lang === 'ar' ? 'توقيع المورد' : "Supplier's Signature", lang === 'ar' ? 'توقيع المقاول' : "Contractor's Signature"].map((lbl, i) => (
                <td key={i} style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #D6D3D1', marginTop: 32, paddingTop: 5, fontSize: 11, color: '#78716C' }}>{lbl}</div>
                </td>
              ))}
            </tr></tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#A8A29E', borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          {lang === 'ar' ? `تم إنشاء أمر الشراء هذا عبر منصة BuildPro استنادًا إلى عرض السعر ${quote.quoteNumber || quote.id} · ${printDate}` : `Generated via BuildPro platform from quote ${quote.quoteNumber || quote.id} · ${printDate}`}
        </div>
      </div>
    </>
  );
}
