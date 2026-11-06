# 新增背景的原則

目前有兩個背景：`BG.mode` 1 = 草地（`src/10-world/04-scenery.js`）、2 = 咖啡廳（`src/10-world/05-cafe.js`）。

## 切換規則（BG 按鈕）
- **預設是灰白**（灰點牆＋灰地板，`BG.mode` 0）。
- 短按 BG 按鈕：灰白 → 草地 → 灰白 → 咖啡廳 → 灰白 → 草地…… 每次回到灰白時，`bgToggle` 把 `chill_hihi.bgPick` 設成「另一個背景」，下一次按就換它。
- 懸停 BG 按鈕的選單可直接選任一個背景（`SM.tiles[1]`），選了之後再短按會回灰白。
- 兩個背景互換時（選單點選），布簾先放下、換場景、再拉起。
- 存檔：`chill_hihi.bg`（目前顯示：'0' 灰白／'1' 草地／'2' 咖啡廳）、`chill_hihi.bgPick`（下一次短按要開的）。
- 新增第三個背景時，要改 `bgToggle` 的「另一個」算法（目前是 `3 - mode`），改成輪流清單。

## 場景擺放原則
1. **不能和播放器重疊**：播放器、遙控器在畫面中央偏右，場景裡的桌椅、吧台、門等大物件要放在兩側或往後推，不要壓在播放器上。咖啡廳用 `CF.zb`（後牆世界 z，目前 -16；愈負愈遠、房間愈小）控制；原本 -8 時右邊桌椅會壓到播放器。
2. **背景不要過亮**，平台（播放器、狗站的地面）要夠突出。
3. **填滿任何視窗寬度**：側牆／地面依視窗寬度往外延伸（咖啡廳的 `CF.E`），16:9 與 21:9 都要測。
4. 場景用螢幕座標或 `L.hw`、`L.d`、`FLOOR_Y` 定位，視窗改尺寸會自動重新對齊（`bgLayout`／`cfLayout`）。
5. 玩家影子要落在場景地面上（隱形 ShadowMaterial 平面）。
6. 窗簾動畫靠灰牆／灰地板被 discard 來露出場景，場景本身不移動；收完後 `grid`、`catcher`、`floorMesh` 設為不可見。

## 新增步驟
1. 素材放 `models/<名>/src/`，寫 `tools/build_<名>.py` 轉成 json／bin。
2. `src/10-world/` 新增場景檔（參考 `05-cafe.js`：`build`、`layout`、`frame`）。
3. `04-scenery.js`：`bgSet` 補上新 mode 的 build／show／layout；`bgFrame` 補每幀更新；`BG_OK` 與 clamp 上限一併調整。
4. `03-summon-menu.js`：`SM.tiles[1]` 加一格，縮圖 `models/thumbs/<名>.png`（從實際畫面截 112×112）。
5. `python3 tools/build.py`，用 Playwright 測：開／關、各視窗尺寸、播放器不被遮、無 JS 錯誤。測試鉤子：`window.__bg`、`window.__cf`。
