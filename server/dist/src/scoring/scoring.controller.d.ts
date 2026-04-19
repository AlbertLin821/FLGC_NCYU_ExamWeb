import { ScoringService } from './scoring.service';
export declare class ScoringController {
    private scoringService;
    constructor(scoringService: ScoringService);
    scoreSession(sessionId: number): Promise<({
        answerId: number;
        score: number;
        feedback: string;
    } | {
        answerId: number;
        skipped: true;
    } | {
        answerId: number;
        pendingReview: true;
        kind: string;
    })[]>;
}
