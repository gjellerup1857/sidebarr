# Changelog

所有重要變更皆記錄於此檔案。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，版本號遵循 `2026.0.x`。

## [2026.0.21] - 2026-09-01

### 🎨 優化 & 🐞 修正

#### 1. 收回/展開動畫仍不順暢
- **修復**：`content.css:1` 移除 `sbx-enter` 延遲，`#sbx-rail-root` 改 `transform:translateX` 無過渡（`transition:none`），`html.sbx-reserve body` 移除 `transition` 使 `margin-right` 與 Rail 同步瞬時完成；`background.js` `broadcastShowRail` 僅處理 `activeTab` 並 `200ms` 節流 `MutationObserver`，消除面板跑動

#### 2. YouTube 影片頁與 Gemini 筆記本 UI（統一 RWD 2.0）
- **問題**：`v2026.0.20` 雖修復動畫，但 YouTube 除影片外元素仍溢出，Gemini 筆記本「職涯顧問」如圖仍扭曲
- **修復**：
  - **統一策略**：移除所有針對單一站點的強制 `width:100%` 與 `flex-direction`，改為**僅對真正溢出的長內容**（`pre,code,table,img`）做 `pre-wrap` 與 `max-width`，`Gemini` 與其他網頁完全一致，不再單獨破壞 RWD
  - `youtube-sidepanel-fix` 對 `youtube.com` 窄 `iframe` 僅對 `#columns` 在 `getBoundingClientRect().width > vw` 時才 `flex-direction:column`，`#player` 保持原生 `aspect-ratio` 不強制 `height`
  - ` manifest.json:4` 版本 `2026.0.20` → `2026.0.21`

---

## [2026.0.20] - 2026-09-01

### 🐞 修正 & 🎨 優化

#### 1. 動畫卡頓、面板跑動（收回/展開）
- **修復**：`content.css:1` ` #sbx-rail-root` 改 `transform:translateX(0)` + `transition: opacity/transform 0.18s` 並 `will-change`，移除 `0.16s` 延遲；`content.js:359` `setupFixedObserver` 改 `200ms` 節流且僅觀察 `body childList`，`background.js:167` `broadcastShowRail` 僅處理 `activeTab` 避免全視窗注入卡頓

#### 2. YouTube 影片頁與 Gemini 筆記本 UI（統一 RWD）
- **問題**：Gemini「職涯顧問」與 YouTube 影片頁在 `~360px` 側邊欄內，`nav bar` 正常但對話/標題/推薦等元素溢出被遮
- **修復**：
  - 移除 `gemini` 專屬全域 CSS：`iframe-layout-fix` 已限縮至 `chatgpt/claude/perplexity`，Gemini 現與其他網頁一致，沿用原生 RWD（側邊欄內自動收合）
  - `youtube-sidepanel-fix` 對 `youtube.com` 窄 `iframe` 強制 `#columns` 單欄 `flex-direction:column`，`#player` 保持 `width:100%` 且 `aspect-ratio:16/9`，非影片元素限寬 `max-width:100%`
  - `manifest.json:4` 版本 `2026.0.19` → `2026.0.20`

---

## [2026.0.19] - 2026-09-01

### 🐞 修正 & 🎨 優化

#### 1. 移除 Gemini 專屬 CSS，統一 RWD
- **問題**：`v2026.0.17/18` 為 Gemini 加入的 `iframe-layout-fix` 使其在側邊欄內如圖中「支付科技」頁面跑版，且連帶影響其他網頁
- **修復**：`manifest.json:44` 將 `iframe-layout-fix` 的 `matches` 限縮至僅 ChatGPT/Claude/Perplexity（移除 `gemini.google.com / aistudio.google.com`），`iframe-layout-fix.css/js` 移除 `div/main/c-wiz` 全域收縮，僅保留 `pre/code/table/img` 的溢出處理；Gemini 現與其他網頁一致，沿用原生 RWD

