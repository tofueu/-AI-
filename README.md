# Multi-AI Workbench

本機多 AI 專案控制台，以 OpenCreator 的深色工作台作為介面參考。支援 GPT 規劃、Perplexity 查證、Gemini 實作、Sub2API 模型複核、GPT 終審的自動套娃流程；另可從 Sub2API 管理 API 讀取多個已配置帳號的狀態。

## 支援的真實連線

- **GPT / ChatGPT**：Codex CLI。使用 ChatGPT 訂閱登入，不設定 OpenAI API Key。
- **Gemini**：Google Antigravity CLI（`agy`）。首次使用先在互動 CLI 以 Google 帳號登入；工作台的程式任務再以 headless 模式執行。
- **Cursor**：Cursor Agent CLI（`agent`）。官方登入流程為 `agent login`；可用 `agent status` 確認登入，並以 `agent -p "..." --output-format text` 在指定專案資料夾執行任務。
- **Perplexity**：Perplexity Computer MCP 官方 OAuth，透過已登入的 Codex CLI 呼叫。Computer 會扣 Perplexity 帳戶 credits；額度不足時任務會失敗，本程式不會設定付款方式或自動購買額度。
- **Sub2API Gateway**：可把你配置在 Gateway 的任一模型作為實作後的獨立複核者。只有當你在 Sub2API 自己配置並選取 Grok 上游時，這一關才代表 Grok；工作台會顯示已設定的模型名稱，不會把任意模型冒稱為 Grok。Gateway 請求可能使用 API 或上游帳號額度，須以 Sub2API 的路由與帳單為準。

Perplexity Pro 不等同於無限 Computer 用量。請先在 Perplexity 帳戶查看 Computer 可用 credits；工作台只有在成功執行過 Computer MCP 任務後，才會顯示「已連線」。只看到 MCP 設定不代表 OAuth 已驗證。

## Windows 一鍵設定

1. 下載 ZIP 並解壓縮到一個新資料夾。
2. 雙擊 `setup.bat`。它會檢查並安裝缺少的 Node.js LTS、Codex CLI、Google Antigravity CLI，然後啟動工作台。
3. 首次設定完成後，之後可用 `start.bat` 啟動。
4. 在「已連線的 AI 助理」按「新增 AI／帳號」，再選要連接的服務：
   - GPT：在終端執行 `codex login`，選擇 ChatGPT 登入並完成瀏覽器授權。
   - Gemini：在終端執行 `agy`，依提示以 Google 帳號登入。成功進入 CLI 後可按 `Ctrl+C` 結束。
   - Perplexity：程式會加入官方 MCP URL，再執行 `codex mcp login perplexity-computer`；在瀏覽器完成 Perplexity OAuth。
   - Cursor：需先安裝 Cursor Agent CLI。Windows 可在 PowerShell 依 Cursor 官方 CLI 文件的安裝指令安裝，再按「連結帳號」；程式會執行 `agent login`。登入後以「更新連線」檢查 `agent status`。
5. 回到工作台按「更新連線」。只有檢查成功或完成首次成功任務的 AI 才會顯示在助理卡片。Gemini 與 Perplexity 會在第一次成功呼叫時驗證訂閱登入／OAuth；Cursor 可直接從「單一 AI 交辦」選取。
6. 按「連結帳號池」，輸入 Sub2API 管理頁網址與管理員 API Key，工作台會驗證並只讀載入帳號清單。管理 Key 權限可能很高，請勿放進 Git 或分享；目前存在本機 `data/sub2api.json`。
7. 按「開啟 Sub2API」，在 Sub2API 自己的管理介面新增每個上游帳號並完成該平台提供的 OAuth/登入授權。完成後回工作台「更新帳號」，確認清單有出現各帳號、平台、狀態與分組。工作台不會代替 Sub2API 保管供應商密碼，也不會自動替你登入尚未授權的帳號。
8. 要讓模型參與任務，另填 Sub2API Gateway URL、一般使用者 Gateway Key 和模型名稱。按測試會送一則短訊息並消耗少量路由額度；成功才保存。管理帳號清單和模型 Gateway 是兩個不同連線。
9. Sub2API 能回報帳號狀態/分組，不代表所有供應商都授權第三方 OAuth 轉接或允許共享訂閱額度。Sub2API 專案也要求部署者自行確認上游服務條款。是否能將各 Pro 訂閱用於這種 Gateway，請依各供應商當前條款及帳號頁確認；工作台不會把「OAuth 成功」冒稱為官方支援，也不會顯示 API 未提供的真實剩餘 Pro 額度。
10. 輸入專案資料夾完整路徑，建立套娃任務。流程為 GPT 拆解 → Perplexity Computer 查證 → Gemini 在資料夾實作 → Sub2API 設定的模型複核 → GPT 只讀終審。Cursor 可在單一 AI 模式直接處理同一資料夾。任一階段失敗就停止，不會自動改用另一個模型。

