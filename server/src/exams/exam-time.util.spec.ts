import { computeTimeRemainingSeconds } from './exam-time.util';

describe('computeTimeRemainingSeconds', () => {
  it('新開考：無 startedAt 時回傳完整分鐘數轉秒', () => {
    expect(computeTimeRemainingSeconds(null, 30, new Date('2026-01-01T12:00:00Z'))).toBe(1800);
  });

  it('進行中：依 startedAt 與 timeLimit 計算剩餘秒數', () => {
    const started = new Date('2026-01-01T12:00:00Z');
    const now = new Date('2026-01-01T12:05:00Z'); // 5 分鐘後
    expect(computeTimeRemainingSeconds(started, 30, now)).toBe(25 * 60);
  });

  it('時間已過：回傳 0（不可為負）', () => {
    const started = new Date('2026-01-01T12:00:00Z');
    const now = new Date('2026-01-01T13:00:01Z');
    expect(computeTimeRemainingSeconds(started, 60, now)).toBe(0);
  });

  it('距離考卷截止較短時，剩餘時間以截止為準（與作答時限取 min）', () => {
    const started = new Date('2026-01-01T12:00:00Z');
    const examEnd = new Date('2026-01-01T13:00:00Z');
    const now = new Date('2026-01-01T12:50:00Z');
    // 作答時限 120 分：依開始時間尚餘 70 分鐘
    // 考卷 13:00 截止：尚餘 10 分鐘
    expect(computeTimeRemainingSeconds(started, 120, now, examEnd)).toBe(10 * 60);
  });

  it('未傳 examEndTime 時維持僅依作答時限（向後相容）', () => {
    const started = new Date('2026-01-01T12:00:00Z');
    const now = new Date('2026-01-01T12:50:00Z');
    expect(computeTimeRemainingSeconds(started, 120, now)).toBe(70 * 60);
  });
});
