# 如何新增第三隻（以上）的動物

目前有六隻：A（`models/dog.*`）、B 柴犬（`models/dog2.*`，原檔在 `models/dog2/src/`）、C 巴哥（`models/pug.*`，原檔在 `models/pug/src/`，轉檔 `tools/build_pug.py`）、D 吉娃娃（`models/chihuahua.*`，原檔在 `models/chihuahua/src/`，轉檔 `tools/build_chihuahua.py`）、E 哈士奇（`models/husky.*`，原檔在 `models/husky/src/`，轉檔 `tools/build_husky.py`）、F 皮卡丘（`models/pikachu.*` 和 `models/pikachu/`，原檔 `models/pikachu/src/pika.obj`，轉檔 `tools/build_pikachu.py`，見最後一章）。
按狗狗按鈕時依序出現：A → B → C → D → E → F → A → …，每隻各自記住穿的衣服（localStorage `chill_hihi.wear`、`wear2`、`wear3`、`wear4`、`wear5`、`wear6`），
輪到誰存在 `chill_hihi.dogNext`。每隻的參數（`map / sit / lie / perch / bite / ak / fit / brow`）放在 `DV.P[i]`，用 `loadDogV(i,'檔名')` 載入；程式在 `src/14-dog/02-dog2.js`，行為（跑、追 CD、翻肚、吃蘋果）共用 `01-dog.js`。

## 做法（B 是範本）

1. **放原檔**：`models/<名字>/src/` 放 `.dae` 和貼圖。
2. **轉檔**：複製 `tools/build_dog2.py` 成 `tools/build_<名字>.py`，改檔名與 `K`（見下）。它會產生 `models/<名字>.json/.bin` 和貼圖。
3. **載入與切換**：在 `02-dog2.js` 的 `DV.P` 加一筆參數（可從相近的動物複製再改），`DV.v` 補一格 `null`、`DV.WK` 加一個衣服 key，
   檔尾加 `loadDogV(<編號>,'<名字>')`。`dogPick()` 會依 `DV.v.length` 自動輪流。`fit.pos/s` 與 `brow` 是帽子眼鏡位置（巴哥的眼睛比柴犬高，所以 `brow` y 較大）。
4. **重建並檢查**：`python3 tools/build.py`，用本機伺服器開頁面測。

## 快速匯入（同作者、同骨架的 .dae，約 10 分鐘）

B、C、D、E 都是同一位作者的 `xxx_a.dae`：28 根骨頭、名字完全一樣（`skl_root / waist / spin / chest / neck / head / Lear1 / Rear1 / mouth / tail1-3 / Larm / Lleg ...`）、每個頂點只綁一根骨頭、Y 向上臉朝 +Z。遇到這種檔就照下面走，不用重新研究：

1. **先比對再動手（1 分鐘）**：用 Python 解析新 `.dae` 和 `models/pug/src/Pug_a.dae`，印出 (a) 關節名稱與父子結構、(b) `<polylist material=…>` 各材質的三角形數、(c) `library_materials` 的 `name`、(d) 頂點 min/max。關節名單一樣就可以直接沿用 `DV.P[1]` 的數字。
2. **轉檔腳本用 sed 複製**，不要重寫：
   `sed -e 's/pug/<名字>/g; s/Pug_a/<檔名前綴>/g' tools/build_pug.py > tools/build_<名字>.py`
