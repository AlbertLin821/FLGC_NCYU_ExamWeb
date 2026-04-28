export function getLocalizedAiFeedback(
  feedback: string | null | undefined,
  locale: 'zh-TW' | 'en',
): string {
  const raw = String(feedback ?? '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/\r\n/g, '\n');
  const enMatch = normalized.match(/EN:\s*([\s\S]*?)(?:\s+ZH:\s*|$)/i);
  const zhMatch = normalized.match(/ZH:\s*([\s\S]*?)$/i);

  if (locale === 'en' && enMatch?.[1]?.trim()) {
    return enMatch[1].trim();
  }
  if (locale !== 'en' && zhMatch?.[1]?.trim()) {
    return zhMatch[1].trim();
  }

  if (locale === 'en' && zhMatch?.[1]?.trim() && !enMatch?.[1]?.trim()) {
    return zhMatch[1].trim();
  }
  if (locale !== 'en' && enMatch?.[1]?.trim() && !zhMatch?.[1]?.trim()) {
    return enMatch[1].trim();
  }

  return raw;
}
