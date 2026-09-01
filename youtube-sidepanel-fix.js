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
      // 強制單欄：將 #columns 的 flex 方向改為 column，避免 secondary 被擠到面板外
      const columns = document.querySelector('#columns');
      if (columns) {
        columns.style.setProperty('flex-direction', 'column', 'important');
        columns.style.setProperty('max-width', '100%', 'important');
        columns.style.setProperty('min-width', '0', 'important');
      }
      const primary = document.querySelector('#primary');
      const secondary = document.querySelector('#secondary');
      [primary, secondary].forEach(el => {
        if (!el) return;
        el.style.setProperty('max-width', '100%', 'important');
        el.style.setProperty('min-width', '0', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('margin-left', '0', 'important');
        el.style.setProperty('margin-right', '0', 'important');
      });
      // 影片容器保持比例
      const player = document.querySelector('#player');
      if (player) {
        player.style.setProperty('max-width', '100%', 'important');
        player.style.setProperty('min-width', '0', 'important');
      }
      // 推薦列表
      document.querySelectorAll('ytd-compact-video-renderer, ytd-rich-item-renderer').forEach(el => {
        el.style.setProperty('max-width', '100%', 'important');
        el.style.setProperty('min-width', '0', 'important');
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
    fix();
    try {
      const obs = new MutationObserver(schedule);
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
      window.addEventListener('resize', schedule);
    } catch (e) {}
    setTimeout(fix, 1000);
    setTimeout(fix, 2500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
