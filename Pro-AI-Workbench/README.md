# Multi-AI Workbench

本機多 AI 專案控制台，以 OpenCreator 的深色工作台作為介面參考。支援 GPT 規劃、Perplexity 查證、Gemini 實作、Grok 複核、GPT 終審的自動套娃流程。

## 支援的真實連線

- **GPT / ChatGPT**：Codex CLI。使用 ChatGPT 訂閱登入，不設定 OpenAI API Key。
- **Gemini**：Google Antigravity CLI（`agy`）。首次使用先在互動 CLI 以 Google 帳號登入；工作台的程式任務再以 headless 模式執行。
- **Perplexity**：Perplexity Computer MCP 官方 OAuth，透過已登入的 Codex CLI 呼叫。Computer 會扣 Perplexity 帳戶 credits；額度不足時任務會失敗，本程式不會設定付款方式或自動購買額度。
- **Grok / SuperGrok**：可連到本機 Sub2API OpenAI 相容 Gateway，作為實作後的獨立複核者。工作台不使用 xAI API Key，也不會在失敗時切換 xAI API。

Perplexity Pro 不等同於無限 Computer 用量。請先在 Perplexity 帳戶查看 Computer 可用 credits；工作台只有在成功執行過 Computer MCP 任務後，才會顯示「已連線」。只看到 MCP 設定不代表 OAuth 已驗證。

## Windows 一鍵設定

1. 下載 ZIP 並解壓縮到一個新資料夾。
2. 雙擊 `setup.bat`。它會檢查並安裝缺少的 Node.js LTS、Codex CLI、Google Antigravity CLI，然後啟動工作台。
3. 首次設定完成後，之後可用 `start.bat` 啟動。
4. 在「AI 助理」依序按「連結帳號」：
   - GPT：在終端執行 `codex login`，選擇 ChatGPT 登入並完成瀏覽器授權。
   - Gemini：在終端執行 `agy`，依提示以 Google 帳號登入。成功進入 CLI 後可按 `Ctrl+C` 結束。
   - Perplexity：程式會加入官方 MCP URL，再執行 `codex mcp login perplexity-computer`；在瀏覽器完成 Perplexity OAuth。
5. 回到工作台按「更新連線狀態」。GPT 由 `codex login status` 確認；Gemini 顯示 CLI 是否存在（Google 登入在首次任務由官方 CLI 驗證）；Perplexity 要等首次成功 Computer 呼叫才會標示已驗證。
6. 在「Grok」卡片設定 Sub2API Gateway 網址（預設 `http://127.0.0.1:8080/v1`）、Sub2API 使用者 Gateway Key，以及 Sub2API 模型清單中的 Grok 模型名稱。按測試後，工作台會送出一則極短模型請求；成功才保存設定。這會消耗該路由帳號少量包含額度，不會呼叫付費 API。
7. 請先確認 Sub2API 後台該模型路由使用的是你自己的 Grok/SuperGrok OAuth 訂閱帳號，而不是 xAI API Key 帳號。工作台能驗證 Gateway 和模型請求成功，但 Sub2API 不一定在相容 API 回應中提供上游帳號類型；上游帳號來源請在 Sub2API 後台確認。多個帳號的池化、分組與輪替由 Sub2API 管理。
8. 輸入專案資料夾完整路徑，建立套娃任務。流程為 GPT 拆解 → Perplexity Computer 查證 → Gemini 在資料夾實作 → Grok 複核 → GPT 只讀終審。任一階段失敗就停止，不會改用 API 金鑰或付費 API。

`setup.bat` 只安裝免費 CLI 程式並啟動本機服務；不登入帳號、不建立供應商 API Key、不設定付款，也不會把專案上傳 GitHub。各官方帳號授權仍須由使用者完成。安裝 Node.js 會使用 Windows `winget`；若電腦沒有 winget，請先安裝 Node.js LTS，再重跑設定檔。

## 執行權限與本機資料

- Codex 實作使用 `workspace-write` 沙箱；GPT 審查使用 `read-only` 沙箱。
- Antigravity headless 預設使用 CLI 的工具權限設定；讀寫目前工作區會放行，其他需要核准的命令可能被略過或拒絕。請只交辦可信任的專案。
- 任務提示、執行記錄和結果保存在 `data/tasks.json`。請勿把密碼或 API key 寫進任務提示。
- Sub2API Gateway Key 保存在本機忽略資料夾 `data/sub2api.json`，不會寫入 Git；請使用 Sub2API 的一般使用者 Gateway Key，不要填供應商 API Key。
- 伺服器只監聽本機 `127.0.0.1`，不會公開到網際網路。
- `git status --short` 用來顯示產生的檔案變更；程式不會自動 commit 或 push。

## 驗證

```bash
npm run check
node --check public/app.js
```

目前驗證範圍：語法檢查與本機假 Gateway 的連線流程測試。尚未在你的 Windows 電腦、實際 Sub2API 帳號池或四家服務帳號上完成端到端驗證；首次使用仍需在你的電腦登入並確認 Sub2API 路由來源。