#### 2. YouTube 側邊欄影片全空白
- **問題**：`youtube-sidepanel-fix` 對 `#player` 強制 `aspect-ratio` 與 `height` 導致高度塌陷，加上 `youtube-adblock` 誤判
- **修復**：`youtube-sidepanel-fix.css` 移除 `aspect-ratio/height` 強制，僅保留 `max-width:100%`；`youtube-adblock.js` 簡化為僅點擊 `skipBtn`，不對 `video` 做 `muted/playbackRate` 干預；`sidepanel.css:35` 移除 `#main` 的 `contain:layout`，`manifest` 暫時停用 `youtube-sidepanel-fix` 對 YouTube 的版面強制，僅保留 `adblock`

#### 3. 收回/關閉動畫卡頓、面板跑動
- **修復**：`background.js:167,277` `broadcastShowRail` / `ensurePageRail` 改為僅處理 `activeTab`（原對同視窗所有分頁注入造成卡頓）；`content.js:359` `setupFixedObserver` 改為僅觀察 `document.body childList` 並 `200ms` 節流，移除 `scroll` 監聽與 `subtree` 全量觀察

- `manifest.json:4` 版本 `2026.0.18` → `2026.0.19`

---

## [2026.0.18] - 2026-09-01

### 🐞 修正

#### 1. 影片全空白回歸 & 統一 RWD 導致 Gemini 再次跑版
- **問題**：`v2026.0.17` 為解決 Gemini 跑版而將 `iframe-layout-fix` 全域收縮，卻使 Gemini 再次如圖中深色列表被壓扁，且 `youtube-adblock` 誤隱藏 `video` 導致側邊欄 YouTube 全空白
- **修復**：
  - `iframe-layout-fix` 全面回退：`manifest.json:44` 限縮 `matches` 僅 `gemini/chatgpt/claude/perplexity`，`css` 移除 `div/main/c-wiz` 全域 `min-width/max-width` 與 `* {box-sizing}`，僅保留 `pre/code/table/img` 長內容 `pre-wrap`；`js` 僅掃描真正溢出的 `pre,code,table,img` 不動整體佈局
  - `youtube-adblock` / `youtube-sidepanel-fix` 解耦：`adblock` 僅 `skipBtn` 點擊，`sidepanel-fix` 對 `youtube` 單獨處理 `flex-direction:column`，兩者不再互相干擾
  - `manifest.json:4` 版本 `2026.0.17` → `2026.0.18`

---

## [2026.0.17] - 2026-09-01

### 🐞 修正

#### 1. 統一 RWD：Gemini 在側邊欄跑版且連帶影響其他網頁
- **問題**：前版 `iframe-layout-fix` 以 `<all_urls>` 對所有 `div/main/section/c-wiz` 強制 `min-width:0; max-width:100%`，雖修復 Gemini 對話溢出，卻導致 Gemini 自身 `RWD`（如圖中深色對話列表）及部分站點（如 YouTube、一般官網）跑版
- **修復**：
  - `manifest.json:44` 將 `iframe-layout-fix` 的 `matches` 由 `<all_urls>` 縮限為 `gemini.google.com / aistudio.google.com / *.gemini / chatgpt.com / chat.openai.com / claude.ai / perplexity.ai` 等 AI 站點，避免影響其他網頁的原生 RWD
  - `iframe-layout-fix.css` 移除 `div/main/section/c-wiz` 全域收縮與 `* {box-sizing}`，僅保留 `pre/code/table/img` 等**長內容**的 `pre-wrap/break-word` 與 `overflow-x:auto`，以及對話容器在**實際溢出時**才限寬
  - `iframe-layout-fix.js` 重構 `fixOverflowElements()` 由「掃描全部 `body *`」改為僅掃描 `pre,code,table,img,canvas,svg` 與真正溢出（`rect.width>vw`）的元素，並移除對 `main/c-wiz` 的強制 `width:100%`，改為僅對溢出的 `c-wiz/[data-test-id]` 動態限寬
  - `youtube-sidepanel-fix` 保持獨立，Gemini 側邊欄內由專屬 `iframe-layout-fix` 處理，兩者不再互相干擾
