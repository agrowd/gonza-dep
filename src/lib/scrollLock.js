/**
 * Utility to safely lock and unlock body scroll on mobile WebKit (iOS Safari)
 * without deadlocking touch events, BFCache, or layout viewports.
 *
 * Avoids setting `document.body.style.position = 'fixed'`, which corrupts
 * WebKit's internal hit-testing layer and freezes touches on iOS Safari.
 */

export function safeUnlockBodyScroll() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.touchAction = '';
  // Force WebKit reflow to restore touch event hit testing
  void document.body.offsetHeight;
}

export function safeLockBodyScroll() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}
