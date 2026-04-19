import { test, expect } from '@playwright/test';

test('後台：登入後可開啟考卷管理頁', async ({ page }) => {
  await page.goto('/teacher/login');
  await page.fill('input[type="email"]', 'system@ncyu.edu.tw');
  await page.fill('input[type="password"]', 'SystemDemo123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/teacher/);

  await page.getByRole('link', { name: '考卷管理' }).click();
  await expect(page).toHaveURL(/\/teacher\/exams/);
  await expect(page.locator('h3', { hasText: '考卷管理' })).toBeVisible({ timeout: 10_000 });
});
