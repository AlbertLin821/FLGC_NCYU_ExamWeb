import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 交卷後重跑 E2E 前清空李小華的 session，避免「已完成測驗」導致 skip。
 * 設 E2E_SKIP_SESSION_RESET=1 可略過（例如不想動本機 DB）。
 */
export default async function globalSetup() {
  if (process.env.E2E_SKIP_SESSION_RESET === '1') {
    console.log('[e2e global-setup] E2E_SKIP_SESSION_RESET=1，略過 session 重置');
    return;
  }
  const serverDir = path.resolve(__dirname, '../../../server');
  execSync('npx ts-node scripts/e2e-reset-sessions.ts', {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
}
