# 新增背景的原則

目前有五個背景：`BG.mode` 1 = 草地（`src/10-world/04-scenery.js`）、2 = 咖啡廳（`05-cafe.js`）、3 = 博物館（`06-museum.js`）、4 = 月亮（`06-moon.js`）、5 = 劇場（`06-bti-theater.js`）。

## 切換規則（BG 按鈕）
- **預設是灰白**（灰點牆＋灰地板，`BG.mode` 0）。
- 短按 BG 按鈕：灰白 → 草地 → 灰白 → 咖啡廳 → 灰白 → 博物館 → 灰白 → 月亮 → 灰白 → 劇場 → 灰白 → 草地…… 每次回到灰白時，`bgToggle` 把 `chill_hihi.bgPick` 設成「另一個背景」，下一次按就換它。
- 懸停 BG 按鈕的選單可直接選任一個背景（`SM.tiles[1]`），選了之後再短按會回灰白。
- 兩個背景互換時（選單點選），布簾先放下、換場景、再拉起。
- 存檔：`chill_hihi.bg`（目前顯示：'0' 灰白／'1' 草地／'2' 咖啡廳）、`chill_hihi.bgPick`（下一次短按要開的）。
- 新增第三個背景時，要改 `bgToggle` 的輪流算法（目前是 `mode%5+1`，新增就改成 `%N+1`）。

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

## 博物館（mode 3）的做法
- `tools/build_museum.py`：`models/museum/src/dinos2.obj/.mtl` → `models/museum.json`（同貼圖合併成一個 mesh），貼圖在 `models/museum/*.png`。上傳的貼圖沒有檔名，是依內容與 UV 對應猜的（骨架 apt/mam/pte/saber 的 a/b 可能互換，看起來不對就在該資料夾換檔名）。
- 房間整個縮放成「視窗寬度 × `MU.fit`」，`muLayout` 自動算深度，讓大廳前緣在播放器後方；`MU.pitch` 把房間以播放器腳下那點為軸心往後仰一點，地板才會接上播放器的地板平面。
- 後牆往左右／上方延伸、地板往下方／前方延伸，任何視窗形狀都填滿。大型骨架在播放器後方，不壓在播放器前。

## 月亮（mode 4）的做法（新增背景的最短流程範例）
- 素材：`tools/build_moon.py`：`models/moon/src/moo_04.dae`（17 個面片）→ `models/moon.json`（節點變換烘進頂點，帶頂點色）。貼圖 `models/moon/{sky,stars,nebula,ground}.png`（上傳的貼圖沒檔名，依內容猜：深藍＝moo_moon_01、白星＝hosi_02、白色星雲＝hosi_04、碎石條＝地面）。`*_bake*.dae` 是把頂點色烘成貼圖的版本，沒用。
- `06-moon.js`：夜空底圖、三層星星（UV 飄移＋閃爍）、五團星雲（貼圖×頂點色，加法混合）、原檔小色塊改成閃爍光點、月面地板（碎石＋畫上去的隕石坑）、地平線山脊、貼圖包成圓的大月亮＋光暈、偶爾流星。全部在播放器後方，窗簾直接露出，不需自訂 shader。
- 光線在 `bgApply` 依 `BG.mode===4` 轉成冷色月光。測試鉤子 `window.__mn`。
- 沒測：實機流暢度（星星 3 層全螢幕疊加）、咖啡廳／博物館切到月亮的布簾轉場（程式與其他背景同一路徑）。
- 可調：`06-moon.js` 的星星層 `[opacity,rows,...]`、`mnGroundCanvas`（坑數量／明暗）、`mnRidgeCanvas`（山脊）、月亮位置大小（`mnLayout` 的 `-.5*L.hw*k`、`.6`、`.23`）。

