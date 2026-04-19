/**
 * 與 client/src/utils/examTimer.ts 公式一致。
 * 剩餘秒數 = min(依 startedAt + 作答時限, 距離考卷 endTime)，避免截止前仍顯示多於實際可作答時間。
 */
export function computeTimeRemainingSeconds(
  startedAt: Date | string | null | undefined,
  timeLimitMinutes: number,
  now: Date,
  examEndTime?: Date | string | null,
): number {
  const fromSessionLimit = (() => {
    if (startedAt == null) {
      return Math.max(0, timeLimitMinutes * 60);
    }
    const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
    const endMs = start.getTime() + timeLimitMinutes * 60 * 1000;
    return Math.max(0, Math.floor((endMs - now.getTime()) / 1000));
  })();

  if (examEndTime == null) {
    return fromSessionLimit;
  }
  const examEnd =
    typeof examEndTime === 'string' ? new Date(examEndTime) : examEndTime;
  const untilExamEnd = Math.max(
    0,
    Math.floor((examEnd.getTime() - now.getTime()) / 1000),
  );
  return Math.min(fromSessionLimit, untilExamEnd);
}
