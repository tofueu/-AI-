# NOVA 官方形象：原圖永久保存、逐格動畫與工作台整合

更新：2026-10-30。只在功能分支與 Draft PR #22 修改；未合併 main。

## 資料真實狀態

- **使用者提供的 Q 版與成熟版兩張原始 PNG**：以原始位元組備份在 Git 的 source split ZIP 中，能校驗並恢復；保留它們作為官方形象的唯一原始設定。
- **動畫 MOD**：已從使用者 Q 版原圖，以及依照原圖衍生的打電腦姿勢圖，產生並保存共 **96 個檔案**；包含真正不同的 Q 版打電腦 **12 幀**、成熟版打電腦 **12 幀**，**12 fps**。不是把一張工作圖重複引用。
- **其他動作**：Q／成熟版待機各 8 幀；Q 版揮手 8 幀、睡眠 8 幀、走路 8 幀、跑步 8 幀、跳躍 6 幀。所有列入 manifest 的檔案皆存在。
- **動畫品質限制**：目前屬 2D 逐格／圖層平移動畫原型（手部敲擊、身體起伏、微晃）；不是已綁定權重的 Live2D、不是完整手肘／手腕骨架，也不是完成的 PSD。成熟版打字姿勢是 AI 衍生圖而非官方原圖本身。
- **工作台**：Web NOVA MOD player 使用 /api/tasks 真實狀態與對話交辦；Windows WPF 角色現已支援 PNG 逐幀播放、12fps timer、約每秒 API 同步與影格快取；**還沒有 Windows 真機 UI 驗收**。
- **外部 AI 登入**：只達到真實資料收集與 fail-closed UI；Codex/Perplexity/Grok 仍可能是 handoff，不能偽稱登入成功。

## Git 位置：永久保存不再靠對話附件

```text
art/nova-official/
├── runtime/
│   └── NOVA_official_runtime_v0.2.zip.part00..15  (96 個 MOD 檔案)
└── source/
    └── NOVA_official_source_v0.2.zip.part00..27   (兩張原始 PNG)
nova-official-installer.js
nova-official-sprite.ps1
public/nova-official-player.js
public/nova-official-player.css
tests/nova-official-assets.test.js
scripts/restore-nova-source.js
```

**runtime 原 ZIP SHA-256**：
`7cd65ca41ba949ff2387c8e9a7a6e762aea92bc5dd156b9044a95b1beec37905`

**source 原 ZIP SHA-256**：
`23f9fe676e9eabed1cdf9122dcf5ff38e49afc3b66bae4f265662e9bc15debf7`

原始 Q 版 PNG SHA-256：
`fbee4aea0cb5bf14a77b3af7be4690b10675d492e153be78954d05e85394617d`

原始成熟版 PNG SHA-256：
`c4fe14e3d8ee5b8172755bcb4bdb900c683dc8164529bc1467b4d12b75954744`

GitHub connector 的單次二進位上傳量有限，因此 **ZIP 分割成固定大小的真正 Git blob**；每個 part 不是文字連結、不是外部依賴。安裝程式用編號組合後核對完整 SHA-256，再檢查 ZIP CRC、路徑穿越、檔案數與檔案大小，才展開透明 PNG。

## 啟動與還原

1. 下載包含本 PR 的 Git checkout，在 Windows 裝好 Node.js 22。
2. `npm start`。伺服器啟動時自動從 Git 的 16 個 runtime part 還原并安裝至 `public/assets/nova-official/`。不必重複傳圖、不必自己手動解包。
3. 在 Web 工作台右下角可看到 NOVA；選 Q 版或成熟版。任務為 running 時讀取 `working` 動作，**每秒播放 12 張不同 PNG**；離線時不偽造成功。
4. Windows 原生桌寵使用 PowerShell 5.1 執行 `nova.ps1`，需先啟動伺服器完成素材安裝。右鍵可切換官方 Q 版與成熟版。
5. 如需恢復未加工的原始圖片：`node scripts/restore-nova-source.js`，得到 `art/nova-official/NOVA_official_source_v0.2.zip`，解壓得到兩張原圖。

## 動畫規格

`manifest.json` = `format: nova.character.mod`、`manifestVersion: 2`，每個角色有獨立的 `root`、`animations`、`fps`、`frames`。動作循環期間依 frame index 播放，不能只用一張 PNG 假裝 12 幀。Q／成熟版 `working` / `typing` 各 12 幀，12fps；每個 SHA-256 不相同。

## 安全與授權

- 官方 archive 只允許安全的本機 PNG、JSON、README；不能放可執行 MOD 程式，ZIP 解包必須通過 CRC、完整性、反穿越路徑等檢查。
- 原圖由使用者提供，社群散佈授權 **尚未被確認**。請在公開釋出前明確取得權利並選擇 MOD 授權，不要擅自宣稱 MIT/CC BY 適用於美術。
- Buzz 可參考分工聊天與代理身份；PlayPort 可參考多帳號 session 隔離；本 PR 沒有藉此假裝已獲得任一第三方 AI 的 OAuth 授權。

## 測試與剩餘工作

`npm run check`、`npm test`、Windows 原生 `nova.ps1`。新增測試檢查 96 個檔案、24 張打字幀唯一性、兩張原圖的 SHA 與 ZIP 損壞拒絕。

**仍待**：完整 Live2D/PSD 關節分層、表情嘴型與物理髮絲、成熟版完整動作（走、跑、跳）、Windows 真機視覺驗收、外部提供者多帳號登入驗證、第三方 MOD 一鍵匯入與作者上傳平台。