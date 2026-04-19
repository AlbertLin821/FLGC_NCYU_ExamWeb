#!/usr/bin/env bash
#
# Debian 12（bookworm）一鍵部署：Node 20、Nginx（/api 反代、/cheat WebSocket）、systemd 後端服務、前端建置與靜態目錄。
# 用法（於 VPS 上，專案根目錄或指定路徑）：
#   sudo bash scripts/deploy/deploy-debian.sh
# 環境變數（可選）：
#   APP_ROOT          專案根目錄（預設：腳本所在目錄往上兩層）
#   DEPLOY_DOMAIN     對外網址，供 VITE_API_URL 與說明用（預設 https://ncyulanguageexam.com）
#   API_PORT          後端監聽埠（預設 3000，須與 server/.env 的 PORT 一致）
#   WEB_ROOT          前端靜態檔目錄（預設 /var/www/ncyulanguageexam/html）
#   SERVICE_USER      執行 Node 的 Linux 使用者（預設 examapp）
#   SKIP_APT          設為 1 略過 apt 安裝（僅建置與重啟服務）
#   SKIP_NODE_SETUP   設為 1 略過 NodeSource 安裝（假設已裝 Node 20+）
#   RUN_CERTBOT       設為 1 於最後執行 certbot（需 DNS 已指向本機；並請設 CERTBOT_EMAIL）
#   CERTBOT_EMAIL     供 certbot 註冊用（例如 admin@example.edu.tw）
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DEFAULT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_ROOT="${APP_ROOT:-$REPO_DEFAULT}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-https://ncyulanguageexam.com}"
API_PORT="${API_PORT:-3000}"
WEB_ROOT="${WEB_ROOT:-/var/www/ncyulanguageexam/html}"
SERVICE_USER="${SERVICE_USER:-examapp}"
NODE_MAJOR="${NODE_MAJOR:-20}"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
NC='\033[0m'

die() {
  echo -e "${RED}[錯誤]${NC} $*" >&2
  exit 1
}

step() {
  echo ""
  echo -e "${GRN}>>>${NC} $*"
}

warn() {
  echo -e "${YLW}[注意]${NC} $*" >&2
}

on_err() {
  local exit_code=$?
  local line_no=$1
  echo -e "${RED}[失敗]${NC} 指令於第 ${line_no} 行結束，結束碼 ${exit_code}。請向上捲動查看該步驟輸出。"
  exit "$exit_code"
}
trap 'on_err $LINENO' ERR

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "請以 root 執行，或使用：sudo bash $0"
  fi
}

step "檢查 root"
require_root

step "確認專案目錄：${APP_ROOT}"
[[ -d "${APP_ROOT}/server" ]] || die "找不到 ${APP_ROOT}/server，請設定 APP_ROOT 為專案根目錄。"
[[ -d "${APP_ROOT}/client" ]] || die "找不到 ${APP_ROOT}/client。"

if [[ ! -f "${APP_ROOT}/server/.env" ]]; then
  if [[ -f "${APP_ROOT}/server/.env.example" ]]; then
    warn "尚未建立 server/.env。請複製並編輯後再執行本腳本："
    echo "  cp ${APP_ROOT}/server/.env.example ${APP_ROOT}/server/.env"
    echo "  nano ${APP_ROOT}/server/.env"
    echo "（須設定 DATABASE_URL、JWT_SECRET、CORS_ORIGINS=${DEPLOY_DOMAIN} 等；本腳本不會覆寫 .env）"
  fi
  die "缺少 ${APP_ROOT}/server/.env"
fi

if [[ "${SKIP_APT:-0}" != "1" ]]; then
  step "安裝系統套件（nginx、certbot、git、編譯工具等）"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx rsync build-essential
else
  warn "已略過 apt（SKIP_APT=1）"
fi

if [[ "${SKIP_NODE_SETUP:-0}" != "1" ]]; then
  step "安裝 Node.js ${NODE_MAJOR}.x（NodeSource）"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
else
  warn "已略過 NodeSource（SKIP_NODE_SETUP=1）"
fi

command -v node >/dev/null || die "找不到 node"
command -v npm >/dev/null || die "找不到 npm"
node -v

