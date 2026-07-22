export type DigitsMode = 'ar' | 'en';

const STORAGE_KEY = 'digitsMode';

export function getDigitsMode(): DigitsMode {
  if (typeof window === 'undefined') {
    return 'ar';
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'ar';
}

export function setDigitsMode(mode: DigitsMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

export function toggleDigitsMode(): DigitsMode {
  const current = getDigitsMode();
  const next: DigitsMode = current === 'ar' ? 'en' : 'ar';
  setDigitsMode(next);
  return next;
}

export function getNumberLocale(): string {
  return getDigitsMode() === 'ar' ? 'ar-EG' : 'en-US';
}
