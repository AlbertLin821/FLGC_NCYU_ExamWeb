# NCYU ExamWeb N2 VPS 重建與部署 Runbook

本文件是 `ncyulanguageexam.com` 正式站的完整重建手冊，目標是從舊 Google VPS 刪除後，重新建立一台 Google Compute Engine N2 主機，部署本專案，接回 Cloudflare 與 Supabase，並提供考前啟動、考後停機、壓測與故障排查流程。

本文件不保存任何密碼、Supabase 連線字串、JWT secret 或 API key。所有機密只填在新 VPS 的 `server/.env`，不要提交到 Git。

## 目前採用的正式架構

- VPS：Google Compute Engine，Debian 12，`n2-standard-4`，4 vCPU，16 GB memory。
- 後端：NestJS，systemd service 名稱 `ncyu-exam-api`，內部監聽 `127.0.0.1:3000`。
- 前端：Vite build 後由 Nginx 提供靜態檔，預設 web root `/var/www/ncyulanguageexam/html`。
- 反向代理：Nginx 對外提供 HTTP/HTTPS，`/api/` 反代到 NestJS，`/cheat` 反代 WebSocket。
- 資料庫：Supabase PostgreSQL，正式環境用 Prisma migration，不在正式庫執行測試 seed。
- DNS/CDN：Cloudflare 代理 `ncyulanguageexam.com` 與 `www.ncyulanguageexam.com`。
- GitHub repo：`https://github.com/AlbertLin821/FLGC_NCYU_ExamWeb.git`。

## 成本與考季策略

考試月份才啟動較高規格 VPS，考後停止 VM，通常比全年長開 N2 省錢。Supabase 同樣可在需要的月份升級 Pro，再依 Supabase 規則降回 Free 或調整方案。

注意事項：

- Google Compute Engine VM 停止後，通常不再收 VM uptime 的 vCPU/記憶體費用，但永久磁碟、靜態外部 IP、快照與網路流量仍可能計費。
- 若建立的是靜態外部 IP，請確認 Google Cloud 對閒置 static IP 的收費規則。
- Supabase Pro、compute、storage、egress、connection pool 或額外用量的費用以 Supabase 帳單為準。
- 實際金額請以官方頁面與計價器確認：
  - Google Compute Pricing: https://cloud.google.com/products/compute/pricing
  - Google Pricing Calculator: https://cloud.google.com/products/calculator
  - Supabase Pricing: https://supabase.com/pricing

## 同場約 400 人正式考：實作與基礎建設要點

- **作答寫入**：每題以 `(session_id, question_id)` 對 `answers` 做 upsert，不產生重複列。`exam_sessions.answered_question_count` 在每次儲存答案後一併更新，監看與班級學生列表可優先讀此欄，避免每頁都對 `answers` 做重 COUNT。
- **查詢索引**：針對「同一考卷＋工作階段狀態」（例如 `published` 期間內的 `in_progress`）的篩選，已建立 `exam_sessions (exam_id, status)` 複合索引，可依 Prisma migration 佈建。
- **自動儲存節流**：客觀題於換題或交卷時寫入；問答題以週期儲存（專案內預設約 45 秒、且內文相對上次寫入有變更才送），避免高頻打滿 API 與資料庫。
- **在線／心跳**：不要用高頻更新 `exam_sessions` 當 heartbeat。若需「誰在線上」，可另闢 Redis、程序內記憶體、或與主流程分離的即時層，避免與交卷、計分爭奪 DB 連線。
- **連線與集區**：`DATABASE_URL` 應使用 Supabase 連線集區（Supavisor，常見 **Transaction 模式、埠 6543**）之 URL，讓多個短請求共用池化連線；`prisma migrate` 則以 Session／Direct URL（或專用 `DIRECT_URL`）執行。實作時參考 `server/src/prisma/prisma.service.ts` 啟動時對 Pooler 的參數提示與專案內 `supabase_setup.md`。**實際連線字串只放在伺服器本機的 `server/.env`，不提交到 Git。**

## 一、刪除舊 VPS 前檢查

