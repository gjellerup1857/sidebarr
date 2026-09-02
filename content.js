(() => {
  if (window.top !== window) return;
  if (document.getElementById('sbx-rail-root')) return;

  const DEFAULT_FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8a8f98" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M2.2 8h11.6M8 2c2 1.8 2.8 3.8 2.8 6S10 12.2 8 14c-2-1.8-2.8-3.8-2.8-6S6 3.8 8 2z"/></svg>'
  );
  const GOOGLE_URL = 'https://www.google.com/';

  let sites = [];
  let activeSiteId = null;
  let theme = 'auto';
  let customColor = '#f2f3f5';
  let customTextColor = '';
  let panelOpen = false;
  let dragId = null;
  let toastTimer = null;
  let shortcut = '';
  let recording = false;
  let isFullscreenHidden = false;
  let panelOpenBeforeFullscreen = null;

  const toSites = (v) => (Array.isArray(v) ? v.filter((s) => s && typeof s === 'object' && s.id) : []);

  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || '');

  const KEY_NAME_MAP = {
    ' ': 'Space',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    ',': 'Comma',
    '.': 'Period',
    '/': 'Slash',
    ';': 'Semicolon',
    "'": 'Quote',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    '\\': 'Backslash',
    '`': 'Backquote',
    '-': 'Minus',
    '=': 'Equal',
    '+': 'Plus'
  };

  const RESERVED_SHORTCUTS = [
    'Ctrl+T', 'Ctrl+W', 'Ctrl+N', 'Ctrl+Shift+N', 'Ctrl+Shift+T', 'Ctrl+Shift+W',
    'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4', 'Ctrl+5',
    'Ctrl+6', 'Ctrl+7', 'Ctrl+8', 'Ctrl+9',
    'Ctrl+L', 'Ctrl+E', 'Ctrl+D', 'Ctrl+Shift+D', 'Ctrl+H', 'Ctrl+J',
    'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+C', 'Ctrl+Shift+O', 'Ctrl+Shift+M',
    'Ctrl+Shift+B', 'Ctrl+Shift+Q', 'Ctrl+R', 'Ctrl+F5', 'Ctrl+F', 'Ctrl+F4',
    'Ctrl+U', 'Ctrl+P', 'Ctrl+S', 'Ctrl+A', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+X', 'Ctrl+C',
    'Ctrl+V', 'Ctrl+0', 'Ctrl++', 'Ctrl+=', 'Ctrl+-',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Alt+Left', 'Alt+Right', 'Alt+Home', 'Alt+D', 'Alt+E', 'Alt+F', 'Alt+Space',
    'Cmd+T', 'Cmd+W', 'Cmd+N', 'Cmd+Shift+N', 'Cmd+Shift+T', 'Cmd+Shift+W',
    'Cmd+Shift+P', 'Cmd+Shift+I', 'Cmd+Shift+J', 'Cmd+Shift+C', 'Cmd+Shift+H',
    'Cmd+L', 'Cmd+D', 'Cmd+Shift+D', 'Cmd+H', 'Cmd+R', 'Cmd+Shift+R', 'Cmd+F',
    'Cmd+P', 'Cmd+A', 'Cmd+Z', 'Cmd+Shift+Z', 'Cmd+X', 'Cmd+C', 'Cmd+V', 'Cmd+M',
    'Cmd+Q', 'Cmd+Comma', 'Cmd+0', 'Cmd++', 'Cmd+=', 'Cmd+-',
    'Cmd+Left', 'Cmd+Right', 'Cmd+Up', 'Cmd+Down', 'Cmd+1', 'Cmd+2', 'Cmd+3',
    'Cmd+4', 'Cmd+5', 'Cmd+6', 'Cmd+7', 'Cmd+8', 'Cmd+9',
    'Space', 'Shift+Space', 'Escape'
  ];

  function normalizeCombo(combo) {
    const parts = combo.split('+');
    const mods = [];
    const keys = [];
    for (const p of parts) {
      if (['Ctrl', 'Alt', 'Shift', 'Cmd', 'Win', 'MacCtrl'].includes(p)) mods.push(p);
      else keys.push(p);
    }
    const order = ['Ctrl', 'Alt', 'Shift', 'Cmd', 'Win', 'MacCtrl'];
    mods.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return mods.concat(keys).join('+');
  }

  function comboFromEvent(e) {
    if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') return null;
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push(IS_MAC ? 'Cmd' : 'Win');
    if (parts.length === 0) return null;
    let key = KEY_NAME_MAP[e.key] || e.key;
    if (key.length === 1) key = key.toUpperCase();
    parts.push(key);
    return parts.join('+');
  }

  function shortcutConflicts(combo) {
    const norm = normalizeCombo(combo);
    const hit = RESERVED_SHORTCUTS.some((r) => normalizeCombo(r) === norm);
    return hit ? '此快捷鍵與瀏覽器或其他擴充功能的快捷鍵衝突，無法使用' : null;
  }

  const root = document.createElement('div');
  root.id = 'sbx-rail-root';
  root.className = 'sbx-hidden';
  root.innerHTML =
    '<div id="sbx-site-list"></div>' +
    '<div id="sbx-controls">' +
    '  <button class="sbx-btn" id="sbx-btn-add" title="將目前分頁加入側邊欄">' +
    '    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.2v9.6M3.2 8h9.6"/></svg>' +
    '  </button>' +
    '  <button class="sbx-btn" id="sbx-btn-collapse" title="展開側邊欄（Google）">' +
    '    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.2 5.2 8l4.8 4.8"/></svg>' +
    '  </button>' +
    '  <button class="sbx-btn" id="sbx-btn-gear" title="設定">' +
    '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '  </button>' +
    '</div>' +
    '<div id="sbx-settings">' +
    '  <div class="sbx-s-title">面板顏色</div>' +
    '  <div class="sbx-opt-row">' +
    '    <button class="sbx-opt" data-theme="auto">自動</button>' +
    '    <button class="sbx-opt" data-theme="light">淺色</button>' +
    '    <button class="sbx-opt" data-theme="dark">深色</button>' +
    '  </div>' +
    '  <label class="sbx-custom" id="sbx-custom-bg">' +
    '    <input type="color" value="#f2f3f5" id="sbx-bg-color">' +
    '    <span>自訂面板顏色</span>' +
    '  </label>' +
    '  <div class="sbx-s-title" style="margin-top:10px">文字 / 圖示顏色</div>' +
    '  <label class="sbx-custom" id="sbx-custom-text">' +
    '    <input type="color" value="#5f6368" id="sbx-text-color">' +
    '    <span>自訂文字 / 圖示顏色</span>' +
    '  </label>' +
    '  <button type="button" class="sbx-shortcut-link" id="sbx-reset-text" style="margin-top:4px">重設為自動</button>' +
    '  <div class="sbx-s-title sbx-shortcut-title">快捷鍵</div>' +
    '  <div class="sbx-shortcut-row">' +
    '    <button type="button" class="sbx-shortcut-input sbx-unset" id="sbx-shortcut-input">未設定</button>' +
    '    <button type="button" class="sbx-shortcut-clear" id="sbx-shortcut-clear" title="清除快捷鍵">✕</button>' +
    '  </div>' +
    '  <div class="sbx-shortcut-hint" id="sbx-shortcut-hint"></div>' +
    '  <div class="sbx-shortcut-err" id="sbx-shortcut-err"></div>' +
    '  <button type="button" class="sbx-shortcut-link" id="sbx-shortcut-link">修改瀏覽器預設快捷鍵…</button>' +
    '</div>' +
    '<div id="sbx-toast"></div>';
  document.documentElement.appendChild(root);

  const siteList = root.querySelector('#sbx-site-list');
  const settingsEl = root.querySelector('#sbx-settings');
  const gearBtn = root.querySelector('#sbx-btn-gear');
  const colorInput = settingsEl.querySelector('#sbx-bg-color') || settingsEl.querySelector('#sbx-custom-bg input');
  const textColorInput = settingsEl.querySelector('#sbx-text-color') || settingsEl.querySelector('#sbx-custom-text input');
  const resetTextBtn = settingsEl.querySelector('#sbx-reset-text');
  const shortcutInput = settingsEl.querySelector('#sbx-shortcut-input');
  const shortcutClear = settingsEl.querySelector('#sbx-shortcut-clear');
  const shortcutHint = settingsEl.querySelector('#sbx-shortcut-hint');
  const shortcutErr = settingsEl.querySelector('#sbx-shortcut-err');
  const shortcutLink = settingsEl.querySelector('#sbx-shortcut-link');

  let originalBodyMarginRight = null;
  let originalBodyMaxWidth = null;
  let originalHtmlOverflowX = null;

  function applyBodyRailCompensation(enable) {
    try {
      if (enable) {
        if (originalBodyMarginRight === null) {
          originalBodyMarginRight = document.body ? document.body.style.getPropertyValue('margin-right') : '';
        }
        if (originalBodyMaxWidth === null) {
          originalBodyMaxWidth = document.body ? document.body.style.getPropertyValue('max-width') : '';
        }
        if (originalHtmlOverflowX === null && document.documentElement) {
          originalHtmlOverflowX = document.documentElement.style.getPropertyValue('overflow-x');
        }
        if (document.body) {
          document.body.style.setProperty('margin-right', '44px', 'important');
          document.body.style.setProperty('max-width', 'calc(100vw - 44px)', 'important');
          document.body.style.setProperty('box-sizing', 'border-box', 'important');
        }
        if (document.documentElement) {
          document.documentElement.style.setProperty('overflow-x', 'clip', 'important');
        }
      } else {
        if (document.body) {
          if (originalBodyMarginRight !== null) {
            if (originalBodyMarginRight) document.body.style.setProperty('margin-right', originalBodyMarginRight);
            else document.body.style.removeProperty('margin-right');
          } else {
            document.body.style.removeProperty('margin-right');
          }
          if (originalBodyMaxWidth !== null) {
            if (originalBodyMaxWidth) document.body.style.setProperty('max-width', originalBodyMaxWidth);
            else document.body.style.removeProperty('max-width');
          } else {
            document.body.style.removeProperty('max-width');
          }
          document.body.style.removeProperty('box-sizing');
        }
        if (document.documentElement && originalHtmlOverflowX !== null) {
          if (originalHtmlOverflowX) document.documentElement.style.setProperty('overflow-x', originalHtmlOverflowX);
          else document.documentElement.style.removeProperty('overflow-x');
        }
        // reset stored values after restore to allow re-apply
        if (!enable) {
          originalBodyMarginRight = null;
          originalBodyMaxWidth = null;
          originalHtmlOverflowX = null;
        }
      }
    } catch (e) {}
  }

  function show() {
    if (isFullscreenHidden) {
      root.classList.add('sbx-fullscreen-hidden');
      root.classList.add('sbx-hidden');
      document.documentElement.classList.add('sbx-fullscreen-active');
      document.documentElement.classList.remove('sbx-reserve');
      applyBodyRailCompensation(false);
      adjustFixedElements();
      return;
    }
    document.documentElement.classList.remove('sbx-fullscreen-active');
    root.classList.remove('sbx-fullscreen-hidden');
    if (panelOpen) {
      root.classList.remove('sbx-enter');
      root.classList.add('sbx-hidden');
      document.documentElement.classList.remove('sbx-reserve');
      applyBodyRailCompensation(false);
      adjustFixedElements();
    } else {
      root.classList.add('sbx-enter');
      root.classList.remove('sbx-hidden');
      document.documentElement.classList.add('sbx-reserve');
      applyBodyRailCompensation(true);
      // 同步處理固定元素，避免收回時先出現空白再跳動
      adjustFixedElements();
    }
  }

  // --- 修正部分網頁被面板遮擋（fixed / sticky / 100vw 全寬元素）---
  const fixedElements = new Map();
  const vwElements = new Map();
  let fixedObserver = null;
  let fixedRaf = null;

  function isFixedOrSticky(el) {
    try {
      const pos = getComputedStyle(el).position;
      return pos === 'fixed' || pos === 'sticky';
    } catch (e) { return false; }
  }

  function shouldAdjustFixed(el) {
    if (el.id === 'sbx-rail-root' || (el.closest && el.closest('#sbx-rail-root'))) return false;
    try {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      if (rect.height > window.innerHeight * 0.45) return false;
      if (rect.width < vw * 0.5) return false;
      const touchesRight = Math.abs(rect.right - vw) < 3;
      const isFullWidth = (style.left === '0px' && style.right === '0px') || style.width === '100vw' || Math.abs(rect.width - vw) < 3;
      return touchesRight && isFullWidth;
    } catch (e) { return false; }
  }

  function shouldAdjustVw(el) {
    if (el.id === 'sbx-rail-root' || (el.closest && el.closest('#sbx-rail-root'))) return false;
    try {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const isVwStyle = style.width === '100vw' || el.style.width.includes('100vw') || (el.getAttribute('style') || '').includes('100vw');
      const isVwComputed = Math.abs(rect.width - window.innerWidth) < 2 && Math.abs(rect.right - window.innerWidth) < 3;
      // 同時處理 inline 100vw 與樣式表 100vw（後者以 rect 判斷）
      const hasVw = isVwStyle || isVwComputed;
      if (!hasVw) return false;
      return Math.abs(rect.right - window.innerWidth) < 3 && rect.width >= window.innerWidth * 0.85;
    } catch (e) { return false; }
  }

  // 依 Skill 建議：批次處理大量 DOM，避免阻塞主線程
  async function adjustFixedElements() {
    if (panelOpen || isFullscreenHidden) {
      // 還原批次
      const toRestoreFixed = Array.from(fixedElements.entries());
      const toRestoreVw = Array.from(vwElements.entries());
      const BATCH = 20;
      for (let i = 0; i < toRestoreFixed.length; i += BATCH) {
        await new Promise(r => requestAnimationFrame(() => {
          toRestoreFixed.slice(i, i + BATCH).forEach(([el, original]) => {
            try {
              if (original.right !== null) el.style.setProperty('right', original.right);
              else el.style.removeProperty('right');
              if (original.width !== null) el.style.setProperty('width', original.width);
              else el.style.removeProperty('width');
              if (original.maxWidth !== null) el.style.setProperty('max-width', original.maxWidth);
              else el.style.removeProperty('max-width');
            } catch (e) {}
          });
          r();
        }));
        if (globalThis.scheduler?.yield) await scheduler.yield();
      }
      fixedElements.clear();
      for (let i = 0; i < toRestoreVw.length; i += BATCH) {
        await new Promise(r => requestAnimationFrame(() => {
          toRestoreVw.slice(i, i + BATCH).forEach(([el, original]) => {
            try {
              if (original.width !== null) el.style.setProperty('width', original.width);
              else el.style.removeProperty('width');
              if (original.maxWidth !== null) el.style.setProperty('max-width', original.maxWidth);
              else el.style.removeProperty('max-width');
            } catch (e) {}
          });
          r();
        }));
        if (globalThis.scheduler?.yield) await scheduler.yield();
      }
      vwElements.clear();
      return;
    }
    try {
      // 極致優化：僅掃描可能溢出的特定選擇器，而非全部 body *
      const selector = 'header, nav, div[style*="fixed"], div[style*="sticky"], div[style*="100vw"], body, html';
      const candidates = document.querySelectorAll(selector);
      const all = [];
      if (document.body) all.push(document.body);
      if (document.documentElement) all.push(document.documentElement);
      all.push(...candidates);
      // 去重
      const uniq = Array.from(new Set(all));
      const BATCH = 20;
      for (let i = 0; i < uniq.length; i += BATCH) {
        const batch = uniq.slice(i, i + BATCH);
        await new Promise(r => requestAnimationFrame(() => {
          for (const el of batch) {
            if (!el || el.id === 'sbx-rail-root' || (el.closest && el.closest('#sbx-rail-root'))) continue;
            if (!fixedElements.has(el) && isFixedOrSticky(el) && shouldAdjustFixed(el)) {
              const inlineRight = el.style.getPropertyValue('right');
              const inlineWidth = el.style.getPropertyValue('width');
              const inlineMaxWidth = el.style.getPropertyValue('max-width');
              fixedElements.set(el, {
                right: inlineRight ? inlineRight : null,
                width: inlineWidth ? inlineWidth : null,
                maxWidth: inlineMaxWidth ? inlineMaxWidth : null
              });
              try {
                el.style.setProperty('right', '44px', 'important');
                el.style.setProperty('max-width', 'calc(100vw - 44px)', 'important');
              } catch (e) {}
              continue;
            }
            if (!vwElements.has(el) && !fixedElements.has(el) && shouldAdjustVw(el)) {
              const inlineWidth = el.style.getPropertyValue('width');
              const inlineMaxWidth = el.style.getPropertyValue('max-width');
              vwElements.set(el, {
                width: inlineWidth ? inlineWidth : null,
                maxWidth: inlineMaxWidth ? inlineMaxWidth : null
              });
              try {
                el.style.setProperty('width', 'calc(100vw - 44px)', 'important');
                el.style.setProperty('max-width', 'calc(100vw - 44px)', 'important');
              } catch (e) {}
            }
          }
          r();
        }));
        if (globalThis.scheduler?.yield) await scheduler.yield();
      }
    } catch (e) {}
  }

  function scheduleAdjustFixed() {
    if (fixedRaf) cancelAnimationFrame(fixedRaf);
    fixedRaf = requestAnimationFrame(() => {
      fixedRaf = null;
      adjustFixedElements().catch(() => {});
    });
  }

  function setupFixedObserver() {
    if (fixedObserver) return;
    try {
      // 極致優化：僅在 Rail 顯示時處理，且大幅降低頻率，恢復至 v2026.0.15 前的順暢度
      let throttleTimer = null;
      const throttledSchedule = () => {
        if (panelOpen || isFullscreenHidden) return;
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          scheduleAdjustFixed();
        }, 500);
      };
      fixedObserver = new MutationObserver(throttledSchedule);
      // 僅觀察 body 的直接子節點新增/移除，不觀察 subtree 與屬性，避免大量觸發
      if (document.body) fixedObserver.observe(document.body, { childList: true });
      window.addEventListener('resize', throttledSchedule);
    } catch (e) {}
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || null;
  }

  function isYouTubeHost() {
    const h = location.hostname || '';
    return h.includes('youtube.com') || h.includes('youtu.be') || h.includes('youtube-nocookie.com');
  }

  function isFullscreenActive() {
    const fsEl = getFullscreenElement();
    if (fsEl) return true;
    if (isYouTubeHost()) {
      if (document.documentElement.classList.contains('ytp-fullscreen')) return true;
      if (document.body && document.body.classList.contains('ytp-fullscreen')) return true;
      const p = document.querySelector('.html5-video-player.ytp-fullscreen, #movie_player.ytp-fullscreen, #player.ytp-fullscreen');
      if (p) return true;
    }
    return false;
  }

  function applyFullscreenHide(shouldHide) {
    if (shouldHide && !isFullscreenHidden) {
      isFullscreenHidden = true;
      panelOpenBeforeFullscreen = panelOpen;
      root.classList.add('sbx-fullscreen-hidden');
      document.documentElement.classList.add('sbx-fullscreen-active');
      document.documentElement.classList.remove('sbx-reserve');
      try { chrome.runtime.sendMessage({ type: 'youtubeFullscreenEnter' }).catch(() => {}); } catch (e) {}
    } else if (!shouldHide && isFullscreenHidden) {
      const wasOpen = panelOpenBeforeFullscreen;
      isFullscreenHidden = false;
      root.classList.remove('sbx-fullscreen-hidden');
      document.documentElement.classList.remove('sbx-fullscreen-active');
      if (wasOpen === true) {
        root.classList.add('sbx-hidden');
        root.classList.remove('sbx-enter');
        document.documentElement.classList.remove('sbx-reserve');
        setTimeout(() => {
          if (!panelOpen && !isFullscreenHidden) show();
        }, 1200);
      } else {
        show();
      }
      panelOpenBeforeFullscreen = null;
      try { chrome.runtime.sendMessage({ type: 'youtubeFullscreenExit' }).catch(() => {}); } catch (e) {}
      setTimeout(checkFullscreenState, 200);
    }
  }

  function checkFullscreenState() {
    applyFullscreenHide(isFullscreenActive());
  }

  (function setupFullscreenHandling() {
    document.addEventListener('fullscreenchange', checkFullscreenState);
    document.addEventListener('webkitfullscreenchange', checkFullscreenState);
    document.addEventListener('mozfullscreenchange', checkFullscreenState);
    document.addEventListener('fullscreenerror', checkFullscreenState);
    window.addEventListener('resize', () => {
      setTimeout(checkFullscreenState, 100);
    });
    if (isYouTubeHost()) {
      try {
        const mo = new MutationObserver(checkFullscreenState);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      } catch (e) {}
    }
    setTimeout(checkFullscreenState, 800);
  })();

  async function renderRail() {
    siteList.innerHTML = '';
    const BATCH = 20;
    for (let i = 0; i < sites.length; i += BATCH) {
      const batch = sites.slice(i, i + BATCH);
      await new Promise(r => requestAnimationFrame(() => {
        batch.forEach((site) => {
      const btn = document.createElement('button');
      btn.className = 'sbx-site-btn' + (activeSiteId === site.id ? ' sbx-active' : '');
      btn.title = site.name;
      btn.draggable = true;
      const img = document.createElement('img');
      img.alt = '';
      img.src = site.favicon || DEFAULT_FAVICON;
      img.addEventListener('error', () => {
        if (!img.dataset.fb) {
          img.dataset.fb = '1';
          try {
            if (site.url && site.url.startsWith('chrome-extension://')) {
              img.src = DEFAULT_FAVICON;
            } else {
              img.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(new URL(site.url).hostname) + '&sz=64';
            }
          } catch (e) {
            img.src = DEFAULT_FAVICON;
          }
        } else {
          img.src = DEFAULT_FAVICON;
        }
      });
      btn.appendChild(img);
      btn.addEventListener('click', () => toggleSite(site.id));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        removeSite(site.id);
      });
      btn.addEventListener('dragstart', () => {
        dragId = site.id;
        btn.classList.add('sbx-dragging');
      });
      btn.addEventListener('dragend', clearDrag);
      btn.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragId || dragId === site.id) return;
        const after = e.clientY > btn.getBoundingClientRect().top + btn.offsetHeight / 2;
        btn.classList.toggle('sbx-drop-before', !after);
        btn.classList.toggle('sbx-drop-after', after);
      });
      btn.addEventListener('dragleave', () => {
        btn.classList.remove('sbx-drop-before', 'sbx-drop-after');
      });
      btn.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragId || dragId === site.id) return;
        const after = e.clientY > btn.getBoundingClientRect().top + btn.offsetHeight / 2;
        reorderSite(dragId, site.id, after);
      });
      siteList.appendChild(btn);
        });
        r();
      }));
      if (globalThis.scheduler?.yield) await scheduler.yield();
    }
  }

  function clearDrag() {
    dragId = null;
    siteList.querySelectorAll('.sbx-site-btn').forEach((b) => {
      b.classList.remove('sbx-dragging', 'sbx-drop-before', 'sbx-drop-after');
    });
  }

  function reorderSite(id, targetId, after) {
    const from = sites.findIndex((s) => s.id === id);
    if (from < 0) { clearDrag(); return; }
    const [moved] = sites.splice(from, 1);
    const to = sites.findIndex((s) => s.id === targetId);
    if (to < 0) {
      sites.splice(from, 0, moved);
      clearDrag();
      return;
    }
    sites.splice(to + (after ? 1 : 0), 0, moved);
    clearDrag();
    saveSites();
    renderRail();
  }

  siteList.addEventListener('dragover', (e) => e.preventDefault());
  siteList.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragId) return;
    if (e.target.closest('.sbx-site-btn')) return;
    const from = sites.findIndex((s) => s.id === dragId);
    if (from < 0) { clearDrag(); return; }
    const [moved] = sites.splice(from, 1);
    sites.push(moved);
    clearDrag();
    saveSites();
    renderRail();
  });

  async function toggleSite(id) {
    const site = sites.find((s) => s.id === id);
    if (!site) return;
    const res = await chrome.runtime.sendMessage({ type: 'openSite', siteId: id, url: site.url }).catch(() => null);
    if (!res || !res.opened) {
      toast('無法開啟側邊欄' + (res && res.error ? '：' + res.error : ''));
    }
  }

  async function removeSite(siteId) {
    sites = sites.filter((s) => s.id !== siteId);
    await saveSites();
    renderRail();
    toast('已移除');
  }

  async function saveSites() {
    try {
      await chrome.storage.local.set({ sites });
    } catch (e) {}
  }

  root.querySelector('#sbx-btn-add').addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'addCurrentSite' }).catch(() => null);
    if (!res || !res.success) {
      toast('加入失敗' + (res && res.error ? '：' + res.error : ''));
      return;
    }
    const site = res.site;
    if (sites.some((s) => s.url === site.url)) {
      toast('此頁面已在側邊欄');
      return;
    }
    sites.unshift(site);
    await saveSites();
    chrome.runtime.sendMessage({ type: 'addDynamicRule', url: site.url }).catch(() => {});
    renderRail();
    toast('已加入：「' + site.name + '」');
  });

  root.querySelector('#sbx-btn-collapse').addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'expandGoogle' }).catch(() => null);
    if (res && res.ok === false) {
      toast('無法開啟側邊欄' + (res.error ? '：' + res.error : ''));
    }
  });

  gearBtn.addEventListener('click', () => {
    if (settingsEl.classList.contains('sbx-show')) {
      stopRecording();
    }
    settingsEl.classList.toggle('sbx-show');
    gearBtn.classList.toggle('sbx-on', settingsEl.classList.contains('sbx-show'));
  });

  document.addEventListener('click', (e) => {
    if (settingsEl.classList.contains('sbx-show') &&
        !settingsEl.contains(e.target) && !gearBtn.contains(e.target)) {
      settingsEl.classList.remove('sbx-show');
      gearBtn.classList.remove('sbx-on');
      stopRecording();
    }
  });

  settingsEl.querySelectorAll('.sbx-opt').forEach((btn) => {
    btn.addEventListener('click', async () => {
      theme = btn.dataset.theme;
      await chrome.storage.local.set({ theme }).catch(() => {});
      renderThemeOptions();
      applyTheme();
    });
  });

  colorInput.addEventListener('input', async () => {
    customColor = colorInput.value;
    theme = 'custom';
    await chrome.storage.local.set({ theme, customColor }).catch(() => {});
    renderThemeOptions();
    applyTheme();
  });

  colorInput.closest('.sbx-custom').addEventListener('click', async (e) => {
    if (e.target === colorInput) return;
    if (theme !== 'custom') {
      theme = 'custom';
      await chrome.storage.local.set({ theme }).catch(() => {});
      renderThemeOptions();
      applyTheme();
    }
  });

  if (textColorInput) {
    textColorInput.addEventListener('input', async () => {
      customTextColor = textColorInput.value;
      await chrome.storage.local.set({ customTextColor }).catch(() => {});
      renderThemeOptions();
      applyTheme();
    });
    const textCustomWrap = textColorInput.closest('.sbx-custom');
    if (textCustomWrap) {
      textCustomWrap.addEventListener('click', async (e) => {
        if (e.target === textColorInput) return;
        textColorInput.click();
      });
    }
  }

  if (resetTextBtn) {
    resetTextBtn.addEventListener('click', async () => {
      customTextColor = '';
      await chrome.storage.local.set({ customTextColor: '' }).catch(() => {});
      renderThemeOptions();
      applyTheme();
      toast('已重設文字顏色為自動');
    });
  }

  function renderThemeOptions() {
    settingsEl.querySelectorAll('.sbx-opt').forEach((b) => {
      b.classList.toggle('sbx-on', theme === b.dataset.theme);
    });
    colorInput.closest('.sbx-custom').classList.toggle('sbx-on', theme === 'custom');
    if (textColorInput) {
      const hasCustomText = !!customTextColor;
      textColorInput.closest('.sbx-custom').classList.toggle('sbx-on', hasCustomText);
      if (resetTextBtn) resetTextBtn.style.display = hasCustomText ? 'block' : 'none';
    }
  }

  function renderShortcut() {
    shortcutInput.textContent = shortcut || '未設定';
    shortcutInput.classList.toggle('sbx-unset', !shortcut);
    shortcutClear.style.display = shortcut ? 'inline-block' : 'none';
    shortcutErr.classList.add('hidden');
    shortcutErr.textContent = '';
  }

  function startRecording() {
    recording = true;
    shortcutInput.classList.add('sbx-recording');
    shortcutInput.textContent = '按下快捷鍵…';
    shortcutErr.classList.add('hidden');
  }

  function stopRecording() {
    recording = false;
    shortcutInput.classList.remove('sbx-recording');
    renderShortcut();
  }

  async function initShortcut() {
    renderShortcut();
    try {
      const res = await chrome.runtime.sendMessage({ type: 'getShortcutInfo' });
      if (res && res.commandShortcut) {
        shortcutHint.textContent = '預設：' + res.commandShortcut;
      } else {
        shortcutHint.textContent = '預設快捷鍵未指派（可能與其他擴充功能衝突），自訂快捷鍵僅在網頁有效';
      }
    } catch (e) {}
  }

  shortcutInput.addEventListener('click', () => {
    if (recording) { stopRecording(); return; }
    startRecording();
  });

  shortcutClear.addEventListener('click', async () => {
    shortcut = '';
    await chrome.storage.local.set({ shortcut: '' }).catch(() => {});
    stopRecording();
    toast('已清除快捷鍵');
  });

  shortcutLink.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'openShortcutsPage' }).catch(() => {});
  });

  window.addEventListener('keydown', (e) => {
    if (recording) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' || e.key === 'Dead') { stopRecording(); return; }
      const combo = comboFromEvent(e);
      if (!combo) return;
      const conflict = shortcutConflicts(combo);
      if (conflict) {
        shortcutErr.textContent = conflict;
        shortcutErr.classList.remove('hidden');
        shortcutInput.textContent = '此快捷鍵已被占用';
        return;
      }
      shortcut = combo;
      chrome.storage.local.set({ shortcut }).catch(() => {});
      stopRecording();
      toast('快捷鍵已設定：' + combo);
      return;
    }
    if (!shortcut || e.repeat) return;
    const combo = comboFromEvent(e);
    if (combo !== shortcut) return;
    e.preventDefault();
    chrome.runtime.sendMessage({ type: 'togglePanel' }).catch(() => {});
  }, true);

  async function applyTheme() {
    let bg;
    if (theme === 'light') {
      bg = '#f2f3f5';
    } else if (theme === 'dark') {
      bg = '#202124';
    } else if (theme === 'custom') {
      bg = customColor;
    } else {
      bg = await getBrowserThemeColor();
      if (!bg) {
        bg = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#202124' : '#f2f3f5';
      }
    }
    const dark = luminance(bg) < 0.5;
    const autoText = dark ? '#ffffff' : '#5f6368';
    const isValidTextHex = customTextColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(customTextColor);
    const text = isValidTextHex ? customTextColor : autoText;
    root.style.setProperty('--sbx-bg', bg);
    root.style.setProperty('--sbx-text', text);
    root.style.setProperty('--sbx-icon', text);
    root.style.setProperty('--sbx-accent', text);
    root.style.setProperty('--sbx-hover', mix(bg, dark ? '#ffffff' : '#000000', dark ? 0.10 : 0.08));
    root.style.setProperty('--sbx-border', mix(bg, dark ? '#ffffff' : '#000000', 0.28));
    if (theme !== 'custom') {
      try { colorInput.value = bg; } catch (e) {}
    } else {
      try { colorInput.value = customColor; } catch (e) {}
    }
    if (textColorInput) {
      try { textColorInput.value = isValidTextHex ? customTextColor : autoText; } catch (e) {}
    }
  }

  async function getBrowserThemeColor() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'getThemeColor' });
      if (res && res.color) return res.color;
    } catch (e) {}
    return null;
  }

  function luminance(hexOrRgb) {
    const m = String(hexOrRgb).match(/\d+/g);
    if (!m || m.length < 3) return 0.5;
    const [r, g, b] = m.map(Number).slice(0, 3);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function mix(bg, other, amount) {
    return `color-mix(in srgb, ${bg} ${Math.round((1 - amount) * 100)}%, ${other})`;
  }

  function toast(msg) {
    const el = root.querySelector('#sbx-toast');
    el.textContent = msg;
    el.classList.add('sbx-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('sbx-show'), 2200);
  }

  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === 'showRail') {
        panelOpen = false;
        isFullscreenHidden = false;
        show();
        sendResponse({ ok: true });
        return true;
      }
    });
  } catch (e) {}

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    try {
      if (changes.sites) {
        sites = toSites(changes.sites.newValue);
        renderRail();
      }
      if (changes.activeSiteId) {
        activeSiteId = changes.activeSiteId.newValue || null;
        renderRail();
      }
      if (changes.panelOpen) {
        panelOpen = !!changes.panelOpen.newValue;
        show();
      }
      if (changes.theme) theme = changes.theme.newValue;
      if (changes.customColor) customColor = changes.customColor.newValue || '#f2f3f5';
      if (changes.customTextColor) customTextColor = changes.customTextColor.newValue || '';
      if (changes.theme || changes.customColor || changes.customTextColor) {
        renderThemeOptions();
        applyTheme();
      }
      if (changes.shortcut) {
        shortcut = changes.shortcut.newValue || '';
        renderShortcut();
        initShortcut();
      }
    } catch (e) {}
  });

  async function init() {
    try {
      const res = await chrome.storage.local.get(['sites', 'activeSiteId', 'theme', 'customColor', 'customTextColor', 'panelOpen', 'shortcut']);
      sites = toSites(res.sites);
      activeSiteId = res.activeSiteId || null;
      theme = res.theme || 'auto';
      customColor = res.customColor || '#f2f3f5';
      customTextColor = res.customTextColor || '';
      panelOpen = !!res.panelOpen;
      shortcut = res.shortcut || '';
    } catch (e) {}
    renderRail();
    renderThemeOptions();
    applyTheme();
    initShortcut();
    show();
    setupFixedObserver();
    setTimeout(checkFullscreenState, 300);
    setTimeout(scheduleAdjustFixed, 600);
  }

  init();
})();
