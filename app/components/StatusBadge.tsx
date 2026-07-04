'use client';

type Lang = 'ar' | 'en';
type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'revision' | 'expired';

const T = {
  pending:  { ar: 'انتظار',    en: 'Pending'  },
  accepted: { ar: 'مقبول',     en: 'Accepted' },
  rejected: { ar: 'مرفوض',    en: 'Rejected' },
  revision: { ar: 'طلب تعديل', en: 'Revision' },
  expired:  { ar: 'منتهي',     en: 'Expired'  },
};

export default function StatusBadge({ status, lang }: { status: QuoteStatus; lang: Lang }) {
  const map = {
    pending:  { cls: 'bg-orange-50 text-orange-700 border-orange-200',    dot: 'bg-orange-400'  },
    accepted: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    rejected: { cls: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-500'     },
    revision: { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400'   },
    expired:  { cls: 'bg-stone-100 text-stone-500 border-stone-200',      dot: 'bg-stone-400'   },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {T[status][lang]}
    </span>
  );
}
