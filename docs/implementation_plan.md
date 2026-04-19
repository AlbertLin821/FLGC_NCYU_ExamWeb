# 專案部署指南 (NCYU Online English Exam Platform)

本指南旨在協助您將專案部署至線上環境，並確保資料庫連線正確。

## 1. 資料庫部署檢查清單 (Supabase)

在部署到線上資料庫前，請檢查以下事項：

- [ ] **連線字串 (Connection Strings)**: 
  - 確保 [server/.env](file:///c:/Users/Administrator/Desktop/flgcncyu/server/.env) 中的 `DATABASE_URL` 使用 **Transaction Mode** (Port 6543) 並包含 `?pgbouncer=true`。
  - 確保 `DIRECT_URL` 使用 **Session Mode** (Port 5432)。
  - *注意：如果您的網路不支持 IPv6，請務必使用帶有 `pooler.supabase.com` 的主機名。*
- [ ] **同步 Schema**: 執行 `npx prisma db push` 將本地的資料庫結構推送到 Supabase。
- [ ] **寫入初始資料 (Seed)**: 執行 `npx prisma db seed`。這非常重要，因為它會建立示範帳號（見 `docs/startup_guide.md`，例如 `system@ncyu.edu.tw` / `SystemDemo123!`）。
- [ ] **RLS 設定**: 如果在控制台開啟了 RLS，請確保您的伺服器使用的是 `postgres` 帳號連線（Prisma 預設行為），這樣可以繞過 RLS 直接操作資料。

## 2. 環境變數設定

### 後端 (Server)
請確保生產環境中包含以下變數：
- `DATABASE_URL`: Supabase Transaction URL
- `DIRECT_URL`: Supabase Session URL
- `JWT_SECRET`: 請更改為隨機強字串（不可使用預設值）。
- `GEMINI_API_KEY`: 您的 Google AI 金鑰。
- `NODE_ENV`: 設為 `production`。

### 前端 (Client)
- `VITE_API_URL`: 必須指向**部署後的後端網址** (例如 `https://your-api.com/api`)。
- `VITE_WS_URL`: 指向**部署後的後端網址**（用於 Socket.io 考卷同步）。

## 3. 啟動步驟

### 後端 Server
1. 進入 `server` 目錄。
2. 安裝依賴：`npm install`
3. 編譯專案：`npm run build`
4. 啟動生產模式：`npm run start:prod` (或使用 PM2 管理：`pm2 start dist/main.js`)

### 前端 Client
1. 進入 `client` 目錄。
2. 安裝依賴：`npm install`
3. 打包專案：`npm run build`
4. 部署 `dist` 資料夾：
   - 您可以將 `dist` 資料夾內容上傳到靜態網站託管平台 (Vercel, Netlify, Cloudflare Pages)。
   - 或者在本地預覽：`npm run preview`

## 驗證計畫

### 自動化測試
- 無（本指南為部署流程說明）。

### 手動驗證
1. **資料庫連線**: 啟動 Server 後，觀察 Log 是否有 Prisma 連線成功的訊息。
2. **登入測試**: 使用種子帳號（如 `system@ncyu.edu.tw` / `SystemDemo123!`）登入管理後台，確保能讀取到 Seed 資料。
3. **API 串接**: 確認前端頁面能正確抓取後端資料，且考卷即時狀態同步 (Socket.io) 運作正常。
