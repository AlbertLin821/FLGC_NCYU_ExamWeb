/**
 * 與 server/src/exams/exam-time.util.ts 公式一致。
 * 倒數應以後端回傳的 timeRemainingSeconds 為準，避免僅依 client 計時導致重新整理後重置。
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
