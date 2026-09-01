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
    // 注入額外樣式以強制收縮（即使 CSS 已載入，再補一次動態樣式確保優先級）
    if (document.getElementById('sbx-layout-fix')) return;
    const style = document.createElement('style');
    style.id = 'sbx-layout-fix';
    style.textContent = `
      html, body { max-width: 100% !important; overflow-x: hidden !important; }
      * { box-sizing: border-box !important; }
      div, main, section, article, c-wiz, [role="main"] { min-width: 0 !important; max-width: 100% !important; }
      pre, code { white-space: pre-wrap !important; word-break: break-word !important; overflow-x: auto !important; max-width: 100% !important; }
      table { display: block !important; max-width: 100% !important; overflow-x: auto !important; }
      img, canvas, svg { max-width: 100% !important; height: auto !important; }
      video, iframe { max-width: 100% !important; }
      main, [role="main"], c-wiz, [data-test-id="conversation"], .conversation-container, .chat-container {
        width: 100% !important; max-width: 100% !important; min-width: 0 !important; overflow-x: hidden !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const fixOverflowElements = () => {
    if (!isInsideSidePanel()) return;
    try {
      const vw = window.innerWidth;
      // 找出所有超出視窗的水平溢出元素
      const all = document.querySelectorAll('body *');
      for (const el of all) {
        if (el.id === 'sbx-layout-fix' || el.closest && el.closest('#sbx-layout-fix')) continue;
        try {
          const rect = el.getBoundingClientRect();
          // 若元素右緣超出視窗或寬度大於視窗
          if (rect.width > vw + 2 || rect.right > vw + 2) {
            // 只對可收縮的容器處理，避免破壞固定定位的對話框
            const style = getComputedStyle(el);
            if (style.position === 'fixed' && rect.width < vw * 0.5) continue; // 小固定按鈕不處理
            // 標記並修正
            if (!el.dataset.sbxFixed) {
              el.dataset.sbxFixed = '1';
              el.style.setProperty('max-width', '100%', 'important');
              el.style.setProperty('box-sizing', 'border-box', 'important');
              if (style.position !== 'fixed' && style.position !== 'sticky') {
                el.style.setProperty('overflow-x', 'hidden', 'important');
              }
            }
            // 對 pre/code/table 特別處理
            if (el.tagName === 'PRE' || el.tagName === 'CODE' || el.tagName === 'TABLE') {
              el.style.setProperty('white-space', 'pre-wrap', 'important');
              el.style.setProperty('word-break', 'break-word', 'important');
              el.style.setProperty('overflow-x', 'auto', 'important');
            }
          }
        } catch (e) {}
      }
      // 特別處理 Gemini 的對話容器：強制 min-width:0
      const candidates = document.querySelectorAll('main, [role="main"], c-wiz, [data-test-id="conversation"], .conversation-container, .chat-container, .response-container');
      for (const el of candidates) {
        try {
          el.style.setProperty('min-width', '0', 'important');
          el.style.setProperty('max-width', '100%', 'important');
          el.style.setProperty('width', '100%', 'important');
          el.style.setProperty('overflow-x', 'hidden', 'important');
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
