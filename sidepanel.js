const DEFAULT_FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8a8f98" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M2.2 8h11.6M8 2c2 1.8 2.8 3.8 2.8 6S10 12.2 8 14c-2-1.8-2.8-3.8-2.8-6S6 3.8 8 2z"/></svg>'
);
const GOOGLE_URL = 'https://www.google.com/';

let sites = [];
let activeSiteId = null;
let theme = 'auto';
let customColor = '#f2f3f5';
let customTextColor = '';
let dragId = null;
let toastTimer = null;
let winId = null;
let isSpFullscreenHidden = false;

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

const siteList = document.getElementById('site-list');
const siteFrame = document.getElementById('site-frame');
const emptyState = document.getElementById('empty-state');
const embedError = document.getElementById('embed-error');
const openExternalBtn = document.getElementById('btn-open-external');
const loadingBar = document.getElementById('loading-bar');
const settingsEl = document.getElementById('settings');
const gearBtn = document.getElementById('btn-gear');
const closePanelBtn = document.getElementById('btn-close-panel');
const collapseBtn = document.getElementById('btn-collapse');
const collapseIcon = document.getElementById('collapse-icon');
const addBtn = document.getElementById('btn-add');
const colorInput = settingsEl.querySelector('#bg-color') || settingsEl.querySelector('#custom-bg input');
const textColorInput = settingsEl.querySelector('#text-color') || settingsEl.querySelector('#custom-text input');
const resetTextBtn = document.getElementById('reset-text');
const shortcutInput = document.getElementById('shortcut-input');
const shortcutClear = document.getElementById('shortcut-clear');
const shortcutHint = document.getElementById('shortcut-hint');
const shortcutErr = document.getElementById('shortcut-err');
const shortcutLink = document.getElementById('shortcut-link');

let shortcut = '';
let recording = false;

async function init() {
  try {
    const win = await chrome.windows.getCurrent();
    winId = win ? win.id : null;
  } catch (e) {}
  try {
    const res = await chrome.storage.local.get(['sites', 'activeSiteId', 'theme', 'customColor', 'customTextColor', 'shortcut']);
    sites = toSites(res.sites);
    activeSiteId = res.activeSiteId || null;
    theme = res.theme || 'auto';
    customColor = res.customColor || '#f2f3f5';
    customTextColor = res.customTextColor || '';
    shortcut = res.shortcut || '';
  } catch (e) {}
  renderRail();
  renderThemeOptions();
  applyTheme();
  initShortcut();
  if (activeSiteId && activeSiteId !== 'google') {
    loadFrame(activeSiteId);
  } else {
    loadGoogle();
  }
}

function renderRail() {
  siteList.innerHTML = '';
  sites.forEach((site) => {
    const btn = document.createElement('button');
    btn.className = 'site-btn' + (activeSiteId === site.id ? ' active' : '');
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
      btn.classList.add('dragging');
    });
    btn.addEventListener('dragend', clearDrag);
    btn.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragId || dragId === site.id) return;
      const after = e.clientY > btn.getBoundingClientRect().top + btn.offsetHeight / 2;
      btn.classList.toggle('drop-before', !after);
      btn.classList.toggle('drop-after', after);
    });
    btn.addEventListener('dragleave', () => {
      btn.classList.remove('drop-before', 'drop-after');
    });
    btn.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragId || dragId === site.id) return;
      const after = e.clientY > btn.getBoundingClientRect().top + btn.offsetHeight / 2;
      reorderSite(dragId, site.id, after);
    });
    siteList.appendChild(btn);
  });
}

