export type EssayQuestionForBatch = {
    questionId: number;
    orderNum: number;
    maxPoints: number;
    promptText: string | null;
    word1: string | null;
    word2: string | null;
    studentAnswer: string | null;
};
export type ParsedEssayItem = {
    questionId: number;
    pointsEarned: number;
    errorAnalysis: string;
    feedback?: string;
};
export type ParsedBatchEssayGrading = {
    questions: ParsedEssayItem[];
    overallFeedbackEn: string;
    overallFeedbackZh: string;
};
export declare function buildBatchEssayGradingPrompt(studentLabel: string, items: EssayQuestionForBatch[]): string;
export declare function parseBatchEssayGradingResponse(raw: string, expected: EssayQuestionForBatch[]): ParsedBatchEssayGrading;
export declare function pointsToAiScorePercent(pointsEarned: number, maxPoints: number): number;
