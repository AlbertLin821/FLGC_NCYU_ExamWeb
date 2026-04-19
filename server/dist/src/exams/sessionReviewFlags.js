"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSessionReviewFlags = attachSessionReviewFlags;
exports.mapSessionsWithReviewFlags = mapSessionsWithReviewFlags;
function attachSessionReviewFlags(session) {
    const hasPendingReview = (session.answers ?? []).some((a) => a.aiModel === 'pending_review');
    return { ...session, hasPendingReview };
}
function mapSessionsWithReviewFlags(sessions) {
    return sessions.map(attachSessionReviewFlags);
}
//# sourceMappingURL=sessionReviewFlags.js.map