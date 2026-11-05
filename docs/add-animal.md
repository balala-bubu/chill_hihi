# 如何新增第三隻（以上）的動物

目前有兩隻：A（`models/dog.*`）與 B 柴犬（`models/dog2.*`，原檔在 `models/dog2/src/`）。
按狗狗按鈕時依序出現：A → B → A → …，每隻各自記住穿的衣服（localStorage `chill_hihi.wear`、`chill_hihi.wear2`），
輪到誰存在 `chill_hihi.dogNext`。程式在 `src/14-dog/02-dog2.js`，行為（跑、追 CD、翻肚、吃蘋果）共用 `01-dog.js`。

## 做法（B 是範本）

1. **放原檔**：`models/<名字>/src/` 放 `.dae` 和貼圖。
2. **轉檔**：複製 `tools/build_dog2.py` 成 `tools/build_<名字>.py`，改檔名與 `K`（見下）。它會產生 `models/<名字>.json/.bin` 和貼圖。
3. **載入與切換**：在 `02-dog2.js` 仿照 `loadDog2()` 寫 `loadXxx()`，登記到 `DV.v[2]`；`DV.WK` 加一個衣服 key；
   `dogPick()` 改成輪 `% 3`（存的數字也改）；`dogSetVariant` 的 `P=i===1?DV:DV.base` 改成依 i 取各自的參數表。
   多隻之後建議把 B 的參數（`map / sit / lie / perch / bite / ak / fit`）整理成每隻一個物件，放進陣列。
4. **重建並檢查**：`python3 tools/build.py`，用本機伺服器開頁面測。

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
