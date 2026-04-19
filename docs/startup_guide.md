# 專案啟動指南 (NCHU Online English Exam Platform)

本指南將引導您如何在本地環境啟動前後端服務，進行開發或測試。

---

## 🛠️ 1. 前置作業 (Prerequisites)

在開始之前，請確保您的系統已安裝以下工具：

*   **Node.js**: 建議版本 v20 或以上。
*   **npm**: 隨 Node.js 一併安裝。
*   **Redis**: 用於任務佇列 (Bull) 與快取。
    *   *Windows*: 建議使用 Docker 啟動，或安裝 WSL2/Memurai。
*   **Supabase 帳號**: 本專案使用 Supabase 作為資料庫（PostgreSQL）。

---

## 🖥️ 2. 後端服務啟動 (Backend - /server)

### A. 環境變數設定
1. 進入 `server` 目錄。
2. 複製範例設定檔：
   ```bash
   cp .env.example .env
   ```
3. 編輯 `.env` 並填入以下資訊：
   *   `DATABASE_URL` & `DIRECT_URL`: 請參考 [supabase_setup.md](../supabase_setup.md) 獲取連線字串。
   *   `REDIS_HOST`: 通常為 `localhost`。
   *   `GEMINI_API_KEY`: 您的 Google AI API Key。
   *   `JWT_SECRET`: 設定一個長且隨機的字串。

### B. 安裝與初始化
```bash
# 安裝依賴
npm install

# 同步資料庫結構並寫入初始資料 (Seed)
# 這會建立預設管理員：admin@nchu.edu.tw / admin123
npx prisma db push
npx prisma db seed
```

### C. 啟動開發伺服器
```bash
# 啟動並進入監看模式 (Hot Reload)
npm run start:dev
```
> [!NOTE]
> 後端預設運行於 `http://localhost:3000`。

---

## 🌐 3. 前端服務啟動 (Client - /client)

### A. 環境變數設定
1. 進入 `client` 目錄。
2. 複製範例設定檔：
   ```bash
   cp .env.example .env
   ```
3. 確認 `.env` 內容（預設應指向本地後端）：
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_WS_URL=http://localhost:3000
   ```

### B. 安裝與啟動
```bash
# 安裝依賴
npm install

# 啟動 Vite 開發伺服器
npm run dev
```
> [!TIP]
> 前端預設運行於 `http://localhost:5173`。

---

## ❓ 常見問題排查 (Troubleshooting)

*   **無法連線至資料庫 (P1001)**:
    *   請檢查 `DATABASE_URL` 是否正確。
    *   如果您在 IPv4 環境下（如大部分家用網路），請務必使用帶有 `pooler.supabase.com` 的連線網址（見 [supabase_setup.md](../supabase_setup.md)）。
*   **`Tenant or user not found`（Prisma / 登入時一併失敗）**:
    *   此為 Supabase **連線集區驗證失敗**，不是密碼錯在應用程式帳號。請確認 Pooler 連線字串的使用者為 **`postgres.[專案代號]`**，密碼與控制台 Database 密碼一致，且 Transaction URL（埠 6543）含 **`pgbouncer=true`**。完整說明見 [supabase_setup.md](../supabase_setup.md) 第七節。
*   **連線正常但預設老師無法登入**:
    *   請在 `server` 目錄執行 `npx prisma db seed`，再重試 `admin@nchu.edu.tw` / `admin123`。
*   **Redis 連線失敗**:
    *   請確保您的 Redis 服務已啟動。如果是本地開發，請檢查 Redis 埠號（預設 6379）是否被佔用。
*   **Prisma 二進位檔錯誤**:
    *   若切換作業系統或環境，請重新執行 `npx prisma generate`。

---

> [!IMPORTANT]
> 預設老師管理員帳號：`admin@nchu.edu.tw` / 密碼：`admin123`