`setup.bat` 只安裝免費 CLI 程式並啟動本機服務；不登入帳號、不建立供應商 API Key、不設定付款，也不會把專案上傳 GitHub。各官方帳號授權仍須由使用者完成。安裝 Node.js 會使用 Windows `winget`；若電腦沒有 winget，請先安裝 Node.js LTS，再重跑設定檔。

## 本機個人帳號

- 第一次開啟工作台時，先建立一組本機帳號：顯示名稱、電子郵件和密碼。電子郵件只當登入名稱使用，不會寄驗證信，也不會登入任何 AI 服務。
- 目前限定一台電腦一個本機帳號。密碼使用 Node.js `scrypt` 雜湊後存在 `data/local-account.json`，不會以明文保存；登入 Cookie 為 HttpOnly，工作台 API 未登入時會拒絕存取。
- 登入有效期最長 12 小時，伺服器重啟後需要重新登入。這是本機存取鎖，不是雲端帳號或跨裝置同步；伺服器仍只監聽 `127.0.0.1`。
- 忘記密碼時，目前沒有郵件重設功能。可先關閉工作台，刪除 `data/local-account.json` 再重新啟動並註冊；任務資料 `data/tasks.json` 不會因此刪除。

## 執行權限與本機資料

- Codex 實作使用 `workspace-write` 沙箱；GPT 審查使用 `read-only` 沙箱。
- Antigravity headless 預設使用 CLI 的工具權限設定；讀寫目前工作區會放行，其他需要核准的命令可能被略過或拒絕。請只交辦可信任的專案。
- 任務提示、執行記錄和結果保存在 `data/tasks.json`。請勿把密碼或 API key 寫進任務提示。
- Sub2API Gateway Key 與管理員 API Key 保存在本機忽略資料夾 `data/sub2api.json`，不會寫入 Git；管理員 Key 權限較高，請限制本機使用者存取與備份範圍。
- 伺服器只監聽本機 `127.0.0.1`，不會公開到網際網路。
- 本版本是本機單一使用者工作台。官方 CLI 登入工作階段屬於目前作業系統使用者，無法在同一個執行個體為多位工作台使用者分開登入；Sub2API 的上游多帳號清單則由 Sub2API 管理。不要把本機 CLI 帳號登入誤當成已完成多人帳號系統。
- `git status --short` 用來顯示產生的檔案變更；程式不會自動 commit 或 push。

## 驗證

```bash
npm run check
node --check public/app.js
```

目前驗證範圍：語法檢查與本機假 Gateway 的連線流程測試。尚未在你的 Windows 電腦或實際 Sub2API 帳號池完成端到端驗證；首次使用需由你在 Sub2API 管理介面完成每個帳號的授權，然後回工作台驗證。


## Dispatcher → Google Antigravity CLI 實驗性 Adapter（PR #6）

本功能**僅在獨立開發分支**，尚未部署成常駐服務，亦尚未完成 GitHub→真實 AI→Commit/PR→獨立審查的端到端驗收。現有 `/aiwb run aiwb-dispatcher` 僅對允許的 GitHub 發言者有效；不得把 Issue 留言當作自動喚醒 Jules 的機制。

- 使用 `agy`（Antigravity CLI）而不是舊版 `gemini`。Google Pro 訂閱是否能使用須依官方當前權益與本機已登入的帳號驗證；**不使用 API key 自動計費**。
- 只有在執行機已安裝 `agy`、本人完成合法登入、部署者明確設定 `AIWB_ENABLE_AGY_CLI=1`，且 GitHub Token／白名單與 Dispatcher 均已配置後，才會嘗試執行固定的 `aiwb-dispatcher` 工作。沒有授權時為 `WAITING_FOR_AUTH`。
- Adapter 使用固定任務提示詞、`shell:false`、`--sandbox`、`--add-dir` 與 `--output-format json`；不使用 `--dangerously-skip-permissions`。工作階段的 API key 與 GitHub Token 不傳給 AI 子程序。工作目錄必須是獨立功能分支。
- CLI 成功退出**不等於**已提交 GitHub、PR 已通過或產品完成。此版本將其標記 `EXECUTED_UNVERIFIED` 並將佇列保持 `BLOCKED`，等待實作真正的 Git SHA／PR 驗證與安全推送機制。
- 若本機 `agy` 不可用、無登入、權限不足、無 GitHub Dispatcher 常駐部署，明確回報未解決；不能宣稱自動接續已完成。