- `manifest.json:4` 版本 `2026.0.16` → `2026.0.17`

---

## [2026.0.16] - 2026-09-01

### 🐞 緊急修正 & 🎨 優化

#### 1. 側邊欄 YouTube 影片全空白 & 廣告回歸
- **問題**：收回或關閉側邊欄時 `44px` Rail 與頁面 `margin-right` 不同步，出現面板跑動與內容跳動
- **修復**：
  - `content.css:1,32` ` #sbx-rail-root` 改 `transition: opacity 0.2s ease` 並 `will-change:opacity`，移除 `sbx-enter` 的 `0.16s` 延遲；`html.sbx-reserve body` 新增 `transition: margin-right 0.2s ease, max-width 0.2s ease`
  - `content.js:212` `show()` 改同步執行 `applyBodyRailCompensation()` 與 `adjustFixedElements()`（移除 `requestAnimationFrame` 延遲），確保 `margin` 與 `fixed` 元素與 Rail 顯隱同幀完成

#### 2. YouTube 側邊欄非影片元素寬度溢出
- **問題**：側邊欄開啟 YouTube 時，影片本身正常（已無廣告黑屏），但標題、說明、留言、推薦等元素 `width` 超出側邊欄寬度被遮蔽
- **修復**：
  - 新增 `youtube-sidepanel-fix.js` / `.css`（`content_scripts` `youtube.com` `all_frames:true` `document_idle`）：當 `window.innerWidth<600` 且在 `iframe` 內時，強制 `#columns/#primary/#secondary/ytd-watch-flexy` 等改 `flex-direction:column; max-width:100%; min-width:0`，`#player` 保持 `width:100%`，推薦列表改單欄；`MutationObserver` + `resize` 動態監聽
  - `manifest.json:4` 版本 `2026.0.14` → `2026.0.15`

---

## [2026.0.15] - 2026-09-01

### 🎨 優化 & 🐞 修正

#### 1. 收回/關閉側邊欄動畫卡頓、面板跑動
- **問題**：收回或關閉側邊欄時 `44px` Rail 與頁面 `margin-right` 不同步，出現面板跑動與內容跳動
- **修復**：
  - `content.css:1,32` ` #sbx-rail-root` 改 `transition: opacity 0.2s ease` 並 `will-change:opacity`，移除 `sbx-enter` 的 `0.16s` 延遲；`html.sbx-reserve body` 新增 `transition: margin-right 0.2s ease, max-width 0.2s ease`
  - `content.js:212` `show()` 改同步執行 `applyBodyRailCompensation()` 與 `adjustFixedElements()`（移除 `requestAnimationFrame` 延遲），確保 `margin` 與 `fixed` 元素與 Rail 顯隱同幀完成

#### 2. YouTube 側邊欄非影片元素寬度溢出
- **問題**：側邊欄開啟 YouTube 時，影片本身正常（已無廣告黑屏），但標題、說明、留言、推薦等元素 `width` 超出側邊欄寬度被遮蔽
- **修復**：
  - 新增 `youtube-sidepanel-fix.js` / `.css`（`content_scripts` `youtube.com` `all_frames:true` `document_idle`）：當 `window.innerWidth<600` 且在 `iframe` 內時，強制 `#columns/#primary/#secondary/ytd-watch-flexy` 等改 `flex-direction:column; max-width:100%; min-width:0`，`#player` 保持 `width:100%`，推薦列表改單欄；`MutationObserver` + `resize` 動態監聽
  - `manifest.json:4` 版本 `2026.0.14` → `2026.0.15`

---

## [2026.0.14] - 2026-09-01

### 🐞 緊急修正

