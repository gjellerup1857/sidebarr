(() => {
  if (window.__sbxLayoutPatched) return;
  window.__sbxLayoutPatched = true;

  const isInsideSidePanel = () => {
    try {
      // YouTube 等影片站點由專屬 adblock 處理，不套用此通用收縮（避免 video 黑屏/高度異常）
      const h = location.hostname || '';
      if (h.includes('youtube.com') || h.includes('youtube-nocookie.com') || h.includes('youtu.be')) return false;
      // 在側邊欄 iframe 內：window.self !== window.top 且寬度窄
      return window.self !== window.top && window.innerWidth < 750;
    } catch (e) {
      const h2 = location.hostname || '';
      if (h2.includes('youtube.com') || h2.includes('youtube-nocookie.com')) return false;
      return window.innerWidth < 750;
    }
  };

  const injectFix = () => {
    if (!isInsideSidePanel()) return;
    if (document.getElementById('sbx-layout-fix')) return;
    const style = document.createElement('style');
    style.id = 'sbx-layout-fix';
    style.textContent = `
      pre, code { white-space: pre-wrap !important; word-break: break-word !important; overflow-wrap: break-word !important; max-width: 100% !important; overflow-x: auto !important; }
      table { display: block !important; max-width: 100% !important; overflow-x: auto !important; }
      img, canvas, svg { max-width: 100% !important; height: auto !important; }
      video, iframe { max-width: 100% !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const fixOverflowElements = () => {
    if (!isInsideSidePanel()) return;
    try {
      // 僅處理真正溢出的長內容，不動整體佈局
      const selectors = 'pre, code, table, img, canvas, svg';
      const candidates = document.querySelectorAll(selectors);
      for (const el of candidates) {
        if (el.dataset.sbxFixed) continue;
        try {
          const rect = el.getBoundingClientRect();
          const vw = window.innerWidth;
          if (rect.width <= vw + 2 && rect.right <= vw + 2) continue;
          if (el.tagName === 'IMG' || el.tagName === 'CANVAS' || el.tagName === 'SVG') {
            // 圖片等僅限制寬度，不強制高度
            el.dataset.sbxFixed = '1';
            el.style.setProperty('max-width', '100%', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
            el.style.setProperty('height', 'auto', 'important');
          } else {
            el.dataset.sbxFixed = '1';
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
            }
          }
        } catch (e) {}
      }
      // Gemini 對話容器：僅當實際溢出時才限制，避免破壞正常 RWD
      const narrowCandidates = document.querySelectorAll('c-wiz, [data-test-id="conversation"], .conversation-container, .chat-container');
      for (const el of narrowCandidates) {
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width > window.innerWidth + 2) {
            el.style.setProperty('max-width', '100%', 'important');
            el.style.setProperty('min-width', '0', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
          }
        } catch (e) {}
      }
    } catch (e) {}
  };

  let raf = null;
  const scheduleFix = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = null;
      fixOverflowElements();
    });
  };

  const init = () => {
    if (!isInsideSidePanel()) return;
    injectFix();
    fixOverflowElements();
    // 監聽動態新增的對話內容
    try {
      const obs = new MutationObserver(scheduleFix);
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
      window.addEventListener('resize', scheduleFix);
    } catch (e) {}
    // Gemini 會動態載入，延遲再修復幾次
    setTimeout(fixOverflowElements, 800);
    setTimeout(fixOverflowElements, 2000);
    setTimeout(fixOverflowElements, 4000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // 若側邊欄寬度改變（拖曳），重新檢查
  try {
    const ro = new ResizeObserver(scheduleFix);
    ro.observe(document.documentElement);
  } catch (e) {}
})();
