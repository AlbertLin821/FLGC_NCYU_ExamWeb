"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorsOrigins = getCorsOrigins;
const DEFAULT_DEV_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:80',
];
function getCorsOrigins() {
    const raw = process.env.CORS_ORIGINS?.trim();
    if (!raw) {
        return [...DEFAULT_DEV_ORIGINS];
    }
    const parsed = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : [...DEFAULT_DEV_ORIGINS];
}
//# sourceMappingURL=cors-origins.js.map