3. **最容易錯的地方：材質編號每隻不一樣！** 巴哥是 `material0=眼 / 1=身 / 2=手`，吉娃娃是 `material0=身 / 1=手 / 2=眼`，哈士奇和巴哥一樣（0=眼 / 1=身 / 2=手，`build_pug.py` 的 sed 複製後不用改材質）。要看 `library_materials` 的 `name`（`xxx_all` / `xxx_hand` / `Dg_eye`），改 `build_*.py` 裡的 `mats = {...}` 和 `order = [...]`（順序固定：身、眼、手）。貼圖尺寸可以幫忙核對：身 256×256、手 64×64、眼 32×32。
4. **`K = 14` 通常不用改**：同作者的模型放大 14 倍後，頭高、身長都接近 A。轉完看一下輸出的頂點範圍（身體 y 最大值約 47～50 就對）。
5. **接線只改 `02-dog2.js` 四個地方**：`DV.v` 補一個 `null`、`DV.P` 補一個 `null`、`DV.WK` 補一個衣服 key、檔尾加 `loadDogV(<編號>,'<名字>')`；再加一筆 `DV.P[<編號>]=Object.assign({},DV.P[1],{ak:…,brow:…,fit:…})`，只覆蓋會不同的三項。`brow` 用「眼睛中心 y +1.1、z −2.5」估（巴哥眼中心 y 39.2 z 30.3 → brow [0,40.3,27.8]；吉娃娃眼中心 y 38.4 z 30.0 → [0,39.5,27.5]；哈士奇眼中心 y 37.9 z 30.8 → [0,39,28.3]）；眼中心從轉出來的 `<名字>.json/.bin` 眼睛網格取平均即可。`dogsNext`、站位、社交行為都是依 `DV.v.length` 自動處理，不用改。
6. **重建**：`python3 tools/build.py`，再 `--check`。
7. **本機驗證（不用真的 YouTube／GPU）**：
   - `npm i three@0.152.2 matter-js@0.20.0` 放在 repo 外的暫存資料夾；`python3 -m http.server` 開 repo。
   - Playwright 用 `executable_path='/usr/bin/google-chrome'`（不必下載瀏覽器），參數 `--use-gl=swiftshader --enable-unsafe-swiftshader --no-sandbox`；用 `page.route` 把 CDN 的 three／matter 換成本機檔案，youtube、fonts 請求直接 abort（會有「YouTube 載入失敗」提示，正常）。
   - `add_init_script("localStorage.setItem('chill_hihi.dogNext','<編號>')")` 讓第一次按鈕就叫出新那隻；等 12 秒載入後 `__dogs.dogToggle()`，再等約 25 秒（swiftshader 很慢，約 2.5 fps）狗才走進畫面。
   - 眼鏡 `fit.glasses` 的 z 要看放大截圖：哈士奇用巴哥的 [0,-1,-1] 時只露出一圈邊（埋進臉裡），改成 z=+1 才完整露出；吉娃娃也有類似備註。
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

## 沒有骨架的模型（皮卡丘，靜態 .obj 依部位拆開）

前五隻都是帶骨架的 `.dae`。皮卡丘只有一個 `.obj`：頭、耳、手、腳、尾巴、身體各自是獨立群組，沒有骨架。做法是替它做一副「假骨架」，讓行為程式（走、坐、翻肚、叼 CD、吃蘋果、頂球）完全不用改：

1. `tools/build_pikachu.py` 讀 `models/pikachu/src/pika.obj`，用 `BONES` 表定義關節（名稱比照狗：`skl_root / waist / chest / neck / head / Lear1 / Rear1 / tail1-3 / Larm1 / Rarm1 / Lleg1 / Rleg1`，每個關節給世界座標 pivot），`classify()` 決定每個群組綁哪一根（權重 1，剛體分件）。輸出 `models/pikachu.json/.bin`，格式同 `dog.json`，另外多一個 `tex`（材質 → 貼圖檔名）和 `alt`（表情貼圖）。
2. 原模型頭和身體之間有縫（頭一轉就露出來），所以腳本另外補一個脖子橢球，權重沿高度在 chest / neck / head 之間平滑混合。
3. 貼圖在 `models/pikachu/*.png`（像素風，載入時用 NearestFilter）。`02-dog2.js` 的 `loadDogV` 看到 `meta.tex` 就依它建材質（沒有就走舊的 `_all/_hand/_eye` 三張）。
4. 沒有眼瞼骨頭和下巴骨頭：眨眼、開心、張嘴、受驚（翻倒時的淚眼）都改成**換臉部貼圖**，邏輯在 `02-dog2.js` 的 `dogFaceFx`，由 `01-dog.js` 的 `dogFrame` 每幀呼叫（`dog.faceFx`，只有帶這個欄位的狗會跑）。表情貼圖：`face`（預設）、`face_wavy`（開心／翻肚）、`face_tongue`（張嘴）、`face_cyan`（翻倒時的藍色淚）、`eyes_closed`（眨眼）、`eyes_big`（追東西）、`eyes_drop`（翻倒）。`face_white` 與橘色配色、寶貝球貼圖放在 `models/pikachu/src/extra/` 備用。
5. 原模型自帶的派對帽拆成衣櫃飾品 `pika_hat`：`python3 tools/build_pikachu_hat.py`（產生 `models/wardrobe/inbox/pika_hat.dae` 和貼圖），再 `python3 tools/build_wardrobe.py`。
6. 接線：`DV.v / DV.P / DV.WK` 各補一格、`DV.P[5]`（`map` 對到上面的關節、`sit / lie / bite / ak / brow / fit`），檔尾 `loadDogV(5,'pikachu')`。另外 `dogLoad` 載入咬點時改成先套 `DV.base.bite` 再套該隻的 `bite`，這樣皮卡丘改了 `stand` 不會影響後面載入的狗。


