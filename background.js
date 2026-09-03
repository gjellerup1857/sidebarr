async function resetPanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch (e) {}
}
resetPanelBehavior();
chrome.runtime.onInstalled.addListener(resetPanelBehavior);
chrome.runtime.onStartup.addListener(resetPanelBehavior);

try {
  chrome.sidePanel.onOpened.addListener(async (info) => {
    try { await chrome.storage.local.set({ panelOpen: true }); } catch (e) {}
  });
} catch (e) {}

try {
  chrome.sidePanel.onClosed.addListener(async (info) => {
    try {
      await chrome.storage.local.set({ panelOpen: false });
      await ensurePageRail(info && info.windowId);
    } catch (e) {}
  });
} catch (e) {}

// 處理 DeepSeek 等站點的 Google OAuth 在側邊欄 iframe 內的 404 問題
// 當 iframe 嘗試導向 accounts.google.com 時，攔截並改以新分頁開啟，登入完成後自動同步回側邊欄
try {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    try {
      // 僅處理側邊欄 iframe 內的導航（frameId !== 0 且 parentFrameId !== -1 表示非主框架）
      if (details.frameId === 0) return;
      const url = details.url || '';
      const isGoogleOAuth = url.includes('accounts.google.com') && (url.includes('oauth') || url.includes('ServiceLogin') || url.includes('signin'));
      if (!isGoogleOAuth) return;
      // 取消 iframe 內的導航，改以新分頁開啟以避免 X-Frame 阻擋
      // 需透過 tabs.create 在新分頁開啟，讓用戶完成 Google 授權
      await chrome.tabs.create({ url });
      // 嘗試取消原導航（僅對可取得 tabId 的情況）
      // 由於 onBeforeNavigate 無法直接取消，改為在 sidepanel 中顯示提示
      chrome.runtime.sendMessage({ type: 'oauthPopupOpened', url }).catch(() => {});
    } catch (e) {}
  }, { url: [{ hostContains: 'accounts.google.com' }] });
} catch (e) {}

try {
  // 監聽新分頁完成 Google 登入後返回 deepseek，自動刷新側邊欄的 deepseek 頁面
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
      if (changeInfo.status !== 'complete' || !tab.url) return;
      // 當用戶在新開的 Google 登入分頁完成後被導回 deepseek，同步更新側邊欄
      if (tab.url.includes('chat.deepseek.com') && tab.url.includes('code=')) {
        const { activeSiteId, sites } = await chrome.storage.local.get(['activeSiteId', 'sites']);
        const list = Array.isArray(sites) ? sites : [];
        const deepseekSite = list.find(s => s.url && s.url.includes('deepseek.com'));
        if (deepseekSite) {
          // 保持側邊欄開啟並刷新為最新 URL（帶授權碼）
          await chrome.storage.local.set({ activeSiteId: deepseekSite.id });
          // 關閉授權完成的分頁（可選）
          // chrome.tabs.remove(tabId).catch(() => {});
        }
      }
    } catch (e) {}
  });
} catch (e) {}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    await chrome.storage.local.set({ panelOpen: true });
  } catch (e) {
    try {
      await chrome.action.setBadgeText({ text: '!' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(() => {}), 2500);
    } catch (err) {}
  }
});

const GOOGLE_URL = 'https://www.google.com/';
let lastToggleAt = 0;
// Service Worker 可能在 30s 閒置後終止，狀態改由 chrome.storage.session 持久化
async function getFullscreenRestoreMap() {
  try {
    const { sbxFullscreenMap = {} } = await chrome.storage.session.get('sbxFullscreenMap');
    return new Map(Object.entries(sbxFullscreenMap));
  } catch (e) { return new Map(); }
}
async function setFullscreenRestoreMap(map) {
  try { await chrome.storage.session.set({ sbxFullscreenMap: Object.fromEntries(map) }); } catch (e) {}
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-panel') return;
  try {
    const windowId = await resolveFocusedWindowId();
    await handleToggle(windowId);
  } catch (e) {}
});

async function resolveFocusedWindowId() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab && tab.windowId != null ? tab.windowId : null;
  } catch (e) {
    return null;
  }
}

