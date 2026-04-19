/**
 * 讀取 CORS_ORIGINS（逗號分隔）。未設定時僅允許本機開發來源。
 * 正式環境請在 .env 設定，例如：CORS_ORIGINS=https://ncyulanguageexam.com
 */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:80',
];

export function getCorsOrigins(): string[] {
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
