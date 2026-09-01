(() => {
  if (window.__sbxUnifiedFix) return;
  window.__sbxUnifiedFix = true;

  const host = location.hostname || '';
  const isYouTube = host.includes('youtube.com') || host.includes('youtube-nocookie.com');
  const isGemini = host.includes('gemini.google.com') || host.includes('aistudio.google.com') || host.includes('notebooklm.google.com');
  const isChatGPT = host.includes('chatgpt.com') || host.includes('chat.openai.com') || host.includes('claude.ai') || host.includes('perplexity.ai');

  const isSidePanel = (() => {
    try { return window.self !== window.top && window.innerWidth < 700; } catch (e) { return window.innerWidth < 700; }
  })();
  if (!isSidePanel) return;

  // 統一策略：僅對真正需要 RWD 調整的頁面生效，YouTube 和 Gemini 採用原生 RWD 為主，僅修正長內容溢出
  const fix = () => {
    try {
      // 通用：長內容（code/pre/table）避免撐寬
      document.querySelectorAll('pre, code').forEach(el => {
        if (el.dataset.sbxFixed) return;
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth) {
          el.dataset.sbxFixed = '1';
          el.style.setProperty('white-space', 'pre-wrap', 'important');
          el.style.setProperty('word-break', 'break-word', 'important');
          el.style.setProperty('overflow-x', 'auto', 'important');
          el.style.setProperty('max-width', '100%', 'important');
        }
      });
      document.querySelectorAll('table').forEach(el => {
        if (el.dataset.sbxFixed) return;
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth) {
          el.dataset.sbxFixed = '1';
          el.style.setProperty('display', 'block', 'important');
          el.style.setProperty('max-width', '100%', 'important');
          el.style.setProperty('overflow-x', 'auto', 'important');
        }
      });
      // YouTube：僅當 #columns 真正溢出時才改為單欄，避免黑屏
      if (isYouTube) {
        const columns = document.querySelector('#columns');
        if (columns) {
          const r = columns.getBoundingClientRect();
          if (r.width > window.innerWidth + 5) {
            columns.style.setProperty('max-width', '100%', 'important');
            columns.style.setProperty('min-width', '0', 'important');
            // 僅在 secondary 確實會超出時才改 column
            if (r.width > window.innerWidth * 1.1) {
              columns.style.setProperty('flex-direction', 'column', 'important');
            }
          }
        }
      }
      // Gemini：不強制整體佈局，僅確保對話容器可收縮（若溢出）
      if (isGemini || isChatGPT) {
        document.querySelectorAll('c-wiz, [data-test-id="conversation"], .conversation-container').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > window.innerWidth) {
            el.style.setProperty('max-width', '100%', 'important');
            el.style.setProperty('min-width', '0', 'important');
          }
        });
      }
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
      obs.observe(document.documentElement, { childList: true, subtree: true });
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
