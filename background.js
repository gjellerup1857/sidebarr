async function resetPanelBehavior() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch (e) {}
}
resetPanelBehavior();
chrome.runtime.onInstalled.addListener(resetPanelBehavior);
chrome.runtime.onStartup.addListener(resetPanelBehavior);

try {
  chrome.sidePanel.onOpened.addListener((info) => {
    chrome.storage.local.set({ panelOpen: true }).catch(() => {});
  });
} catch (e) {}

try {
  chrome.sidePanel.onClosed.addListener((info) => {
    chrome.storage.local.set({ panelOpen: false }).then(() => {
      ensurePageRail(info && info.windowId);
    }).catch(() => {});
  });
} catch (e) {}

chrome.action.onClicked.addListener((tab) => {
  const openPromise = chrome.sidePanel.open({ windowId: tab.windowId });
  openPromise
    .then(() => chrome.storage.local.set({ panelOpen: true }))
    .catch(() => {
      chrome.action.setBadgeText({ text: '!' }).catch(() => {});
      setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(() => {}), 2500);
    });
});

const GOOGLE_URL = 'https://www.google.com/';
let lastToggleAt = 0;
const fullscreenRestoreMap = new Map();

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-panel') return;
  resolveFocusedWindowId().then((windowId) => handleToggle(windowId)).catch(() => {});
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
  if (message.type === 'getThemeColor') {
    getThemeColor().then(sendResponse);
    return true;
  }
  if (message.type === 'addDynamicRule') {
    addDynamicRule(message.url).then(sendResponse);
    return true;
  }
  if (message.type === 'addCurrentSite') {
    addCurrentSite().then(sendResponse);
    return true;
  }
  if (message.type === 'openSite') {
    openPanelThen(() => openSite(message.siteId, message.url), sender).then(sendResponse);
    return true;
  }
  if (message.type === 'closeSite') {
    resolveWindowId(message.windowId, sender)
      .then((windowId) => closePanel(windowId).then(sendResponse));
    return true;
  }
  if (message.type === 'expandGoogle') {
    openPanelThen(expandGoogle, sender).then(sendResponse);
    return true;
  }
  if (message.type === 'togglePanel') {
    resolveWindowId(message.windowId, sender)
      .then((windowId) => handleToggle(windowId))
      .then(sendResponse);
    return true;
  }
  if (message.type === 'getShortcutInfo') {
    getShortcutInfo().then(sendResponse);
    return true;
  }
  if (message.type === 'openShortcutsPage') {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === 'youtubeFullscreenEnter') {
    handleFullscreenEnter(sender).then(sendResponse);
    return true;
  }
  if (message.type === 'youtubeFullscreenExit') {
    handleFullscreenExit(sender).then(sendResponse);
    return true;
  }
  if (message.type === 'sbx-copy-text') {
    handleCopyText(message.text, sender).then(sendResponse);
    return true;
  }
});

function openPanelThen(fn, sender) {
  const winId = sender && sender.tab ? sender.tab.windowId : null;
  const openPromise = winId != null
    ? chrome.sidePanel.open({ windowId: winId }).catch(() => null)
    : Promise.resolve(null);
  return openPromise.then(fn);
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
  return { closed };
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
    fullscreenRestoreMap.set(wid, wasOpen);
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
    const wasOpen = fullscreenRestoreMap.get(wid);
    fullscreenRestoreMap.delete(wid);
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
    const opts = windowId != null
      ? { active: true, windowId }
      : { active: true, lastFocusedWindow: true };
    const [tab] = await chrome.tabs.query(opts);
    if (!tab || !tab.id || !tab.url || !/^https?:/.test(tab.url)) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
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
    if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
      return { success: false, error: '目前分頁不支援加入' };
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
