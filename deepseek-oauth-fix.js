(() => {
  if (window.__sbxDeepseekFix) return;
  window.__sbxDeepseekFix = true;

  const isDeepSeek = location.hostname.includes('deepseek.com');
  if (!isDeepSeek) return;

  // 攔截 Google 登入按鈕的點擊，改由新分頁開啟以避免 iframe 內的 404 與 X-Frame 阻擋
  const handleGoogleLogin = (e) => {
    const target = e.target.closest('a, button');
    if (!target) return;
    const text = (target.innerText || target.textContent || '').toLowerCase();
    const href = target.href || target.getAttribute('href') || '';
    const isGoogleBtn = text.includes('google') || href.includes('accounts.google.com') || href.includes('oauth') || target.querySelector('img[alt*="Google"]');
    if (!isGoogleBtn) return;

    // 若按鈕有 href 直接是 Google OAuth，攔截
    let url = href;
    // 若按鈕無 href，可能是 JS 觸發的，嘗試從 onclick 或 data 屬性取得
    if (!url || url === '#' || url.startsWith('javascript:')) {
      // 嘗試從按鈕的點擊事件中取得即將導向的 URL（由 background 的 webNavigation 處理）
      return;
    }

    if (url.includes('accounts.google.com')) {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'openGoogleOAuth', url });
        } else {
          window.open(url, '_blank');
        }
      } catch (err) {
        window.open(url, '_blank');
      }
      return false;
    }
  };

  // 攔截 window.open 被用於 Google OAuth 彈窗的情況
  const origOpen = window.open;
  window.open = function(url, ...args) {
    if (typeof url === 'string' && url.includes('accounts.google.com')) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'openGoogleOAuth', url });
          return null;
        }
      } catch (e) {}
    }
    return origOpen.call(this, url, ...args);
  };

  document.addEventListener('click', handleGoogleLogin, true);
  document.addEventListener('auxclick', handleGoogleLogin, true);

  // 同時攔截所有對 accounts.google.com 的導航（包括 JS 導向）
  const origAssign = window.location.assign.bind(window.location);
  const origReplace = window.location.replace.bind(window.location);
  const interceptLocation = (url) => {
    if (typeof url === 'string' && url.includes('accounts.google.com')) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'openGoogleOAuth', url });
          return true;
        }
      } catch (e) {}
    }
    return false;
  };

  // 監聽所有點擊，確保 Google 登入按鈕被攔截
  document.addEventListener('click', (e) => {
    // 延遲檢查是否即將導向 Google（由 deepseek 的 JS 處理）
    setTimeout(() => {
      try {
        const href = location.href;
        if (href.includes('accounts.google.com')) {
          // 若已在 Google 頁面且是在 iframe 內，通知 background 在新分頁開啟
          if (window.self !== window.top) {
            try {
              chrome.runtime.sendMessage({ type: 'openGoogleOAuth', url: href });
              // 嘗試返回上一頁
              history.back();
            } catch (e) {}
          }
        }
      } catch (e) {}
    }, 100);
  }, true);
})();
