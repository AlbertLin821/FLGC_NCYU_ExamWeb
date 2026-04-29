import {
  buildBatchEssayGradingPrompt,
  parseBatchEssayGradingResponse,
  pointsToAiScorePercent,
  type EssayQuestionForBatch,
} from './batch-essay-grading.util';

describe('batch-essay-grading.util', () => {
  const baseItem = (over: Partial<EssayQuestionForBatch>): EssayQuestionForBatch => ({
    questionId: 1,
    orderNum: 1,
    maxPoints: 20,
    promptText: 'Write one sentence.',
    word1: 'cat',
    word2: 'run',
    studentAnswer: 'The cat can run.',
    ...over,
  });

  it('buildBatchEssayGradingPrompt includes N and questionIds', () => {
    const items = [
      baseItem({ questionId: 10 }),
      baseItem({ questionId: 11, orderNum: 2, studentAnswer: '  ' }),
    ];
    const p = buildBatchEssayGradingPrompt('Student A (s001)', items);
    expect(p).toContain('There are 2 essay question(s)');
    expect(p).toContain('questionId=10');
    expect(p).toContain('questionId=11');
    expect(p).toContain('(blank');
    expect(p).toContain('Zero Marks (0/20): nonsensical, missing target words, or more than one sentence.');
    expect(p).toContain('Rule of One: multiple errors in the same category only cause one -5 deduction.');
    expect(p).toContain('Correction: [Fixed sentence]');
  });

  it('parseBatchEssayGradingResponse accepts valid JSON', () => {
    const expected = [baseItem({ questionId: 5, maxPoints: 10 })];
    const raw = JSON.stringify({
      questions: [
        {
          questionId: 5,
          pointsEarned: 7,
          errorAnalysis: 'Minor tense issue.',
          feedback: 'Good vocabulary.',
        },
      ],
      overallFeedbackEn: 'Solid effort.',
      overallFeedbackZh: '表現不錯。',
    });
    const out = parseBatchEssayGradingResponse(raw, expected);
    expect(out.questions[0].pointsEarned).toBe(7);
    expect(out.overallFeedbackEn).toBe('Solid effort.');
    expect(out.overallFeedbackZh).toBe('表現不錯。');
  });

  it('parseBatchEssayGradingResponse clamps points', () => {
    const expected = [baseItem({ questionId: 5, maxPoints: 10 })];
    const raw = JSON.stringify({
      questions: [
        {
          questionId: 5,
          pointsEarned: 99,
          errorAnalysis: 'x',
        },
      ],
      overallFeedbackEn: 'a',
      overallFeedbackZh: 'b',
    });
    const out = parseBatchEssayGradingResponse(raw, expected);
    expect(out.questions[0].pointsEarned).toBe(10);
  });

  it('parseBatchEssayGradingResponse throws on length mismatch', () => {
    const expected = [baseItem({}), baseItem({ questionId: 2, orderNum: 2 })];
    const raw = JSON.stringify({
      questions: [{ questionId: 1, pointsEarned: 1, errorAnalysis: 'a' }],
      overallFeedbackEn: 'e',
      overallFeedbackZh: 'z',
    });
    expect(() => parseBatchEssayGradingResponse(raw, expected)).toThrow();
  });

  it('pointsToAiScorePercent maps to 0–100', () => {
    expect(pointsToAiScorePercent(5, 10)).toBe(50);
    expect(pointsToAiScorePercent(0, 20)).toBe(0);
    expect(pointsToAiScorePercent(20, 20)).toBe(100);
  });
});
