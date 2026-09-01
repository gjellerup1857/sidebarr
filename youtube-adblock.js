(() => {
  if (window.__sbxYoutubeAdblock) return;
  window.__sbxYoutubeAdblock = true;

  const host = location.hostname || '';
  if (!host.includes('youtube.com') && !host.includes('youtube-nocookie.com')) return;

  // 僅在側邊欄窄 iframe 或一般頁面皆生效（Brave 側邊欄不走 Shields）
  const isSidePanel = (() => {
    try { return window.self !== window.top; } catch (e) { return false; }
  })();

  // 加速與跳過邏輯
  const skipAd = () => {
    try {
      const video = document.querySelector('video.html5-main-video, video.video-stream');
      const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, [class*="skip-button"]');
      
      if (adShowing && video) {
        // 加速播放以快速跳過不可跳過廣告（不隱藏容器，避免全黑）
        try {
          if (!video.muted) video.muted = true;
          video.playbackRate = 16;
          // 直接跳至結尾
          if (video.duration && isFinite(video.duration) && video.currentTime < video.duration - 0.5) {
            try { video.currentTime = video.duration; } catch (e) {}
          }
          if (video.paused) video.play().catch(() => {});
        } catch (e) {}
      }

      // 點擊可跳過按鈕
      if (skipBtn && skipBtn.offsetParent !== null) {
        skipBtn.click();
        // 備援：分發點擊事件
        try {
          skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch (e) {}
      }

      // 隱藏廣告遮罩
      document.querySelectorAll('.ytp-ad-module, .ytp-ad-player-overlay, #player-ads').forEach(el => {
        el.style.display = 'none';
      });

      // 移除廣告類別，讓播放器恢復（需從實際帶有該類的元素移除，否則影片保持 opacity:0 或黑屏）
      try {
        document.querySelectorAll('.ad-showing, .ad-interrupting').forEach(el => {
          el.classList.remove('ad-showing', 'ad-interrupting');
        });
        // YouTube 播放器容器通常為 .html5-video-player
        document.querySelectorAll('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting').forEach(el => {
          el.classList.remove('ad-showing', 'ad-interrupting');
        });
      } catch (e) {}
      // 確保影片可見
      try {
        if (video) {
          video.style.removeProperty('opacity');
          video.style.removeProperty('display');
        }
      } catch (e) {}
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
