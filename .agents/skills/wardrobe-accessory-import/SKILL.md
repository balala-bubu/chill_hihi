---
name: wardrobe-accessory-import
description: 快速匯入 chill_hihi 狗狗衣櫃 3D 飾品（帽子、眼鏡、項圈）。
---

# 新增飾品

1. `mkdir -p models/wardrobe/inbox`（倉庫裡沒有這個資料夾），把 `.dae` 和它使用的**所有**貼圖（檔名必須和 `.dae` 裡引用的一致）一起放進去。一個 `.dae` 可以有多個材質、多張貼圖（例如 `head_l`：`Head_l.png` 加 `s_Head_l.png`）：`id` 取自三角形最多的主貼圖，轉檔後主貼圖是 `items/<id>.png`，其餘是 `items/<id>.1.png`…，網格的 `groups` 記錄哪些三角形用哪張貼圖。
2. 執行 `python3 tools/build_wardrobe.py`：自動搬到 `src/<id>/`（`id` 取自貼圖檔名小寫）、轉成 `items/<id>.json`＋`.png`、建立 `src/<id>/item.json`、更新 `manifest.json`。部位依 id 猜（含 `glass`→眼鏡、`coller`/`collar`→項圈、`head`/`hat`/`cap`→帽子），猜不到會留空，要手動填。
3. 修改 `models/wardrobe/src/<id>/item.json`：`slot`（hat / glasses / collar）、`name`、`fit`（scale / pos / rot），**再執行一次**步驟 2 讓 `manifest.json` 更新。
4. 執行 `python3 tools/validate_wardrobe.py`，要看到 `Wardrobe OK`。
5. 開頁面（用本機伺服器，不要直接雙擊）叫出狗，穿上去從正面和側面檢查大小與穿模。

## 座標（調 fit 前先看）

飾品掛在狗的骨頭上，骨頭自己的座標是 **+X 左右、+Y 向上、+Z 朝嘴巴**（已實測）。`fit` 的 pos/scale 是在「槽位縮放後」的空間裡，`slots.json` 裡各部位的 `worn.scale`（帽子 9、眼鏡 10、項圈 17.5）會再乘上去。

- **眼鏡**：模型的鏡片面在 +X、鏡腳往 -X、鏡片寬在 Z，槽位旋轉 `[0,-1.5708,0]` 會把它轉成朝向嘴巴。槽位預設位置會讓鏡片浮在臉前，所以新眼鏡一定要設 `fit`；尺寸和 `glass_c` 差不多的話，從 `glass_c` 的 `fit` 開始微調：`scale [0.95,1.9,1.6]`、`pos [-0.589,-0.06,0]`、`rot [0,0,0]`（鏡片面落在眼前約 z=2.5，寬約 ±8，鏡腳長到耳根 z=-8.5；眼睛在 x=±4、y=-1.1，頭寬約 ±7）。
- **帽子、項圈**：先用預設，再微調 `fit`。

## 注意

- 單件飾品優先調 `item.json.fit`，不要隨意改 `slots.json` 影響其他物品；目前項圈位置已調好，修眼鏡不要動項圈。
- **帽子和耳機一次只能戴一個**（戴耳機時帽子會自動收回衣櫃，反之亦然）；眼鏡和項圈可以和耳機一起戴。新增帽子不需要另外處理這件事。
- 程式碼在 `src/`，不是直接改 `index.html`；改了程式要執行 `python3 tools/build.py` 再一起 commit。純新增飾品（只動 `models/wardrobe/`）不需要重建 `index.html`。
- Push 前先 `git fetch`，檢查與最新 `main` 的差異，不強制覆蓋其他內容。