你選擇的流程是「先刪舊機，再建立新的 N2 server」。這種方式最乾淨，但會有停機時間，也不能依賴舊機上的 `.env`。刪除前務必確認下面項目。

### 1. 確認 GitHub 已經是最新版本

在本機專案目錄確認：

```powershell
cd C:\Users\Administrator\Desktop\ncyu-language-center-exam
git status --short
git log -1 --oneline
git remote -v
```

確認最新 commit 已 push 到：

```text
https://github.com/AlbertLin821/FLGC_NCYU_ExamWeb.git
```

如果尚未 push：

```powershell
git add -A
git commit -m "docs: update server rebuild runbook"
git push origin master
```

### 2. 確認資料存在 Supabase

本專案的正式資料應該存在 Supabase PostgreSQL，不應只存在 VPS 本機。刪除 VPS 前，到 Supabase 後台確認：

- 專案可以開啟。
- Tables 中看得到教師、班級、學生、考卷等資料。
- Database password 可重新設定或仍可取得。
- Project Settings -> Database 裡可以複製 connection string。

### 3. 確認機密可以重新填寫

新 VPS 會重新建立 `server/.env`。請先準備以下資訊：

| 變數 | 來源 | 說明 |
|------|------|------|
| `DATABASE_URL` | Supabase Database connection string | 應用程式執行用，建議使用 Pooler Transaction URL |
| `DIRECT_URL` | Supabase Database connection string | Prisma migration 用，使用 Session/Direct URL |
| `JWT_SECRET` | 自行產生 | 建議 32 字元以上隨機字串 |
| `JWT_EXPIRES_IN` | 自行設定 | 例如 `24h` |
| `REDIS_HOST` | 本機或外部 Redis | 目前可填 `localhost` |
| `REDIS_PORT` | 本機或外部 Redis | 目前可填 `6379` |
| `OPENAI_API_KEY` | OpenAI 後台 | 若不用可先留空或保留占位 |
| `GEMINI_API_KEY` | Google AI Studio / Vertex AI | 若作文評分使用 Gemini 則必填 |
| `GEMINI_MODEL` | 專案設定 | 例如 `gemini-2.5-flash` |
| `AI_MODEL` | 專案設定 | 例如 `gpt-4o-mini` |
| `PORT` | 固定設定 | `3000` |
| `NODE_ENV` | 固定設定 | `production` |
| `CORS_ORIGINS` | 正式網址 | `https://ncyulanguageexam.com,https://www.ncyulanguageexam.com` |

### 4. 確認 Cloudflare 權限

確認可以登入 Cloudflare，且能修改：

- DNS records。
- SSL/TLS mode。
- Cache Rules。
- WAF / Rate limiting。

### 5. 刪除舊 Google VPS

在 Google Cloud Console：

1. 進入 Compute Engine -> VM instances。
2. 找到舊的 VPS instance。
3. 確認沒有需要保留的本機檔案。
4. Delete instance。
5. 如果舊 boot disk 不需要保留，刪除舊 disk，避免繼續計費。
6. 如果舊 static IP 不再使用，釋放舊 static IP，避免繼續計費。

## 二、建立新的 N2 VPS

### 1. 建立 VM instance

Google Cloud Console -> Compute Engine -> VM instances -> Create instance。

建議設定：

| 項目 | 設定 |
|------|------|
| Name | `ncyu-exam-n2` |
| Region | `asia-southeast1` |
| Zone | `asia-southeast1-a` 或同區可用 zone |
| Machine series | `N2` |
| Machine type | `n2-standard-4` |
| Boot disk OS | Debian 12 |
| Boot disk type | Balanced persistent disk |
| Boot disk size | 30-50 GB |
| Firewall | Allow HTTP traffic、Allow HTTPS traffic |

選 `asia-southeast1` 是因為 Supabase 若在新加坡區域，VPS 靠近資料庫可以降低延遲。若 Supabase 專案在其他區域，優先讓 VPS 靠近 Supabase。

### 2. 建立並綁定新的 static external IP

建議使用 static external IP，避免停機或重建後 Cloudflare DNS 每次都要改。

