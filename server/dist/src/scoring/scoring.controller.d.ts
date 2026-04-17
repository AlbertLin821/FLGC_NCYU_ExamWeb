import { ScoringService } from './scoring.service';
export declare class ScoringController {
    private scoringService;
    constructor(scoringService: ScoringService);
    scoreSession(sessionId: number): Promise<({
        answerId: number;
        skipped: boolean;
        score?: undefined;
        feedback?: undefined;
        error?: undefined;
    } | {
        answerId: number;
        score: number;
        feedback: string;
        skipped?: undefined;
        error?: undefined;
    } | {
        answerId: number;
        error: any;
        skipped?: undefined;
        score?: undefined;
        feedback?: undefined;
    })[]>;
}