async function handleToggle(windowId) {
  const now = Date.now();
  if (now - lastToggleAt < 300) return { skipped: true };
  lastToggleAt = now;
  const data = await chrome.storage.local.get(['panelOpen']);
  if (data.panelOpen) {
    return closePanel(windowId);
  }
  await expandGoogle();
  if (windowId != null) {
    await chrome.sidePanel.open({ windowId }).catch(() => {});
  }
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'getThemeColor') {
        sendResponse(await getThemeColor());
      } else if (message.type === 'addDynamicRule') {
        sendResponse(await addDynamicRule(message.url));
      } else if (message.type === 'addCurrentSite') {
        sendResponse(await addCurrentSite());
      } else if (message.type === 'openSite') {
        sendResponse(await openPanelThen(() => openSite(message.siteId, message.url), sender));
      } else if (message.type === 'closeSite') {
        const windowId = await resolveWindowId(message.windowId, sender);
        sendResponse(await closePanel(windowId));
      } else if (message.type === 'expandGoogle') {
        sendResponse(await openPanelThen(expandGoogle, sender));
      } else if (message.type === 'togglePanel') {
        const windowId = await resolveWindowId(message.windowId, sender);
        sendResponse(await handleToggle(windowId));
      } else if (message.type === 'getShortcutInfo') {
        sendResponse(await getShortcutInfo());
      } else if (message.type === 'openShortcutsPage') {
        await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }).catch(() => {});
        sendResponse({ ok: true });
      } else if (message.type === 'youtubeFullscreenEnter') {
        sendResponse(await handleFullscreenEnter(sender));
      } else if (message.type === 'youtubeFullscreenExit') {
        sendResponse(await handleFullscreenExit(sender));
      } else if (message.type === 'sbx-copy-text') {
        sendResponse(await handleCopyText(message.text, sender));
      }
    } catch (e) {
      try { sendResponse({ ok: false, error: e.message }); } catch (_) {}
    }
  })();
  return true;
});

async function openPanelThen(fn, sender) {
  const winId = sender && sender.tab ? sender.tab.windowId : null;
  if (winId != null) {
    try { await chrome.sidePanel.open({ windowId: winId }); } catch (e) {}
  }
  return fn();
}

async function openSite(siteId, url) {
  try {
    if (url) {
      addDynamicRule(url);
    }
    await chrome.storage.local.set({ activeSiteId: siteId });
    return { opened: true };
  } catch (e) {
    return { opened: false, error: e && e.message ? e.message : String(e) };
  }
}

async function resolveWindowId(explicit, sender) {
  if (explicit != null) return explicit;
  if (sender && sender.tab && sender.tab.windowId != null) return sender.tab.windowId;
  try {
    const wins = await chrome.windows.getAll({ windowTypes: ['normal'] });
    return wins.length ? wins[0].id : null;
  } catch (e) {
    return null;
  }
}

async function closePanel(windowId) {
  let closed = false;
  try {
    if (windowId != null) {
      await chrome.sidePanel.close({ windowId });
    }
    closed = true;
  } catch (e) {}
  await chrome.storage.local.set({ panelOpen: false });
  ensurePageRail(windowId);
  broadcastShowRail(windowId);
  return { closed };
}

async function broadcastShowRail(windowId) {
  try {
    // 優化：僅處理當前 active 分頁，避免對同視窗所有分頁注入造成卡頓與面板跑動
    const query = windowId != null ? { active: true, windowId } : { active: true, lastFocusedWindow: true };
    const tabs = await chrome.tabs.query(query);
    const tab = tabs[0];
    if (!tab || !tab.id || !tab.url || !/^https?:/.test(tab.url)) return;
    try { await chrome.tabs.sendMessage(tab.id, { type: 'showRail' }); } catch (e) {}
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    } catch (e) {}
  } catch (e) {}
}

async function handleFullscreenEnter(sender) {
  try {
    let wid = sender && sender.tab && sender.tab.windowId != null ? sender.tab.windowId : null;
    if (wid == null) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        wid = tab && tab.windowId != null ? tab.windowId : null;
      } catch (e) {}
    }
    if (wid == null) return { ok: false };
    const data = await chrome.storage.local.get(['panelOpen']);
    const wasOpen = !!data.panelOpen;
    const map = await getFullscreenRestoreMap();
    map.set(String(wid), wasOpen);
    await setFullscreenRestoreMap(map);
    if (wasOpen) {
      await closePanel(wid);
      return { ok: true, closed: true };
    }
    return { ok: true, closed: false };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

