# 如何做（或改）背景場景

遙控器的 **BG** 按鈕：灰點牆＋灰地板像窗簾一樣往上收走，露出一個 3D 場景（目前是「陽光草地」）。
程式全在 `src/10-world/04-scenery.js`（一個檔案、一個群組 `BG.g`，離動作區很遠，不碰物理世界）；素材在 `models/scenery/`，轉檔 `tools/build_scenery.py`。

## 先搞懂畫面（最重要，不然山和天空會全部放錯）

- 相機在 (0, 2.4, 18.3)，只往下俯 12°（`rot.x ≈ -0.207`），視角 32°。所以**畫面 90% 是地面**，地平線被擠到畫面最上緣；單純放一片平地加一座山，山會全部躲到畫面外或被草地蓋住。
- 解法：**不要用世界座標思考，用螢幕高度（NDC：0＝畫面中線，1＝上緣，-1＝下緣）**。`bgY(z, ndc)` 會算出「在深度 z 的平面上，看起來落在螢幕高度 ndc 的世界 y」。山、天空、太陽、雲全部用它定位（`bgLayout`），所以視窗大小改了會自動重排。
- 草地只鋪到 z = -26（約螢幕高度 0.13），之後靠「一條矮丘」接山。想要更多天空，就把山的 `pk`（山頂的螢幕高度）調低；想要山更高，調高。
- 參考數字（1280×720）：草地盡頭 ≈ 0.13、矮丘 0.21、近山頂 0.44、中山 0.58、遠山 0.74、太陽 0.84。

## 一、放素材、轉檔

支援兩種原檔：Collada `.dae`（單一網格＋貼圖＋頂點色，例如大樹）和 `.obj`（＋`.mtl`，例如告示板、帳篷、鳥）。

1. 原檔放 `models/scenery/src/`，**用到的那張貼圖**放 `models/scenery/<名字>.png`（`src/` 放不用的備份，例如灰階版）。
2. 在 `tools/build_scenery.py` 最下面加一行：
   `finish('<名字>', *obj(os.path.join(D,'src','<名字>.obj')))`（`.dae` 用 `dae(...)`）。
3. 執行 `python3 tools/build_scenery.py`，會印出頂點數、高 `h`、寬 `w`，並產生 `models/scenery/<名字>.json`。轉檔時會自動：三角化、去重、**xz 置中、y 最低點 = 0**（所以模型「腳」踩在原點，放到地面只要設 y = `FLOOR_Y`）。
4. 單位每個模型都不同（樹高 220、告示板 48、帳篷 6.6、鳥 0.11），**一定要看輸出的 `h` 再決定縮放**：目標高度 ÷ `h` = scale。

> 貼圖有兩張的時候（彩色＋灰階），灰階通常是 AO／備用，用彩色的那張。看不出來就先把兩張放大並排看一眼。

## 二、在場景裡放東西（`bgBuild`）

- 載入：`bgBuild` 開頭的 `Promise.all([load('tree'),…])` 加上你的 json；貼圖用 `tx('<名字>')`（已設 sRGB、鏡像重複、各向異性）。
- 建網格：`bgMesh(json, null, material)`，包進 `T.Group` 再設位置／縮放（縮放設在群組上）。
- 材質用 `mk(texture, haze)`：`MeshBasicMaterial`（不吃光，顏色穩定）＋ `alphaTest .45`＋雙面。`haze` 0~1 是往暖色霧靠的程度，越遠的東西越高。
  - **`.dae` 有頂點色**（樹）：`material.vertexColors = true`。`.obj` 沒有。
  - **像素貼圖（16×16 的鳥）**：`tex.magFilter = tex.minFilter = T.NearestFilter; tex.generateMipmaps = false`（用 `pix()`），不然會糊成一團。
- 擺位置：在 `bgLayout` 設 `position.y = FLOOR_Y`（落地）；左右位置用 `clamp(L.hw*.74, 8, 24)` 這種「跟視窗寬度走」的寫法，不要寫死 x。
- 在 `bgFrame` 做動畫（樹的搖擺、鳥繞圈、貓頭鷹轉頭都在那裡）。
- 柔影：`blobTex` 的平面貼在腳下（見告示板／帳篷）。

## 三、山、天空、太陽

- 山：`bgRidge(seed, 山頂色, 山腳色, lo, hi, 頻率陣列, jag)` 畫一條山脊輪廓；`lo~hi` 是山脊佔畫布高度的範圍，`jag=1` 用 |sin| 做尖峰（遠山用），`0` 是圓潤的丘。
  在 `bgBuild` 的山陣列加一筆 `[z, 頂色, 腳色, lo, hi, 頻率, seed, pk, jag]`，`pk` 是山頂的螢幕高度。**顏色越遠越淡、越偏暖粉紫**（空氣透視），這是「舒服」的關鍵。
