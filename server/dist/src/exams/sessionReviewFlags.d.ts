export declare function attachSessionReviewFlags<T extends {
    answers?: {
        aiModel?: string | null;
    }[];
}>(session: T): T & {
    hasPendingReview: boolean;
};
export declare function mapSessionsWithReviewFlags<T extends {
    answers?: {
        aiModel?: string | null;
    }[];
}>(sessions: T[]): Array<T & {
    hasPendingReview: boolean;
}>;