function clearDrag() {
  dragId = null;
  siteList.querySelectorAll('.site-btn').forEach((b) => {
    b.classList.remove('dragging', 'drop-before', 'drop-after');
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
  if (e.target.closest('.site-btn')) return;
  const from = sites.findIndex((s) => s.id === dragId);
  if (from < 0) { clearDrag(); return; }
  const [moved] = sites.splice(from, 1);
  sites.push(moved);
  clearDrag();
  saveSites();
  renderRail();
});

async function toggleSite(id) {
  if (activeSiteId === id) {
    await chrome.runtime.sendMessage({ type: 'closeSite', windowId: winId }).catch(() => {});
    return;
  }
  const site = sites.find((s) => s.id === id);
  if (!site) return;
  const res = await chrome.runtime.sendMessage({ type: 'openSite', siteId: id, url: site.url }).catch(() => null);
  if (!res || !res.opened) {
    toast('無法開啟側邊欄' + (res && res.error ? '：' + res.error : ''));
  }
}

function hideEmbedError() {
  if (embedError) embedError.classList.add('hidden');
}
function showEmbedError(url) {
  hideEmbedError();
  emptyState.classList.add('hidden');
  if (embedError) embedError.classList.remove('hidden');
  loadingBar.classList.add('hidden');
}
if (openExternalBtn) {
  openExternalBtn.addEventListener('click', () => {
    const site = sites.find((s) => s.id === activeSiteId);
    const url = site ? site.url : null;
    if (url) chrome.tabs.create({ url }).catch(() => {});
  });
}
function isExtensionUrl(url) {
  return typeof url === 'string' && url.startsWith('chrome-extension://');
}

async function loadFrame(siteId) {
  const site = sites.find((s) => s.id === siteId);
  if (!site) return;
  activeSiteId = siteId;
  emptyState.classList.add('hidden');
  hideEmbedError();
  // chrome-extension 頁面嘗試直接嵌入，若對方未宣告 web_accessible_resources 會被瀏覽器阻擋，顯示備援提示
  if (isExtensionUrl(site.url)) {
    // 先嘗試載入，3 秒後若仍無法存取則顯示錯誤（跨擴充功能限制）
    if (siteFrame.src !== site.url) {
      loadingBar.classList.remove('hidden');
      siteFrame.src = site.url;
    }
    // 延遲檢測：若 iframe 被阻擋，Chrome 會顯示錯誤頁，contentWindow 無法存取
    setTimeout(() => {
      if (activeSiteId !== siteId) return;
      try {
        // 嘗試存取，若成功且 href 仍為目標 URL 則視為載入成功
        const href = siteFrame.contentWindow.location.href;
        if (href && href.startsWith('chrome-extension://')) {
          hideEmbedError();
          loadingBar.classList.add('hidden');
        }
      } catch (e) {
        // 跨來源無法存取，無法判斷，改用逾時顯示備援（若 1.5s 後仍未觸發 load 隱藏，則視為失敗）
      }
    }, 1200);
  } else {
    if (siteFrame.src !== site.url) {
      loadingBar.classList.remove('hidden');
      siteFrame.src = site.url;
    }
  }
  renderRail();
}

function loadGoogle() {
  activeSiteId = 'google';
  emptyState.classList.add('hidden');
  hideEmbedError();
  if (siteFrame.src !== GOOGLE_URL) {
    loadingBar.classList.remove('hidden');
    siteFrame.src = GOOGLE_URL;
  }
  renderRail();
}

function showEmpty() {
  activeSiteId = null;
  siteFrame.src = '';
  hideEmbedError();
  emptyState.classList.remove('hidden');
  renderRail();
}

async function removeSite(siteId) {
  sites = sites.filter((s) => s.id !== siteId);
  await saveSites();
  if (activeSiteId === siteId) {
    loadGoogle();
  } else {
    renderRail();
  }
  toast('已移除');
}

async function saveSites() {
  try {
    await chrome.storage.local.set({ sites });
  } catch (e) {}
}

addBtn.addEventListener('click', async () => {
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

closePanelBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'closeSite', windowId: winId }).catch(() => {});
});

collapseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'closeSite', windowId: winId }).catch(() => {});
});

gearBtn.addEventListener('click', () => {
  if (settingsEl.classList.contains('show')) {
    stopRecording();
  }
  settingsEl.classList.toggle('show');
  gearBtn.classList.toggle('on', settingsEl.classList.contains('show'));
});

document.addEventListener('click', (e) => {
  if (settingsEl.classList.contains('show') &&
      !settingsEl.contains(e.target) && !gearBtn.contains(e.target)) {
    settingsEl.classList.remove('show');
    gearBtn.classList.remove('on');
    stopRecording();
  }
});