#### 1. 點擊 YouTube 影片仍全黑 + 廣告處理回歸
- **問題**：`v2026.0.13` 仍全黑且廣告快轉無效，部分 `get_video_info` 與 `api/stats` 阻擋導致播放器無法切換
- **修復**：
  - `youtube-adblock.js` 簡化為僅點擊 `skipBtn`（最可靠）與輕量 `muted+2x`，移除 `currentTime` 強制 seek 與 `wasAd` 狀態機中對 `adShowing` 的 `display:none` / `classList.remove`（避免误删播放器狀態），黑屏後不再殘留 `opacity`
  - `adblock-rules.json` 移除 `youtube.com/api/stats/ads` / `pagead` / `ptracking` 等 YouTube 同域阻擋，僅保留 `||doubleclick.net` / `||googleadservices.com` / `||googlesyndication.com` / `||googletagmanager.com` / `||google-analytics.com` 第三方廣告網域
  - `iframe-layout-fix` 對 `youtube.com` 已於 `v2026.0.12` 排除，本版保持 `exclude_matches` 避免 `height:auto` 影響播放器

#### 2. 收回/關閉側邊欄時面板消失
- **問題**：點擊 `>` / `X` 關閉側邊欄後，`44px` 常駐面板偶發消失（`panelOpen` 已設 `false` 但 `content.js` 未收到 `storage.onChanged` 或 `ensurePageRail` 僅處理 `activeTab`）
- **修復**：
  - `background.js:153,277` `closePanel()` 與 `ensurePageRail()` 新增 `broadcastShowRail()`：對同視窗所有 `http(s)` 分頁 `chrome.tabs.sendMessage({type:'showRail'})` 並重新 `executeScript`/`insertCSS`，確保 Rail 立即重顯
  - `content.js:821` 新增 `chrome.runtime.onMessage` 監聽 `showRail`，強制 `panelOpen=false; isFullscreenHidden=false; show()`，避免 `storage` 未觸發時的顯示失效

- `manifest.json:4` 版本 `2026.0.13` → `2026.0.14`

---

## [2026.0.13] - 2026-09-01

### 🐞 修正

#### 1. YouTube 廣告快轉後黑屏 / 持續播廣告
- **問題**：`v2026.0.12` 廣告雖快轉但 `一直播廣告`，結束後 `黑畫面`；`get_video_info*ad` 阻擋導致主影片無法載入
- **修復**：
  - `youtube-adblock.js` 重構 `skipAd()` 為狀態機 `wasAd`：`adShowing` 時記憶 `muted/rate` 並 `muted+16x` + `currentTime=duration-0.1`（僅 `duration<600` 且可 `seek`），否則 `playbackRate=16`；`!wasAd && adShowing` 結束時還原 `muted/rate` 並 `removeProperty(opacity/display)`，移除殘留 `ytp-ad-module` 遮罩；`skipBtn` 無論是否 `adShowing` 皆嘗試點擊
  - `adblock-rules.json` 移除 `id:110` `youtube.com/get_video_info*ad` 阻擋（會阻擋主影片資訊）
  - `youtube-adblock.css` 已於 `v2026.0.12` 移除 `opacity:0`，本版保持僅隱藏遮罩
- `manifest.json:4` 版本 `2026.0.12` → `2026.0.13`

---

## [2026.0.12] - 2026-09-01

### 🐞 修正

#### 1. 側邊欄內 YouTube 影片全黑
- **問題**：側邊欄開啟 YouTube 點播後影片介面全黑
- **根因**：
  - `youtube-adblock.css:27` `.ad-showing video{opacity:0 !important}` 在廣告被跳過後，若 `.ad-showing` 未從 `html5-video-player` 正確移除，影片保持隱藏
  - `youtube-adblock.js:22` 對 `adShowing` 元素誤執行 `style.display='none'`，若命中播放器容器則直接隱藏整個播放器
  - `iframe-layout-fix` 對 `youtube.com` 的 `video` 套用 `height:auto !important` 與 `div {min-width:0; max-width:100%}` 導致播放器高度塌陷
