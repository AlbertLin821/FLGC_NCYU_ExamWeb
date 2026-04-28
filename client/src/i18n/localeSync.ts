export type GlobalLocale = 'zh-TW' | 'en';

export const GLOBAL_LOCALE_STORAGE_KEY = 'ncyu-global-locale';
export const GLOBAL_LOCALE_EVENT = 'ncyu-global-locale-change';

function isLocale(value: unknown): value is GlobalLocale {
  return value === 'zh-TW' || value === 'en';
}

export function readGlobalLocale(): GlobalLocale | null {
  try {
    const value = localStorage.getItem(GLOBAL_LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function syncGlobalLocale(locale: GlobalLocale, keys: string[]) {
  try {
    localStorage.setItem(GLOBAL_LOCALE_STORAGE_KEY, locale);
    for (const key of keys) {
      localStorage.setItem(key, locale);
    }
  } catch {
    /* ignore */
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<GlobalLocale>(GLOBAL_LOCALE_EVENT, { detail: locale }));
  }
}
