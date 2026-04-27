/**
 * 若任一答案仍為 AI 排隊中／批改中／待複閱，
 * 則 hasPendingReview 為 true；此時 session.status 可能已是 graded（客觀題已計分）。
 */
export function attachSessionReviewFlags<
  T extends { answers?: { aiModel?: string | null }[] },
>(session: T): T & { hasPendingReview: boolean; hasAiGrading: boolean; hasAiQueued: boolean } {
  const hasAiQueued = (session.answers ?? []).some(
    (a) => a.aiModel === 'ai_queued',
  );
  const hasAiGrading = (session.answers ?? []).some(
    (a) => a.aiModel === 'ai_grading',
  );
  const hasPendingReview = (session.answers ?? []).some(
    (a) => a.aiModel === 'pending_review',
  );
  return { ...session, hasPendingReview, hasAiGrading, hasAiQueued };
}

export function mapSessionsWithReviewFlags<
  T extends { answers?: { aiModel?: string | null }[] },
>(sessions: T[]): Array<T & { hasPendingReview: boolean; hasAiGrading: boolean; hasAiQueued: boolean }> {
  return sessions.map(attachSessionReviewFlags);
}
