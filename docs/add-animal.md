# 如何新增第三隻（以上）的動物

目前有四隻：A（`models/dog.*`）、B 柴犬（`models/dog2.*`，原檔在 `models/dog2/src/`）、C 巴哥（`models/pug.*`，原檔在 `models/pug/src/`，轉檔 `tools/build_pug.py`）、D 吉娃娃（`models/chihuahua.*`，原檔在 `models/chihuahua/src/`，轉檔 `tools/build_chihuahua.py`）。
按狗狗按鈕時依序出現：A → B → C → D → A → …，每隻各自記住穿的衣服（localStorage `chill_hihi.wear`、`wear2`、`wear3`、`wear4`），
輪到誰存在 `chill_hihi.dogNext`。每隻的參數（`map / sit / lie / perch / bite / ak / fit / brow`）放在 `DV.P[i]`，用 `loadDogV(i,'檔名')` 載入；程式在 `src/14-dog/02-dog2.js`，行為（跑、追 CD、翻肚、吃蘋果）共用 `01-dog.js`。

## 做法（B 是範本）

1. **放原檔**：`models/<名字>/src/` 放 `.dae` 和貼圖。
2. **轉檔**：複製 `tools/build_dog2.py` 成 `tools/build_<名字>.py`，改檔名與 `K`（見下）。它會產生 `models/<名字>.json/.bin` 和貼圖。
3. **載入與切換**：在 `02-dog2.js` 的 `DV.P` 加一筆參數（可從相近的動物複製再改），`DV.v` 補一格 `null`、`DV.WK` 加一個衣服 key，
   檔尾加 `loadDogV(<編號>,'<名字>')`。`dogPick()` 會依 `DV.v.length` 自動輪流。`fit.pos/s` 與 `brow` 是帽子眼鏡位置（巴哥的眼睛比柴犬高，所以 `brow` y 較大）。
4. **重建並檢查**：`python3 tools/build.py`，用本機伺服器開頁面測。

## 快速匯入（同作者、同骨架的 .dae，約 10 分鐘）

B、C、D 都是同一位作者的 `xxx_a.dae`：28 根骨頭、名字完全一樣（`skl_root / waist / spin / chest / neck / head / Lear1 / Rear1 / mouth / tail1-3 / Larm / Lleg ...`）、每個頂點只綁一根骨頭、Y 向上臉朝 +Z。遇到這種檔就照下面走，不用重新研究：

1. **先比對再動手（1 分鐘）**：用 Python 解析新 `.dae` 和 `models/pug/src/Pug_a.dae`，印出 (a) 關節名稱與父子結構、(b) `<polylist material=…>` 各材質的三角形數、(c) `library_materials` 的 `name`、(d) 頂點 min/max。關節名單一樣就可以直接沿用 `DV.P[1]` 的數字。
2. **轉檔腳本用 sed 複製**，不要重寫：
   `sed -e 's/pug/<名字>/g; s/Pug_a/<檔名前綴>/g' tools/build_pug.py > tools/build_<名字>.py`
