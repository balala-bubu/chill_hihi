---
name: wardrobe-accessory-import
description: 快速匯入 chill_hihi 狗狗衣櫃 3D 飾品。
---

# 新增飾品（四步驟）

1. 將 `.dae` 和它使用的貼圖一起放入 `models/wardrobe/inbox/`。
2. 執行 `python3 tools/build_wardrobe.py`，會自動轉換模型、建立 `src/<id>/item.json` 並更新 `manifest.json`。
3. 必要時修改 `models/wardrobe/src/<id>/item.json`：`slot`（hat / glasses / collar）、`name`、`fit`（scale / pos / rot），然後**再執行一次**建置腳本。
4. 確認 `manifest.json` 已更新；進入遊戲穿戴、看正面與側面，檢查大小和穿模。

**注意：** 單件飾品優先調 `item.json.fit`，不要隨意改 `slots.json` 影響其他物品；目前項圈位置已調好，修眼鏡不要動項圈。Push 前檢查與最新 `main` 的差異，不強制覆蓋其他內容。
