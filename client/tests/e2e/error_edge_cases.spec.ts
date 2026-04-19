import { test, expect } from '@playwright/test';

test.describe('錯誤與權限（非完整快樂路徑）', () => {
  test('未登入學生造訪 /student/exams 會導向登入頁', async ({ page }) => {
    await page.goto('/student/exams');
    await expect(page).toHaveURL(/\/student\/login/, { timeout: 10_000 });
  });

  test('未帶教師 token 造訪 /teacher/exams 會導向教師登入', async ({ page }) => {
    await page.goto('/teacher/exams');
    await expect(page).toHaveURL(/\/teacher\/login/, { timeout: 10_000 });
  });

  test('學生登入後造訪不存在的考卷會提示並返回考卷列表', async ({ page }) => {
    await page.goto('/student/login');
    await page.fill('input[placeholder="例如: 411200000"]', '411200001');
    await page.fill('input[placeholder="您的真實姓名"]', '王小明');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/student\/exams/, { timeout: 20_000 });

    const dialogPromise = page.waitForEvent('dialog', { timeout: 20_000 });
    await page.goto('/student/exam/999999999');
    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/失敗|不存在|考卷/);
    await dialog.accept();
    await expect(page).toHaveURL(/\/student\/exams/, { timeout: 15_000 });
  });

  test('登入 API 回傳 500 時顯示可讀錯誤訊息（非無限 loading）', async ({ page }) => {
    await page.route('**/api/auth/student/verify', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: '伺服器錯誤' }),
      });
    });

    await page.goto('/student/login');
    await page.fill('input[placeholder="例如: 411200000"]', '411200001');
    await page.fill('input[placeholder="您的真實姓名"]', '王小明');
    await page.click('button[type="submit"]');

    await expect(page.getByText('伺服器錯誤')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });
});
