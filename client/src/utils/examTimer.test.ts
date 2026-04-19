import { describe, it, expect } from 'vitest';
import { computeTimeRemainingSeconds } from './examTimer';

describe('examTimer（與後端一致）', () => {
  it('重新整理後仍以 startedAt + timeLimit 錨定剩餘秒數', () => {
    const started = new Date('2026-04-19T10:00:00.000Z');
    const now = new Date('2026-04-19T10:07:30.000Z');
    expect(computeTimeRemainingSeconds(started, 30, now)).toBe(22 * 60 + 30);
  });
});
