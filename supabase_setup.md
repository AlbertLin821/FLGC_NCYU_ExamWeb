# NCHU Online English Exam Platform — Supabase 雲端資料庫設定

既然您決定直接使用 Supabase 而不建置本地 Docker 資料庫，請按照以下步驟進行設定：

## 1. Supabase 控制台操作
1. **建立專案**: 登入 [Supabase](https://supabase.com/)，點擊 **New Project**。
   - Name: `nchu-exam`
   - Database Password: `[請設定一個強密碼並記錄下來]`
   - Region: `Singapore` (對台灣通訊延遲最低)
2. **獲取連線字串**:
   - 進入左側選單 **Project Settings (齒輪)** -> **Database**。
   - 往下滑到 **Connection string**。
   - **重要：您需要兩種連線方式：**
     - **Transaction (用於日常運行)**: 選擇命名為 `Transaction` 的選項。這將用於 `DATABASE_URL`。這通常會使用連接埠 `6543` 且包含 `?pgbouncer=true`。
     - **Session (用於遷移/Seed)**: 選擇命名為 `Session` (或原本的 `Direct`) 的選項。這將用於 `DIRECT_URL`。這通常會使用連接埠 `5432` 指向資料庫原始端。

## 2. 本地開發環境變數設定
請開啟 `server/.env`。**重點：如果您的網路環境不支持 IPv6 (大部分家用網路)，請務必使用「Pooler」形式的 URL：**

1. 在 Supabase 的 **Database Settings** 中，找到 **Connection string**。
2. 點擊 **Connection Pooler** 開關 (確保它是開啟的)。
3. **Mode 選擇 Transaction** -> 複製 URL 到 `DATABASE_URL` (通常 port 是 6543)。
4. **Mode 選擇 Session** -> 複製 URL 到 `DIRECT_URL` (通常 port 是 5432)。

您的 `.env` 應該長得像這樣（注意主機名包含 `pooler.supabase.com`）：

```env
# Transaction Mode (Port 6543)
DATABASE_URL="postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session Mode (Port 5432) - 即使是 Direct，也建議使用 Pooler 的 Session Host 以支援 IPv4
DIRECT_URL="postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

> [!TIP]
> 如果您使用的是 Supabase 提供的 `db.[REF].supabase.co` 這種主機名，它通常只支援 IPv6，這就是為什麼您會遇到 `P1001` (無法連線) 的原因。切換到帶有 `pooler` 的網址即可解決。

## 3. 同步資料庫結構 (Prisma)
在您的 `server` 目錄執行以下指令，這會直接在 Supabase 上建立所有 9 張資料表：

```bash
# 推送 Schema
npx prisma db push

# 寫入初始測試數據 (管理員、預設班級、考卷)
npx prisma db seed
```

## 5. 安全性說明：關於 RLS 警告
在 Supabase 控制台，您可能會看到紅色的 **"RLS is disabled"** 警告。

### 為什麼可以暫時忽略？
- **Supabase 有兩條路徑：**
  1. **Data API (PostgREST)**: 這是給前端直接透過 Supabase SDK 存取的。它需要 RLS 來保護。
  2. **Direct Connection (Prisma)**: 這是我們的 NestJS 伺服器使用的方式。伺服器使用管理員帳號 (`postgres`) 連線，會繞過 RLS。
- 由於我們的架構是 `前端 -> NestJS -> Prisma -> 資料庫`，安全性是在 NestJS 中控制的，因此 **RLS 不會影響您的伺服器運行**。

### 如果您想消除警告：
您可以為每張表點擊 **"Enable RLS"**。
- **注意**：一旦啟動 RLS 且沒有設定 Policy (政策)，所有人透過 Data API 都會抓不到資料。這對我們的 NestJS + Prisma 架構反而是最安全的（因為完全封鎖了 Data API 這條路徑）。

## 6. 下一步：寫入初始資料
現在結構有了，但資料庫是空的。請執行：
```bash
npx prisma db seed
```
這會在 Supabase 中建立：
- 測試老師：`admin@nchu.edu.tw` / `admin123`
- 預設班級與學員資訊

---

## 7. 錯誤排查：`Tenant or user not found`（與老師帳號無關）

若後端日誌出現 `DriverAdapterError: Tenant or user not found` 或 PostgreSQL `FATAL: Tenant or user not found`，這是 **Supabase 連線集區（Supavisor）拒絕連線**，不是資料庫裡找不到 `admin@nchu.edu.tw` 這筆老師資料。

請依序檢查：

1. **使用者名稱格式（最常見）**  
   使用 **Connection Pooler** 主機（網址含 `pooler.supabase`）時，使用者必須是 **`postgres.[專案代號]`**，不能只有 `postgres`。請到 Supabase 控制台 **Project Settings → Database → Connection string**，依 **Transaction** / **Session** 模式各複製一次，勿手動改成單純的 `postgres`。

2. **密碼**  
   須與建立專案時設定的 **Database password** 一致；若曾重設密碼，請更新 `.env` 內兩條 URL 的密碼（本專案禁止由助理代改 `.env`，請您本機自行確認）。

3. **埠與參數**  
   - 日常執行用的 `DATABASE_URL` 若為 **Transaction 模式（常為 6543）**，請保留官方字串中的 **`pgbouncer=true`**（或同等查詢參數）。  
   - `DIRECT_URL` / **Session 模式（常為 5432）** 用於遷移與 `prisma db seed`，請勿與 Transaction URL 混用同一條來跑 Prisma Migrate（見 [Prisma × Supabase 說明](https://supabase.com/docs/guides/database/prisma)）。

4. **確認已有種子資料**  
   連線成功後，若仍無法以 `admin@nchu.edu.tw` 登入，請在 `server` 目錄執行：
   ```bash
   npx prisma db seed
   ```

---

*完成後，您可以啟動您的伺服器 `npm run start:dev`，它就會連到雲端資料庫了！*
