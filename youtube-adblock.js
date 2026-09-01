(() => {
  if (window.__sbxYoutubeAdblock) return;
  window.__sbxYoutubeAdblock = true;

  const host = location.hostname || '';
  if (!host.includes('youtube.com') && !host.includes('youtube-nocookie.com')) return;

  // 僅在側邊欄窄 iframe 或一般頁面皆生效（Brave 側邊欄不走 Shields）
  const isSidePanel = (() => {
    try { return window.self !== window.top; } catch (e) { return false; }
  })();

  const skipAd = () => {
    try {
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot, [class*="ytp-ad-skip"]');
      // 僅處理可跳過按鈕，不對影片做任何靜音/加速/seek，避免黑屏與持續播廣告的副作用
      if (skipBtn && skipBtn.offsetParent !== null && !skipBtn.disabled) {
        try { skipBtn.click(); } catch (e) {}
        try { skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
      }
    } catch (e) {}
  };

  // 持續監控
  let raf = null;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      skipAd();
    });
  };

  // 高頻檢查（廣告切換快）
  const start = () => {
    // 立即執行一次
    skipAd();
    // MutationObserver 監看播放器變化
    try {
      const obs = new MutationObserver(schedule);
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    } catch (e) {}
    // 定時輪詢（0.5s）
    setInterval(skipAd, 500);
    // 影片事件
    try {
      document.addEventListener('timeupdate', schedule, true);
      window.addEventListener('yt-navigate-finish', schedule);
    } catch (e) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  // 延遲再啟動確保 SPA 載入後生效
  setTimeout(start, 1500);
  setTimeout(start, 3500);
})();