async function handleFullscreenExit(sender) {
  try {
    let wid = sender && sender.tab && sender.tab.windowId != null ? sender.tab.windowId : null;
    if (wid == null) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        wid = tab && tab.windowId != null ? tab.windowId : null;
      } catch (e) {}
    }
    if (wid == null) return { ok: false };
    const map = await getFullscreenRestoreMap();
    const wasOpen = map.get(String(wid));
    map.delete(String(wid));
    await setFullscreenRestoreMap(map);
    if (!wasOpen) return { ok: true, reopened: false };
    const cur = await chrome.storage.local.get(['panelOpen']);
    if (cur.panelOpen) return { ok: true, reopened: false };
    try {
      await chrome.storage.local.set({ activeSiteId: 'google' });
      await chrome.sidePanel.open({ windowId: wid });
      await chrome.storage.local.set({ panelOpen: true });
      return { ok: true, reopened: true };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

async function handleCopyText(text, sender) {
  try {
    if (typeof text !== 'string' || !text) return { ok: false, error: 'empty' };
    // Try service worker clipboard if available (Chrome 116+ offscreen may have it)
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); return { ok: true }; } catch (e) {}
    }
    // Fallback: inject into sender tab or active tab
    let tabId = sender && sender.tab && sender.tab.id != null ? sender.tab.id : null;
    if (!tabId) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tabId = tab && tab.id != null ? tab.id : null;
      } catch (e) {}
    }
    if (tabId != null) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (t) => navigator.clipboard.writeText(t),
          args: [text]
        });
        return { ok: true };
      } catch (e) {
        // try execCommand fallback in tab
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: (t) => {
              const ta = document.createElement('textarea');
              ta.value = t; ta.style.position='fixed'; ta.style.left='-9999px';
              document.body.appendChild(ta); ta.select();
              const ok = document.execCommand('copy'); ta.remove(); return ok;
            },
            args: [text]
          });
          return { ok: true };
        } catch (e2) { return { ok: false, error: e2.message || e.message }; }
      }
    }
    return { ok: false, error: 'no tab' };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function ensurePageRail(windowId) {
  try {
    await chrome.storage.local.set({ panelOpen: false }).catch(() => {});
    const query = windowId != null ? { active: true, windowId } : { active: true, lastFocusedWindow: true };
    let tabs = [];
    try { tabs = await chrome.tabs.query(query); } catch (e) { tabs = []; }
    const tab = tabs[0];
    if (!tab || !tab.id || !tab.url || !/^https?:/.test(tab.url)) return;
    if (/^chrome-extension:/.test(tab.url)) return;
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    } catch (e) {}
    try { await chrome.tabs.sendMessage(tab.id, { type: 'showRail' }); } catch (e) {}
  } catch (e) {}
}

async function expandGoogle() {
  try {
    addDynamicRule(GOOGLE_URL);
    await chrome.storage.local.set({ activeSiteId: 'google' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

async function addCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) {
      return { success: false, error: '目前分頁不支援加入' };
    }
    // 允許 http/https 與 chrome-extension 頁面（如 ollbabafopjfidmpdikdnokhhfefacpl/fullpage.html）
    // 瀏覽器內部頁面 chrome://, edge://, brave://, about: 仍不支援
    if (/^(chrome|edge|brave|about):/.test(tab.url)) {
      return { success: false, error: '瀏覽器內部頁面不支援加入' };
    }
    if (!/^(https?|chrome-extension):/.test(tab.url)) {
      return { success: false, error: '目前分頁不支援加入（僅支援 http/https 與擴充功能頁面）' };
    }
    return {
      success: true,
      site: {
        id: 's' + Date.now(),
        name: (tab.title || '').trim() || new URL(tab.url).hostname,
        url: tab.url,
        favicon: tab.favIconUrl || null
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getShortcutInfo() {
  let commandShortcut = '';
  try {
    const commands = await chrome.commands.getAll();
    const cmd = commands.find((c) => c.name === 'toggle-panel');
    if (cmd) commandShortcut = cmd.shortcut || '';
  } catch (e) {}
  let custom = '';
  try {
    const data = await chrome.storage.local.get(['shortcut']);
    custom = data.shortcut || '';
  } catch (e) {}
  return { custom, commandShortcut };
}

async function getThemeColor() {
  try {
    const theme = await chrome.theme.getCurrent();
    const colors = (theme && theme.colors) || {};
    const raw = colors.toolbar || colors.frame || colors.window_frame || null;
    if (Array.isArray(raw) && raw.length >= 3) {
      return `rgb(${Math.round(raw[0])}, ${Math.round(raw[1])}, ${Math.round(raw[2])})`;
    }
    if (typeof raw === 'string' && raw) {
      return raw;
    }
  } catch (e) {}
  return null;
}

async function addDynamicRule(url) {
  try {
    // chrome-extension:// 等非 http(s) 頁面不需要去除 X-Frame-Options
    if (!/^https?:/.test(url)) return { success: true, ruleId: null };
    const hostname = new URL(url).hostname;
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    if (existingRules.some((r) => r.condition.urlFilter === `||${hostname}`)) {
      return { success: true, ruleId: null };
    }
    const maxId = existingRules.reduce((max, r) => Math.max(max, r.id), 100);
    const rule = {
      id: maxId + 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'content-security-policy', operation: 'remove' },
          { header: 'content-security-policy-report-only', operation: 'remove' },
          { header: 'permissions-policy', operation: 'remove' },
          { header: 'permissions-policy-report-only', operation: 'remove' },
          { header: 'feature-policy', operation: 'remove' },
          { header: 'cross-origin-embedder-policy', operation: 'remove' },
          { header: 'cross-origin-opener-policy', operation: 'remove' },
          { header: 'cross-origin-resource-policy', operation: 'remove' }
        ]
      },
      condition: {
        urlFilter: `||${hostname}`,
        resourceTypes: ['sub_frame']
      }
    };
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [rule],
      removeRuleIds: []
    });
    return { success: true, ruleId: rule.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
