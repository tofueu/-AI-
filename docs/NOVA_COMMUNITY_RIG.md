# NOVA 官方動畫與社群關節 MOD 使用說明（2026-10-30）

## 先看目前完成度
已上傳：兩張官方原始圖（Git source 分段 28 個）、Q/成熟版各 12 幀打字與其他動作（runtime 分段 16 個）、Web 與 Windows WPF 逐格播放程式。新版加上**通用骨架 runtime、分層 PNG 匯入、動作補間、220ms 狀態切換、兩種比例的畫師樣板**。
**未完成**：原本的官方扁平角色圖真正 PSD 分層綁關節/網格權重；社群 ZIP 一鍵安裝與跨重啟持久保存；Windows 真機動作視覺驗收。12 張不同 PNG 不是完整的骨架動畫。

## 取得 Git 備份並執行工作台
此版本位於 PR #22 的分支，並非 main。

```powershell
git clone --branch feature/nova-official-mod-runtime-20261030 https://github.com/tofueu/-AI-.git
cd -AI-
npm start
```
開啟 http://127.0.0.1:4173 ，首啟動會自動把 Git runtime 分段驗證 SHA256、解壓至 public/assets/nova-official/。
Windows 原生透明寵物另於 PowerShell 5.1 執行 `powershell.exe -NoProfile -File .\nova.ps1`。
還原最初兩張未加工官方 PNG：`node scripts/restore-nova-source.js`，會產生 `art/nova-official/NOVA_official_source_v0.2.zip`。原圖仍受原有美術權利約束。

## 創作者怎麼畫、怎麼匯入
```powershell
npm run nova:create-character -- chibi .\MyCharacter
# 或：npm run nova:create-character -- mature .\MyMatureCharacter
```
腳本產出 rig.json、README、16 張**透明 RGBA 256×256 的空白部位 PNG**。繪師將頭、身、左右上臂、前臂、手、腿、頭髮等畫入各自 PNG。每張預設 (128,128) 是關節 pivot；改尺寸須同步修改 rig.json。不可直接把完整扁平立繪塞進 head.png 當作全身模型。

在 Windows Chrome/Edge 打開工作台，NOVA 浮窗按「匯入角色」，選整個 MyCharacter 資料夾。圖片只在本機瀏覽器記憶體使用，不會自行上傳；重整網頁後目前需重選資料夾。按「官方角色」可切回原始逐格 NOVA。

新骨架繼承父節點旋轉、逐節點動作、緩動與 220ms 平滑過渡。包括 idle/typing/thinking/wave/walk/run/jump/sit/sleep/error/celebrate；任務 running 切 typing，error 切 error。動作真的能套在**分層且正確設 pivot 的新角色**上；官方 NOVA 的兩張扁平參考圖尚未全部分層綁好。

## 程式與驗證
- public/nova-rig-runtime.js：階層關節、世界變換、逐關節插值與切換混合。
- public/nova-rig-import.js：只接受使用者選取之本機 PNG/WebP/JSON，檢查路徑、大小及檔案標頭。
- templates/nova-character-mod/{chibi,mature}/rig.json：通用比例骨架與 11 種動作模板。
- scripts/create-nova-character-mod.js：生成可編輯部位 PNG。
- tests/nova-rig-runtime.test.js、tests/nova-rig-scaffold.test.js：回歸測試。

本 PR 保持 Draft，Windows GitHub Actions CI 和真機視覺完成前不要宣稱正式發行。
