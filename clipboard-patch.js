(() => {
  if (window.__sbxClipboardPatched) return;
  window.__sbxClipboardPatched = true;

  const tryPatch = () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) return;
      const origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = async (text) => {
        try {
          return await origWrite(text);
        } catch (e) {
          // Fallback: execCommand inside iframe (preserves user activation)
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '-9999px';
            ta.setAttribute('readonly', '');
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            ta.setSelectionRange(0, ta.value.length);
            const ok = document.execCommand('copy');
            ta.remove();
            if (ok) return;
          } catch (_) {}
          // Sidepanel iframe -> try parent postMessage (parent has clipboard permission)
          if (window.parent !== window) {
            try {
              const res = await new Promise((resolve, reject) => {
                let done = false;
                const timeout = setTimeout(() => {
                  if (done) return;
                  done = true;
                  window.removeEventListener('message', handler);
                  reject(e);
                }, 1200);
                const handler = (ev) => {
                  if (ev.data && ev.data.type === 'sbx-copy-result') {
                    if (done) return;
                    done = true;
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    if (ev.data.success) resolve();
                    else reject(new Error(ev.data.error || 'copy failed'));
                  }
                };
                window.addEventListener('message', handler);
                try { window.parent.postMessage({ type: 'sbx-copy', text }, '*'); } catch (_) {}
                try {
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({ type: 'sbx-copy-text', text }, (r) => {
                      if (chrome.runtime.lastError) return;
                      if (r && r.ok && !done) {
                        done = true;
                        clearTimeout(timeout);
                        window.removeEventListener('message', handler);
                        resolve();
                      }
                    });
                  }
                } catch (_) {}
              });
              return res;
            } catch (_) {}
          }
          throw e;
        }
      };

      // Patch clipboard.write (used by Gemini for rich copy)
      if (navigator.clipboard.write) {
        try {
          const origWriteAll = navigator.clipboard.write.bind(navigator.clipboard);
          navigator.clipboard.write = async (items) => {
            try { return await origWriteAll(items); } catch (e) {
              try {
                for (const item of items) {
                  const t = item.types && item.types.includes('text/plain') ? 'text/plain' : item.types[0];
                  if (!t) continue;
                  const blob = await item.getType(t);
                  const text = await blob.text();
                  return await navigator.clipboard.writeText(text);
                }
              } catch (_) {}
              throw e;
            }
          };
        } catch (_) {}
      }

      // Patch execCommand copy to ensure it works inside iframe (avoid recursion)
      const origExec = Document.prototype.execCommand;
      Document.prototype.execCommand = function (cmd, showUI, value) {
        if (String(cmd).toLowerCase() === 'copy') {
          try {
            const r = origExec.call(this, cmd, showUI, value);
            if (r) return r;
          } catch (_) {}
          return false;
        }
        return origExec.call(this, cmd, showUI, value);
      };
    } catch (_) {}
  };

  // patch early and after load
  tryPatch();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPatch);
  }
  setTimeout(tryPatch, 800);
  setTimeout(tryPatch, 2000);
})();
