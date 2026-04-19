import { test, expect } from '@playwright/test';

test.describe('防弊監控 WebSocket 狀態', () => {
  test('登入後進入防弊頁顯示連線狀態列', async ({ page }) => {
    await page.goto('/teacher/login');
    await page.fill('input[type="email"]', 'admin@nchu.edu.tw');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/teacher\/(overview|dashboard)/, { timeout: 20_000 });

    await page.goto('/teacher/cheat');
    const bar = page.getByTestId('monitor-ws-status');
    await expect(bar).toBeVisible({ timeout: 15_000 });
    await expect(bar).toContainText(/已連線|重新連線中|無法連線/);
  });
});