3. **最容易錯的地方：材質編號每隻不一樣！** 巴哥是 `material0=眼 / 1=身 / 2=手`，吉娃娃是 `material0=身 / 1=手 / 2=眼`。要看 `library_materials` 的 `name`（`xxx_all` / `xxx_hand` / `Dg_eye`），改 `build_*.py` 裡的 `mats = {...}` 和 `order = [...]`（順序固定：身、眼、手）。貼圖尺寸可以幫忙核對：身 256×256、手 64×64、眼 32×32。
4. **`K = 14` 通常不用改**：同作者的模型放大 14 倍後，頭高、身長都接近 A。轉完看一下輸出的頂點範圍（身體 y 最大值約 47～50 就對）。
5. **接線只改 `02-dog2.js` 四個地方**：`DV.v` 補一個 `null`、`DV.P` 補一個 `null`、`DV.WK` 補一個衣服 key、檔尾加 `loadDogV(<編號>,'<名字>')`；再加一筆 `DV.P[<編號>]=Object.assign({},DV.P[1],{ak:…,brow:…,fit:…})`，只覆蓋會不同的三項。`brow` 用「眼睛中心 y +1.1、z −2.5」估（巴哥眼中心 y 39.2 z 30.3 → brow [0,40.3,27.8]；吉娃娃眼中心 y 38.4 z 30.0 → [0,39.5,27.5]）；眼中心從轉出來的 `<名字>.json/.bin` 眼睛網格取平均即可。`dogsNext`、站位、社交行為都是依 `DV.v.length` 自動處理，不用改。
6. **重建**：`python3 tools/build.py`，再 `--check`。
7. **本機驗證（不用真的 YouTube／GPU）**：
   - `npm i three@0.152.2 matter-js@0.20.0` 放在 repo 外的暫存資料夾；`python3 -m http.server` 開 repo。
   - Playwright 用 `executable_path='/usr/bin/google-chrome'`（不必下載瀏覽器），參數 `--use-gl=swiftshader --enable-unsafe-swiftshader --no-sandbox`；用 `page.route` 把 CDN 的 three／matter 換成本機檔案，youtube、fonts 請求直接 abort（會有「YouTube 載入失敗」提示，正常）。
   - `add_init_script("localStorage.setItem('chill_hihi.dogNext','<編號>')")` 讓第一次按鈕就叫出新那隻；等 12 秒載入後 `__dogs.dogToggle()`，再等約 25 秒（swiftshader 很慢，約 2.5 fps）狗才走進畫面。
   - 穿搭：`__mt.wardEquip('head_t')`（帽子）、`'glass_c'`（眼鏡）、`'coller_d'`（項圈），回傳 undefined 是正常的；翻肚：`__mt.dogPet()`，等約 14 秒。截圖看帽子位置、眼鏡有沒有埋進頭裡、翻肚時有沒有穿模。
8. 提交：`models/<名字>/src/`（原檔）、`models/<名字>.json/.bin/_all/_hand/_eye.png`、`tools/build_<名字>.py`、`src/14-dog/02-dog2.js`、`index.html`、這份文件，一起一個 commit。

## 要注意的點

- **大小 `K`**：把新動物放大到和 A 差不多（A：頭高約 39、身長約 85 模型單位）。K 烘進頂點和骨頭位移，這樣帽子、眼鏡、耳機的數字可以共用。
- **座標方向**：轉檔假設模型是 Y 向上、臉朝 +Z（B 就是）。若是 Z 向上，把轉檔裡根節點的 -90° X 旋轉拿掉。
- **骨頭對應 `map`**：動畫用第一隻的骨頭名（Hip、Neck、Head、LearA、tailA、ShoulderL、LegL…），
  新動物要把這些名字對到自己的關節；沒有的就不寫（不會動，不會壞）。例如沒有耳朵骨就不寫 `LearA/RearA`。
  動作是繞世界軸轉，所以新動物靜止時必須同樣朝 +Z、頭朝上。
- **力度 `ak`**：B 的耳朵、下巴比 A 小，用 `ak` 縮小動作。擺動太誇張就降，不夠就升。
- **嘴巴 `bite`**：叼 CD 和吃蘋果的位置（模型空間）。看狗叼著 CD 的樣子微調 `mx/my/mz`。
- **帽子眼鏡 `fit`**：程式會建一個 `Brow_group` 錨點（+X 左右、+Y 上、+Z 朝嘴），位置放在「兩眼之間」。
  穿上後從側面看，用 `pos`（位移）與 `s`（縮放）調；耳機會依兩耳距離自動縮放，所以耳骨要有。
- **坐 / 翻肚 / 趴窗 `sit / lie / perch`**：沒有的骨頭姿勢要自己試。用 `__mt.dogPet()` 看翻肚，
  先用 B 的數字，再微調角度。四隻腳的動物建議保持 `front:0`。
- **不是狗的動物**（貓、兔、鳥）：行為程式（走路、叼 CD）都假設四足動物。兔、貓只要骨架類似就能沿用；
  鳥、魚要另外設計動作，不建議硬塞進同一個 `dog`。
- 材質若有透明或毛片（像 A 的 fur），需要仿照 `loadDog()` 增加材質；B 只用單張貼圖所以簡單。

## 測試

本機：`python3 -m http.server`，開 `index.html`。console 可用 `__mt.dogToggle()`、`__mt.dogPet()`、`__mt.wardEquip('<id>')`；
`localStorage.setItem('chill_hihi.dogNext','1')` 後重新整理可直接叫出第二隻。