## 卡通人物（吉伊卡哇／小八貓／烏薩奇）與「TOON」按鈕

`models/chiikawa/src/chiikawa_and_friends.glb`（靜態、無骨架）→ `python3 tools/build_chiikawa.py` → `models/chiikawa|hachiware|usagi.json/.bin` + 共用臉部圖集 `models/chiikawa/face.png`。

- **和皮卡丘不同**：頭、身、手、腳是同一張網格，所以假骨架的權重改成**依頂點位置**計算（頭／脖子／左右手／左右腳／腰／尾巴，交界用 smoothstep 混合；烏薩奇的長耳朵交給 `Lear1/Rear1`）。小八的藍色網格拆成頭上的帽狀頭髮和屁股後的尾巴。
- **材質**寫在 json 的 `mats`（顏色用 sRGB 十六進位；`outline` = 描邊殼只畫背面；`face` = 臉的面片，圖集 + alpha 裁切、不受光）。`loadDogV` 看到 `meta.mats` 走這條路，另支援索引網格（`index/indexCount`）。
- **描邊**：原本的反轉外殼（法線朝內）比身體大 0.85 模型單位，轉檔時沿法線收進 `OUTLINE_IN`，只剩細邊；顏色是原模型的柔和深棕 `#4f2e24`。
- **像人一樣動**（`DV.P[6..8]` 的 `HUMANOID`，`dog.human`）：手腳反向擺動、拿東西時雙手伸向前（跳起搆 CD 時舉高）、在腰部彎腰＋蹲低（不是低頭）、握持點改在胸口骨頭（`biteBone:'Bust'`，叼 CD／吃蘋果／頂球都改用這個點，程式裡原本寫死的 `bones.Head` 已改成 `bones[dog.biteBone]`）、坐姿雙腿向前、被摸時面向鏡頭側躺。
- **按鈕**：遙控器第 6 顆（`TOON`，`src/10-world/02-remote.js`）。第 1 下叫皮卡丘，第 2 下皮卡丘離場、三隻一起進場，第 3 下全部離場（`toonToggle`，`03-dogs.js`）。狗按鈕只管狗（輪替 A–E，`DV.NDOG=5`），兩邊可同時存在，共用同一條地板與碰撞。
- **多隻碰撞**：兩兩比對，距離不足 `rad` 之和（狗 1.3、角色 1.05）時閒著的讓路；站位間距 `dogGap()` 依寬度與畫面自動縮放；電視前間距 `tvGap`；打工櫃檯 3 隻以上不使用。
- 沒做／沒測：眨眼與換表情（臉是分散在圖集多處的小面片，要換需逐片改 UV）、衣櫃飾品在三隻身上的位置（`fit/brow` 是估的）、實機流暢度、三隻同時搶 CD／蘋果／球的手感。

### 補充（第二輪修正）
- **場上有沒有角色**：`dogAnyOn()` 是「任何角色」（球、蘋果、耳機、電視都問它），`dogsOnlyOn()` 才是只算狗（狗按鈕的燈）。之前誤把兩者混在一起，卡通人物就不玩球、不戴耳機。
- **描邊殼要和身體同權重**：殼的每個頂點沿用最近的身體頂點的骨架權重（`build_chiikawa.py`），否則尾巴擺動時殼留在原地變黑影、頭轉動時線條穿出。
- **耳機**：頭兩側的定位點 `HpL/HpR`（`DV.P[*].hpMark`），`hpWear` 優先用它們量頭寬；縮放上限對人形放寬到 32；`fit.hp.pos` 可微調。
- **打工**：櫃檯有 3 個站位（`JOB.spots[3]`），超過 3 隻的在外面玩；人形不像狗站起來，只墊高 `DOG_JOB.humanRise` 讓頭露出櫃檯。
- **長按 TOON 按鈕 3 秒**：依 皮卡丘 → 吉伊卡哇 → 小八 → 烏薩奇 的順序叫出下兩隻（`toonCall2`，順序記在 localStorage `chill_hihi.toonNext`）。短按：沒人→皮卡丘；只有皮卡丘→換成三隻；其他→全部離場。
- **耳機不再自己掉下**：`dogHit(cx,cy,focus)` 預設只判斷「滑鼠有沒有碰到角色」，不再順手換焦點（耳機綁在焦點角色身上，換焦點就會取下）。只有真的把衣物／耳機拖到某隻身上時（`01-wardrobe.js`、`02-pointer-drag.js`）才傳 `true`。
- **懸停召喚選單**（`src/10-world/03-summon-menu.js` ＋ `index.template.html` 的 `#summonMenu` CSS）：滑鼠停在遙控器的狗按鈕或 TOON 按鈕上約 0.25 秒，在按鈕左邊展開縮圖卡片，點哪隻就單獨叫哪隻進來（已經在場的再點一次就離場，外框橘色代表在場）。狗最多同時 2 隻（超過時最早進來的離場）；TOON 選單多一格「三隻一組」。短按、長按照舊。觸控裝置不顯示（用長按）。選單的項目表在 `SM.tiles`；程式入口 `dogSummonOne(v)`（`03-dogs.js`）。
- **縮圖**：`models/thumbs/v0..v8.png`（透明背景 192×192）。新增角色後在 `SM.tiles` 加一格，再執行 `python3 tools/render_thumbs.py <node_modules 路徑>` 重新產生（用頁面裡的測試鉤子 `window.__thumb(v)`）。

