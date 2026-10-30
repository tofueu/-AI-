# AI Workbench — GPT 對話進度同步與開發交接
最後整理：2026-10-31（Asia/Taipei）

> 此文件專門保存 GPT 對話中的需求、決策、開發進度與待驗收工作，避免跨對話／Codex／Jules／Gemini 接手時遺失。**需求紀錄≠程式已實作；PR 已提交≠已合併；測試宣稱≠真實 Windows／多帳號端到端驗收。** 原始功能分支和 main 不因本報告修改。

## 一、總目標（GPT 對話已確定）
在既有 GitHub `tofueu/-AI-` 專案打造 Windows-first 的多 AI 工作台；不另外重做新專案。平台應可連接 GPT/Codex、Gemini（包括不同 Google 帳號）、Claude、Perplexity、Grok、OpenCode、Cursor、Manus、Jules，以及合法可用的本機模型、官方 API 或 CLI/ACP 等來源。使用者重視使用既有訂閱額度，API 費用應與訂閱區分，不可假設訂閱即 API 授權。每個登入、連線、任務執行狀態都必須真實驗證，不能使用假成功燈號或只有打開登入頁就判定已連接。

希望參考 Buzz 的 provider/harness 設計、Herdr 多代理工作區以及 sub2api 的集中授權管理理念；允許多 AI 並行規劃、寫程式、交叉審查與接替。帳號的官方登入、2FA、付款、同意授權等必須遵守服務提供者要求，不能繞過或自行聲稱已核准。

## 二、跨回合關鍵需求：持續執行與自動恢復
- 任務持久化：task ID、事件／心跳、lease、checkpoint、策略性 retry、限流及錯誤分流、audit trail、GitHub commit/PR/CI 對照。
- 實際支援的代理應可在原 AI 額度、斷線、執行失敗或 Jules session 中止時接手，但要避免任務重複執行、重複派單與重複回報；相同故障再次出現，須診斷根因，不是只報「卡住」。
- 工作台應是使用者未來操作 AI 專案的控制台，Windows 啟動後可由常駐 runner 繼續；不能依賴這個 ChatGPT 對話保持開啟。不得把 GitHub Issue 留言誤認成 Jules 已真的收到、重新執行。
- AI 工作台與 NOVA 屬同一應用：工作台啟動 NOVA、NOVA 訂閱**真實** task state，Windows 透明拖動置頂；可在工作台最小化時顯示。
- 未經實際測試的本機登入／重連／雙帳號／代理協作，不可標成 completed。

## 三、NOVA 角色與 MOD — 最新 GPT 需求
- 官方 NOVA 需要 Q 版與一般／成熟版兩種角色，使用已提供的**原始角色圖**，風格與全身完整度應保持一致。使用者偏好淡紫色角色。
- 不是只需分鏡 GIF；動作要流暢、連續、有真正的人物骨架階層與手肘／手腕、頭髮、衣服等可動部位，角色動作包括打字、待機、眨眼、行走、跑步、跳躍、揮手、睡眠、坐下、思考、錯誤、慶祝。
- 提供正式社群角色 MOD 作者模板：分層透明 PNG 和可編輯 PSD（使用者希望像官方 PSD：臉部五官、頭髮、帽子、身體、衣服、手臂、手、腿等各部位），包含各部位 pivot、骨骼綁定、遮擋排序與動作命名；作者只需填入對應部位畫作即可套用動作和匯入平台。
- 確保去背乾淨、身體衣物不截斷、不出現多手、動作自然，整組動畫需預覽及實機驗收。逐格動圖素材不可冒充可編輯的真正分層 PSD／蒙皮。
- 要將完成的圖、PSD／PNG、模板、動畫、使用說明和來源核對資訊實際保存在 Git 中；不應因 GPT 對話消失而遺失。確認圖像公開散布權利後再設定素材授權。