操作路徑：

1. VPC network -> IP addresses。
2. Reserve external static IP address。
3. Name：`ncyu-exam-ip`。
4. Region：與 VM 相同。
5. Attach to：剛建立的 `ncyu-exam-n2`。
6. 記下 IPv4 位址，後面 Cloudflare 會用到。

### 3. 防火牆設定

確認 VPC firewall 至少有：

| Port | Source | 用途 |
|------|--------|------|
| `tcp:22` | 你的管理 IP，或暫時 `0.0.0.0/0` | SSH |
| `tcp:80` | `0.0.0.0/0` | HTTP、Certbot 驗證 |
| `tcp:443` | `0.0.0.0/0` | HTTPS |

如果要更安全，可以之後把 `80/443` 來源限制為 Cloudflare IP ranges，但第一次部署和 Certbot 建議先保持簡單，確認站點正常後再收斂。

## 三、Cloudflare DNS 與 SSL 設定

### 1. DNS records

Cloudflare -> 你的網域 -> DNS -> Records。

新增或更新：

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| A | `@` | 新 VPS static external IP | Proxied，橘色雲 |
| A | `www` | 新 VPS static external IP | Proxied，橘色雲 |

也可以讓 `www` 使用 CNAME 指向 `ncyulanguageexam.com`，但 A record 指同一 IP 最直觀。

### 2. SSL/TLS mode

Cloudflare -> SSL/TLS -> Overview：

- 設為 `Full (strict)`。

不要用 `Flexible`。Flexible 會讓 Cloudflare 到 VPS 走 HTTP，容易造成 redirect loop、HTTPS 狀態不一致或安全性下降。

Cloudflare -> SSL/TLS -> Edge Certificates：

- 開啟 Always Use HTTPS。
- Automatic HTTPS Rewrites 可開啟。

### 3. Cache Rules

Cloudflare 靜態檔可以快取，但 API 與 WebSocket 不應快取。

建立 Cache Rules：

- Rule 1：URI Path starts with `/api/` -> Bypass cache。
- Rule 2：URI Path starts with `/cheat` -> Bypass cache。
- 如 Cloudflare 顯示 Socket.IO 路徑，也可加：URI Path starts with `/socket.io/` -> Bypass cache。

### 4. WAF / Rate limiting

k6 壓測時可能被 Cloudflare 視為異常流量。壓測前確認：

- WAF 是否有 challenge 或 block。
- Rate limiting 是否太低。
- 若要測 VPS 原始能力，可建立測試子網域並暫時設灰色雲，但正式考試建議仍用實際 Cloudflare 路徑做一次完整演練。

## 四、SSH 登入新 VPS

在 Google Cloud Console 可以用瀏覽器 SSH。若使用本機 PowerShell：

```powershell
ssh USERNAME@NEW_STATIC_IP
```

如果使用 SSH key：

```powershell
ssh -i C:\path\to\key USERNAME@NEW_STATIC_IP
```

登入後先更新系統：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl ca-certificates
```

## 五、Clone 專案

在 VPS 上執行：

```bash
cd ~
git clone https://github.com/AlbertLin821/FLGC_NCYU_ExamWeb.git NCYU_ExamWeb
cd NCYU_ExamWeb
git log -1 --oneline
```

確認 latest commit 是你剛剛推上 GitHub 的版本。

如果是 private repo，請先設定 GitHub SSH key 或使用 GitHub personal access token。不要把 token 寫進文件或提交到 repo。

## 六、建立 `server/.env`

在 VPS 上：

```bash
cd ~/NCYU_ExamWeb
cp server/.env.example server/.env
nano server/.env
```

正式環境建議格式：

```env
DATABASE_URL="postgres://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres"

JWT_SECRET="請改成長隨機字串"
JWT_EXPIRES_IN="24h"

REDIS_HOST="localhost"
REDIS_PORT=6379

OPENAI_API_KEY=""
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
AI_MODEL="gpt-4o-mini"

