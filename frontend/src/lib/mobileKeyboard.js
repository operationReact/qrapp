const EDITABLE_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(',');

function isEditable(element) {
  return element instanceof Element && element.matches(EDITABLE_SELECTOR) && !element.hasAttribute('disabled');
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Keeps mobile form controls visible when the on-screen keyboard opens.
 * Works with iOS WKWebView/Capacitor and Android Chrome/TWA without changing
 * form submission, validation, routing, or any business behavior.
 */
export function installMobileKeyboardHandling() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const touchCapable = navigator.maxTouchPoints > 0;
  if (!coarsePointer && !touchCapable) return () => {};

  const root = document.documentElement;
  const viewport = window.visualViewport;
  let largestViewportHeight = viewport?.height || window.innerHeight;
  let focusTimer;
  let blurTimer;

  const setViewportVars = () => {
    const currentHeight = viewport?.height || window.innerHeight;
    const offsetTop = viewport?.offsetTop || 0;
    const active = document.activeElement;

    if (!isEditable(active)) {
      largestViewportHeight = Math.max(largestViewportHeight, currentHeight);
    }

    const baselineGap = Math.max(0, largestViewportHeight - currentHeight - offsetTop);
    const visualGap = viewport
      ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      : 0;
    const keyboardInset = Math.max(baselineGap, visualGap);
    const keyboardOpen = isEditable(active) && keyboardInset > 100;

    root.style.setProperty('--app-visible-viewport-height', `${Math.round(currentHeight)}px`);
    root.style.setProperty('--app-keyboard-inset', `${Math.round(keyboardOpen ? keyboardInset : 0)}px`);
    root.classList.toggle('mobile-keyboard-open', keyboardOpen);
  };

  const revealFocusedControl = (target) => {
    if (!isEditable(target)) return;

    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => {
      setViewportVars();

      const currentViewport = window.visualViewport;
      const rect = target.getBoundingClientRect();
      const visibleTop = (currentViewport?.offsetTop || 0) + 16;
      const visibleBottom = (currentViewport?.offsetTop || 0) + (currentViewport?.height || window.innerHeight) - 20;

      if (rect.top < visibleTop || rect.bottom > visibleBottom) {
        target.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
    }, 220);
  };

  const onFocusIn = (event) => {
    if (!isEditable(event.target)) return;
    revealFocusedControl(event.target);
  };

  const onFocusOut = () => {
    window.clearTimeout(blurTimer);
    blurTimer = window.setTimeout(setViewportVars, 180);
  };

  const onViewportChange = () => {
    setViewportVars();
    const active = document.activeElement;
    if (isEditable(active)) revealFocusedControl(active);
  };

  const onOrientationChange = () => {
    largestViewportHeight = viewport?.height || window.innerHeight;
    window.setTimeout(setViewportVars, 250);
  };

  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  viewport?.addEventListener('resize', onViewportChange);
  viewport?.addEventListener('scroll', onViewportChange);
  window.addEventListener('orientationchange', onOrientationChange);
  window.addEventListener('resize', setViewportVars);
  setViewportVars();

  return () => {
    window.clearTimeout(focusTimer);
    window.clearTimeout(blurTimer);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    viewport?.removeEventListener('resize', onViewportChange);
    viewport?.removeEventListener('scroll', onViewportChange);
    window.removeEventListener('orientationchange', onOrientationChange);
    window.removeEventListener('resize', setViewportVars);
    root.classList.remove('mobile-keyboard-open');
    root.style.removeProperty('--app-keyboard-inset');
    root.style.removeProperty('--app-visible-viewport-height');
  };
}
