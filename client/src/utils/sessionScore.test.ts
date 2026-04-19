import { describe, it, expect } from 'vitest';
import { earnedPointsOnQuestion, sessionScorePercent } from './sessionScore';

describe('sessionScorePercent', () => {
  it('returns 0 for empty answers', () => {
    expect(sessionScorePercent([])).toBe(0);
    expect(sessionScorePercent(null)).toBe(0);
  });

  it('matches simple average when all maxPoints equal 100', () => {
    const answers = [
      { aiScore: 80, question: { maxPoints: 100 } },
      { aiScore: 60, question: { maxPoints: 100 } },
    ];
    expect(sessionScorePercent(answers)).toBe(70);
  });

  it('weights by maxPoints', () => {
    const answers = [
      { aiScore: 100, question: { maxPoints: 10 } },
      { aiScore: 0, question: { maxPoints: 90 } },
    ];
    expect(sessionScorePercent(answers)).toBe(10);
  });
});

describe('earnedPointsOnQuestion', () => {
  it('scales ai percentage to max points', () => {
    expect(earnedPointsOnQuestion(50, 20)).toBe(10);
  });
});
