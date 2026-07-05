'use client';

import { useState } from 'react';

type Lang = 'ar' | 'en';
type MonthRow = { month: string; reqs: number; quotesReceived: number; accepted: number; totalVal: number };

const SERIES = [
  { key: 'reqs',           color: '#eda100', ar: 'طلبات جديدة',  en: 'New Requests'     },
  { key: 'quotesReceived', color: '#2a78d6', ar: 'عروض واردة',   en: 'Quotes Received'  },
  { key: 'accepted',       color: '#008300', ar: 'عروض مقبولة',  en: 'Accepted'         },
] as const;

const GRID = '#EDF0F3';
const AXIS_INK = '#898781';

function niceMax(max: number) {
  if (max <= 0) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / step;
  const rounded = n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return rounded * step;
}

function ticksFor(max: number, count = 4) {
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) ticks.push(Math.round((max / count) * i));
  return ticks;
}

/** rect with rounded top corners, square baseline — bars grow from y=baseline upward */
function barPath(x: number, yTop: number, w: number, yBase: number, r: number) {
  const rr = Math.min(r, w / 2, Math.max(yBase - yTop, 0));
  if (yBase - yTop <= 0) return '';
  return `M${x},${yBase} L${x},${yTop + rr} Q${x},${yTop} ${x + rr},${yTop} L${x + w - rr},${yTop} Q${x + w},${yTop} ${x + w},${yTop + rr} L${x + w},${yBase} Z`;
}

function shortMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${mo}/${y.slice(2)}`;
}

export function MonthlyActivityChart({ data, lang }: { data: MonthRow[]; lang: Lang }) {
  const [hover, setHover] = useState<number | null>(null);
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  const rows = [...data].sort((a, b) => a.month.localeCompare(b.month));
  if (rows.length === 0) return null;

  const W = 760, H = 260;
  const padL = 32, padR = 8, padT = 12, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const max = niceMax(Math.max(...rows.map(r => Math.max(r.reqs, r.quotesReceived, r.accepted))));
  const ticks = ticksFor(max);
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  const groupW = plotW / rows.length;
  const barGap = 2;
  const barW = Math.max(4, Math.min(24, (groupW - 10) / 3 - barGap));

  return (
    <div>
      <div className="flex items-center gap-4 px-5 pt-4 pb-1 flex-wrap">
        {SERIES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[11px] text-stone-600">
            <span className="inline-block w-2.5 h-2.5 rounded-[2px]" style={{ background: s.color }} />
            {t(s.ar, s.en)}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto px-2 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 480, maxWidth: W, display: 'block' }} role="img" aria-label={t('الرسم البياني للنشاط الشهري', 'Monthly activity chart')}>
          {ticks.map((tv, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(tv)} y2={y(tv)} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={y(tv)} dy="0.32em" textAnchor="end" fontSize={9} fill={AXIS_INK}>{tv}</text>
            </g>
          ))}

          {rows.map((row, gi) => {
            const gx = padL + gi * groupW;
            const vals = [row.reqs, row.quotesReceived, row.accepted];
            const innerW = barW * 3 + barGap * 2;
            const startX = gx + (groupW - innerW) / 2;
            const isHover = hover === gi;
            return (
              <g key={row.month} opacity={hover === null || isHover ? 1 : 0.45}>
                {SERIES.map((s, si) => {
                  const v = vals[si];
                  const bx = startX + si * (barW + barGap);
                  return (
                    <path key={s.key} d={barPath(bx, y(v), barW, padT + plotH, 4)} fill={s.color} />
                  );
                })}
                <text x={gx + groupW / 2} y={H - padB + 14} textAnchor="middle" fontSize={9} fill={AXIS_INK}>
                  {shortMonth(row.month)}
                </text>
                {isHover && (
                  <rect x={gx + 1} y={padT + 1} width={groupW - 2} height={plotH - 2} rx={4} fill="none" stroke="var(--line)" strokeWidth={1} />
                )}
                {/* full-height hit target for hover/focus tooltip, per-group (bigger than the marks) */}
                <rect
                  x={gx} y={padT} width={groupW} height={plotH}
                  fill="transparent"
                  style={{ outline: 'none' }}
                  tabIndex={0}
                  onMouseEnter={() => setHover(gi)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(gi)}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}

          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#c3c2b7" strokeWidth={1} />
        </svg>
      </div>

      {hover !== null && (
        <div className="mx-5 mb-4 -mt-1 inline-flex flex-col gap-1 rounded-lg border border-[var(--line)] bg-white shadow-sm px-3 py-2 text-[11px]">
          <div className="font-bold text-stone-800">{shortMonth(rows[hover].month)}</div>
          {SERIES.map((s, si) => {
            const v = [rows[hover].reqs, rows[hover].quotesReceived, rows[hover].accepted][si];
            return (
              <div key={s.key} className="flex items-center gap-1.5 text-stone-600">
                <span className="inline-block w-2 h-0.5" style={{ background: s.color }} />
                <span>{t(s.ar, s.en)}:</span>
                <span className="font-bold text-stone-900">{v}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MonthlyValueChart({ data, lang, currency }: { data: MonthRow[]; lang: Lang; currency: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  const rows = [...data].sort((a, b) => a.month.localeCompare(b.month));
  if (rows.length === 0) return null;

  const W = 760, H = 180;
  const padL = 46, padR = 8, padT = 12, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const max = niceMax(Math.max(...rows.map(r => r.totalVal)));
  const ticks = ticksFor(max);
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  const groupW = plotW / rows.length;
  const barW = Math.max(6, Math.min(24, groupW - 10));
  const color = 'var(--brand-strong)';

  return (
    <div>
      <div className="overflow-x-auto px-2 pt-3 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 480, maxWidth: W, display: 'block' }} role="img" aria-label={t('الرسم البياني للقيمة الشهرية', 'Monthly value chart')}>
          {ticks.map((tv, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(tv)} y2={y(tv)} stroke={GRID} strokeWidth={1} />
              <text x={padL - 6} y={y(tv)} dy="0.32em" textAnchor="end" fontSize={9} fill={AXIS_INK}>{tv.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')}</text>
            </g>
          ))}

          {rows.map((row, gi) => {
            const gx = padL + gi * groupW;
            const bx = gx + (groupW - barW) / 2;
            const isHover = hover === gi;
            return (
              <g key={row.month} opacity={hover === null || isHover ? 1 : 0.45}>
                <path d={barPath(bx, y(row.totalVal), barW, padT + plotH, 4)} fill={color} />
                <text x={gx + groupW / 2} y={H - padB + 14} textAnchor="middle" fontSize={9} fill={AXIS_INK}>
                  {shortMonth(row.month)}
                </text>
                {isHover && (
                  <rect x={gx + 1} y={padT + 1} width={groupW - 2} height={plotH - 2} rx={4} fill="none" stroke="var(--line)" strokeWidth={1} />
                )}
                <rect
                  x={gx} y={padT} width={groupW} height={plotH}
                  fill="transparent"
                  style={{ outline: 'none' }}
                  tabIndex={0}
                  onMouseEnter={() => setHover(gi)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(gi)}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}

          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#c3c2b7" strokeWidth={1} />
        </svg>
      </div>

      {hover !== null && (
        <div className="mx-5 mb-4 -mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white shadow-sm px-3 py-2 text-[11px]">
          <span className="font-bold text-stone-800">{shortMonth(rows[hover].month)}:</span>
          <span className="font-bold text-[var(--brand-strong)]">{rows[hover].totalVal.toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US')} {currency}</span>
        </div>
      )}
    </div>
  );
}
