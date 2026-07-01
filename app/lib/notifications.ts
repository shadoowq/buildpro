export type Lang = 'ar' | 'en';
export type NotifType = 'quote' | 'accepted' | 'rejected' | 'revision' | 'close' | 'open' | 'rated';

export interface NotifItem {
  id: string;
  type: NotifType;
  requestId: number;
  textAr: string;
  textEn: string;
  timestamp: string;
  unread: boolean;
}

export const notifIconMap: Record<NotifType, { bg: string; icon: string; color: string }> = {
  quote:    { bg: 'bg-[#F3EAE0]',  icon: '📄', color: 'text-[#8A7B6C]'   },
  accepted: { bg: 'bg-emerald-50', icon: '✓',  color: 'text-emerald-600' },
  rejected: { bg: 'bg-red-50',     icon: '✗',  color: 'text-red-500'     },
  revision: { bg: 'bg-amber-50',   icon: '✏',  color: 'text-amber-500'   },
  close:    { bg: 'bg-stone-100',  icon: '🔒', color: 'text-stone-500'   },
  open:     { bg: 'bg-[#F3EAE0]',  icon: '🔓', color: 'text-[#C0603E]'   },
  rated:    { bg: 'bg-amber-50',   icon: '⭐', color: 'text-amber-500'   },
};

export function timeAgo(ts: string, lang: Lang): string {
  const diff  = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return lang === 'ar' ? 'الآن'      : 'Just now';
  if (mins  < 60) return lang === 'ar' ? `${mins}د`  : `${mins}m ago`;
  if (hours < 24) return lang === 'ar' ? `${hours}س` : `${hours}h ago`;
  return lang === 'ar' ? `${days} يوم` : `${days}d ago`;
}

export function buildNotifications(
  allQuotes: any[],
  allActivityLogs: any[],
  requestIds: number[],
  opts?: { includeLogs?: boolean; limit?: number }
): NotifItem[] {
  const idSet = new Set(requestIds);
  const includeLogs = opts?.includeLogs !== false;

  const quoteItems: NotifItem[] = allQuotes
    .filter(q => idSet.has(q.requestId))
    .map(q => {
      const type: NotifType =
        q.status === 'accepted' ? 'accepted'
        : q.status === 'rejected' ? 'rejected'
        : q.status === 'revision' ? 'revision'
        : 'quote';
      return {
        id: `q-${q.id}`,
        type,
        requestId: q.requestId,
        textAr: type === 'quote'    ? `${q.supplierCompany} أرسل عرض سعر على طلب #${q.requestId}`
              : type === 'accepted' ? `تم قبول عرض ${q.supplierCompany} بسعر ${Number(q.totalPrice).toLocaleString()} ر.س`
              : type === 'rejected' ? `تم رفض عرض ${q.supplierCompany}`
              :                       `طلب تعديل على عرض ${q.supplierCompany}`,
        textEn: type === 'quote'    ? `${q.supplierCompany} sent a quote on request #${q.requestId}`
              : type === 'accepted' ? `Accepted quote from ${q.supplierCompany} at ${Number(q.totalPrice).toLocaleString()} SAR`
              : type === 'rejected' ? `Rejected quote from ${q.supplierCompany}`
              :                       `Revision requested on ${q.supplierCompany} quote`,
        timestamp: q.createdAt,
        unread: q.status === 'pending',
      };
    });

  const logItems: NotifItem[] = !includeLogs ? [] : allActivityLogs
    .filter(l => idSet.has(l.requestId))
    .map((l): NotifItem | null => {
      const type: NotifType | null =
        l.action.includes('إغلاق') || l.action.includes('closed')   ? 'close'
        : l.action.includes('فتح') || l.action.includes('reopened') ? 'open'
        : l.action.includes('تقييم') || l.action.includes('Rated')  ? 'rated'
        : null;
      if (!type) return null;
      return {
        id: `log-${l.id}`,
        type,
        requestId: l.requestId,
        textAr: l.action,
        textEn: l.actionEn,
        timestamp: l.timestamp,
        unread: false,
      };
    })
    .filter((x): x is NotifItem => x !== null);

  const all = [...quoteItems, ...logItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return opts?.limit ? all.slice(0, opts.limit) : all;
}