PORT=3000
NODE_ENV="production"
CORS_ORIGINS="https://ncyulanguageexam.com,https://www.ncyulanguageexam.com"
```

重點：

- `DATABASE_URL` 用 Supabase Pooler Transaction mode，常見 port 是 `6543`，通常要有 `pgbouncer=true`。
- `DIRECT_URL` 用 Session/Direct connection，供 Prisma migration 使用。
- `CORS_ORIGINS` 不要有結尾 `/`。
- `www` 與無 `www` 是不同 origin，兩者都可能使用時都要列入。
- 不要執行正式環境 seed，除非你明確要建立測試資料。

## 七、執行一鍵部署腳本

本專案提供 Debian 部署腳本：`scripts/deploy/deploy-debian.sh`。

首次部署建議直接執行：

```bash
cd ~/NCYU_ExamWeb
sudo DEPLOY_DOMAIN=https://ncyulanguageexam.com bash scripts/deploy/deploy-debian.sh
```

腳本會做這些事：

- 安裝 nginx、certbot、git、rsync、build-essential 等系統套件。
- 安裝 Node.js 20。
- 建立系統使用者 `examapp`。
- 執行後端 `npm ci`、`npx prisma generate`、`npx prisma migrate deploy`、`npm run build`。
- 執行前端 `npm ci`，並用 `VITE_API_URL=https://ncyulanguageexam.com` build。
- 將 `client/dist/` 同步到 `/var/www/ncyulanguageexam/html`。
- 建立 systemd service：`ncyu-exam-api`。
- 寫入 Nginx site config 並 reload Nginx。

如果重新部署且 Node 與 apt 套件都已安裝，可用：

```bash
cd ~/NCYU_ExamWeb
sudo SKIP_APT=1 SKIP_NODE_SETUP=1 DEPLOY_DOMAIN=https://ncyulanguageexam.com bash scripts/deploy/deploy-debian.sh
```

## 八、申請 HTTPS 憑證

確認 Cloudflare DNS 已指向新 static IP，且 port 80/443 開放後，在 VPS 執行：

```bash
sudo certbot --nginx -d ncyulanguageexam.com -d www.ncyulanguageexam.com --redirect
```

如果 Certbot 問：

```text
1: Attempt to reinstall this existing certificate
2: Renew & replace the certificate
```

通常選 `1`。只有憑證真的失效、網域變更或你明確要重新簽發時才選 `2`，避免碰到 CA rate limit。

完成後檢查：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 九、部署驗證

### 1. 檢查服務狀態

```bash
sudo systemctl status nginx --no-pager -l
sudo systemctl status ncyu-exam-api --no-pager -l
```

### 2. 檢查 listening ports

```bash
sudo ss -ltnp | grep -E ':80|:443|:3000'
```

正常要看到：

- `:80`：Nginx。
- `:443`：Nginx。
- `:3000`：Node/NestJS。

### 3. 檢查 Prisma migration

```bash
cd ~/NCYU_ExamWeb/server
npx prisma migrate status
```

正常結果應顯示 database schema is up to date，且 migration 數量與 repo 中 `server/prisma/migrations` 一致。

### 4. 檢查 HTTP/HTTPS

```bash
curl -I http://ncyulanguageexam.com
curl -I https://ncyulanguageexam.com
curl -I https://www.ncyulanguageexam.com
```

預期：

- HTTP 會被 redirect 到 HTTPS。
- `https://ncyulanguageexam.com` 回 `HTTP/2 200` 或 `HTTP/1.1 200`。
- `www` 會導向主網域，或至少可以正常開站。

### 5. 瀏覽器功能驗證

用無痕視窗測：

- 首頁可載入最新 UI。
- 教師登入正常。
- 教師首頁資料可載入。
- 班級管理、學生管理、匯入預覽正常。
- 考卷管理可開啟。
- 學生輸入學號後能看到確認彈窗。
- 學生可進入考試、作答、交卷。
- 防弊監控 WebSocket 無連線錯誤。

## 十、考前啟動流程

考試前建議至少提前一天啟動並壓測。

### 1. 啟動 VM

Google Cloud Console -> Compute Engine -> VM instances -> 選 `ncyu-exam-n2` -> Start。

