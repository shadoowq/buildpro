import { getRequestDisplayName, isQuoteExpired, quoteValidityDaysLeft, RequestLike } from './requestHelpers';
import { isRequestMatchedToSupplier, SupplierMatchProfile } from './marketplace';

export type Lang = 'ar' | 'en';
export type NotifType = 'quote' | 'accepted' | 'rejected' | 'revision' | 'close' | 'open' | 'rated' | 'invite' | 'editRequest' | 'withdrawn' | 'expiring' | 'question' | 'answer' | 'delivered';

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
  invite:   { bg: 'bg-[#F3EAE0]',  icon: '📨', color: 'text-[#C0603E]'   },
  editRequest: { bg: 'bg-amber-50', icon: '🔏', color: 'text-amber-500' },
  withdrawn: { bg: 'bg-stone-100', icon: '↩', color: 'text-stone-500' },
  expiring:  { bg: 'bg-orange-50', icon: '⏳', color: 'text-orange-500' },
  question:  { bg: 'bg-[#F3EAE0]', icon: '❓', color: 'text-[#C0603E]' },
  answer:    { bg: 'bg-emerald-50', icon: '💬', color: 'text-emerald-600' },
  delivered: { bg: 'bg-emerald-50', icon: '📦', color: 'text-emerald-600' },
};

