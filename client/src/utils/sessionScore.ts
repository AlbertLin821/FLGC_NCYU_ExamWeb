/**
 * 依各題配分（maxPoints）將 0–100 的 aiScore 換算為整份試卷加權百分比（0–100）。
 */
export function sessionScorePercent(
  answers: { aiScore?: unknown; question?: { maxPoints?: unknown } }[] | undefined | null,
): number {
  if (!answers?.length) return 0;
  let weighted = 0;
  let denom = 0;
  for (const a of answers) {
    const mp = Math.max(1, Number(a.question?.maxPoints) || 100);
    const raw = Number(a.aiScore);
    const score = Number.isFinite(raw) ? raw : 0;
    weighted += (score / 100) * mp;
    denom += mp;
  }
  return denom > 0 ? Math.round((weighted / denom) * 100) : 0;
}

export function earnedPointsOnQuestion(
  aiScore: unknown,
  maxPoints: unknown,
): number {
  const mp = Math.max(1, Number(maxPoints) || 100);
  const raw = Number(aiScore);
  const score = Number.isFinite(raw) ? raw : 0;
  return Math.round((score / 100) * mp * 100) / 100;
}
