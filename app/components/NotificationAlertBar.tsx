'use client';

import { useState, useEffect, useRef } from 'react';
import { NotifItem, notifIconMap } from '../lib/notifications';
import { playNotificationSound } from '../lib/notificationSound';

type Lang = 'ar' | 'en';

/**
 * Watches `notifs` for items that weren't seen on a previous pass (tracked via
 * `storageKey`, separate from the bell's read/unread state) and surfaces each
 * one as a bottom banner + chime for 5 seconds. The very first time it runs
 * for a given key it snapshots the current list silently — only notifications
 * that show up *after* that baseline trigger an alert.
 */
export default function NotificationAlertBar({ notifs, lang, storageKey }: { notifs: NotifItem[]; lang: Lang; storageKey: string }) {
  const [current, setCurrent] = useState<NotifItem | null>(null);
  const queueRef = useRef<NotifItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = () => {
    const next = queueRef.current.shift();
    if (!next) { setCurrent(null); timerRef.current = null; return; }
    setCurrent(next);
    playNotificationSound();
    timerRef.current = setTimeout(showNext, 5000);
  };

  useEffect(() => {
    if (notifs.length === 0) return;
    let alerted: string[] = [];
    try { alerted = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}

    if (alerted.length === 0) {
      localStorage.setItem(storageKey, JSON.stringify(notifs.map(n => n.id)));
      return;
    }

    const alertedSet = new Set(alerted);
    const newOnes = notifs.filter(n => !alertedSet.has(n.id));
    if (newOnes.length === 0) return;

    localStorage.setItem(storageKey, JSON.stringify([...alerted, ...newOnes.map(n => n.id)]));
    queueRef.current.push(...newOnes);
    if (!timerRef.current) showNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs, storageKey]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!current) return null;
  const icon = notifIconMap[current.type];

  return (
    <div className="fixed bottom-4 inset-x-0 z-[3000] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto bg-white border border-[#E8DFD3] shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 max-w-sm w-full">
        <div className={`w-9 h-9 rounded-lg ${icon.bg} flex items-center justify-center text-base shrink-0`}>{icon.icon}</div>
        <p className="text-xs text-stone-700 leading-relaxed flex-1">{lang === 'ar' ? current.textAr : current.textEn}</p>
        <button
          onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); showNext(); }}
          className="text-stone-300 hover:text-stone-500 text-sm shrink-0">✕</button>
      </div>
    </div>
  );
}