- 天空：`sky` 平面的漸層（地平線暖奶油 → 上方清藍）；太陽是兩個加法混色 Sprite＋幾條 `BG.rays` 光束；雲是 `bgCloudTex` 畫的柔邊團。
- 一個群組裡的層次用 z 排序：遠 -96（天空）、-90（太陽）、-74／-60／-46 山、-32 矮丘、-26 以內才是草地與你擺的東西。透明物件由遠到近自動排序，不要開 `depthWrite`。

## 四、草地（最花時間的地方）

- 地面是**一張大畫布貼圖**（`bgGroundTex`，2560×1080，貼在 96×39 的平面上，從 z = 12.4 一路到 -26.6），並且蓋過原本灰地板的上表面（草地放在地板上表面下 0.02，窗簾收走後才露出）。貼圖由下往上依序畫：底色漸層（遠處更淡）→ 刈草條紋 → 大色斑 → 2.6 萬根草葉 → 花叢 → 加法混色的斑駁陽光。要換草色、花量、密度，改這個函式的色盤與迴圈次數。
- 立體草叢：`bgTufts`，`InstancedMesh`＋兩片交叉面片＋風搖 shader（改 `onBeforeCompile` 加 `uTime`）。`NT` 是數量（手機若吃力先降這個）、`s=` 那行是大小。
- 地面用 `MeshLambertMaterial` 才會接收播放器的影子；**不要改成 Basic**。

## 五、窗簾（開／關動畫）

不要移動 3D 物件。灰牆、牆影子接收面、灰地板三個材質掛了同一段 fragment 程式（`bgPatchCurtain`）：螢幕座標低於「波浪邊線」的像素 `discard`，邊線由 `uK`（0＝下緣、1＝上緣）驅動，動畫就是 `bgCurtain(p)` 從 0 補間到 1。
新增的背景如果是「在牆後面」就自動受惠；如果你想讓**別的灰色東西**也一起被收走，對它的材質呼叫 `hook(mat, true)`（見 `bgPatchCurtain`）。

## 六、新增「第二個背景」（夜晚、海邊…）要改什麼

目前只有一個場景，`bgBuild` 直接把它全建完。要做第二個：

1. 把場景建構拆成函式（例如 `bgBuildMeadow` / `bgBuildNight`），各自回傳一個 `T.Group`，以及自己的 `litSun` 色（燈光色調）。
2. 按 BG 的行為改成：沒開 → 開第 1 個；已開再短按 → 換下一個（可以用同一條窗簾「放下再拉起」換場景）；長按 → 關掉。主要改 `bgSet`／`bgToggle`，`localStorage` 的 `chill_hihi.bg` 改存編號。
3. `bgLayout`／`bgFrame` 要依目前場景分支，或讓每個場景帶自己的 `layout(dt)`／`frame(dt)`。
4. 夜晚版建議：`BG.litSun` 改冷藍、`sun.intensity` 降低；天空漸層換深藍＋星點（Points）；太陽換月亮（同一組 Sprite 換顏色）；草地貼圖用同一張乘上深藍色即可（`material.color`）。

## 七、驗證流程（沒有 GPU 也能看畫面）

跟 `docs/add-animal.md` 的本機驗證一樣：`npm i three@0.152.2 matter-js` 放在 repo 外，`http.server` 開 repo，Playwright 用 `/usr/bin/google-chrome`＋`--use-gl=swiftshader --enable-unsafe-swiftshader --no-sandbox`，用 `page.route` 把 CDN 的 three／matter 換本機檔案。

- 等 4 秒載入後，`await __bg.bgSet(true, true)` 直接跳到「已開」；`__bg.bgShowFloor(); __bg.bgCurtain(0.5)` 可以凍結在窗簾 50% 看畫面（swiftshader 只有約 2.5 fps，不要靠動畫截圖）。
- 同時測兩種比例（例如 1280×720 和 800×900），因為左右位置與太陽 x 都跟視窗寬度走。
- 看 console：載入失敗會印 `background failed to load …`（缺檔、json 欄位錯、shader 編譯錯都在這裡）。
- 重建：改 `src/` 後 `python3 tools/build.py`，再 `--check`；只改 `models/scenery/` 的素材不用重建 `index.html`。

## 常見坑

- **山完全看不到**：多半是 `pk` 設得比草地盡頭（≈0.13）還低，被矮丘或草地蓋住；或忘了用 `bgY`、直接寫世界座標。
- **草地接縫／影子怪怪的**：確認草地平面在 `FLOOR_Y - .02`、地板上表面在 `FLOOR_Y`；地面材質是 Lambert 且 `receiveShadow = true`。
- **鳥／像素貼圖糊掉**：忘了 `NearestFilter`。
- **樹的黑邊／顏色怪**：`.dae` 的樹忘了 `vertexColors = true`，或 `alphaTest` 太低出現白邊。
- **改了窗簾不生效**：`onBeforeCompile` 要在第一次繪製前設定，之後改 shader 字串要同時改 `customProgramCacheKey`，不然 three 會重用舊程式。
- 不要把大圖（>4096）塞進畫布貼圖；手機記憶體會爆。