settingsEl.querySelectorAll('.opt').forEach((btn) => {
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

colorInput.closest('.custom').addEventListener('click', async (e) => {
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
  const textWrap = textColorInput.closest('.custom');
  if (textWrap) {
    textWrap.addEventListener('click', async (e) => {
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
  settingsEl.querySelectorAll('.opt').forEach((b) => {
    b.classList.toggle('on', theme === b.dataset.theme);
  });
  colorInput.closest('.custom').classList.toggle('on', theme === 'custom');
  if (textColorInput) {
    const hasCustomText = !!customTextColor;
    textColorInput.closest('.custom').classList.toggle('on', hasCustomText);
    if (resetTextBtn) resetTextBtn.style.display = hasCustomText ? 'block' : 'none';
  }
}

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
  document.documentElement.style.setProperty('--sb-bg', bg);
  document.documentElement.style.setProperty('--sb-text', text);
  document.documentElement.style.setProperty('--sb-icon', text);
  document.documentElement.style.setProperty('--sb-accent', text);
  document.documentElement.style.setProperty('--sb-hover', mix(bg, dark ? '#ffffff' : '#000000', dark ? 0.10 : 0.08));
  document.documentElement.style.setProperty('--sb-border', mix(bg, dark ? '#ffffff' : '#000000', 0.28));
  if (theme !== 'custom') {
    try { colorInput.value = bg; } catch (e) {}
  } else {
    try { colorInput.value = customColor; } catch (e) {}
  }
  if (textColorInput) {
    try { textColorInput.value = isValidTextHex ? customTextColor : autoText; } catch (e) {}
  }
}

function renderShortcut() {
  shortcutInput.textContent = shortcut || '未設定';
  shortcutInput.classList.toggle('unset', !shortcut);
  shortcutClear.style.display = shortcut ? 'inline-block' : 'none';
  shortcutErr.classList.add('hidden');
  shortcutErr.textContent = '';
}

function startRecording() {
  recording = true;
  shortcutInput.classList.add('recording');
  shortcutInput.textContent = '按下快捷鍵…';
  shortcutErr.classList.add('hidden');
}

function stopRecording() {
  recording = false;
  shortcutInput.classList.remove('recording');
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
  chrome.runtime.sendMessage({ type: 'togglePanel', windowId: winId }).catch(() => {});
});

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

function getSpFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || null;
}

function shouldHideSpForFullscreen() {
  const fsEl = getSpFullscreenElement();
  if (fsEl) return true;
  return false;
}

function updateSpFullscreenState() {
  const shouldHide = shouldHideSpForFullscreen();
  const rail = document.getElementById('rail');
  if (!rail) return;
  if (shouldHide && !isSpFullscreenHidden) {
    isSpFullscreenHidden = true;
    rail.classList.add('sbx-fullscreen-hidden');
    document.documentElement.classList.add('sbx-fullscreen-active');
    document.body.classList.add('sbx-fullscreen-active');
  } else if (!shouldHide && isSpFullscreenHidden) {
    isSpFullscreenHidden = false;
    rail.classList.remove('sbx-fullscreen-hidden');
    document.documentElement.classList.remove('sbx-fullscreen-active');
    document.body.classList.remove('sbx-fullscreen-active');
  }
}

(function setupSpFullscreenHandling() {
  document.addEventListener('fullscreenchange', updateSpFullscreenState);
  document.addEventListener('webkitfullscreenchange', updateSpFullscreenState);
  document.addEventListener('mozfullscreenchange', updateSpFullscreenState);
  document.addEventListener('fullscreenerror', updateSpFullscreenState);
  window.addEventListener('resize', () => setTimeout(updateSpFullscreenState, 100));
})();

// --- Clipboard fallback for Gemini / ChatGPT copy button inside iframe ---
(function setupClipboardFallback() {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'clipboard-write' }).catch(() => {});
      navigator.permissions.query({ name: 'clipboard-read' }).catch(() => {});
    }
  } catch (e) {}

  window.addEventListener('message', async (event) => {
    if (!event.data || event.data.type !== 'sbx-copy') return;
    const text = event.data.text || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('已複製');
      if (event.source) event.source.postMessage({ type: 'sbx-copy-result', success: true }, '*');
    } catch (err) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (ok) {
          toast('已複製');
          if (event.source) event.source.postMessage({ type: 'sbx-copy-result', success: true }, '*');
        } else throw err;
      } catch (e2) {
        toast('複製失敗：' + (e2.message || err.message));
        if (event.source) event.source.postMessage({ type: 'sbx-copy-result', success: false, error: e2.message || err.message }, '*');
      }
    }
  });

  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === 'sbx-copy-text' && typeof msg.text === 'string') {
        navigator.clipboard.writeText(msg.text).then(() => {
          toast('已複製');
          sendResponse({ ok: true });
        }).catch((err) => {
          try {
            const ta = document.createElement('textarea');
            ta.value = msg.text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            if (ok) { toast('已複製'); sendResponse({ ok: true }); }
            else sendResponse({ ok: false, error: err.message });
          } catch (e2) { sendResponse({ ok: false, error: e2.message || err.message }); }
        });
        return true;
      }
    });
  } catch (e) {}

  siteFrame.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const win = siteFrame.contentWindow;
        if (!win || !win.navigator || !win.navigator.clipboard) return;
        const orig = win.navigator.clipboard.writeText.bind(win.navigator.clipboard);
        win.navigator.clipboard.writeText = async (text) => {
          try { return await orig(text); } catch (e) {
            try { await navigator.clipboard.writeText(text); return; } catch (e2) {
              const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); const ok=document.execCommand('copy'); ta.remove(); if(!ok) throw e2; return;
            }
          }
        };
      } catch (e) {}
    }, 900);
  });
})();

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

