import { test, expect } from '@playwright/test';

test('Teacher login and dashboard flow', async ({ page }) => {
  await page.goto('/teacher/login');
  
  // Fill in teacher login details from seed data
  await page.fill('input[type="email"]', 'admin@nchu.edu.tw');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Verify successful login and redirect to dashboard
  await expect(page).toHaveURL(/\/teacher/);
  await expect(page.locator('text=儀表板')).toBeVisible();
});
