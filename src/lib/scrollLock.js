/**
 * Utility to safely lock and unlock body scroll on mobile WebKit (iOS Safari)
 * without deadlocking touch events, BFCache, or layout viewports.
 */

export function safeUnlockBodyScroll() {
  if (typeof document === 'undefined') return;
  const top = document.body.style.top;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  // Force WebKit reflow to restore touch event hit testing
  void document.body.offsetHeight;
  if (top) {
    const restoreY = Math.abs(parseInt(top, 10)) || 0;
    if (typeof window !== 'undefined' && restoreY > 0) {
      window.scrollTo(0, restoreY);
    }
  }
}

export function safeLockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (document.body.style.position === 'fixed') {
    // Already locked, do not re-lock to prevent WebKit scroll jump / deadlock
    return;
  }
  const scrollY = (typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0);
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
}
