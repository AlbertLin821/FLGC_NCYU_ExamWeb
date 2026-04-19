/**
 * 與 client/src/utils/examTimer.ts 公式一致：以 startedAt + timeLimit 推算剩餘秒數（伺服器時間）。
 */
export function computeTimeRemainingSeconds(
  startedAt: Date | string | null | undefined,
  timeLimitMinutes: number,
  now: Date,
): number {
  if (startedAt == null) {
    return Math.max(0, timeLimitMinutes * 60);
  }
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  const endMs = start.getTime() + timeLimitMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - now.getTime()) / 1000));
}