## 劇場（mode 5）的做法
- 素材：`models/bti/src/bti_04.dae`（Paper Mario 風格的劇院舞台，233 個節點）→ `tools/build_bti.py`（用 `tools/dae_parse.py` 讀 dae、烘節點變換）→ `models/bti.json`。**這次的 dae 內附貼圖檔名**（`<library_images>`），貼圖對應不用猜，只有「上傳的 png 是哪一張」要靠尺寸＋用途對：`models/bti/{katen 紅布幕, kin 金色花邊, panel 星星牆板, kabe 壁紙, ue 金屬條, door/door2, floor(butaiue) 舞台地板牆天花, denki 腳燈, isu 座椅, kyatatu 小桌, light 燈光暈}.png`。`*_bake*.dae` 是頂點色烘進貼圖的版本，沒用。
- 略過的機關／多餘物件：`spotlight`、`nozzle_*`、`iron_frame`、`escape_wall`、`A_bti_*`（影子面）、`bti_kyaku_*`（觀眾席牆地，程式自己畫）、`pCube2`、`bti_mizu`。其餘依（貼圖、是否半透明）合併成十幾個 mesh，座椅每排一個、腳燈 `denki` 單獨一個。
- `06-bti-theater.js`：做法同博物館——整間房縮放（框寬＝視窗寬×`BT.fit`，同時舞台高度限制在視窗內，`BT.hfit`）、以玩家腳下為軸心往後仰 `BT.pitch`，舞台前緣放在世界 z = `BT.front`（玩家後方）。玩家和狗站在「觀眾席」（程式畫的暗紅地毯＋`BT.keep` 排座椅），舞台在後面墊高。框外全黑（原檔的 MASUKU），任何視窗形狀都填滿。材質掛了和博物館一樣的布簾 discard，舞台前面的部分不會穿出灰牆。
- 動態：腳燈三步跑馬燈（改 uv 的 v）、燈光暈緩慢呼吸。測試鉤子 `window.__bt`。
- 可調：`BT.fit`／`BT.hfit`（舞台大小；hfit 愈小舞台愈大、上緣被切愈多）、`BT.front`、`BT.keep`（座椅排數）、`BT.tint`（整體明暗，要比播放器暗才突出）、地毯色 `mb(tx('katen'),{color:0x5a5a5a})`。

### 劇場的影片螢幕與光影（後續加的）
- **影片螢幕**：有 YouTube 專輯在播、而且電視沒有在顯示影片時，舞台後牆（`BT.scr`，16:9）會變成影片螢幕。影片的 DOM 方塊放在 **canvas 後面**（`ytBehind`，`04-homography.js`；`#ytbox.bt` z-index:-1、`html.btv body` 背景透明），`BT.screen` 是一片「穿孔材質」（不混合、alpha 0），在 canvas 上挖一個有深度測試的洞，所以布幕、門框、座椅、播放器、狗都在影片前面。電視的影片仍是疊在 canvas 上面，兩者互不影響；電視優先（`01-sync.js` 的 `tvShow`）。
- 洞的前面還有：暗邊（`BT.back`）、暈影（`BT.shade`）、開機淡入的黑膜（`BT.fade`）、投在舞台地板的冷光（`BT.spill`）。
- **鏡頭**：固定置中，不會自己放大或位移（曾做過播放時放大左移的「影片視角」，使用者覺得背景自己動不合理，已移除）。為了讓上方不擋畫面，整個房間上半部（門框拱、布幔、牆頂、天花、燈）用 `BT.lift`（9）往上抬，從 y 9 平滑過渡到 y 15（`btBuild` 的 `lf`）；螢幕中心也上移到 y 15.4。
- **光影**：所有舞台材質走 `btGrade`（依位置調色：舞台中央暖色主光、邊緣偏冷偏暗、觀眾席隨距離變暗、前排有暖光溢出）；六盞舞台燈各有一束會慢慢擺動的光錐＋地板光斑、漂浮的灰塵、整體輕微閃爍；`bgApply` 對 mode 5 用偏暖的主光。
- **踩過的坑**：GLSL 的 `smoothstep(e0,e1,x)` 必須 e0<e1（反過來是未定義行為，會出雜訊）；`step()` 不要用在剛好落在邊界的面上（z=10 的門框前緣會一閃一閃）。
- 測試：`window.__bt.BT.force=true` 可在沒有網路時強制顯示影片螢幕；再把 `#ytp` 塗個漸層就能看位置與遮擋。沒測：真正的 YouTube 播放、實機流暢度（多了 6 個光錐＋70 顆灰塵）、直式視窗（螢幕在左側布幕後面，幾乎看不到）。
- **地板高度（後續修正）**：劇場原本整間房（含地毯、座椅）一起往後仰 `BT.pitch`，地毯只有在玩家腳下那一點和 `FLOOR_Y` 一樣高，往後（z<2.2，TV、球、蘋果、椅子的物理平面在 z≈0）會高出約 0.2，物件就陷進地毯。現在地毯和座椅放進不傾斜的 `BT.flat` 群組，貼在 `FLOOR_Y`（-0.02）；舞台那間房改以「舞台前緣在地板高度」那點為軸心後仰（`btLayout`）。副作用：整座舞台比之前低約 0.5。
- **影片播放時**：光錐和灰塵整個關掉（只留地板光斑，變淡），暈影也調淡，避免影片像蓋了一層灰霧。
