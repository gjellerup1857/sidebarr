const DEFAULT_FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8a8f98" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M2.2 8h11.6M8 2c2 1.8 2.8 3.8 2.8 6S10 12.2 8 14c-2-1.8-2.8-3.8-2.8-6S6 3.8 8 2z"/></svg>'
);
const GOOGLE_URL = 'https://www.google.com/';

let sites = [];
let activeSiteId = null;
let theme = 'auto';
let customColor = '#f2f3f5';
let dragId = null;
let toastTimer = null;
let winId = null;

const toSites = (v) => (Array.isArray(v) ? v.filter((s) => s && typeof s === 'object' && s.id) : []);

const siteList = document.getElementById('site-list');
const siteFrame = document.getElementById('site-frame');
const emptyState = document.getElementById('empty-state');
const loadingBar = document.getElementById('loading-bar');
const settingsEl = document.getElementById('settings');
const gearBtn = document.getElementById('btn-gear');
const closePanelBtn = document.getElementById('btn-close-panel');
const collapseBtn = document.getElementById('btn-collapse');
const collapseIcon = document.getElementById('collapse-icon');
const addBtn = document.getElementById('btn-add');
const colorInput = settingsEl.querySelector('.custom input');

async function init() {
  try {
    const win = await chrome.windows.getCurrent();
    winId = win ? win.id : null;
  } catch (e) {}
  try {
    const res = await chrome.storage.local.get(['sites', 'activeSiteId', 'theme', 'customColor']);
    sites = toSites(res.sites);
    activeSiteId = res.activeSiteId || null;
    theme = res.theme || 'auto';
    customColor = res.customColor || '#f2f3f5';
  } catch (e) {}
  renderRail();
  renderThemeOptions();
  applyTheme();
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
          img.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(new URL(site.url).hostname) + '&sz=64';
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

async function loadFrame(siteId) {
  const site = sites.find((s) => s.id === siteId);
  if (!site) return;
  activeSiteId = siteId;
  emptyState.classList.add('hidden');
  if (siteFrame.src !== site.url) {
    loadingBar.classList.remove('hidden');
    siteFrame.src = site.url;
  }
  renderRail();
}

function loadGoogle() {
  activeSiteId = 'google';
  emptyState.classList.add('hidden');
  if (siteFrame.src !== GOOGLE_URL) {
    loadingBar.classList.remove('hidden');
    siteFrame.src = GOOGLE_URL;
  }
  renderRail();
}

function showEmpty() {
  activeSiteId = null;
  siteFrame.src = '';
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
  settingsEl.classList.toggle('show');
  gearBtn.classList.toggle('on', settingsEl.classList.contains('show'));
});

document.addEventListener('click', (e) => {
  if (settingsEl.classList.contains('show') &&
      !settingsEl.contains(e.target) && !gearBtn.contains(e.target)) {
    settingsEl.classList.remove('show');
    gearBtn.classList.remove('on');
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

function renderThemeOptions() {
  settingsEl.querySelectorAll('.opt').forEach((b) => {
    b.classList.toggle('on', theme === b.dataset.theme);
  });
  colorInput.closest('.custom').classList.toggle('on', theme === 'custom');
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
  const text = dark ? '#d2d6dc' : '#202124';
  document.documentElement.style.setProperty('--sb-bg', bg);
  document.documentElement.style.setProperty('--sb-text', text);
  document.documentElement.style.setProperty('--sb-accent', text);
  document.documentElement.style.setProperty('--sb-hover', mix(bg, dark ? '#ffffff' : '#000000', dark ? 0.10 : 0.08));
  document.documentElement.style.setProperty('--sb-border', mix(bg, dark ? '#ffffff' : '#000000', 0.28));
  if (theme !== 'custom') {
    colorInput.value = bg;
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
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

siteFrame.addEventListener('load', () => {
  loadingBar.classList.add('hidden');
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
    if (changes.customColor) customColor = changes.customColor.newValue;
    if (changes.theme || changes.customColor) {
      renderThemeOptions();
      applyTheme();
    }
  } catch (e) {}
});

init();
