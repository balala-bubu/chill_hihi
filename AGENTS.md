# chill_hihi 開發規則

**程式碼在 `src/`，`index.html` 是 build 產物，不要直接改它。**

1. 改 `src/<編號-功能>/*.js`（或 `src/index.template.html`）。
2. 執行 `python3 tools/build.py` 產生 `index.html`，兩邊一起 commit。
3. `python3 tools/build.py --check` 可檢查兩者是否一致。
4. push 前先 `git fetch`，確認沒有別人剛推的 commit；若有人直接改了 `index.html`，把改動搬進對應的 `src/` 檔案再重建，不要強制覆蓋。

資料夾結構、檔案編號（＝執行順序，所有檔案共用同一個作用域）見 README「專案結構」。
新增狗狗衣櫃飾品見 `.claude/skills/wardrobe-accessory-import/SKILL.md`（只動 `models/wardrobe/` 的話不用重建 `index.html`）。
