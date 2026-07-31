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
  let panelOpen = false;
  let dragId = null;
  let toastTimer = null;

  const toSites = (v) => (Array.isArray(v) ? v.filter((s) => s && typeof s === 'object' && s.id) : []);

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
    '  <label class="sbx-custom">' +
    '    <input type="color" value="#f2f3f5">' +
    '    <span>自訂顏色</span>' +
    '  </label>' +
    '</div>' +
    '<div id="sbx-toast"></div>';
  document.documentElement.appendChild(root);

  const siteList = root.querySelector('#sbx-site-list');
  const settingsEl = root.querySelector('#sbx-settings');
  const gearBtn = root.querySelector('#sbx-btn-gear');
  const colorInput = settingsEl.querySelector('.sbx-custom input');

  function show() {
    if (panelOpen) {
      root.classList.remove('sbx-enter');
      root.classList.add('sbx-hidden');
      document.documentElement.classList.remove('sbx-reserve');
    } else {
      root.classList.add('sbx-enter');
      root.classList.remove('sbx-hidden');
      document.documentElement.classList.add('sbx-reserve');
    }
  }

  function renderRail() {
    siteList.innerHTML = '';
    sites.forEach((site) => {
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
    settingsEl.classList.toggle('sbx-show');
    gearBtn.classList.toggle('sbx-on', settingsEl.classList.contains('sbx-show'));
  });

  document.addEventListener('click', (e) => {
    if (settingsEl.classList.contains('sbx-show') &&
        !settingsEl.contains(e.target) && !gearBtn.contains(e.target)) {
      settingsEl.classList.remove('sbx-show');
      gearBtn.classList.remove('sbx-on');
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

  function renderThemeOptions() {
    settingsEl.querySelectorAll('.sbx-opt').forEach((b) => {
      b.classList.toggle('sbx-on', theme === b.dataset.theme);
    });
    colorInput.closest('.sbx-custom').classList.toggle('sbx-on', theme === 'custom');
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
    root.style.setProperty('--sbx-bg', bg);
    root.style.setProperty('--sbx-text', text);
    root.style.setProperty('--sbx-accent', text);
    root.style.setProperty('--sbx-hover', mix(bg, dark ? '#ffffff' : '#000000', dark ? 0.10 : 0.08));
    root.style.setProperty('--sbx-border', mix(bg, dark ? '#ffffff' : '#000000', 0.28));
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
    const el = root.querySelector('#sbx-toast');
    el.textContent = msg;
    el.classList.add('sbx-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('sbx-show'), 2200);
  }

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
      if (changes.customColor) customColor = changes.customColor.newValue;
      if (changes.theme || changes.customColor) {
        renderThemeOptions();
        applyTheme();
      }
    } catch (e) {}
  });

  async function init() {
    try {
      const res = await chrome.storage.local.get(['sites', 'activeSiteId', 'theme', 'customColor', 'panelOpen']);
      sites = toSites(res.sites);
      activeSiteId = res.activeSiteId || null;
      theme = res.theme || 'auto';
      customColor = res.customColor || '#f2f3f5';
      panelOpen = !!res.panelOpen;
    } catch (e) {}
    renderRail();
    renderThemeOptions();
    applyTheme();
    show();
  }

  init();
})();
