import { test, expect } from '@playwright/test';

/**
 * 以 route mock 固定後端 timeRemainingSeconds，驗證重新整理後倒數錨定後端。
 * 其餘破壞情境（重複交卷、逾時作答）以 server Jest（ExamsService）為主。
 */
test.describe('考試倒數與錨定', () => {
  test('重新整理後剩餘時間仍與 mock 的 timeRemainingSeconds 一致', async ({
    page,
  }) => {
    await page.route('**/api/exams/*/start', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 888001,
            status: 'in_progress',
            examId: 1,
            startedAt: '2026-04-19T10:00:00.000Z',
            exam: { title: 'Mock Exam' },
          },
          questions: [
            {
              id: 1,
              type: 'multiple_choice',
              content: 'Q?',
              options: ['A', 'B'],
              orderNum: 1,
            },
          ],
          timeLimit: 30,
          timeRemainingSeconds: 111,
        }),
      });
    });

    await page.goto('/student/login');
    await page.fill('input[placeholder="例如: 411200000"]', '411200001');
    await page.fill('input[placeholder="您的真實姓名"]', '王小明');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/student\/exams/, { timeout: 20_000 });

    await page.goto('/student/exam/1');
    await expect(page.getByText('剩餘時間: 1:51')).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.getByText('剩餘時間: 1:51')).toBeVisible({ timeout: 20_000 });
  });
});
