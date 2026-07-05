'use client';

import { useEffect, useState } from 'react';
import { sendQuoteMessage, QuoteMessage } from '../lib/marketplace';

type Lang = 'ar' | 'en';

const T = {
  toggle:  { ar: '💬 رسائل',                 en: '💬 Messages' },
  title:   { ar: 'رسائل خاصة حول هذا العرض',  en: 'Private messages about this quote' },
  none:    { ar: 'لا توجد رسائل بعد',         en: 'No messages yet' },
  ph:      { ar: 'اكتب رسالتك...',           en: 'Write your message...' },
  send:    { ar: 'إرسال',                   en: 'Send' },
  you:     { ar: 'أنت',                     en: 'You' },
};
const tx = (k: keyof typeof T, lang: Lang) => T[k][lang];

export default function QuoteMessagesThread({ quoteId, requestId, lang, role, senderName }: {
  quoteId: number; requestId: number; lang: Lang; role: 'contractor' | 'supplier'; senderName: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<QuoteMessage[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) return;
    try {
      const all: QuoteMessage[] = JSON.parse(localStorage.getItem('quoteMessages') || '[]');
      setMessages(all.filter(m => m.quoteId === quoteId));
    } catch {}
  }, [open, quoteId]);

  const unreadCount = messages.length; // simple count badge — no per-user read tracking yet

  const handleSend = () => {
    if (!text.trim()) return;
    const updated = sendQuoteMessage(quoteId, requestId, role, senderName, text.trim());
    setMessages(updated.filter(m => m.quoteId === quoteId));
    setText('');
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="text-[11px] font-semibold px-3 py-1.5 bg-stone-50 text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors inline-flex items-center gap-1">
        {tx('toggle', lang)}
        {!open && unreadCount > 0 && <span className="bg-[var(--brand)] text-[var(--on-brand,#231B06)] text-[9px] font-bold px-1.5 rounded-full">{unreadCount}</span>}
      </button>

      {open && (
        <div className="mt-2 bg-[var(--bg-soft)] border border-[var(--line)] rounded-xl p-3 max-w-md">
          <p className="text-[11px] font-bold text-stone-500 mb-2">{tx('title', lang)}</p>
          {messages.length === 0 ? (
            <p className="text-[11px] text-stone-400 mb-2">{tx('none', lang)}</p>
          ) : (
            <div className="space-y-1.5 mb-2 max-h-48 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className={`text-xs rounded-lg px-2.5 py-1.5 max-w-[85%] ${m.senderRole === role ? 'bg-[var(--tint)] text-[var(--brand-strong)] ms-auto' : 'bg-white text-stone-700 border border-[var(--line)]'}`}>
                  <span className="font-semibold">{m.senderRole === role ? tx('you', lang) : m.senderName}:</span> {m.text}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              placeholder={tx('ph', lang)}
              className="flex-1 text-xs border border-[var(--line)] rounded-lg px-2.5 py-1.5 outline-none bg-white focus:border-[var(--sec)]" />
            <button type="button" onClick={handleSend}
              className="shrink-0 text-[11px] font-bold px-3 bg-[var(--sec)] hover:bg-[var(--sec-hover)] text-white rounded-lg transition-colors">
              {tx('send', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
