"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTimeRemainingSeconds = computeTimeRemainingSeconds;
function computeTimeRemainingSeconds(startedAt, timeLimitMinutes, now, examEndTime) {
    const fromSessionLimit = (() => {
        if (startedAt == null) {
            return Math.max(0, timeLimitMinutes * 60);
        }
        const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
        const endMs = start.getTime() + timeLimitMinutes * 60 * 1000;
        return Math.max(0, Math.floor((endMs - now.getTime()) / 1000));
    })();
    if (examEndTime == null) {
        return fromSessionLimit;
    }
    const examEnd = typeof examEndTime === 'string' ? new Date(examEndTime) : examEndTime;
    const untilExamEnd = Math.max(0, Math.floor((examEnd.getTime() - now.getTime()) / 1000));
    return Math.min(fromSessionLimit, untilExamEnd);
}
//# sourceMappingURL=exam-time.util.js.map