# Debian 12 與 Nginx 部署說明

單一網域 `https://ncyulanguageexam.com`：瀏覽器載入 Nginx 靜態前端，路徑 `/api` 與 `/cheat` 由 Nginx 反代至本機 NestJS（預設埠 `3000`）。

## 事前準備

1. DNS：將 `ncyulanguageexam.com`（及若需要之 `www`）A 記錄指向 VPS 公網 IP。
2. 防火牆：開放 80、443（SSH 另開）。
3. 於伺服器建立 `server/.env`（勿將含密碼之檔案提交版本庫）：
   - 複製 `server/.env.example` 並填寫 `DATABASE_URL`、`JWT_SECRET`、`REDIS_*` 等。
   - **必須**設定 `CORS_ORIGINS`（與使用者實際在瀏覽器網址列看到的來源一致，逗號可列多個）。
   - 若同時使用 **無 www** 與 **www**（例如有人從 `https://www.ncyulanguageexam.com` 開站，而 API 建置為 `https://ncyulanguageexam.com`），兩者為**不同來源**，須寫成：  
     `CORS_ORIGINS="https://ncyulanguageexam.com,https://www.ncyulanguageexam.com"`  
     修改後請執行：`sudo systemctl restart ncyu-exam-api`。
   - 較乾淨的做法：在 Nginx 為 **HTTPS** 的 `www` 設 `return 301` 導向主網域（須憑證含 `www`，certbot 可加 `-d www.ncyulanguageexam.com`），讓使用者只從一個主機名稱存取；部署範本已含 **HTTP** 的 `www`→主網域導向。
   - `PORT` 須與 Nginx 範本之反代埠一致（預設 3000）。

## 自動部署腳本

在已 clone 的專案**根目錄**執行：

```bash
sudo bash scripts/deploy/deploy-debian.sh
```

腳本會依序：安裝套件與 Node 20、後端 `npm ci` / Prisma / `npm run build`、前端以 `VITE_API_URL=https://ncyulanguageexam.com` 建置、同步至 `/var/www/ncyulanguageexam/html`、寫入 systemd `ncyu-exam-api` 並重啟、啟用 Nginx 站台。

失敗時 shell 會因 `set -e` 中止，並顯示 `trap` 提示之失敗行號；請向上捲動查看該步驟錯誤訊息。

### 常用環境變數

| 變數 | 說明 |
|------|------|
| `APP_ROOT` | 專案根目錄（預設為腳本相對路徑推得之 repo 根） |
| `DEPLOY_DOMAIN` | 前端建置用 `VITE_API_URL`（預設 `https://ncyulanguageexam.com`） |
| `API_PORT` | 與 `.env` 的 `PORT` 一致（預設 3000） |
| `SKIP_APT=1` | 略過 `apt-get` |
| `SKIP_NODE_SETUP=1` | 略過 NodeSource（本機已裝 Node 20+ 時） |
| `RUN_CERTBOT=1` | 腳本結尾嘗試 `certbot --nginx`（需 DNS 已生效） |

首次申請 TLS 建議 DNS 生效後再執行（須提供聯絡用電子郵件）：

```bash
sudo CERTBOT_EMAIL=admin@example.edu.tw RUN_CERTBOT=1 bash scripts/deploy/deploy-debian.sh
```

或手動（建議 apex 與 www 一併申請，方便之後做 HTTPS 導向）：  
`sudo certbot --nginx -d ncyulanguageexam.com -d www.ncyulanguageexam.com`

## 服務指令

```bash
sudo systemctl status ncyu-exam-api
sudo journalctl -u ncyu-exam-api -f
sudo systemctl reload nginx
```

## 資料庫

正式環境請使用 `npx prisma migrate deploy`，勿在正式庫執行 seed 測試資料（除非您清楚後果）。
