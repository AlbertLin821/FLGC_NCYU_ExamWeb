import { attachSessionReviewFlags, mapSessionsWithReviewFlags } from './sessionReviewFlags';

describe('sessionReviewFlags', () => {
  it('essay 待複閱時 hasPendingReview 為 true', () => {
    const s = attachSessionReviewFlags({
      id: 1,
      status: 'graded',
      answers: [{ aiModel: 'pending_review' }],
    });
    expect(s.hasPendingReview).toBe(true);
  });

  it('無 pending_review 時 hasPendingReview 為 false', () => {
    const s = attachSessionReviewFlags({
      id: 2,
      status: 'graded',
      answers: [{ aiModel: 'gemini-2.0' }],
    });
    expect(s.hasPendingReview).toBe(false);
  });

  it('mapSessionsWithReviewFlags 套用到陣列', () => {
    const rows = mapSessionsWithReviewFlags([
      { answers: [] },
      { answers: [{ aiModel: 'pending_review' }] },
    ]);
    expect(rows[0].hasPendingReview).toBe(false);
    expect(rows[1].hasPendingReview).toBe(true);
  });
});
