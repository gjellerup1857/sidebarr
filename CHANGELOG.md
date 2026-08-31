# Changelog

所有重要變更皆記錄於此檔案。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，版本號遵循 `2026.0.x`。

## [2026.0.7] - 2026-08-31

### 概述
本次版本聚焦於 **側邊欄體驗、視覺自訂與 AI 站點相容性** 三大主軸，涵蓋 YouTube 全螢幕智慧隱藏、淺色主題視覺修正、文字/圖示顏色自訂，以及 Gemini / ChatGPT 複製失效的徹底修復。

---

### ✨ 新增功能

#### 1. YouTube 全螢幕智慧隱藏
- **`content.js` / `content.css` / `background.js` / `sidepanel.js|css`**
- 偵測 `HTML5 Fullscreen API` (`document.fullscreenElement` / `webkitFullscreenElement` / `mozFullScreenElement`) + YouTube 專屬 `ytp-fullscreen` class（`#movie_player`, `#player`, `.html5-video-player`）
- 進入全螢幕時：
  - 頁面常駐 `44px` Rail (`#sbx-rail-root`) 自動 `opacity:0` + `pointer-events:none`（`sbx-fullscreen-hidden` / `sbx-fullscreen-active`），`html.sbx-reserve` 的 `margin-right` 歸零，影片佔滿視窗
  - 若側邊欄當時開啟，`background.js:fullscreenRestoreMap` 記憶 `panelOpen` 並 `chrome.sidePanel.close()`；退出時若曾開啟則自動 `chrome.sidePanel.open()` 重建
- 退出全螢幕後依記憶狀態還原 Rail / Panel，避免閃爍（`panelOpenBeforeFullscreen` + 1.2s fallback）
- 同時處理側邊欄內 `iframe`（如 YouTube 嵌於 Panel）全螢幕時隱藏 `sidepanel #rail` 與 `settings`
- 監聽 `fullscreenchange` / `webkitfullscreenchange` / `mozfullscreenchange` / `resize` + YouTube `MutationObserver`，通用全螢幕亦會隱藏避免遮擋

#### 2. 淺色主題圖示灰化 + 文字/圖示顏色自訂
- **問題**：白色/淺色面板底色時，設定彈窗文字與 `+` / `<` / 齒輪圖示為近黑 `#202124` 對比過強
- **修正**：
  - `content.css:2` / `sidepanel.css:7` `:root` 預設 `--sbx-text/--sb-icon/--sb-accent` / `--sb-text/--sb-icon` 由 `#202124` 改 `#5f6368`
  - `applyTheme()` 改 `autoText = dark ? '#ffffff' : '#5f6368'`（`luminance(bg)<0.5` 判斷），深底白字、淺底灰字
- **新增自訂**：
  - `content.js:14,101` / `sidepanel.js:9,36` 新增 `customTextColor`（`chrome.storage.local`）
  - 設定面板新增區塊「文字 / 圖示顏色」：`#sbx-text-color` / `#text-color` 色盤 + `重設為自動` 按鈕
  - `renderThemeOptions()` 高亮 `sbx-on`，`applyTheme()` 以 `isValidTextHex ? customTextColor : autoText` 覆蓋 `--sb-text/--sb-icon/--sb-accent`，背景與文字解耦
  - `sidepanel.html:36` / `content.js:101` 設定彈窗 `max-height:78vh; overflow-y:auto; scrollbar-width:none` 避免內容溢出

#### 3. 快捷鍵系統
- **新增**：`manifest.json:21` `commands.toggle-panel` (`Ctrl+Shift+S` / `MacCtrl+Shift+S`) 預設可於 `chrome://extensions/shortcuts` 修改
- **頁面內自訂快捷鍵**：設定面板新增「快捷鍵」輸入框，支援 `Ctrl/Alt/Shift/Cmd` 組合錄製、衝突檢測（`RESERVED_SHORTCUTS` 43+ 組瀏覽器保留組合）、`chrome.storage` 同步，`keydown` 於 `content.js` / `sidepanel.js` 觸發 `handleToggle`（`Google` 開啟 / 收合）
- **相關**：`background.js` 新增 `resolveFocusedWindowId` / `handleToggle` / `getShortcutInfo` / `openShortcutsPage`，800ms 去抖

