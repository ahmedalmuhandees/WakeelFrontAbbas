import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getDigitsMode, setDigitsMode as persistDigitsMode, type DigitsMode } from '../utils/localeDigits';

type Locale = string;

interface DigitsContextType {
  digitsMode: DigitsMode;
  setDigitsMode: (mode: DigitsMode) => void;
  /** locale for numbers and dates: 'ar-EG' or 'en-US' */
  locale: Locale;
  /** format number; optional suffix e.g. ' د.ع' */
  formatNumber: (n: number, opts?: { suffix?: string }) => string;
  /** format date/datetime string or Date */
  formatDate: (d: Date | string, options?: Intl.DateTimeFormatOptions) => string;
}

const DigitsContext = createContext<DigitsContextType | undefined>(undefined);

export function useDigits(): DigitsContextType {
  const ctx = useContext(DigitsContext);
  if (ctx === undefined) {
    throw new Error('useDigits must be used within a DigitsProvider');
  }
  return ctx;
}

/** use only formatNumber/formatDate when you don't need setDigitsMode (avoids extra re-renders from context value) */
export function useFormatNumber(): (n: number, opts?: { suffix?: string }) => string {
  return useDigits().formatNumber;
}

export function useFormatDate(): (d: Date | string, options?: Intl.DateTimeFormatOptions) => string {
  return useDigits().formatDate;
}

interface DigitsProviderProps {
  children: ReactNode;
}

export const DigitsProvider: React.FC<DigitsProviderProps> = ({ children }) => {
  const [digitsMode, setDigitsModeState] = useState<DigitsMode>(() => getDigitsMode());

  const setDigitsMode = useCallback((mode: DigitsMode) => {
    setDigitsModeState(mode);
    persistDigitsMode(mode);
  }, []);

  const locale: Locale = digitsMode === 'ar' ? 'ar-EG' : 'en-US';

  const formatNumber = useCallback((n: number, opts?: { suffix?: string }) => {
    const num = n != null && !Number.isNaN(n) ? Number(n) : 0;
    const formatted = num.toLocaleString(locale);
    return opts?.suffix != null ? `${formatted}${opts.suffix}` : formatted;
  }, [locale]);

  const formatDate = useCallback((d: Date | string, options?: Intl.DateTimeFormatOptions) => {
    if (d == null) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(locale, options);
  }, [locale]);

  const value: DigitsContextType = {
    digitsMode,
    setDigitsMode,
    locale,
    formatNumber,
    formatDate,
  };

  return (
    <DigitsContext.Provider value={value}>
      {children}
    </DigitsContext.Provider>
  );
};
