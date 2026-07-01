'use client';

import { displayVal, formatDate, getSupplierData, arToEn, Lang, Quote, ActivityLog, RequestLike } from '../lib/requestHelpers';

interface RequestDetailModalProps {
  req: RequestLike; lang: Lang; dir: 'rtl' | 'ltr';
  quotes: Quote[]; logs: ActivityLog[];
  revisionQuoteId: number | null; revisionNote: string;
  setRevisionQuoteId: (id: number | null) => void;
  setRevisionNote: (note: string) => void;
  onClose: () => void; onToggle: () => void; onDelete: () => void; onEdit: () => void;
  onQuoteAction: (quoteId: number, action: 'accepted' | 'rejected' | 'pending') => void;
  onRevisionSubmit: (quoteId: number) => void;
  setLightboxImg: (img: string | null) => void;
}

export default function RequestDetailModal({
  req, lang, dir, quotes, logs, revisionQuoteId, revisionNote, setRevisionQuoteId, setRevisionNote,
  onClose, onToggle, onDelete, onEdit, onQuoteAction, onRevisionSubmit, setLightboxImg,
}: RequestDetailModalProps) {
  const tr = (ar: string, en: string) => lang === 'ar' ? ar : en;
  const thStyle: React.CSSProperties = { padding: '8px 10px', backgroundColor: '#C0603E', color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', textAlign: 'center', border: '1px solid #9C4C31' };
  const tdStyle: React.CSSProperties = { padding: '7px 10px', color: '#44403C', fontSize: 12, textAlign: 'center', border: '1px solid #E8DFD3' };
  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto" dir={dir} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-stone-900">{tr('تفاصيل الطلب', 'Request Details')}</h2>
            <span className="text-[#8A7B6C] font-bold text-sm">#{req.id}</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${req.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600'}`}>
              {req.status === 'open' ? tr('مفتوح', 'Open') : tr('مغلق', 'Closed')}
            </span>
            {req.location && <span className="text-stone-400 text-sm">📍 {req.location}</span>}
            {req.deadline && <span className="text-stone-400 text-sm">⏱ {req.deadline}</span>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold hover:bg-red-100 text-lg">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* materials */}
          <div>
            <h3 className="text-sm font-bold text-stone-900 mb-3">{tr('المواد المطلوبة', 'Required Materials')}</h3>
            {req.materials && req.materials.length > 0 ? (
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['#', tr('نوع المادة','Material'), tr('الاستخدام','Usage'), tr('المقاس','Size'), tr('السماكة','Thickness'), tr('الفنش','Finish'), tr('اللون','Color'), tr('الكمية','Qty'), tr('السعر المستهدف','Target Price'), tr('الصناعة','Origin'), tr('تاريخ التوريد','Delivery Date'), tr('وصف البند','Note'), tr('الصور','Images')].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {req.materials.map((m: any, i: number) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAF7F2' }}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{displayVal(m.type, lang)}</td>
                        <td style={tdStyle}>{displayVal(m.usage, lang)}</td>
                        <td style={tdStyle}>{m.size || '—'}</td>
                        <td style={tdStyle}>{m.thickness || '—'}</td>
                        <td style={tdStyle}>{displayVal(m.finish, lang)}</td>
                        <td style={tdStyle}>{displayVal(m.color, lang)}</td>
                        <td style={tdStyle}>{m.quantity ? `${m.quantity} ${lang === 'en' ? (arToEn[m.unit] || m.unit || 'm²') : (m.unit || 'م²')}` : '—'}</td>
                        <td style={tdStyle}>{m.targetPrice ? `${m.targetPrice} ${lang === 'en' ? (m.currency === 'ر.س' ? 'SAR' : m.currency || 'SAR') : (m.currency || 'ر.س')}` : '—'}</td>
                        <td style={tdStyle}>{displayVal(m.origin, lang)}</td>
                        <td style={tdStyle}>{m.deliveryDate || '—'}</td>
                        <td style={{ ...tdStyle, maxWidth: 120, fontSize: 11 }}>{m.note || '—'}</td>
                        <td style={tdStyle}>
                          {m.images && m.images.length > 0 ? (
                            <div className="flex gap-1 justify-center">
                              {m.images.map((img: string, j: number) => (
                                <img key={j} src={img} alt="" onClick={e => { e.stopPropagation(); setLightboxImg(img); }}
                                  className="w-10 h-10 object-cover rounded border border-stone-200 cursor-zoom-in" />
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600 space-y-1">
                {!!req.ceramic   && req.ceramic   > 0 && <p>• {tr('سيراميك','Ceramic')}: {req.ceramic} m²</p>}
                {!!req.porcelain && req.porcelain > 0 && <p>• {tr('بورسلان','Porcelain')}: {req.porcelain} m²</p>}
                {!!req.marble    && req.marble    > 0 && <p>• {tr('رخام','Marble')}: {req.marble} m²</p>}
                {!!req.granite   && req.granite   > 0 && <p>• {tr('جرانيت','Granite')}: {req.granite} m²</p>}
                {!!req.terrazzo  && req.terrazzo  > 0 && <p>• {tr('تيرازو','Terrazzo')}: {req.terrazzo} m²</p>}
              </div>
            )}
          </div>

          {/* description */}
          {req.description && (
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">{tr('الوصف', 'Description')}</h3>
              <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600">{req.description}</div>
            </div>
          )}

          {/* quotes */}
          <div>
            <h3 className="text-sm font-bold text-stone-900 mb-3">{tr('عروض الأسعار', 'Quotes')} ({quotes.length})</h3>
            {quotes.length === 0 ? (
              <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-400 text-center">{tr('لا توجد عروض أسعار بعد', 'No quotes yet')}</div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote: Quote) => {
                  const supplierData = quote.status === 'accepted' ? getSupplierData(quote.supplierId) : null;
                  return (
                    <div key={quote.id} className={`border rounded-xl p-4 ${quote.status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : quote.status === 'rejected' ? 'bg-red-50 border-red-200' : quote.status === 'revision' ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{quote.supplierCompany}</p>
                          <p className="text-stone-400 text-xs">{quote.supplierName}</p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : quote.status === 'rejected' ? 'bg-red-100 text-red-700' : quote.status === 'revision' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                          {quote.status === 'accepted' ? tr('مقبول','Accepted') : quote.status === 'rejected' ? tr('مرفوض','Rejected') : quote.status === 'revision' ? tr('طلب تعديل','Revision Requested') : tr('قيد الانتظار','Pending')}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-stone-900">{quote.totalPrice?.toLocaleString()} {tr('ر.س','SAR')}</p>
                      <p className="text-xs text-stone-500 mt-1">{tr('مدة التوريد:','Delivery:')} {quote.deliveryDays} {tr('يوم','days')}</p>
                      {quote.description && <p className="text-xs text-stone-500 mt-1">{quote.description}</p>}

                      {quote.status === 'accepted' && supplierData && (
                        <div className="mt-3 bg-emerald-100 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 space-y-1">
                          <p className="font-bold mb-1">{tr('بيانات التواصل مع المورد:', 'Supplier Contact:')}</p>
                          <p><strong>{tr('الاسم:','Name:')}</strong> {supplierData.name}</p>
                          <p><strong>{tr('الشركة:','Company:')}</strong> {supplierData.company}</p>
                          <p><strong>{tr('التليفون:','Phone:')}</strong> {supplierData.phone || tr('غير متوفر','N/A')}</p>
                          <p><strong>{tr('الإيميل:','Email:')}</strong> {supplierData.email}</p>
                        </div>
                      )}
                      {quote.status === 'revision' && quote.revisionNote && (
                        <div className="mt-3 bg-amber-100 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                          <strong>{tr('ملاحظة التعديل:','Revision Note:')}</strong> {quote.revisionNote}
                        </div>
                      )}
                      {quote.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => onQuoteAction(quote.id, 'accepted')} className="flex-1 bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-600">{tr('قبول','Accept')}</button>
                          <button onClick={() => setRevisionQuoteId(quote.id)} className="flex-1 bg-amber-400 text-white text-xs font-bold py-2 rounded-lg hover:bg-amber-500">{tr('طلب تعديل','Revision')}</button>
                          <button onClick={() => onQuoteAction(quote.id, 'rejected')} className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-600">{tr('رفض','Reject')}</button>
                        </div>
                      )}
                      {revisionQuoteId === quote.id && (
                        <div className="mt-3 bg-white border border-amber-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-stone-700 mb-2">{tr('اكتب ملاحظة التعديل:','Write revision note:')}</p>
                          <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)}
                            placeholder={tr('مثال: أريد سعر أقل أو توريد أسرع...','Ex: Need lower price or faster delivery...')}
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-700 bg-white outline-none resize-none min-h-[70px] mb-2" />
                          <div className="flex gap-2">
                            <button onClick={() => onRevisionSubmit(quote.id)} className="flex-1 bg-amber-400 text-white text-xs font-bold py-1.5 rounded-lg">{tr('إرسال التعديل','Send Revision')}</button>
                            <button onClick={() => { setRevisionQuoteId(null); setRevisionNote(''); }} className="flex-1 bg-stone-100 text-stone-600 text-xs font-bold py-1.5 rounded-lg">{tr('إلغاء','Cancel')}</button>
                          </div>
                        </div>
                      )}
                      {(quote.status === 'accepted' || quote.status === 'rejected' || quote.status === 'revision') && (
                        <button onClick={() => onQuoteAction(quote.id, 'pending')} className="mt-2 w-full bg-stone-100 text-stone-600 text-xs font-bold py-1.5 rounded-lg hover:bg-stone-200">{tr('إلغاء القرار','Undo Decision')}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* activity log */}
          {logs.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-3">{tr('تاريخ النشاط', 'Activity History')}</h3>
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                {logs.map((log: ActivityLog, i: number) => (
                  <div key={log.id} className={`flex items-center justify-between px-4 py-3 text-xs border-b border-stone-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                    <span className="text-stone-700">
                      {log.action.includes('قبول') || log.action.includes('Accepted') ? '✅' : log.action.includes('رفض') || log.action.includes('Rejected') ? '❌' : log.action.includes('تعديل') || log.action.includes('Revision') ? '✏️' : log.action.includes('إغلاق') || log.action.includes('closed') ? '🔒' : log.action.includes('فتح') || log.action.includes('reopened') ? '🔓' : log.action.includes('تقييم') || log.action.includes('Rated') ? '⭐' : '📋'}{' '}
                      {lang === 'ar' ? log.action : log.actionEn}
                    </span>
                    <span className="text-stone-400 whitespace-nowrap mr-4">{formatDate(log.timestamp, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* footer actions */}
        <div className="flex gap-3 p-5 border-t border-stone-100">
          <button onClick={onClose} className="flex-1 bg-stone-100 text-stone-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-stone-200">{tr('إغلاق','Close')}</button>
          <button onClick={onEdit} className="flex-1 bg-[#8A7B6C] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#6F6255]">{tr('تعديل','Edit')}</button>
          <button onClick={onToggle}
            className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition-colors ${req.status === 'open' ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
            {req.status === 'open' ? tr('إغلاق الطلب','Close Request') : tr('فتح الطلب','Open Request')}
          </button>
          <button onClick={onDelete} className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-600">{tr('حذف','Delete')}</button>
        </div>
      </div>
    </div>
  );
}
