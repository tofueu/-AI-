# NOVA 官方角色與 AI Workbench 整合 — 2026-10-30

## 已完成
- 新增工作台網頁版 NOVA MOD 播放器、可拖曳浮窗、Q／成熟版切換、呼叫真實任務 API 的對話交辦、動畫狀態轉換。
- MOD 2.0 格式只接受本機相對 PNG/WEBP 資源，不接受腳本、外部網址或路徑穿越。
- 角色設計嚴格以使用者提供的兩張 NOVA 圖為準，不以幾何替身冒充正式角色。

## 官方角色素材的實際狀態
- Q 版：官方原始透明圖裁切待機、表情、部分動畫幀，未完成全部小幀的逐格美術檢查。
- 成熟版：原始角色三視圖參考，背景尚非透明，沒有完整動作與 PSD 分層。
- rig.json：僅有關節位置模板，尚未完成真正可動 PSD、蒙皮權重、物理模擬。
- 官方角色 ZIP 是另行交付的使用者素材；本 PR 不含 ZIP 二進位，因此未解壓時 UI 明確顯示尚未安裝，不會假裝載入成功。
- Windows WPF 的 nova.ps1 已新增以官方 PNG 格式取代舊幾何圖的 renderer，缺少素材時提示安裝，尚未完成 Windows 真機驗收。

## 如何安裝素材
把 NOVA 官方角色 MOD 初版 ZIP 解壓到此 repo 的 public/assets/nova-official/ ，目錄下應有 manifest.json 和 characters/chibi/sprites/idle.png。
啟動 npm start，在工作台右下角切換角色，點「對話」提交真實任務。
Gemini 必須有實際絕對工作區路徑；Codex、Perplexity、Grok 目前仍有 handoff，不代表自動執行成功。

## MOD manifest v2
頂層 format 必須是 nova.character.mod，manifestVersion 為數字 2。
characters.chibi / characters.mature 各自提供 root 相對素材目錄；animations 為每個狀態的 fps、frames 陣列。
成熟版尚無動畫時，可用 views.front 顯示參考圖。
不能執行 MOD 提供的 JavaScript、PowerShell 或 Python；ZIP 安裝器尚未製作，之後應檢查數量、檔案大小、壓縮炸彈、CRC、符號連結和重複路徑。

## Buzz 與 PlayPort
Buzz 借鏡：每個 Agent 獨立身份、群組對話、官方本機 harness、真實任務狀態。
PlayPort 借鏡：不同服務的授權 session 隔離、持久化、登入失敗需要真實狀態。
不能把可打開登入網站視為已取得授權，也不能聲稱 Gemini/Codex 多帳號已被自動驗證。

## 仍待完成
1. 高解析來源的 Q／成熟版 PSD 分層、關節綁定、動作補幀與正式對齊。
2. WPF PNG renderer 已加入，但仍需 Windows 真機測試、逐幀對齊及後續真正 Live2D/關節蒙皮。
3. 多帳號官方 OAuth/CLI 實際核驗、獨立 session 與可靠恢復。
4. 真機安裝與 UI 測試、MOD 一鍵匯入與安全驗證。
5. 本 PR 必須在 CI 通過及真機驗收後才可合併。

## 開發測試
Node.js 22: npm test ; npm run check。

## Windows 啟動
在 Windows PowerShell 5.1 執行 nova.ps1；若尚未把官方 PNG ZIP 解壓至 public/assets/nova-official，桌寵顯示缺少素材而不使用幾何人物冒充。右鍵選官方 Q 版或成熟版；成熟版目前是靜態參考圖，不能宣稱已綁定關節。