如果使用 static external IP，DNS 不需要改。

### 2. 檢查服務

SSH 進 VPS：

```bash
sudo systemctl status nginx --no-pager -l
sudo systemctl status ncyu-exam-api --no-pager -l
sudo ss -ltnp | grep -E ':80|:443|:3000'
curl -I https://ncyulanguageexam.com
```

### 3. 更新程式

```bash
cd ~/NCYU_ExamWeb
git fetch origin
git pull --ff-only origin master
sudo SKIP_APT=1 SKIP_NODE_SETUP=1 DEPLOY_DOMAIN=https://ncyulanguageexam.com bash scripts/deploy/deploy-debian.sh
sudo certbot --nginx -d ncyulanguageexam.com -d www.ncyulanguageexam.com --redirect
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 確認 Supabase 方案與連線

考試月份若流量較大：

- 將 Supabase 升級到 Pro。
- 檢查 Database compute、connection pool、storage 與 egress。
- 確認 `DATABASE_URL` 使用 Pooler Transaction mode。
- 確認 `DIRECT_URL` 可跑 migration。

## 十一、考後停機與降成本

考試結束後：

1. 確認沒有學生正在考試。
2. 確認資料已完整寫入 Supabase。
3. 如需要，從 Supabase 匯出備份或確認 PITR/backup 狀態。
4. 停止 VM。

Google Cloud Console：

```text
Compute Engine -> VM instances -> ncyu-exam-n2 -> Stop
```

注意：

- Stop VM 後，vCPU/記憶體通常不再計費。
- Disk、static IP、snapshot 仍可能計費。
- 若完全不再需要，才刪除 VM、disk、static IP。
- Supabase Pro 是否降回 Free 要看資料大小、功能需求與 Supabase 當下限制。降級前先確認不會超出 Free 限制。

## 十二、k6 壓測流程

專案已有 k6 腳本在 `scripts/k6/`。

### 1. 本機設定目標網址

PowerShell：

```powershell
$env:K6_BASE_URL="https://ncyulanguageexam.com"
```

### 2. 先跑低流量

```powershell
k6 run scripts/k6/student-load.js
```

或教師端：

```powershell
k6 run scripts/k6/teacher-load.js
```

### 3. 逐步提高流量

不要一開始就打最大流量。建議順序：

1. 5-10 VU，確認流程正確。
2. 20-50 VU，觀察 API latency。
3. 接近實際考生人數，觀察 DB 與 VPS。
4. 如果有正式考試尖峰，做短時間 spike test。

### 4. 壓測時觀察 VPS

SSH 進 VPS：

```bash
top
free -h
df -h
sudo journalctl -u ncyu-exam-api -f
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

也可安裝 `htop`：

```bash
sudo apt install -y htop
htop
```

### 5. 壓測時觀察 Supabase

Supabase dashboard 檢查：

- CPU。
- RAM。
- Disk IO。
- Active connections。
- Pooler 使用狀態。
- Slow queries。
- API errors。

如果 N2 VPS CPU/RAM 很低，但請求仍慢，瓶頸通常在資料庫、連線池、慢查詢或 API 查詢策略，不是 VPS 規格。

## 十三、常見故障排查

### 1. 前端沒有更新

確認 VPS 真的 pull 到最新 commit：

```bash
cd ~/NCYU_ExamWeb
git log -1 --oneline
git status --short
```

重新部署：

```bash
sudo SKIP_APT=1 SKIP_NODE_SETUP=1 DEPLOY_DOMAIN=https://ncyulanguageexam.com bash scripts/deploy/deploy-debian.sh
```

確認 web root 的檔案時間：

```bash
ls -lah /var/www/ncyulanguageexam/html
ls -lah /var/www/ncyulanguageexam/html/assets | tail
```

瀏覽器用無痕或 `Ctrl+F5` 強制刷新。Cloudflare 可 Purge cache。

### 2. Cloudflare 521

521 通常代表 Cloudflare 連不到來源站。

檢查：

