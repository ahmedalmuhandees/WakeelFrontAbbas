import React from 'react';
import type { LucideIcon } from 'lucide-react';

/** بطاقة KPI صلبة — خلفية بيضاء، ظل ناعم، زوايا كبيرة — بدون glass */
export type DashboardSolidAccent = 'primary' | 'sky' | 'emerald' | 'violet' | 'amber' | 'rose';

const ACCENT_ICON: Record<
  DashboardSolidAccent,
  { wrap: string; icon: string }
> = {
  primary: {
    wrap: 'bg-indigo-100 dark:bg-indigo-900/40',
    icon: 'text-indigo-600 dark:text-indigo-300',
  },
  sky: {
    wrap: 'bg-sky-100 dark:bg-sky-900/40',
    icon: 'text-sky-600 dark:text-sky-300',
  },
  emerald: {
    wrap: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: 'text-emerald-600 dark:text-emerald-300',
  },
  violet: {
    wrap: 'bg-violet-100 dark:bg-violet-900/40',
    icon: 'text-violet-600 dark:text-violet-300',
  },
  amber: {
    wrap: 'bg-amber-100 dark:bg-amber-900/40',
    icon: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    wrap: 'bg-rose-100 dark:bg-rose-900/40',
    icon: 'text-rose-600 dark:text-rose-300',
  },
};

const CARD_SHELL =
  'rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] transition-shadow duration-300 hover:shadow-[0_24px_60px_-12px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]';

export interface DashboardSolidCardProps {
  title: string;
  accent?: DashboardSolidAccent;
  /** أيقونة في الزاوية — نمط KPI حديث */
  icon?: LucideIcon;
  /** نص تحت القيمة */
  footer?: React.ReactNode;
  /** بطاقة إجراء (تقارير إكسل): عنوان + أيقونة كبيرة في الصف */
  actionLayout?: boolean;
  endIcon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
}

export const DashboardSolidCard: React.FC<DashboardSolidCardProps> = ({
  title,
  accent = 'primary',
  icon: Icon,
  footer,
  actionLayout,
  endIcon: EndIcon,
  className = '',
  children,
}) => {
  const a = ACCENT_ICON[accent];

  if (actionLayout && EndIcon) {
    return (
      <div className={`${CARD_SHELL} p-5 sm:p-6 ${className}`.trim()}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {title}
            </p>
            {children != null && children !== false && (
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums leading-tight">
                {children}
              </div>
            )}
            {footer != null && footer !== false && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{footer}</p>
            )}
          </div>
          <div
            className={`shrink-0 rounded-2xl p-3 sm:p-4 ${a.wrap}`}
            aria-hidden
          >
            <EndIcon className={`h-7 w-7 sm:h-9 sm:w-9 ${a.icon}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CARD_SHELL} p-4 sm:p-5 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </p>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums leading-tight">
            {children}
          </div>
          {footer != null && footer !== false && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{footer}</p>
          )}
        </div>
        {Icon ? (
          <div className={`shrink-0 rounded-2xl p-2.5 sm:p-3 ${a.wrap}`} aria-hidden>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${a.icon}`} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
