/**
 * Small hand-drawn line-icon set for the landing page — stroke uses currentColor so
 * each icon inherits its wrapper's text color/size, keeping every icon in step with
 * the brand palette instead of needing per-icon color props.
 */

type IconProps = { className?: string };
const base = 'w-6 h-6';

export function IconClipboardList({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </svg>
  );
}

export function IconInboxDownload({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 13h3.2a2 2 0 0 1 1.79 1.11l.3.6A2 2 0 0 0 11.08 16h1.84a2 2 0 0 0 1.79-1.29l.3-.6A2 2 0 0 1 16.8 13H20" />
      <path d="M5.5 13 4 5.5A2 2 0 0 1 5.96 4h12.08a2 2 0 0 1 1.96 1.5L21.5 13" />
      <rect x="4" y="13" width="16" height="7" rx="2" />
      <path d="M12 3v7m0 0 2.5-2.5M12 10 9.5 7.5" />
    </svg>
  );
}

export function IconBadgeCheck({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2 9.7 3.6 7 3.2 6 5.8 3.6 7.3 4.4 10 3.6 12.7 6 14.2l1 2.6 2.7-.4L12 18l2.3-1.6 2.7.4 1-2.6 2.4-1.5-.8-2.7.8-2.7-2.4-1.5-1-2.6-2.7.4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconMapPin({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10.5c0 5-8 11-8 11s-8-6-8-11a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10.5" r="2.75" />
    </svg>
  );
}

export function IconPackage({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3.5 7.5 8.5-4 8.5 4-8.5 4-8.5-4Z" />
      <path d="M3.5 7.5v9l8.5 4 8.5-4v-9" />
      <path d="M12 11.5v9" />
    </svg>
  );
}

export function IconHardHat({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 16a8 8 0 0 1 16 0Z" />
      <path d="M2 16h20" />
      <path d="M12 6.5V4" />
      <path d="M9 16V9.5a3 3 0 0 1 6 0V16" />
    </svg>
  );
}

export function IconBuilding({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="3" width="10" height="18" rx="1" />
      <rect x="15" y="9" width="4.5" height="12" rx="1" />
      <path d="M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1" />
    </svg>
  );
}

export function IconSparkle({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5c.6 3.6 2 5 5.6 5.6-3.6.6-5 2-5.6 5.6-.6-3.6-2-5-5.6-5.6 3.6-.6 5-2 5.6-5.6Z" />
      <path d="M19 14c.3 1.7.9 2.3 2.6 2.6-1.7.3-2.3.9-2.6 2.6-.3-1.7-.9-2.3-2.6-2.6 1.7-.3 2.3-.9 2.6-2.6Z" opacity=".7" />
    </svg>
  );
}

export function IconArrow({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconCheck({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

export function IconQuote({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9.5 6C6 6 3.5 8.7 3.5 12.2c0 2.7 1.7 4.6 4 4.6 1.8 0 3.2-1.3 3.2-3.1 0-1.7-1.2-2.9-2.7-2.9-.3 0-.6 0-.8.1.3-1.8 2-3.2 4-3.4L9.5 6Zm9.3 0c-3.5 0-6 2.7-6 6.2 0 2.7 1.7 4.6 4 4.6 1.8 0 3.2-1.3 3.2-3.1 0-1.7-1.2-2.9-2.7-2.9-.3 0-.6 0-.8.1.3-1.8 2-3.2 4-3.4L18.8 6Z" />
    </svg>
  );
}
