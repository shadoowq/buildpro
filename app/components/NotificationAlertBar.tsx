'use client';

import { useState, useEffect, useRef } from 'react';
import { NotifItem, NotifType, notifIconMap } from '../lib/notifications';
import { playNotificationSound } from '../lib/notificationSound';
import { getJSONArray, setJSONArray } from '../lib/store';

type Lang = 'ar' | 'en';

/** Strong accent color per notification type — used for the card border/ring so the alert reads instantly, not just its icon tint. */
const alertAccent: Record<NotifType, { border: string; ring: string }> = {
  quote:       { border: 'border-[var(--brand-strong)]', ring: 'bg-[var(--brand)]' },
  accepted:    { border: 'border-emerald-500', ring: 'bg-emerald-500' },
  rejected:    { border: 'border-red-500', ring: 'bg-red-500' },
  revision:    { border: 'border-amber-500', ring: 'bg-amber-500' },
  close:       { border: 'border-stone-400', ring: 'bg-stone-400' },
  open:        { border: 'border-[var(--brand-strong)]', ring: 'bg-[var(--brand)]' },
  rated:       { border: 'border-amber-500', ring: 'bg-amber-500' },
  invite:      { border: 'border-[var(--brand-strong)]', ring: 'bg-[var(--brand)]' },
  editRequest: { border: 'border-amber-500', ring: 'bg-amber-500' },
  withdrawn:   { border: 'border-stone-400', ring: 'bg-stone-400' },
  expiring:    { border: 'border-orange-500', ring: 'bg-orange-500' },
  question:    { border: 'border-[var(--brand-strong)]', ring: 'bg-[var(--brand)]' },
  answer:      { border: 'border-emerald-500', ring: 'bg-emerald-500' },
  shipping:    { border: 'border-sky-500', ring: 'bg-sky-500' },
  delivered:   { border: 'border-emerald-500', ring: 'bg-emerald-500' },
  received:    { border: 'border-emerald-500', ring: 'bg-emerald-500' },
};

/**
 * Watches `notifs` for items that weren't seen on a previous pass (tracked via
 * `storageKey`, separate from the bell's read/unread state) and surfaces each
 * one as a bottom banner + chime for 6 seconds. The very first time it runs
 * for a given key it snapshots the current list silently — only notifications
 * that show up *after* that baseline trigger an alert.
 */
export default function NotificationAlertBar({ notifs, lang, storageKey }: { notifs: NotifItem[]; lang: Lang; storageKey: string }) {
  const [current, setCurrent] = useState<NotifItem | null>(null);
  const [alertKey, setAlertKey] = useState(0);
  const queueRef = useRef<NotifItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = () => {
    const next = queueRef.current.shift();
    if (!next) { setCurrent(null); timerRef.current = null; return; }
    setCurrent(next);
    setAlertKey(k => k + 1);
    playNotificationSound();
    timerRef.current = setTimeout(showNext, 6000);
  };

  useEffect(() => {
    if (notifs.length === 0) return;
    const alerted: string[] = getJSONArray<string>(storageKey);

    if (alerted.length === 0) {
      setJSONArray(storageKey, notifs.map(n => n.id));
      return;
    }

    const alertedSet = new Set(alerted);
    const newOnes = notifs.filter(n => !alertedSet.has(n.id));
    if (newOnes.length === 0) return;

    setJSONArray(storageKey, [...alerted, ...newOnes.map(n => n.id)]);
    queueRef.current.push(...newOnes);
    if (!timerRef.current) showNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs, storageKey]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!current) return null;
  const icon = notifIconMap[current.type];
  const accent = alertAccent[current.type];

  return (
    <div className="fixed bottom-6 inset-x-0 z-[3000] flex justify-center px-4 pointer-events-none">
      <div key={alertKey}
        className={`bp-alert-enter pointer-events-auto bg-white border-2 ${accent.border} shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-4 max-w-md w-full`}>
        <div className="relative w-12 h-12 shrink-0">
          <span className={`absolute inset-0 rounded-xl ${accent.ring} opacity-30 animate-ping`} />
          <div className={`relative w-12 h-12 rounded-xl ${icon.bg} flex items-center justify-center text-2xl`}>{icon.icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-0.5">{lang === 'ar' ? 'إشعار جديد' : 'New Notification'}</p>
          <p className="text-sm font-semibold text-stone-800 leading-snug">{lang === 'ar' ? current.textAr : current.textEn}</p>
        </div>
        <button
          onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); showNext(); }}
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
          className="text-stone-300 hover:text-stone-500 text-lg font-bold shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-50 transition-colors">✕</button>
      </div>
    </div>
  );
}
