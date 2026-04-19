/**
 * 若任一答案仍為 AI 未就緒／待人工複閱（aiModel === pending_review），
 * 則 hasPendingReview 為 true；此時 session.status 可能已是 graded（客觀題已計分）。
 */
export function attachSessionReviewFlags<
  T extends { answers?: { aiModel?: string | null }[] },
>(session: T): T & { hasPendingReview: boolean } {
  const hasPendingReview = (session.answers ?? []).some(
    (a) => a.aiModel === 'pending_review',
  );
  return { ...session, hasPendingReview };
}

export function mapSessionsWithReviewFlags<
  T extends { answers?: { aiModel?: string | null }[] },
>(sessions: T[]): Array<T & { hasPendingReview: boolean }> {
  return sessions.map(attachSessionReviewFlags);
}