- **修復**：
  - `youtube-adblock.css` 移除 `opacity:0` 規則，僅隱藏廣告遮罩
  - `youtube-adblock.js` 移除 `adShowing.style.display`，改為對所有 `.ad-showing/.ad-interrupting` 元素批次 `classList.remove`，並 `video.style.removeProperty('opacity/display')`；`isInsideSidePanel` 對 `youtube` 網域直接返回 `false` 避免 `iframe-layout-fix` 介入
  - `iframe-layout-fix.css/js` 調整 `video/iframe` 僅 `max-width:100%`（移除 `height:auto`），`manifest.json` 對該修正新增 `exclude_matches: ["*://*.youtube.com/*", "*://youtube.com/*", "*://*.youtube-nocookie.com/*"]` 避免注入 YouTube
  - `manifest.json:4` 版本 `2026.0.11` → `2026.0.12`

---

## [2026.0.11] - 2026-09-01

### ✨ 改進

#### 1. Brave 側邊欄 YouTube 廣告攔截
- **問題**：Brave 瀏覽器本身可擋 YouTube 廣告，但 `chrome-extension://` 側邊欄內的 `iframe`（`youtube.com`）因 `top frame` 為擴充功能而非 `youtube.com`，Brave Shields 未套用 YouTube 規則，導致廣告仍出現
- **修復**：
  - 新增 `adblock-rules.json`（`declarativeNetRequest` `id: adblock`，`block`）：`||doubleclick.net`、`||googleadservices.com`、`||googlesyndication.com`、`||googletagmanager.com`、`youtube.com/api/stats/ads`、`youtube-nocookie.com/api/stats/ads`、`youtube.com/pagead`、`youtube.com/ptracking`、`google.com/pagead`、`google-analytics.com` 等，`resourceTypes` 含 `script/image/xmlhttprequest/media/sub_frame/other`
  - 新增 `youtube-adblock.js` / `.css`（`content_scripts` `*://*.youtube.com/*` + `*://youtube-nocookie.com/*` `all_frames:true` `document_start`）：CSS 隱藏 `#player-ads`、`.ytp-ad-module`、`ytd-display-ad-renderer` 等；JS 以 `MutationObserver` + `setInterval(500ms)` 檢測 `.ad-showing`，自動 `video.muted=true; playbackRate=16; currentTime=duration` 並點擊 `.ytp-ad-skip-button`，移除 `ad-showing` 類
  - `manifest.json:4` 版本 `2026.0.10` → `2026.0.11`，`declarative_net_request` 新增 `adblock` 資源

---

## [2026.0.10] - 2026-08-31

### 🐞 修正

#### 1. Gemini 側邊欄對話區域溢出側邊欄
- **問題**：Gemini 網頁於側邊欄 `iframe`（`~360px`）開啟時，`nav bar` 正常 RWD，但對話區域偶發寬出超出側邊欄，導致橫向滾動與內容被切
- **根因**：Gemini 對話容器及內部 `pre`/`code`/`table` 使用 `min-width:auto`（flex 預設不收縮）與 `white-space:pre` / `min-width:600px`，在窄 `iframe` 內不收縮；長程式碼/表格亦以 `max-content` 撐寬
- **修復**：
  - 新增 `iframe-layout-fix.js` / `.css`（`content_scripts` `matches:<all_urls>` `all_frames:true` `document_idle`）：當 `window.self!==window.top && innerWidth<750`（側邊欄內）時注入
    - CSS（`@media (max-width:700px)`）：`html,body{max-width:100%; overflow-x:hidden}`；所有 `div/main/section/c-wiz` 強制 `min-width:0; max-width:100%; box-sizing:border-box`；`pre/code` 改 `pre-wrap/break-word` 且 `overflow-x:auto`；`table` 改 `display:block` 橫向捲動；Gemini 特定容器 `main/[role="main"]/c-wiz/[data-test-id="conversation"]/.conversation-container` 強制 `width:100%; min-width:0; overflow-x:hidden`
    - JS：`fixOverflowElements()` 掃描 `body *` 中 `rect.width > vw` 或 `right > vw` 的溢出元素，標記 `dataset.sbxFixed` 後 `max-width:100%`，`pre/code/table` 另加 `white-space/break`；對 `main/c-wiz` 等強制 `min-width:0`；`MutationObserver` + `ResizeObserver` + `resize` 監聽動態對話，初載後 `800/2000/4000ms` 延遲再修復
  - `sidepanel.css:35` `#main` 新增 `overflow-x:hidden; contain:layout style`，`#site-frame` 新增 `max-width:100%; overflow-x:hidden` 防止外層溢出
