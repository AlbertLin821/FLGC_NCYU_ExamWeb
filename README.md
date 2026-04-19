# NCHU Online English Exam Platform

線上英文測驗平台（學生端考試、教師端出題與成績、防弊監控、AI 輔助評分）。

## 專案結構

| 目錄 | 說明 |
|------|------|
| `client/` | React + Vite 前端 |
| `server/` | NestJS 後端、Prisma、Socket.IO |
| `docs/` | 啟動與操作說明 |

## 快速開始

請詳閱 **[docs/startup_guide.md](docs/startup_guide.md)**，內容包含：

- 前置需求（Node.js、PostgreSQL 等）
- 後端與前端啟動指令
- 環境變數（`server/.env.example`、`client/.env.example`）
- 單元測試、後端 e2e、前端 E2E 指令
- 預設種子帳號與已知限制（例如 AI 評分可能進入 `pending_review`）

## 持續整合

GitHub Actions 工作流程定義於 [.github/workflows/ci.yml](.github/workflows/ci.yml)：

- **client**：建置、lint、Vitest
- **server**：PostgreSQL 服務容器、`prisma migrate deploy`、建置、lint、Jest、**Jest e2e**

## 授權

請依各目錄內授權聲明為準。
