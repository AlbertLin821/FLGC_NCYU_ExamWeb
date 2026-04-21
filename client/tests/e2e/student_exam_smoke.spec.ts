import { test, expect } from '@playwright/test';

/**
 * 核心路徑 + 計時器煙霧（單一連續流程，避免並行搶同一張卷／重複交卷）：
 * 登入 → 進入考場 → 剩餘時間可見 → 重新整理後倒數未無故重置 → 作答 → 換題 → 交卷 → 結果頁
 *
 * 若資料庫中該學生已完成此考卷，整則測試會 skip（需清空 exam_sessions 或換種子／重灌 DB）。
 */
test.describe.configure({ mode: 'serial' });

test('學生：考試頁計時與交卷最小流程', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/student/login');
  await page.fill('input[placeholder="例如: 411200000"]', '411200002');
  await page.click('button[type="submit"]');
  await page.getByRole('button', { name: '確認進入考試' }).click();
  await page.waitForURL(/\/student\/exams/, { timeout: 20_000 });
  await page.waitForResponse(
    (r) => r.url().includes('/api/students/') && r.url().includes('/exams') && r.status() === 200,
    { timeout: 30_000 },
  );

  const emptyMsg = page.getByText('目前沒有可考的考卷');
  const enterBtn = page.getByRole('button', { name: /進入考場|繼續測驗/ }).first();
  await Promise.race([
    emptyMsg.waitFor({ state: 'visible', timeout: 5_000 }),
    enterBtn.waitFor({ state: 'visible', timeout: 5_000 }),
  ]).catch(() => {});
  if (await emptyMsg.isVisible().catch(() => false)) {
    test.skip(true, '無可參加考卷（請確認 seed、考試時間窗與班級綁定）');
  }
  await expect(enterBtn).toBeVisible({ timeout: 10_000 });

  await enterBtn.click();
  await expect(page.getByText('正在測驗')).toBeVisible({ timeout: 25_000 });

  const timeLocator = page.getByText(/剩餘時間:/);
  await expect(timeLocator).toBeVisible();
  const before = await timeLocator.textContent();

  await page.waitForTimeout(2500);
  await page.reload();
  await expect(page.getByText('正在測驗')).toBeVisible({ timeout: 25_000 });
  const after = await timeLocator.textContent();

  expect(before).toMatch(/剩餘時間:\s*\d+:\d+/);
  expect(after).toMatch(/剩餘時間:\s*\d+:\d+/);
  const parseSec = (s: string) => {
    const m = s.match(/剩餘時間:\s*(\d+):(\d+)/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
  };
  expect(parseSec(after!)).toBeLessThanOrEqual(parseSec(before!) + 5);

  await expect(page.getByText(/第 1 題/)).toBeVisible();
  await expect(page.getByPlaceholder('在這邊輸入您的答案...')).toBeVisible();

  await page.fill('textarea.form-input', 'E2E answer one.');
  await page.getByRole('button', { name: '下一題' }).click();

  await expect(page.getByText(/第 2 題/)).toBeVisible();
  await page.fill('textarea.form-input', 'E2E answer two.');
  await page.getByRole('button', { name: '下一題' }).click();

  await expect(page.getByText(/第 3 題/)).toBeVisible();
  await page.fill('textarea.form-input', 'E2E answer three.');
  await page.getByRole('button', { name: '確認交卷' }).click();

  await expect(page.getByText('測驗已提交成功')).toBeVisible({ timeout: 25_000 });
});