#### 4. Gemini / ChatGPT 複製失效修復
- **根因**：側邊欄 `iframe` 缺 `allow="clipboard-*"` 且 AI 站點 `Permissions-Policy: clipboard-write=(self)` 阻擋 `navigator.clipboard.writeText`
- **修復**：
  - `manifest.json:6` 新增 `clipboardWrite` / `clipboardRead`
  - `sidepanel.html:12` `allow` 擴為 `clipboard-read *; clipboard-write *; fullscreen *; autoplay *; encrypted-media *; picture-in-picture *; web-share *`
  - `rules.json` / `background.js:298` 動/靜態 `declarativeNetRequest` 移除 `permissions-policy` / `feature-policy` / `content-security-policy-report-only` 等 7 項 header，確保嵌入幀寫入權限
  - 新增 `clipboard-patch.js`（`content_scripts` `all_frames:true` `document_start`）：攔截 `clipboard.writeText` / `clipboard.write`（Gemini 富文本），先試原函式，失敗則 `execCommand('copy')`（保留 user activation），仍失敗則 `window.parent.postMessage({type:'sbx-copy'})` + `chrome.runtime.sendMessage({type:'sbx-copy-text'})` 轉發父層
  - `sidepanel.js:554` `setupClipboardFallback()`：`permissions.query` 預授權，監聽 `message` / `runtime.onMessage` 於父頁用 `navigator.clipboard.writeText` 或 `textarea+execCommand` 完成複製並 `toast('已複製')`；`siteFrame load` 後嘗試直接包裝 `contentWindow.navigator.clipboard.writeText`
  - `background.js:217` `handleCopyText()`：`service worker` → `chrome.scripting.executeScript` 於宿主 `tab` 注入 `writeText` / `execCommand` 備援

---

### 🎨 視覺與樣式
- `content.css` / `sidepanel.css` 新增 `sbx-fullscreen-hidden` / `sbx-fullscreen-active`、快捷鍵輸入框 (`sbx-shortcut-input` / `shortcut-input`、`sbx-unset`、`sbx-recording`)、提示/錯誤樣式、設定彈窗滾動隱藏
- `sidepanel.css` 新增 `#rail svg {stroke:var(--sb-icon)}` 確保圖示跟隨文字色

### 🔧 技術細節
- 修復 `background.js` 遺漏 `GOOGLE_URL` 常數
- `declarativeNetRequest` 規則由 2 項 header 擴至 9 項，涵蓋 `cross-origin-*`
- `chrome.storage` 新增 `customTextColor`、`shortcut` 欄位，`onChanged` 同步兩端主題與快捷鍵
- `luminance()` 採用 `0.299R+0.587G+0.114B` 判斷深淺，`mix()` 以 `color-mix` 產生 `hover` / `border` 色

### 📦 相容性
- Chrome / Brave / Edge 141+（`sidePanel.close` / `onClosed` 優雅降級）
- `clipboard-patch` 支援 `chatgpt.com` / `chat.openai.com` / `gemini.google.com` / `aistudio.google.com` / `claude.ai` / `perplexity.ai` / `grok.com` / `chat.deepseek.com` 等嵌入 AI 站點

### 📝 檔案變更
- `manifest.json`、`background.js`、`content.js` / `.css`、`sidepanel.js` / `.html` / `.css`、`rules.json`、新增 `clipboard-patch.js`

---

## [2026.0.6] - 2026-07-31
- 初始發布：Dual Rail 架構、嵌入網站、快速加入、Google 一鍵開啟、拖曳排序、右鍵移除、自動/淺/深色主題

