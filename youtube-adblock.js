(() => {
  if (window.__sbxYoutubeAdblock) return;
  window.__sbxYoutubeAdblock = true;

  const host = location.hostname || '';
  if (!host.includes('youtube.com') && !host.includes('youtube-nocookie.com')) return;

  // 僅在側邊欄窄 iframe 或一般頁面皆生效（Brave 側邊欄不走 Shields）
  const isSidePanel = (() => {
    try { return window.self !== window.top; } catch (e) { return false; }
  })();

  let wasAd = false;
  let adMutedOriginal = null;
  let adRateOriginal = 1;

  const skipAd = () => {
    try {
      const video = document.querySelector('video.html5-main-video, video.video-stream');
      const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, [class*="skip-button"]');

      // 點擊可跳過按鈕（無論是否偵測到 adShowing，都嘗試點擊）
      if (skipBtn && skipBtn.offsetParent !== null) {
        try { skipBtn.click(); } catch (e) {}
        try { skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
      }

      if (adShowing && video) {
        if (!wasAd) {
          wasAd = true;
          try { adMutedOriginal = video.muted; } catch (e) { adMutedOriginal = false; }
          try { adRateOriginal = video.playbackRate || 1; } catch (e) { adRateOriginal = 1; }
        }
        // 僅對廣告影片加速與靜音，不隱藏容器
        try {
          if (!video.muted) video.muted = true;
          // 僅在可 seek 時跳至結尾，避免對直播廣告拋錯
          if (video.duration && isFinite(video.duration) && video.duration > 0 && video.duration < 600 && video.currentTime < video.duration - 0.2) {
            try { video.currentTime = Math.max(0, video.duration - 0.1); } catch (e) {}
          } else {
            // 不可 seek 的廣告，加速播放
            try { video.playbackRate = 16; } catch (e) {}
          }
          if (video.paused) video.play().catch(() => {});
        } catch (e) {}
        // 輕量隱藏遮罩，不動主容器
        document.querySelectorAll('.ytp-ad-player-overlay, #player-ads').forEach(el => {
          if (el.style.display !== 'none') el.style.display = 'none';
        });
      } else if (wasAd && !adShowing && video) {
        // 廣告剛結束，恢復現場
        wasAd = false;
        try {
          video.muted = adMutedOriginal !== null ? adMutedOriginal : false;
          video.playbackRate = adRateOriginal || 1;
          video.style.removeProperty('opacity');
          video.style.removeProperty('display');
          video.style.removeProperty('visibility');
          if (video.paused) video.play().catch(() => {});
        } catch (e) {}
        // 確保播放器容器可見
        document.querySelectorAll('.html5-video-player').forEach(el => {
          try {
            el.style.removeProperty('display');
            el.style.removeProperty('opacity');
            el.style.removeProperty('visibility');
          } catch (e) {}
        });
        // 還原被隱藏的遮罩（讓 YouTube 自行管理）
        document.querySelectorAll('.ytp-ad-module, .ytp-ad-player-overlay, #player-ads').forEach(el => {
          try { el.style.removeProperty('display'); } catch (e) {}
        });
      } else if (!adShowing) {
        // 非廣告期間，確保不殘留加速/靜音
        if (wasAd) wasAd = false;
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
