(() => {
  if (window.__sbxYoutubeAdblock) return;
  window.__sbxYoutubeAdblock = true;

  const host = location.hostname || '';
  if (!host.includes('youtube.com') && !host.includes('youtube-nocookie.com')) return;

  const isSidePanel = (() => {
    try { return window.self !== window.top; } catch (e) { return false; }
  })();
  // 僅在側邊欄 iframe 內生效，一般分頁交給 Brave Shields，避免無側邊欄時仍卡頓
  if (!isSidePanel) return;

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

  // 極致低頻：僅在可見且非閒置時檢查
  const start = () => {
    if (document.visibilityState !== 'visible') return;
    skipAd();
    try {
      const player = document.querySelector('#movie_player');
      if (player) {
        const obs = new MutationObserver(() => {
          if (document.visibilityState === 'visible') schedule();
        });
        obs.observe(player, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (e) {}
    // 2.5s 輪詢，僅在可見時執行
    setInterval(() => {
      if (document.visibilityState === 'visible') skipAd();
    }, 2500);
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
