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
      const video = document.querySelector('video.html5-main-video, video.video-stream');
      const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot, [class*="ytp-ad-skip"]');

      // 優先點擊跳過按鈕（最可靠）
      if (skipBtn && skipBtn.offsetParent !== null && !skipBtn.disabled) {
        try { skipBtn.click(); } catch (e) {}
        try { skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
        // 點擊後立即返回，讓 YouTube 自行切換
        return;
      }

      if (adShowing && video) {
        // 對於不可跳過的廣告，靜音並嘗試加速（不強制 seek，避免黑屏）
        try {
          if (!video.muted) video.muted = true;
          // 僅對短廣告（<30s）嘗試加速，不對長廣告 seek 以免觸發 YouTube 錯誤
          if (video.duration && isFinite(video.duration) && video.duration > 0 && video.duration < 30) {
            try { video.playbackRate = 2; } catch (e) {}
          }
          if (video.paused) video.play().catch(() => {});
        } catch (e) {}
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
