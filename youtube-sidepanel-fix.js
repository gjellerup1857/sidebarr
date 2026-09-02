(() => {
  if (window.__sbxYoutubeLayout) return;
  window.__sbxYoutubeLayout = true;

  const host = location.hostname || '';
  if (!host.includes('youtube.com') && !host.includes('youtube-nocookie.com')) return;

  const isSidePanel = (() => {
    try { return window.self !== window.top && window.innerWidth < 600; } catch (e) { return window.innerWidth < 600; }
  })();
  if (!isSidePanel) return;

  const fix = () => {
    try {
      // 僅在真正溢出時才調整，避免破壞 YouTube 原生 RWD
      const vw = window.innerWidth;
      const columns = document.querySelector('#columns');
      if (columns && columns.getBoundingClientRect().width > vw) {
        columns.style.setProperty('max-width', '100%', 'important');
        columns.style.setProperty('min-width', '0', 'important');
        // 僅當 secondary 會超出時才改為單欄
        if (columns.getBoundingClientRect().width > vw * 1.1) {
          columns.style.setProperty('flex-direction', 'column', 'important');
        }
      }
      document.querySelectorAll('#primary, #secondary').forEach(el => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width > vw) {
          el.style.setProperty('max-width', '100%', 'important');
          el.style.setProperty('min-width', '0', 'important');
        }
      });
    } catch (e) {}
  };

  let raf = null;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      fix();
    });
  };

  const init = () => {
    if (document.visibilityState !== 'visible') return;
    fix();
    try {
      const obs = new MutationObserver(() => {
        if (document.visibilityState === 'visible') schedule();
      });
      obs.observe(document.body, { childList: true, subtree: false });
      window.addEventListener('resize', schedule);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') schedule();
      });
    } catch (e) {}
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => fix(), { timeout: 1500 });
    } else {
      setTimeout(fix, 2000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