siteFrame.addEventListener('load', () => {
  loadingBar.classList.add('hidden');
  const site = sites.find((s) => s.id === activeSiteId);
  if (site && isExtensionUrl(site.url)) {
    try {
      const href = siteFrame.contentWindow.location.href;
      if (!href || href === 'about:blank' || href.startsWith('chrome-error://') || href.startsWith('chrome://')) {
        showEmbedError(site.url);
      } else {
        // 嘗試進一步檢查是否為阻擋頁（跨擴充功能限制時，雖然 href 仍為原 URL，但內容為錯誤頁且無法存取）
        setTimeout(() => {
          try {
            const doc = siteFrame.contentDocument;
            if (doc && doc.body && doc.body.innerText && /ERR_BLOCKED|無法顯示|blocked by response|not allowed to load/i.test(doc.body.innerText)) {
              showEmbedError(site.url);
            } else {
              hideEmbedError();
            }
          } catch (_) {
            // 跨來源無法讀取，假設若 1.5s 後仍無明確成功，保留目前顯示；若對方未開放 web_accessible_resources，通常會顯示空白或錯誤，超時後提示
          }
        }, 600);
      }
    } catch (e) {
      // 跨來源無法判斷，延遲後若仍為空白則提示備援
      setTimeout(() => {
        try {
          const doc = siteFrame.contentDocument;
          if (doc && doc.body && /ERR_BLOCKED/i.test(doc.body.innerText)) showEmbedError(site.url);
        } catch (_) {}
      }, 800);
    }
  } else {
    hideEmbedError();
  }
});
siteFrame.addEventListener('error', () => {
  loadingBar.classList.add('hidden');
  const site = sites.find((s) => s.id === activeSiteId);
  if (site && isExtensionUrl(site.url)) showEmbedError(site.url);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  try {
    if (changes.sites) {
      sites = toSites(changes.sites.newValue);
      if (activeSiteId && activeSiteId !== 'google' && !sites.some((s) => s.id === activeSiteId)) {
        activeSiteId = 'google';
        loadGoogle();
      } else {
        renderRail();
      }
    }
    if (changes.activeSiteId) {
      const id = changes.activeSiteId.newValue;
      if (id === 'google') {
        loadGoogle();
      } else if (id) {
        loadFrame(id);
      } else {
        showEmpty();
      }
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

init();
