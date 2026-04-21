import { test, expect } from '@playwright/test';

test('Student login and dashboard flow', async ({ page }) => {
  await page.goto('/student/login');
  
  // Fill in student login details from seed data
  await page.fill('input[placeholder="例如: 411200000"]', '411200001');
  await page.click('button[type="submit"]');
  await expect(page.getByText('確認學生資料')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('國立嘉義大學')).toBeVisible();
  await page.getByRole('button', { name: '確認進入考試' }).click();

  // Verify successful login and redirect to exams page
  await page.waitForURL(/\/student\/exams/);
  await expect(page.getByText('王小明')).toBeVisible({ timeout: 10000 });
});