```bash
sudo systemctl status nginx --no-pager -l
sudo ss -ltnp | grep -E ':80|:443'
sudo nginx -t
curl -I http://127.0.0.1
```

常見原因：

- Nginx 沒跑。
- 443 沒 listen。
- GCP firewall 沒開 80/443。
- Cloudflare DNS 指到舊 IP。
- Certbot 還沒重新設定 HTTPS。

### 3. API CORS 錯誤

檢查 `server/.env`：

```bash
cd ~/NCYU_ExamWeb/server
grep CORS_ORIGINS .env
```

應為：

```env
CORS_ORIGINS="https://ncyulanguageexam.com,https://www.ncyulanguageexam.com"
```

修改後重啟：

```bash
sudo systemctl restart ncyu-exam-api
```

### 4. Prisma migration 失敗

檢查 `.env`：

- `DIRECT_URL` 是否存在。
- 是否使用 Supabase Session/Direct URL。
- 密碼是否正確。
- Supabase project 是否 paused。

執行：

```bash
cd ~/NCYU_ExamWeb/server
npx prisma validate
npx prisma migrate status
```

正式環境只用：

```bash
npx prisma migrate deploy
```

不要在正式環境用 `migrate dev`。

### 5. NestJS service 起不來

檢查：

```bash
sudo systemctl status ncyu-exam-api --no-pager -l
sudo journalctl -u ncyu-exam-api -n 200 --no-pager
```

常見原因：

- `server/.env` 缺變數。
- `DATABASE_URL` 錯誤。
- `dist/src/main.js` 不存在，代表 build 沒成功。
- Node 版本不對。
- port 3000 被其他 process 佔用。

### 6. WebSocket 或防弊監控異常

檢查 Nginx config 是否包含 `/cheat` 反代與 upgrade headers：

```bash
sudo grep -n "location /cheat" -A20 /etc/nginx/sites-available/ncyulanguageexam.conf
```

檢查 Cloudflare 是否有快取或 WAF 擋 `/cheat`。

檢查後端 log：

```bash
sudo journalctl -u ncyu-exam-api -f
```

### 7. 資料庫或伺服器壓測卡頓

先分辨瓶頸：

- VPS CPU 高：增加 VPS 規格、檢查 Node blocking work、減少同步計算。
- VPS RAM 高：檢查 memory leak、大量查詢結果、Node process。
- Supabase CPU 高：檢查慢查詢、索引、批次查詢、N+1 query。
- Active connections 高：確認使用 Pooler Transaction URL，避免每個請求建立大量直連。
- Cloudflare 有 403/429/challenge：調整 WAF 或 rate limiting，不要誤判為 VPS 卡。

## 十四、常用指令速查

### 部署

```bash
cd ~/NCYU_ExamWeb
git fetch origin
git pull --ff-only origin master
sudo SKIP_APT=1 SKIP_NODE_SETUP=1 DEPLOY_DOMAIN=https://ncyulanguageexam.com bash scripts/deploy/deploy-debian.sh
sudo certbot --nginx -d ncyulanguageexam.com -d www.ncyulanguageexam.com --redirect
sudo nginx -t
sudo systemctl reload nginx
```

### 服務狀態

```bash
sudo systemctl status nginx --no-pager -l
sudo systemctl status ncyu-exam-api --no-pager -l
sudo journalctl -u ncyu-exam-api -n 200 --no-pager
```

### 連線與 port

```bash
sudo ss -ltnp | grep -E ':80|:443|:3000'
curl -I https://ncyulanguageexam.com
curl -I https://www.ncyulanguageexam.com
```

### Prisma

```bash
cd ~/NCYU_ExamWeb/server
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
```

### Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 十五、相關文件

- Debian 部署腳本說明：`docs/deploy-debian.md`
- 本地開發與啟動：`docs/startup_guide.md`
- Supabase 連線注意事項：`supabase_setup.md`
- 部署腳本：`scripts/deploy/deploy-debian.sh`
- Nginx 範本：`scripts/deploy/nginx-ncyulanguageexam.conf.template`
- systemd 範本：`scripts/deploy/ncyu-exam-api.service.template`