step "建立系統使用者 ${SERVICE_USER}（若不存在）"
if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/var/lib/${SERVICE_USER}" --shell /usr/sbin/nologin "${SERVICE_USER}" || die "useradd 失敗"
fi

step "調整專案目錄擁有者（供 ${SERVICE_USER} 執行 npm／讀取 .env）"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_ROOT}/server" "${APP_ROOT}/client"

step "後端：npm ci、Prisma、建置"
cd "${APP_ROOT}/server"
sudo -u "${SERVICE_USER}" -H npm ci
sudo -u "${SERVICE_USER}" -H npx prisma generate
sudo -u "${SERVICE_USER}" -H npx prisma migrate deploy
sudo -u "${SERVICE_USER}" -H npm run build

step "前端：npm ci、建置（VITE_API_URL=${DEPLOY_DOMAIN}）"
cd "${APP_ROOT}/client"
sudo -u "${SERVICE_USER}" -H npm ci
sudo -u "${SERVICE_USER}" -H env VITE_API_URL="${DEPLOY_DOMAIN}" npm run build

step "部署靜態檔至 ${WEB_ROOT}"
install -d -m 0755 -o root -g root "$(dirname "${WEB_ROOT}")"
install -d -m 0755 -o www-data -g www-data "${WEB_ROOT}"
rsync -a --delete "${APP_ROOT}/client/dist/" "${WEB_ROOT}/"

step "安裝 systemd 服務 ncyu-exam-api"
UNIT_PATH="/etc/systemd/system/ncyu-exam-api.service"
sed -e "s|__APP_ROOT__|${APP_ROOT}|g" -e "s|__SERVICE_USER__|${SERVICE_USER}|g" \
  "${SCRIPT_DIR}/ncyu-exam-api.service.template" > "${UNIT_PATH}"
chmod 0644 "${UNIT_PATH}"

systemctl daemon-reload
systemctl enable ncyu-exam-api.service
systemctl restart ncyu-exam-api.service
systemctl --no-pager -l status ncyu-exam-api.service || true

step "安裝 Nginx 站台設定"
NGX_SITE="/etc/nginx/sites-available/ncyulanguageexam.conf"
sed -e "s|__WEB_ROOT__|${WEB_ROOT}|g" -e "s|__API_PORT__|${API_PORT}|g" \
  "${SCRIPT_DIR}/nginx-ncyulanguageexam.conf.template" > "${NGX_SITE}"
ln -sf "${NGX_SITE}" /etc/nginx/sites-enabled/ncyulanguageexam.conf
# 避免 default 搶佔 server_name
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl reload nginx

if [[ "${RUN_CERTBOT:-0}" == "1" ]]; then
  step "執行 Certbot（Let's Encrypt）"
  HOST_FOR_CERT="${DEPLOY_DOMAIN#https://}"
  HOST_FOR_CERT="${HOST_FOR_CERT#http://}"
  HOST_FOR_CERT="${HOST_FOR_CERT%%/*}"
  if [[ -z "${CERTBOT_EMAIL:-}" ]]; then
    warn "已設定 RUN_CERTBOT=1 但未設定 CERTBOT_EMAIL，略過 certbot。"
    echo "  範例：sudo CERTBOT_EMAIL=you@school.edu.tw RUN_CERTBOT=1 bash scripts/deploy/deploy-debian.sh"
  else
    certbot --nginx -d "${HOST_FOR_CERT}" --non-interactive --agree-tos --email "${CERTBOT_EMAIL}" --redirect || \
      warn "Certbot 失敗（請確認 DNS 與 80/443）。可稍後手動：certbot --nginx -d ${HOST_FOR_CERT}"
  fi
else
  warn "未執行 Certbot。正式 HTTPS 請設 RUN_CERTBOT=1 與 CERTBOT_EMAIL，或手動 certbot --nginx。"
fi

step "完成"
echo "後端：systemctl status ncyu-exam-api"
echo "Nginx：curl -sI http://127.0.0.1/api/  （視路由可能 404，重點為有回應）"
echo "請確認 server/.env 內 CORS_ORIGINS 含：${DEPLOY_DOMAIN}"