## 四、本次從 GitHub 直接核對的事實（截至 2026-10-31）
- `main` 仍是 v0.2 初始提交 `9f7778737679b8dc0ce2660fef4d43ffacc76fbe`；重要新功能**尚未合併 main**。
- [PR #21](https://github.com/tofueu/-AI-/pull/21) — `feature/ai-workbench-nova-interop-7550545324508422030` → main，**OPEN DRAFT**，head `a493497f5193c0c126fa7f9594ed6a499b510b47`。PR 描述包含 `server.js` 健康檢查／task ledger、防假授權、WPF NOVA overlay、任務狀態，需繼續實機驗收。
- [PR #22](https://github.com/tofueu/-AI-/pull/22) — `feature/nova-official-mod-runtime-20261030` → **PR #21 的 feature branch**，**OPEN DRAFT**，本次查核 head `bfc8afb067a3b4121c6cc32873b6326aa3def541`；屬堆疊式開發，未進 main。
- PR #22 分支已存在 `docs/NOVA_COMMUNITY_RIG.md`、`public/nova-rig-runtime.js`、`public/nova-rig-import.js`、`templates/nova-character-mod/{chibi,mature}/rig.json`、`scripts/create-nova-character-mod.js` 等。該文件稱官方原圖 Git 分段備份、雙角色逐格動畫、可匯入 16 部位 PNG+rig 的社群骨架，包含 11 種動作和 220ms 混合；文件明言：官方兩張原圖仍屬扁平圖，未完成真正的官方角色 PSD 分層和綁定，未做到 ZIP 永久安裝、跨重啟保存與 Windows 真機視覺驗收。
- PR #22 內容聲稱 [Windows Actions Run 41071042096](https://github.com/tofueu/-AI-/actions/runs/41071042096) 有 23/23 Node 測試與 PowerShell regression 通過；本次以 head SHA 查詢 workflow runs 回傳空陣列，**未獨立驗證該 CI 執行記錄**，因此請以 run 連結與實際 job logs 再核實。
- [PR #15](https://github.com/tofueu/-AI-/pull/15) OpenCode 基礎、[PR #16](https://github.com/tofueu/-AI-/pull/16) 備援、[PR #18](https://github.com/tofueu/-AI-/pull/18) provider 授權、[PR #19](https://github.com/tofueu/-AI-/pull/19) 多 AI 群組聊天室均 OPEN／未合併；各 PR 之功能主張不代表已在 #21/#22 或 main 整合完成。
- 驗收規格見 [Issue #2](https://github.com/tofueu/-AI-/issues/2)、[Issue #14](https://github.com/tofueu/-AI-/issues/14)、[Issue #20](https://github.com/tofueu/-AI-/issues/20)。

## 五、完成度區分
| 項目 | 已有可檢查證據 | 尚欠 |
| --- | --- | --- |
| 工作台基本程式 | GitHub 已有多條功能分支、PR | 選定整合基線、PR 去重、整合驗收、main 未更新 |
| NOVA 原圖與逐格動畫 | PR #22 文件及 Git 素材／runtime 聲明 | 動作美術品質、Windows 真機播放再檢查 |
| 通用骨架、社群 MOD | PR #22 有 rig/import/scaffold 程式和文件 | 官方角色實際切層、正確透明去背、可編輯 PSD、跨重啟 MOD 持久化 |
| Windows NOVA | PR #21/#22 WPF overlay 程式聲明 | Windows 上可見實測影像與各動作流暢度驗收 |
| OAuth/CLI 真實登入 | PR #18 及其他 auth 改善分支 | 各服務真實已授權帳號的登入／重連／執行、雙帳號實測 |
| 多 AI 並行與故障接替 | 多 PR 功能實作聲明 | 完整 E2E（兩代理並行、異常恢復、不重複執行、Git 續派） |
| CI 測試 | PR 描述附 run URL | 最終整合版 Windows/Linux CI 及實機測試紀錄 |

## 六、交接後的執行優先順序（需求，不代表已執行）
1. **保持原有分支與成果**：先對照 #21/#22 與 #15/#16/#18/#19 的差異，避免覆蓋較新的檔案。#22 是疊在 #21 上，合併次序要先評估。
2. **NOVA 官方分層成品**：原圖正確去背、切完整部件、PSD+PNG+rig+pivot+動畫實際預覽；官方 Q 版與一般版都需能套 11 動作，不只 12 張打字畫面。
3. **角色 MOD 匯入可用性**：創作者從 PSD 畫好部件→輸出 PNG→放入 rig MOD→匯入→測試動作→重啟依然有效。增加 ZIP 安裝與保存。
4. **真正多 AI 帳號連線**：逐個 provider 驗證登入→capability→任務執行→斷線／過期→重連；支持不同帳號標識，不混淆訂閱和 API 計費。
5. **可靠代理協作**：runner 常駐、任務事件與心跳、重試去重、AI 接手與 GitHub PR／CI 回饋，呈現可查核的成功／失敗實際紀錄。
6. **正式驗收後才考慮合併**：需要 PR/commit、CI job、Windows 實際操作截圖／影片、測試命令與限制清單。不可直接把有 PR 等同整套平台完成。

## 七、避免再遺失的規則
- 本檔作為 **GPT 規格與交接快照**；新對話／代理開工前先閱讀此檔及 PR #21/#22，再對照最新 Git commit，不能拿過時快照覆蓋新成果。
- 每一工作批次同步更新：UTC／台灣時間、commit SHA、PR、改動檔案、實際成功測試、失敗原因、剩餘驗收項；區分「已記錄需求」「有程式」「有測試」「實機完成」四種層級。
- 若後續修改需要重新登入或人工 OAuth 同意，只標明真實阻塞與下一個可自動執行步驟，不虛構授權，也不要讓工作狀態遺失。
