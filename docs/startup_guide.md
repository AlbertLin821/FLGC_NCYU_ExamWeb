# 專案啟動指南（NCHU Online English Exam Platform）

本指南說明本地開發、測試與 demo 所需步驟。

---

## 1. 前置作業

請先安裝：

- **Node.js**：建議 v20 或以上
- **npm**：隨 Node 安裝
- **PostgreSQL**：本專案使用 Prisma 連線 PostgreSQL（本地或雲端 Supabase 皆可）

說明：`.env.example` 中雖列出 Redis 相關變數，但目前應用程式模組**未連線 Redis**；若僅跑本專案 API 與測試，可不啟動 Redis。

---

## 2. 後端（`server/`）

### 環境變數

1. 複製範例檔（請自行建立實際 `.env`，勿將機密提交版本庫）：

   ```bash
   cp .env.example .env
   ```

2. 至少設定：

   - `DATABASE_URL`：應用程式連線用（若使用 Supabase Pooler，請依官方字串並視需要加上 `pgbouncer=true`）
   - `DIRECT_URL`：建議與遷移／seed 相同目標資料庫之連線（見 `server/prisma.config.ts`）
   - `JWT_SECRET`：請改為足夠長度的隨機字串
   - `GEMINI_API_KEY` 或其他 AI 金鑰：評分功能需要時再填

詳細 Supabase 連線注意事項見專案內 **[supabase_setup.md](../supabase_setup.md)**（若存在）。

### 安裝與資料庫

```bash
cd server
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

種子會建立預設管理員（見下方「Demo 帳號」）。

### 啟動

```bash
npm run start:dev
```

預設 HTTP：`http://localhost:3000`

### 測試指令

| 指令 | 說明 |
|------|------|
| `npm test` | Jest 單元測試 |
| `npm run test:e2e` | Jest e2e（需可連線之資料庫與環境變數） |
| `npm run build` | 編譯 |
| `npm run lint` | ESLint |

---

## 3. 前端（`client/`）

### 環境變數

1. 複製範例檔：

   ```bash
   cp .env.example .env
   ```

2. `VITE_API_URL` 請填**後端 HTTP 來源，勿含路徑 `/api`**（程式會自動加上 `/api`，WebSocket 使用同源之 `/cheat`）：

   ```env
   VITE_API_URL=http://localhost:3000
   ```

### 安裝與啟動

```bash
cd client
npm install
npm run dev
```

預設開發網址：`http://localhost:5173`

### 測試指令

| 指令 | 說明 |
|------|------|
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright（會依 `playwright.config.ts` 啟動後端與前端） |
| `npm run build` | 正式建置 |

---

## 4. Demo 帳號與建立方式

種子（`npx prisma db seed`）預設建立：

- **教師／管理員**：`admin@nchu.edu.tw` / `admin123`

學生帳號由種子在班級內建立（例如學號 `411200001`、姓名需與種子一致方可登入）；實際資料以 `server/prisma/seed.ts` 為準。

---

## 5. 已知限制（交付／demo 時請一併說明）

- **AI 評分**：若雲端配額不足或服務異常，部分題型可能寫入 `pending_review`（待人工複閱）；**交卷仍會成功**，成績後台會顯示「已評分（待複閱）」等狀態，與純「已評分」區分。
- **學生部分 API** 仍依產品設計採學號／姓名驗證流程，與教師 JWT 保護之路由不同；若需全面 JWT 化需另規劃。
- **CI**：`.github/workflows/ci.yml` 使用服務容器 PostgreSQL 跑 `prisma migrate deploy` 與 `npm run test:e2e`；本地跑 e2e 前請確認 `DATABASE_URL`／`DIRECT_URL` 正確。

---

## 6. 常見問題

- **資料庫連線失敗（P1001 等）**：檢查 `DATABASE_URL`、防火牆與 Supabase 專案狀態。
- **`Tenant or user not found`（Supabase Pooler）**：多為連線字串使用者名稱或 `pgbouncer` 設定與官方不一致，請對照 [supabase_setup.md](../supabase_setup.md)。
- **預設教師無法登入**：重新執行 `npx prisma db seed`，並確認連線的是預期資料庫。
- **Prisma 二進位或產生器錯誤**：執行 `npx prisma generate`。

---

## 7. GitHub Actions（CI）

推送或 PR 至設定的分支時，會執行前端與後端工作。後端 job 內含 PostgreSQL 服務、遷移與 **server e2e**，無須另建雲端資料庫即可驗證基本流程。
