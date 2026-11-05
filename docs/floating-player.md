# 懸浮播放器：狀況與開發過程

> 狀態：**暫停開發**（2026-11-06）。已能用，但有未解決的問題，見「待處理」。

## 目標

讓 chill_hihi（3D CD 播放器）在工作時當成小型音樂播放器／療癒小物：

- macOS、Chrome；耗電要低。
- 背景透明，只有播放器浮在使用者平常瀏覽的網頁右下角（約 200×264），按鈕可以按，其餘地方的點擊穿透到下面的網頁。
- 在原網頁的「⋯」選單可以選擇要不要開。
- 完整 CD 播放器要在；最後決定不要專輯櫃、不要狗狗（程式還在，只是懸浮版隱藏）。

## 三個產出

| 資料夾／參數 | 說明 | 狀態 |
|---|---|---|
| `?pet=full\|mini` + `src/16-pet/`、`src/01-core/02-pet-config.js` | 寵物模式：透明背景、限幀省電、點擊穿透探測、迷你版 | 完成，沙盒測過 |
| `desktop/` | macOS Electron 外殼（透明置頂視窗、選單列圖示、自動省電） | 寫好，**沒在 macOS 實測** |
| `extension/` | Chrome MV3 擴充功能：把播放器以 iframe 浮在每個分頁 | 可用，見下 |

## 擴充功能架構

- `content.js`：每個一般網頁注入，建立 Shadow DOM 容器，裡面放一個 iframe，載入 `…/chill_hihi/?pet=full&ext=1`。iframe 預設 `pointer-events:none`，播放器自己判斷游標是否在畫面上，再透過私有 `MessagePort` 通知外層切換是否接住點擊。
- 通訊：外層建 `MessageChannel`，把 port2 交給 iframe（網頁看不到）。訊息：`hello/init`、`ign`（穿透）、`ls`（localStorage 鏡像）、`state`（播放狀態）、`hide`、`move`、`cmd`、`activate`。
- 儲存：`chrome.storage.local` 存設定、位置、大小、播放清單（localStorage 鏡像）、播放狀態。
- 只有「正在看的分頁」顯示播放器（用 storage 裡的 lease）；換分頁／換頁時存下曲目和秒數，新播放器放回 CD 接著播（約 1–2 秒空檔）。重開後 CD 回到播放器、暫停在上次位置；沒有紀錄時預設放第一張專輯。
- 網頁 ↔ 懸浮播放器同步（`src/16-pet/02-ext.js`）：有懸浮播放器存活（心跳 `alive`）時，由它出聲；原網頁的播放／暫停／下一首／放 CD 會變成 `site-cmd` 遙控它，它的狀態再反映回原網頁。沒有懸浮播放器時原網頁照常自己播。
- 操作：游標移到播放器上會出現「⠿ 移動」「⤡ 縮放」「✕ 關閉」；工具列圖示有設定視窗；快捷鍵 Alt+Shift+C 開關；關閉時圖示顯示「關」。
- 載入 8 秒沒回應會在右下角顯示原因提示。

## 開發時間線（重點）

1. 評估：網頁版 → 桌面小寵物／小視窗。選 macOS、可選擇、重視耗能。
2. 寵物模式：新增 `PET` 設定、限幀、DPR 上限、`low-power`、點擊穿透探測、迷你版；`16-boot` 改名 `17-boot`。
3. Electron 外殼（`desktop/`）。
4. 需求演變：灰白圓角卡片 → 全透明＋狗趴在播放器上 → 小視窗 ≈ 200×264 → 「直接懸在使用者一般網頁上」，改走 Chrome 擴充功能。
5. 擴充功能第一版 → 修正：持久化狀態、自由縮放、拿掉專輯櫃和狗、預設 CD、載入失敗提示、網頁與播放器雙向同步、快捷鍵與徽章。
6. PR：#22、#23 已合併；#24 起還在 `claude/floating-player` 分支（合併後 GitHub Pages 才會更新）。

## 測試狀況

沙盒（Playwright + 模擬 chrome API + 本機伺服器）測過：掛載、穿透點擊、拖曳、縮放、開關、重開還原（暫停／播放兩種）、兩分頁同步（網頁放 CD／暫停 → 播放器跟隨；播放器播放 → 網頁顯示播放中）、載入失敗提示、彈出視窗渲染。

**沒測過（沙盒無網路、非 macOS）**：真正的 YouTube 播放與音量／解除靜音、換頁接續的實際聽感、Electron 在 macOS 的行為、Chrome 真實環境下的背景分頁節流。

## 待處理

1. **claude.ai 等有嚴格 CSP 的網站不會出現播放器。** claude.ai 的 `frame-src` 只允許自己和 Cloudflare，iframe 會被擋；這是網站規定。選項：
   - 維持現狀（其他網站正常，音樂由另一分頁繼續播）。
   - 用 declarativeNetRequest 移除 claude.ai 的 CSP（可行，但降低該站防護、無法上架商店）。
   - **改開獨立小視窗**（使用者選了這個方向，但**尚未開發**）：點圖示開一個小的獨立瀏覽器視窗放播放器；不透明、不浮在頁面上、不一定置頂。也可評估 Document Picture-in-Picture（置頂，需使用者手勢，且可能同樣受 CSP 影響，未驗證）。
2. 「換頁不中斷」只做到接續（有 1–2 秒空檔）。要完全不中斷，需要常駐的播放位置（例如 offscreen document），但 YouTube 在擴充功能頁面能不能播沒把握，未做。
3. 播放器所在分頁若被 Chrome 休眠，聲音可能中斷。
4. 實機驗證項目見上「沒測過」。
5. 要上架 Chrome 網路商店：5 美元註冊、審核（含不公開上架）、需說明為何注入所有網站；改 `extension/` 要重新審核，只改 Pages 上的播放器不用。

## 怎麼接手

- 改程式在 `src/`，執行 `python3 tools/build.py` 重建 `index.html`（`--check` 檢查），兩邊一起提交。
- 擴充功能（`extension/`）更新：在 `chrome://extensions` 按重新整理；播放器本體更新靠部署 GitHub Pages，不用動擴充功能。
- 擴充功能預設播放器網址 `https://balala-bubu.github.io/chill_hihi/`，可在彈出視窗修改。
- 測試腳本在工作階段的暫存目錄，沒進 repo；要重做的話：本機起兩個 `http.server`（播放器、模擬宿主頁，不同 port 才是不同 origin），Playwright 攔截 three／matter-js 的 CDN 請求改用本機檔案，並注入模擬的 `chrome.storage`。
- 頁面測試用鉤子：`window.__pet`（`PET`、`handle`、`now`）與 `window.__mt`（含 `Au`、`press`、`status`、`cdIn`、`ALBUMS`）。

## 已知小事

- 寵物模式的 `mini` 版（狗＋控制列）和桌面外殼都保留著，但目前主線是擴充功能。
- 懸浮版不顯示專輯櫃和狗（CSS `html.pet-ext` 隱藏）；程式沒刪，之後可恢復。