## 史迪奇（有骨架的 .dae，頂點各綁一根骨頭，T-pose）→ TOON 按鈕第 6 位（編號 10）

`models/stitch/src/`（`Stitch_rigged.dae` 有骨架版、`Stitch.obj/.mtl` 靜態版沒用、`ST_01~04.png`）→ `python3 tools/build_stitch.py` → `models/stitch.json/.bin`，貼圖直接用 `models/stitch/ST_0x.png`（NearestFilter 像素貼圖，走皮卡丘／奇諾比奧的 `meta.tex` 路徑）。

- **原檔特色**：23 根關節、834 頂點、每個頂點 100% 一根骨頭；Y 向上、臉朝 +Z、T-pose；**沒有法線**（只有位置／UV／頂點色）。轉檔時依三角形自己算法線（相同位置合併，貼圖接縫沒有明暗斷層），頂點色（0.6~1.0 的烘焙明暗）不用。
- **假骨架**（同吉伊卡哇／奇諾比奧，名稱比照狗）：大腿／小腿／腳→`Lleg1/Rleg1`，上臂／前臂／手→`Larm1/Rarm1`，耳朵兩節→`Lear1/Rear1`，頭＋嘴→`head`，屁股後的小尾巴凸起→`tail1`，身體（b_root／b_spine）依高度在 `skl_root → waist → chest` 之間平滑混合（彎腰不會裂開）。手臂頂點繞肩膀轉下 `ARM_DOWN=58°`。`K=4.2`（身高約 52，耳朵橫向 ±37）。
- **材質→貼圖**：`head`＝ST_01（頭＋嘴）、`belly`＝ST_02、`skin`＝ST_03（手、耳朵、腳、頭頂毛，原檔三個材質共用同張圖）、`eyes`＝ST_04。材質名稱別用 `face`：`loadDogV` 的 `castShadow` 規則把 `face`／`eyes` 當成不投影。
- **兩面繪製**：耳朵和頭頂的毛是單片，`stitch.json` 的 `double:['skin','head']`，`loadDogV` 看到 `meta.double` 就把那些材質設成 `DoubleSide`（其他角色沒有這個欄位，不受影響）。
- **動作**：`DV.P[10]`＝`HUMANOID` ＋ 烏薩奇的耳朵對應（`LearA/RearA`，`ak` .5）。短按 TOON 的「三隻一組」**不含**史迪奇（和奇諾比奧一樣），長按 3 秒的順序變成 皮卡丘→吉伊卡哇→小八→烏薩奇→奇諾比奧→史迪奇；懸停 TOON 選單多一格「史迪奇」（縮圖 `models/thumbs/v10.png`，`python3 tools/render_thumbs.py <node_modules> 10` 只重畫這一張）。存檔 key `chill_hihi.wear11`。
- **可再調**（`DV.P[10]`）：`rad`／`hit`（耳朵很寬，碰撞只算身體）、`bite`（CD 握持高度）、`brow`（眼睛中心 y≈41.6、z≈12）、`fit.hat/glasses/hp`、`hpMark`；項圈用預設位置，要調可加 `fit.collar:{pos,s}`。沒做眨眼／換表情（臉是單張貼圖，可仿皮卡丘做 `alt`）。
