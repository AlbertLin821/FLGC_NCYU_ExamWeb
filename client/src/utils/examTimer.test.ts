import { describe, it, expect } from 'vitest';
import { computeTimeRemainingSeconds } from './examTimer';

describe('examTimer（與後端一致）', () => {
  it('無 startedAt 時視為完整時長（秒）', () => {
    expect(computeTimeRemainingSeconds(undefined, 10, new Date())).toBe(600);
  });

  it('已過考試結束時間則為 0', () => {
    const started = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(computeTimeRemainingSeconds(started, 60, new Date())).toBe(0);
  });

  it('邊界：剩餘 1 秒時仍為 1', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const started = new Date('2026-06-01T09:59:29.000Z'); // 31 秒前，時限 1 分鐘
    expect(computeTimeRemainingSeconds(started, 1, now)).toBe(29);
  });
});