export function notifHref(n: Pick<NotifItem, 'type' | 'requestId'>, role?: 'contractor' | 'supplier'): string {
  const quoteTypes: NotifType[] = ['quote', 'accepted', 'rejected', 'revision', 'editRequest', 'expiring', 'answer', 'delivered'];
  if (role === 'supplier') {
    return quoteTypes.includes(n.type)
      ? `/my-quotes?reqId=${n.requestId}`
      : `/supplier-requests?reqId=${n.requestId}`;
  }
  return quoteTypes.includes(n.type)
    ? `/my-quotes?reqId=${n.requestId}`
    : `/my-requests?reqId=${n.requestId}`;
}

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
  myRequests: (RequestLike | number)[],
  opts?: { includeLogs?: boolean; limit?: number; allQuestions?: { id: number; requestId: number; question: string; supplierCompany: string; answer?: string; createdAt: string }[] }
): NotifItem[] {
  /* accepts full request objects (preferred — enables project names) or bare ids (legacy) */
  const reqById = new Map<number, RequestLike>();
  const idSet = new Set<number>();
  for (const r of myRequests) {
    if (typeof r === 'number') { idSet.add(r); }
    else { idSet.add(r.id); reqById.set(r.id, r); }
  }
  const nameAr = (id: number) => getRequestDisplayName(reqById.get(id), 'ar', id);
  const nameEn = (id: number) => getRequestDisplayName(reqById.get(id), 'en', id);
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
        id: `q-${q.id}-${q.status}-${q.statusChangedAt || ''}`,
        type,
        requestId: q.requestId,
        textAr: type === 'quote'    ? `${q.supplierCompany} أرسل عرض سعر على «${nameAr(q.requestId)}»`
              : type === 'accepted' ? `تم قبول عرض ${q.supplierCompany} بسعر ${Number(q.totalPrice).toLocaleString()} ر.س`
              : type === 'rejected' ? `تم رفض عرض ${q.supplierCompany}`
              :                       `طلب تعديل على عرض ${q.supplierCompany}`,
        textEn: type === 'quote'    ? `${q.supplierCompany} sent a quote on "${nameEn(q.requestId)}"`
              : type === 'accepted' ? `Accepted quote from ${q.supplierCompany} at ${Number(q.totalPrice).toLocaleString()} SAR`
              : type === 'rejected' ? `Rejected quote from ${q.supplierCompany}`
              :                       `Revision requested on ${q.supplierCompany} quote`,
        timestamp: q.statusChangedAt || q.createdAt,
        unread: q.status === 'pending',
      };
    });

  const editRequestItems: NotifItem[] = allQuotes
    .filter(q => idSet.has(q.requestId) && q.editRequestStatus === 'pending')
    .map(q => ({
      id: `editreq-${q.id}-${q.editRequestedAt || ''}`,
      type: 'editRequest' as NotifType,
      requestId: q.requestId,
      textAr: `${q.supplierCompany} يطلب إذنًا بتعديل عرضه على «${nameAr(q.requestId)}»`,
      textEn: `${q.supplierCompany} is requesting permission to edit their quote on "${nameEn(q.requestId)}"`,
      timestamp: q.createdAt,
      unread: true,
    }));

  const logItems: NotifItem[] = !includeLogs ? [] : allActivityLogs
    .filter(l => idSet.has(l.requestId))
    .map((l): NotifItem | null => {
      const type: NotifType | null =
        l.action.includes('إغلاق') || l.action.includes('closed')   ? 'close'
        : l.action.includes('فتح') || l.action.includes('reopened') ? 'open'
        : l.action.includes('تقييم') || l.action.includes('Rated')  ? 'rated'
        : l.action.includes('سحب')  || l.actionEn?.includes('withdrew') ? 'withdrawn'
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

  const questionItems: NotifItem[] = (opts?.allQuestions || [])
    .filter(q => idSet.has(q.requestId) && !q.answer)
    .map(q => ({
      id: `question-${q.id}`,
      type: 'question' as NotifType,
      requestId: q.requestId,
      textAr: `${q.supplierCompany} سأل سؤالاً على «${nameAr(q.requestId)}»: "${q.question}"`,
      textEn: `${q.supplierCompany} asked a question on "${nameEn(q.requestId)}": "${q.question}"`,
      timestamp: q.createdAt,
      unread: true,
    }));

  const deliveredItems: NotifItem[] = allQuotes
    .filter(q => idSet.has(q.requestId) && q.executionStatus === 'delivered')
    .map(q => ({
      id: `delivered-${q.id}-${q.executionStatusChangedAt || ''}`,
      type: 'delivered' as NotifType,
      requestId: q.requestId,
      textAr: `${q.supplierCompany} أعلن اكتمال توريد «${nameAr(q.requestId)}»`,
      textEn: `${q.supplierCompany} marked "${nameEn(q.requestId)}" as delivered`,
      timestamp: q.executionStatusChangedAt || q.statusChangedAt || q.createdAt,
      unread: true,
    }));

  const all = [...quoteItems, ...editRequestItems, ...logItems, ...questionItems, ...deliveredItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return opts?.limit ? all.slice(0, opts.limit) : all;
}

export function buildSupplierNotifications(
  allQuotes: any[],
  allActivityLogs: any[],
  allRequests: any[],
  allRatings: any[],
  supplier: SupplierMatchProfile,
  opts?: { limit?: number; allQuestions?: { id: number; requestId: number; supplierId: string; answer?: string; answeredAt?: string; createdAt: string }[] }
): NotifItem[] {
  const supplierEmail = supplier.email;
  const myQuotes = allQuotes.filter(q => q.supplierId === supplierEmail);
  const reqById = new Map<number, RequestLike>(allRequests.map((r: RequestLike) => [r.id, r]));
  const nameAr = (id: number) => getRequestDisplayName(reqById.get(id), 'ar', id);
  const nameEn = (id: number) => getRequestDisplayName(reqById.get(id), 'en', id);

  const statusItems: NotifItem[] = myQuotes
    .filter(q => q.status !== 'pending')
    .map(q => {
      const type: NotifType = q.status === 'accepted' ? 'accepted' : q.status === 'rejected' ? 'rejected' : 'revision';
      return {
        id: `q-${q.id}-${q.status}-${q.statusChangedAt || ''}`,
        type,
        requestId: q.requestId,
        textAr: type === 'accepted' ? `تم قبول عرضك على «${nameAr(q.requestId)}» بسعر ${Number(q.totalPrice).toLocaleString()} ر.س`
              : type === 'rejected' ? (q.rejectionReason ? `تم رفض عرضك على «${nameAr(q.requestId)}» — السبب: "${q.rejectionReason}"` : `تم رفض عرضك على «${nameAr(q.requestId)}»`)
              :                       `طلب تعديل على عرضك بخصوص «${nameAr(q.requestId)}»`,
        textEn: type === 'accepted' ? `Your quote on "${nameEn(q.requestId)}" was accepted at ${Number(q.totalPrice).toLocaleString()} SAR`
              : type === 'rejected' ? (q.rejectionReason ? `Your quote on "${nameEn(q.requestId)}" was rejected — reason: "${q.rejectionReason}"` : `Your quote on "${nameEn(q.requestId)}" was rejected`)
              :                       `Revision requested on your quote for "${nameEn(q.requestId)}"`,
        timestamp: q.statusChangedAt || q.createdAt,
        unread: true,
      };
    });

  const editRequestDeclinedItems: NotifItem[] = myQuotes
    .filter(q => q.editRequestStatus === 'rejected')
    .map(q => ({
      id: `editreq-declined-${q.id}-${q.editRequestedAt || ''}`,
      type: 'rejected' as NotifType,
      requestId: q.requestId,
      textAr: `تم رفض طلبك بتعديل العرض على «${nameAr(q.requestId)}»`,
      textEn: `Your request to edit the quote on "${nameEn(q.requestId)}" was declined`,
      timestamp: q.createdAt,
      unread: true,
    }));

  const invitedRequestIds = new Set(myQuotes.map(q => q.requestId));
  const inviteItems: NotifItem[] = allRequests
    .filter(r => r.status === 'open' && !invitedRequestIds.has(r.id)
      && (r.selectedSuppliers?.includes(supplierEmail) || isRequestMatchedToSupplier(r, supplier)))
    .map(r => ({
      id: `invite-${r.id}`,
      type: 'invite' as NotifType,
      requestId: r.id,
      textAr: `تمت دعوتك لتقديم عرض سعر على «${nameAr(r.id)}»`,
      textEn: `You were invited to quote "${nameEn(r.id)}"`,
      timestamp: r.createdAt,
      unread: true,
    }));

  const ratingItems: NotifItem[] = allRatings
    .filter(r => r.supplierId === supplierEmail)
    .map(r => ({
      id: `rating-${r.id}`,
      type: 'rated' as NotifType,
      requestId: r.requestId,
      textAr: `تلقيت تقييم ${r.rating}★ على «${nameAr(r.requestId)}»`,
      textEn: `You received a ${r.rating}★ rating on "${nameEn(r.requestId)}"`,
      timestamp: r.createdAt,
      unread: true,
    }));

  /* pending quotes about to lapse (≤3 days) or already lapsed — nudge the supplier to extend */
  const expiryItems: NotifItem[] = myQuotes
    .filter(q => q.status === 'pending')
    .map((q): NotifItem | null => {
      const daysLeft = quoteValidityDaysLeft(q);
      if (daysLeft === null || daysLeft > 3) return null;
      const expired = isQuoteExpired(q);
      return {
        id: `expiry-${q.id}-${q.validUntil}-${expired ? 'ended' : 'soon'}`,
        type: 'expiring' as NotifType,
        requestId: q.requestId,
        textAr: expired
          ? `انتهت صلاحية عرضك على «${nameAr(q.requestId)}» — مدّدها ليبقى قابلاً للقبول`
          : `صلاحية عرضك على «${nameAr(q.requestId)}» تنتهي ${daysLeft === 0 ? 'اليوم' : `خلال ${daysLeft} يوم`}`,
        textEn: expired
          ? `Your quote on "${nameEn(q.requestId)}" has expired — extend it so it can still be accepted`
          : `Your quote on "${nameEn(q.requestId)}" expires ${daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}`,
        timestamp: q.validUntil!,
        unread: true,
      };
    })
    .filter((x): x is NotifItem => x !== null);

  const answerItems: NotifItem[] = (opts?.allQuestions || [])
    .filter(q => q.supplierId === supplierEmail && q.answer)
    .map(q => ({
      id: `answer-${q.id}`,
      type: 'answer' as NotifType,
      requestId: q.requestId,
      textAr: `تم الرد على سؤالك بخصوص «${nameAr(q.requestId)}»`,
      textEn: `Your question about "${nameEn(q.requestId)}" was answered`,
      timestamp: q.answeredAt || q.createdAt,
      unread: true,
    }));

  const all = [...statusItems, ...editRequestDeclinedItems, ...inviteItems, ...ratingItems, ...expiryItems, ...answerItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return opts?.limit ? all.slice(0, opts.limit) : all;
}
