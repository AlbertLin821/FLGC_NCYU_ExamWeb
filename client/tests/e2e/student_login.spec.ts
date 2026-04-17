import { test, expect } from '@playwright/test';

test('Student login and dashboard flow', async ({ page }) => {
  await page.goto('/student/login');
  
  // Fill in student login details from seed data
  await page.fill('input[placeholder="例如: 411200000"]', '411200001');
  await page.fill('input[placeholder="您的真實姓名"]', '王小明');
  await page.click('button[type="submit"]');

  // Verify successful login and redirect to exams page
  await page.waitForURL(/\/student\/exams/);
  await expect(page.getByText('王小明')).toBeVisible({ timeout: 10000 });
});
