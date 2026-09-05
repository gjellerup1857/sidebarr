(() => {
  if (window.__sbxOverflowFixed) return;
  window.__sbxOverflowFixed = true;

  const inNarrowIframe = () => {
    try {
      return window.self !== window.top && window.innerWidth < 700;
    } catch (e) {
      return window.innerWidth < 700;
    }
  };

  const clampOverflow = () => {
    if (!inNarrowIframe() || document.visibilityState !== 'visible') return;
    try {
      const vw = window.innerWidth;
      const nodes = document.querySelectorAll('pre, code, table, img, canvas');
      for (const el of nodes) {
        if (el.dataset.sbxOverflow) continue;
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width <= vw + 2 && rect.right <= vw + 2) continue;
          el.dataset.sbxOverflow = '1';
          el.style.setProperty('max-width', '100%', 'important');
          el.style.setProperty('box-sizing', 'border-box', 'important');
          if (el.tagName === 'PRE' || el.tagName === 'CODE') {
            el.style.setProperty('white-space', 'pre-wrap', 'important');
            el.style.setProperty('word-break', 'break-word', 'important');
            el.style.setProperty('overflow-wrap', 'break-word', 'important');
            el.style.setProperty('overflow-x', 'auto', 'important');
          } else if (el.tagName === 'TABLE') {
            el.style.setProperty('display', 'block', 'important');
            el.style.setProperty('overflow-x', 'auto', 'important');
          } else if (el.tagName === 'IMG' || el.tagName === 'CANVAS') {
            el.style.setProperty('height', 'auto', 'important');
          }
        } catch (e) {}
      }
    } catch (e) {}
  };

  let raf = null;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      clampOverflow();
    });
  };

  const init = () => {
    if (!inNarrowIframe() || document.visibilityState !== 'visible') return;
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => clampOverflow(), { timeout: 1500 });
    } else {
      setTimeout(clampOverflow, 800);
    }
    try {
      const obs = new MutationObserver(() => {
        if (document.visibilityState === 'visible') schedule();
      });
      obs.observe(document.body, { childList: true, subtree: false });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') schedule();
      });
    } catch (e) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
