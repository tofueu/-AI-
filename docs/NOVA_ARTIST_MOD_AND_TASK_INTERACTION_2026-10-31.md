# NOVA 社群 MOD：畫師交稿、關節與 AI 工作台互動（2026-10-31）

## 最直接的使用方式

1. 在 Windows 工作台啟動 `npm start`，開啟 `http://127.0.0.1:4173`。點 NOVA 的「Q 版」或「成熟版」，再點 **下載 PSD 模板**。
2. 在 Photoshop、Krita（PSD 相容性需自行核對）等編輯器打開模板。畫布是 **640×800**；畫師應在具有 `PART__` 前綴的透明圖層繪製，不要畫在 GUIDE 參考圖層。每個可動部位需獨立，不能把整個人物畫成一張。頭髮、帽子、表情和服裝的變體使用 `VAR__類別__選項__部位` 命名，遵循 PSD 模板內現有命名。
3. 確保 `PART__head` 和 `PART__torso` 至少有非透明內容；真正能夠流暢轉動需要**所有需要顯示的**部位都有對應非透明畫作。手臂分上臂、前臂、手，腿部分大腿、小腿、鞋。髮絲、帽子、外套、斗篷可依模板拆成前後遮擋圖層。
4. 保存為 **非扁平化 PSD**，在 NOVA 按 **上傳 PSD**；程式檢查可用部位、抽出透明 PNG、計算 pivot、寫入骨架 rig.json，將已繪角色與原 PSD 保存在本機 `data/nova-installed-mods/`，並設為當前角色。不要手動把圖傳到 Git，原作者素材不會自動公開上傳。
5. 角色匯入成功後，可在 NOVA 面板切換模板已定義且實際繪製的髮型、帽子、表情、服飾選項。要用 PNG 管線則先執行 `npm run nova:create-character -- chibi .\\MyCharacter`（或 `mature`），生成 `rig.json` 與每部位透明 PNG 填畫，再使用 **匯入 PNG 資料夾**。注意這個 PNG 資料夾途徑目前僅存在瀏覽器記憶體，重新整理後需重新選。
6. 官方模型與社群可繪模板是不同東西。先前四張圖為**整體視覺設計／分鏡參考**，不是程式可以直接拆分綁定的真實 PNG。只有畫師提交正確分層圖並通過實機視覺檢查，才能說人物綁骨完成。

## 程式的關節、動作和即時狀態

- `templates/nova-character-mod/chibi/rig.json` 與 `mature/rig.json`：骨架、可替換部位、動作 clips、服裝變體。
- `public/nova-rig-runtime.js`：父子關節變換、逐骨骼時間補間、220ms 動作切換、按 pivot 繪製透明部位；不是把一張整圖上下抖動。
- `public/nova-official-player.js`：NOVA 每次查詢工作台真實 `/api/tasks`，根據狀態更新文字／官方逐格動畫／社群關節角色動作；不會生成 AI 假回覆。修正歷史錯誤紀錄遮蓋新任務的判定（比較 timestamp）。
- 任務執行中 `running` → 官方 `working`／骨架 `typing`；`error` → error；`done` → done／celebrate；`handoff` 或 `ready_for_approval` → 等待授權／thinking；`queued` → thinking。上層任務表不可用假狀態取代授權驗證。
- `public/nova-rig-import.js`：匯入作者 PNG/rig；`public/nova-psd-parser.js` + `nova-psd-mod.js`：PSD→透明 PNG＋骨架 MOD 並本機保存；`nova.ps1`：Windows WPF 桌面顯示官方逐格角色（與 Web 社群 canvas 管線不同，**目前不能宣稱** Windows WPF 也能原生播放所有 PSD 骨架）。
- 已有模板 clips 名稱：idle、typing、thinking、wave、walk、run、jump、sit、sleep、error、celebrate。其存在不等於圖像已完美配對。

## 測試與驗收：不能跳過

- 回歸程式：`tests/nova-rig-runtime.test.js`、`tests/nova-rig-scaffold.test.js`、`tests/nova-psd.test.js`、`tests/nova-official-mod.test.js`。
- 本次新增狀態測試：舊 error / 新 running 必須顯示 working；新 done 要更新 done；handoff 不可裝作已授權。
- 核心仍欠：**把四張官方設定／分鏡真正切分成逐部位可編輯透明 PNG、建立兩種官方 rig 模型、全動作實機驗收、Q/成熟版動作和美術一致性、Windows 端 PSD 關節可視播放**。不能把上述待辦寫成完成。
- 驗證 `npm test` 和 `npm run check`，Windows 實機至少逐一試 idle/typing/walk/run/jump/sit/sleep/error/celebrate，核對頭髮遮擋、衣服不截斷、左右手腳、旋轉中心、圖層完整度、切換自然度；CI 與實機記錄需附 commit/run URL。

本文件是使用指南與現況區分；不代表後續視覺驗收已通過。
