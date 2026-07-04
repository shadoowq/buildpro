'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Quote, QuoteLineItem, displayVal, getEffectiveQuoteStatus } from '../../../lib/requestHelpers';
import { currencyLabel, resolveOther, lineSubtotal, VAT_RATE } from '../../../lib/materialOptions';

type Lang = 'ar' | 'en';
type PrintMode = 'single' | 'multi';

interface Request { id: number; contractorId: string; projectName?: string; materials?: any[]; ceramic: number; porcelain: number; marble: number; granite: number; terrazzo: number; location: string; deadline: string; }

export default function PrintQuote() {
  const params = useParams();
  const isPreview = params.id === 'preview';
  const [lang, setLang]         = useState<Lang>('ar');
  const [quote, setQuote]       = useState<Quote | null>(null);
  const [req, setReq]           = useState<Request | null>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [supplier, setSupplier]     = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('single');
  const [singlePageHeightMm, setSinglePageHeightMm] = useState<number | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('language') as Lang || 'ar';
      setLang(savedLang);
      setAutoPrint(new URLSearchParams(window.location.search).get('autoprint') === '1');

      const cu = localStorage.getItem('currentUser');
      const currentUser = cu ? JSON.parse(cu) : null;

      let found: Quote | null = null;
      if (isPreview) {
        const previewRaw = localStorage.getItem('quotePreview');
        found = previewRaw ? JSON.parse(previewRaw) : null;
      } else {
        const allQuotes: Quote[] = JSON.parse(localStorage.getItem('quotes') || '[]');
        found = allQuotes.find(q => q.id === Number(params.id)) || null;
      }

      const allReqs: Request[] = JSON.parse(localStorage.getItem('requests') || '[]');
      const foundReq = found ? allReqs.find(r => r.id === found.requestId) : undefined;

      const isContractor = !!(found && foundReq && currentUser && foundReq.contractorId === currentUser.email);
      const isSupplier = !!(found && currentUser && found.supplierId === currentUser.email);
      const owned = isPreview ? !!found : (isContractor || isSupplier);

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
  }, [params.id, isPreview]);

  useEffect(() => {
    if (printMode !== 'single' || !ready || !quote) { setSinglePageHeightMm(null); return; }
    const t = setTimeout(() => {
      const el = printAreaRef.current;
      if (el) {
        const heightMm = Math.ceil(el.scrollHeight * 25.4 / 96) + 20;
        setSinglePageHeightMm(heightMm);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [printMode, ready, quote]);

  const hasAutoPrintedRef = useRef(false);
  useEffect(() => {
    if (!ready || !quote || hasAutoPrintedRef.current) return;
    if (!isPreview && !autoPrint) return;
    if (printMode === 'single' && singlePageHeightMm === null) return;
    hasAutoPrintedRef.current = true;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [ready, quote, printMode, singlePageHeightMm, isPreview, autoPrint]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!ready) return null;

  if (!quote) return (
    <div className="print-area" style={{ padding: 40, fontFamily: 'Cairo, sans-serif', textAlign: 'center', color: '#A8A29E' }}>
      {lang === 'ar' ? 'العرض غير موجود' : 'Quote not found'}
    </div>
  );

  const printDate = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const quoteDate = new Date(quote.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reqName   = req?.projectName?.trim() || `${lang === 'ar' ? 'طلب' : 'Request'} #${quote.requestId}`;
  const statusMap = { pending: { ar: 'قيد الانتظار', en: 'Pending', color: '#D97706' }, accepted: { ar: 'مقبول', en: 'Accepted', color: '#059669' }, rejected: { ar: 'مرفوض', en: 'Rejected', color: '#DC2626' }, revision: { ar: 'طلب تعديل', en: 'Revision', color: '#D97706' }, expired: { ar: 'منتهي الصلاحية', en: 'Expired', color: '#78716C' } };
  const statusInfo = statusMap[getEffectiveQuoteStatus(quote)];

  const getMaterials = () => {
    if (!req) return [];
    const withType = req.materials?.filter((m: any) => m.type?.trim() || m.typePending?.trim());
    if (withType?.length) return withType;
    const rows: any[] = [];
    const types = [{ key: 'ceramic', ar: 'سيراميك', en: 'Ceramic' }, { key: 'porcelain', ar: 'بورسلان', en: 'Porcelain' }, { key: 'marble', ar: 'رخام', en: 'Marble' }, { key: 'granite', ar: 'جرانيت', en: 'Granite' }, { key: 'terrazzo', ar: 'تيرازو', en: 'Terrazzo' }];
    types.forEach(t => { if ((req as any)[t.key] > 0) rows.push({ type: lang === 'ar' ? t.ar : t.en, quantity: (req as any)[t.key], unit: 'م²' }); });
    return rows;
  };

  const materials = getMaterials();
  const S = {
    th:  { background: '#C0603E', color: '#fff', fontWeight: 700, padding: '7px 8px', textAlign: (lang === 'ar' ? 'right' : 'left') as 'right' | 'left', border: '1px solid #9C4C31', fontSize: 11 },
    tdE: { border: '1px solid #E8DFD3', padding: '6px 8px', color: '#44403C', fontSize: 11 },
    tdO: { border: '1px solid #E8DFD3', padding: '6px 8px', color: '#44403C', fontSize: 11, background: '#FAF7F2' },
  };
  const matCols   = lang === 'ar' ? ['#', 'المادة', 'الاستخدام', 'الكمية', 'المقاس', 'الفنش', 'اللون', 'الصناعة'] : ['#', 'Material', 'Usage', 'Qty', 'Size', 'Finish', 'Color', 'Origin'];
  const matFields = ['type', 'usage', 'quantity', 'size', 'finish', 'color', 'origin'];
  const liCols = lang === 'ar'
    ? ['#', 'المادة', 'المقاس', 'السماكة', 'الفنش', 'اللون', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الخصم', 'قبل الضريبة', 'الضريبة', 'الإجمالي', 'وصف البند', 'صورة']
    : ['#', 'Material', 'Size', 'Thickness', 'Finish', 'Color', 'Qty', 'Unit', 'Unit Price', 'Discount', 'Before Tax', 'Tax', 'Total', 'Note', 'Image'];
  const matVal = (m: any, f: string) => {
    if (f === 'quantity') return m.quantity ? `${m.quantity} ${displayVal(m.unit, lang) !== '—' ? displayVal(m.unit, lang) : 'm²'}` : '—';
    if (f === 'type')     return displayVal(m.type || m.typePending, lang);
    return displayVal(m[f], lang);
  };

  return (
    <>
      {printMode === 'single' && singlePageHeightMm && (
        <style>{`@media print { @page { size: 297mm ${singlePageHeightMm}mm; margin: 10mm 12mm; } }`}</style>
      )}

      <div className="no-print" style={{ display: 'flex', padding: '10px 16px', background: '#C0603E', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => window.history.back()} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
        <button onClick={() => window.print()} style={{ color: '#fff', background: '#8A7B6C', border: 'none', borderRadius: 8, padding: '6px 18px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>
          🖨 {lang === 'ar' ? 'طباعة' : 'Print'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 6px', marginInlineStart: 'auto' }}>
          <span style={{ color: '#fff', fontSize: 12, opacity: 0.8, paddingInlineStart: 6 }}>
            {lang === 'ar' ? 'الطباعة في:' : 'Print as:'}
          </span>
          <button onClick={() => setPrintMode('single')}
            style={{ color: '#fff', background: printMode === 'single' ? '#C0603E' : 'transparent', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 12, fontWeight: printMode === 'single' ? 700 : 400 }}>
            {lang === 'ar' ? 'صفحة واحدة' : 'One Page'}
          </button>
          <button onClick={() => setPrintMode('multi')}
            style={{ color: '#fff', background: printMode === 'multi' ? '#C0603E' : 'transparent', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 12, fontWeight: printMode === 'multi' ? 700 : 400 }}>
            {lang === 'ar' ? 'عدة صفحات' : 'Multiple Pages'}
          </button>
        </div>
      </div>

      <div className="print-area quote-print-area" ref={printAreaRef} dir={dir}
        style={{ padding: '24px 28px', paddingBottom: supplier?.letterheadFooter ? 170 : 24, maxWidth: 820, margin: '0 auto', fontFamily: 'Cairo, sans-serif', background: '#ffffff', minHeight: '100vh' }}>

        {/* HEADER */}
        {supplier?.letterhead && (
          <img src={supplier.letterhead} alt="letterhead"
            style={{ width: '100%', maxHeight: 160, objectFit: 'contain', display: 'block', marginBottom: 12 }} />
        )}
        <table style={{ width: '100%', marginBottom: 14, borderCollapse: 'collapse' }}>
          <tbody><tr>
            {!supplier?.letterhead && (
              <td style={{ verticalAlign: 'top' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#C0603E' }}>Build<span style={{ color: '#8A7B6C' }}>Pro</span></div>
                <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>{quote.supplierCompany || (lang === 'ar' ? 'منصة تسعير مواد البناء' : 'Construction Materials Pricing Platform')}</div>
              </td>
            )}
            <td style={{ textAlign: supplier?.letterhead ? (lang === 'ar' ? 'right' : 'left') : (lang === 'ar' ? 'left' : 'right'), verticalAlign: 'top' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#C0603E' }}>{lang === 'ar' ? 'عرض سعر' : 'QUOTATION'}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 3 }}>{lang === 'ar' ? 'رقم العرض:' : 'Quote No:'} <strong style={{ color: '#C0603E' }}>{quote.quoteNumber || `#${quote.id}`}</strong></div>
              <div style={{ fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'تاريخ العرض:' : 'Quote Date:'} {quoteDate}</div>
              <div style={{ fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'تاريخ الطباعة:' : 'Printed:'} {printDate}</div>
              {quote.validUntil && (
                <div style={{ fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'صالح حتى:' : 'Valid Until:'} {quote.validUntil}</div>
              )}
              <div style={{ marginTop: 6, display: 'inline-block', background: `${statusInfo.color}18`, border: `1px solid ${statusInfo.color}50`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: statusInfo.color }}>
                {lang === 'ar' ? statusInfo.ar : statusInfo.en}
              </div>
            </td>
          </tr></tbody>
        </table>

        <div style={{ height: 3, background: 'linear-gradient(90deg, #C0603E, #8A7B6C)', borderRadius: 2, marginBottom: 16 }} />

        {/* FROM / TO */}
        <table style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <tbody><tr>
            <td style={{ width: '48%', verticalAlign: 'top', paddingLeft: lang === 'ar' ? 12 : 0, paddingRight: lang === 'ar' ? 0 : 12 }}>
              <div style={{ background: '#F3EAE0', border: '1px solid #E8DFD3', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#C0603E', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'من: المورد' : 'FROM: SUPPLIER'}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#C0603E', marginBottom: 3 }}>{quote.supplierCompany}</div>
                <div style={{ fontSize: 11, color: '#57534E' }}>{quote.supplierName}</div>
                {supplier?.phone && <div style={{ fontSize: 11, color: '#57534E', marginTop: 2 }}>{supplier.phone}</div>}
                {supplier?.city  && <div style={{ fontSize: 11, color: '#57534E' }}>📍 {supplier.city}</div>}
                <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 3 }}>{quote.supplierId}</div>
              </div>
            </td>
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ background: '#FAF7F2', border: '1px solid #E8DFD3', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>{lang === 'ar' ? 'إلى: المقاول' : 'TO: CONTRACTOR'}</div>
                {contractor ? <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#44403C', marginBottom: 3 }}>{contractor.name}</div>
                  {contractor.company && <div style={{ fontSize: 11, color: '#57534E' }}>{contractor.company}</div>}
                  {contractor.phone   && <div style={{ fontSize: 11, color: '#57534E' }}>{contractor.phone}</div>}
                  {contractor.city    && <div style={{ fontSize: 11, color: '#57534E' }}>📍 {contractor.city}</div>}
                </> : <div style={{ fontSize: 11, color: '#A8A29E' }}>{req?.contractorId}</div>}
                {req && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E8DFD3', fontSize: 11 }}>
                    <span style={{ color: '#78716C' }}>{lang === 'ar' ? 'المشروع:' : 'Project:'} </span>
                    <span style={{ fontWeight: 600, color: '#44403C' }}>{reqName}</span>
                    {req.location && <div style={{ color: '#78716C', marginTop: 2 }}>📍 {req.location}</div>}
                  </div>
                )}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* PRICE BOX */}
        <div style={{ background: 'linear-gradient(135deg, #C0603E, #8A7B6C)', borderRadius: 12, padding: '18px 22px', marginBottom: 16, color: '#fff', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{lang === 'ar' ? 'إجمالي العرض' : 'TOTAL PRICE'}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{Number(quote.totalPrice).toLocaleString()}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{quote.currency ? currencyLabel(quote.currency, lang) : (lang === 'ar' ? 'ريال سعودي' : 'SAR')}</div>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{lang === 'ar' ? 'مدة التوريد' : 'DELIVERY TIME'}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{quote.deliveryDays}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{lang === 'ar' ? 'يوم عمل' : 'Business Days'}</div>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{lang === 'ar' ? 'تاريخ التسليم المتوقع' : 'EXPECTED DELIVERY'}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {new Date(new Date(quote.createdAt).getTime() + quote.deliveryDays * 86400000)
                .toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* MATERIALS */}
        {quote.lineItems && quote.lineItems.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#C0603E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'بنود العرض' : 'QUOTE LINE ITEMS'}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{liCols.map((c, i) => <th key={i} style={S.th}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {quote.lineItems.map((li: QuoteLineItem, i: number) => {
                  const td = i % 2 === 0 ? S.tdE : S.tdO;
                  const subtotal = lineSubtotal(li);
                  const tax = subtotal * VAT_RATE;
                  const lineTotal = subtotal + tax;
                  return (
                    <tr key={li.id}>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#C0603E' }}>{i + 1}</td>
                      <td style={td}>{displayVal(resolveOther(li.type, li.typeOther), lang)}</td>
                      <td style={td}>{resolveOther(li.size, li.sizeOther) || '—'}</td>
                      <td style={td}>{resolveOther(li.thickness, li.thicknessOther) || '—'}</td>
                      <td style={td}>{displayVal(resolveOther(li.finish, li.finishOther), lang)}</td>
                      <td style={td}>{displayVal(resolveOther(li.color, li.colorOther), lang)}</td>
                      <td style={td}>{li.quantity || '—'}</td>
                      <td style={td}>{displayVal(resolveOther(li.unit, li.unitOther), lang)}</td>
                      <td style={td}>{Number(li.unitPrice).toLocaleString()} {currencyLabel(quote.currency || 'ر.س', lang)}</td>
                      <td style={td}>{li.discount ? Number(li.discount).toLocaleString() : '—'}</td>
                      <td style={td}>{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td style={td}>{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td style={{ ...td, maxWidth: 140 }}>{li.description || '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {li.images && li.images.length > 0 ? (
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            {li.images.map((img, imgI) => (
                              <img key={imgI} src={img} alt="" className="li-thumb" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4, border: '1px solid #E8DFD3' }} />
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {quote.subtotalBeforeTax !== undefined && (
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <table style={{ width: 260, borderCollapse: 'collapse' }}>
                  <tbody>
                    {!!quote.overallDiscount && (
                      <tr>
                        <td style={{ padding: '4px 8px', fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'خصم على الإجمالي' : 'Discount on Total'}</td>
                        <td style={{ padding: '4px 8px', fontSize: 11, color: '#44403C', textAlign: 'end', fontWeight: 600 }}>-{Number(quote.overallDiscount).toLocaleString()}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '4px 8px', fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'الإجمالي قبل الضريبة' : 'Subtotal Before Tax'}</td>
                      <td style={{ padding: '4px 8px', fontSize: 11, color: '#44403C', textAlign: 'end', fontWeight: 600 }}>{quote.subtotalBeforeTax!.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(quote.currency || 'ر.س', lang)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px', fontSize: 11, color: '#78716C' }}>{lang === 'ar' ? 'إجمالي الضريبة (15%)' : 'Total Tax (15%)'}</td>
                      <td style={{ padding: '4px 8px', fontSize: 11, color: '#44403C', textAlign: 'end', fontWeight: 600 }}>{(quote.taxAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {currencyLabel(quote.currency || 'ر.س', lang)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 8px', fontSize: 12, color: '#C0603E', fontWeight: 800, borderTop: '1px solid #E8DFD3' }}>{lang === 'ar' ? 'الإجمالي مع الضريبة' : 'Total (incl. Tax)'}</td>
                      <td style={{ padding: '6px 8px', fontSize: 12, color: '#C0603E', textAlign: 'end', fontWeight: 800, borderTop: '1px solid #E8DFD3' }}>{Number(quote.totalPrice).toLocaleString()} {currencyLabel(quote.currency || 'ر.س', lang)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : materials.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#C0603E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'المواد المعروضة' : 'QUOTED MATERIALS'}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{matCols.map((c, i) => <th key={i} style={S.th}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {materials.map((m: any, i: number) => {
                  const td = i % 2 === 0 ? S.tdE : S.tdO;
                  return (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#C0603E' }}>{i + 1}</td>
                      {matFields.map(f => <td key={f} style={td}>{matVal(m, f)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* PAYMENT TERMS */}
        {quote.paymentTerms && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#C0603E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'شروط الدفع' : 'PAYMENT TERMS'}</div>
            <div style={{ background: '#FAF7F2', border: '1px solid #E8DFD3', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#44403C' }}>{quote.paymentTerms}</div>
          </div>
        )}

        {/* ATTACHMENTS */}
        {quote.attachments && quote.attachments.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#C0603E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'المرفقات' : 'ATTACHMENTS'}</div>
            <div style={{ background: '#F3EAE0', border: '1px solid #E8DFD3', borderRadius: 6, padding: '10px 14px' }}>
              {quote.attachments.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#44403C', marginBottom: i < quote.attachments!.length - 1 ? 4 : 0 }}>📎 {f.name}</div>
              ))}
            </div>
          </div>
        )}

        {/* NOTES */}
        {quote.description && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#C0603E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'ar' ? 'ملاحظات المورد' : 'SUPPLIER NOTES'}</div>
            <div style={{ background: '#F3EAE0', border: '1px solid #E8DFD3', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#C0603E', lineHeight: 1.7 }}>{quote.description}</div>
          </div>
        )}

        {quote.status === 'revision' && quote.revisionNote && (
          <div style={{ marginBottom: 14, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>{lang === 'ar' ? 'طلب تعديل من المقاول:' : 'REVISION REQUEST:'}</div>
            <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.7 }}>{quote.revisionNote}</div>
          </div>
        )}

        {/* SIGNATURES */}
        <div style={{ marginTop: 24, borderTop: '1px solid #E8DFD3', paddingTop: 14 }}>
          <table style={{ width: '100%' }}>
            <tbody><tr>
              {[lang === 'ar' ? 'توقيع المورد' : "Supplier's Signature", lang === 'ar' ? 'توقيع المقاول' : "Contractor's Signature", lang === 'ar' ? 'الختم الرسمي' : 'Official Stamp'].map((lbl, i) => (
                <td key={i} style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #D6D3D1', marginTop: 32, paddingTop: 5, fontSize: 11, color: '#78716C' }}>{lbl}</div>
                </td>
              ))}
            </tr></tbody>
          </table>
        </div>

        {supplier?.letterheadFooter && (
          <img src={supplier.letterheadFooter} alt="footer" className="print-quote-footer-fixed"
            style={{ width: '100%', maxHeight: 140, objectFit: 'contain', display: 'block', marginTop: 18 }} />
        )}

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#A8A29E', borderTop: '1px solid #F1EAE0', paddingTop: 8 }}>
          {lang === 'ar' ? `تم إنشاء هذا العرض عبر منصة BuildPro · ${printDate}` : `Generated via BuildPro platform · ${printDate}`}
        </div>
      </div>
    </>
  );
}