- `manifest.json:4` 版本 `2026.0.9` → `2026.0.10`

---

## [2026.0.9] - 2026-08-31

### 🐞 修正

#### 1. 關閉/收回側邊欄後網頁內容仍被面板遮蓋
- **問題**：關閉或收回側邊欄後（`>` / `X`），`html.sbx-reserve body {margin-right:44px}` 對 `width:100vw`、`inline style` 或 `body` 本身 `100vw` 的頁面無效，右側元素仍跑到 `44px` Rail 下方
- **修復**：
  - `content.css:32` 增 `scrollbar-gutter:stable` 與 `body {max-width:calc(100vw - 44px)}`、`[style*="100vw"]` 後備；`content.js` 新增 `applyBodyRailCompensation()` 以 `style.setProperty('margin-right','44px','important')` / `max-width` / `box-sizing` / `overflow-x:clip` 直接覆蓋 `inline !important`，關閉時完整還原
  - `content.js:181,233` 擴充修正引擎：新增 `vwElements:Map` 與 `shouldAdjustVw`（同時處理 `inline 100vw` 與樣式表 `100vw` 以 `rect` 判斷），對 `document.body` / `document.documentElement` 及所有 `body *` 中貼右全寬元素（含 `100vw`）套用 `width/max-width:calc(100vw - 44px)`，`fixed/sticky` 另加 `right:44px`，並以 `Map` 記憶還原
  - `background.js:261` 已確保關閉後對同視窗所有 `http(s)` 分頁注入並保持 `panelOpen:false`，確保 Rail 常駐

#### 2. 其他
- `manifest.json:4` 版本 `2026.0.8` → `2026.0.9`

---

## [2026.0.8] - 2026-08-31

### 🐞 修正

#### 1. 關閉側邊欄後面板必定保留（`>` / `X`）
- **問題**：側邊欄開啟時點擊 `sidepanel` 內的 `>`（收合）與 `X`（關閉）後，`44px` 常駐面板偶發消失
- **修復**：`background.js:261` `ensurePageRail()` 改為對**同視窗所有 `http(s)` 分頁**批次 `executeScript`/`insertCSS`，並 `set({panelOpen:false})` 確保儲存狀態一致；`chrome.storage.onChanged` 已注入的頁面立即透過 `show()` 重顯 Rail，`init()` 新開分頁讀 `panelOpen:false` 亦顯示。`closePanel()` 與 `onClosed` 皆走此可靠路徑

#### 2. 部分網頁被面板遮擋（`fixed` 導航列）
- **根因**：`html.sbx-reserve body {margin-right:44px}` 僅推移文件流，`position:fixed; left:0; right:0; width:100vw` 的頂部導航仍以視窗寬度計算而被 `44px` Rail 覆蓋
- **修復**：
  - `content.css:32` 新增 `html.sbx-reserve {--sbx-rail-width:44px}` 與 `body {box-sizing:border-box}`，保留 `margin-right` 為主方案
  - `content.js:158,233` 新增 **動態 `fixed` 修正引擎**：`fixedElements:Map` + `isFixedOrSticky` / `shouldAdjustFixed`（全寬且貼右、高度 <35% 視窗的固定頭）+ `adjustFixedElements()` 對命中元素 `style.setProperty('right','44px','important')` 與 `width/max-width:calc(100vw - 44px)`，並在 `show()` / `panelOpen` 切換時自動還原；`scheduleAdjustFixed` 以 `requestAnimationFrame` 去抖，`setupFixedObserver()` 以 `MutationObserver` + `resize`/`scroll` 監聽動態插入的固定元素

#### 3. 其他
- `manifest.json:4` 版本 `2026.0.7` → `2026.0.8`

---

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

