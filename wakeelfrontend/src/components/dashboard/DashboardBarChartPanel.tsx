import React from 'react';

export interface DashboardBarChartItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface DashboardBarChartPanelProps {
  title: string;
  subtitle?: string;
  items: DashboardBarChartItem[];
  /** عرض القيمة كنص جاهز */
  formatValue: (n: number) => string;
  variant?: 'vertical' | 'horizontal';
  className?: string;
  onItemClick?: (id: string) => void;
}

export const DashboardBarChartPanel: React.FC<DashboardBarChartPanelProps> = ({
  title,
  subtitle,
  items,
  formatValue,
  variant = 'vertical',
  className = '',
  onItemClick,
}) => {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));

  if (variant === 'horizontal') {
    return (
      <div
        className={`rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 sm:p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] flex flex-col h-full min-h-0 ${className}`.trim()}
      >
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 shrink-0">{title}</h3>
        {subtitle ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 shrink-0">{subtitle}</p>
        ) : null}
        <ul className="space-y-4 flex-1 flex flex-col justify-center min-h-0">
          {items.map((item) => {
            const pct = Math.min(100, (Math.abs(item.value) / max) * 100);
            const interactive = Boolean(onItemClick);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => onItemClick?.(item.id)}
                  className={`w-full text-right ${interactive ? 'cursor-pointer hover:opacity-95' : 'cursor-default'}`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate min-w-0">
                      {item.label}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white shrink-0">
                      {formatValue(item.value)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 sm:p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] flex flex-col h-full min-h-0 ${className}`.trim()}
    >
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 shrink-0">{title}</h3>
      {subtitle ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 shrink-0">{subtitle}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 basis-0 items-end justify-between gap-2 pt-2 sm:gap-3">
        {items.map((item) => {
          const pct = Math.min(100, (Math.abs(item.value) / max) * 100);
          const h = `${Math.max(pct, 4)}%`;
          const interactive = Boolean(onItemClick);
          return (
            <button
              key={item.id}
              type="button"
              disabled={!interactive}
              onClick={() => onItemClick?.(item.id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-2 h-full ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex-1 w-full flex items-end justify-center min-h-0">
                <div
                  className="w-full max-w-[3.5rem] sm:max-w-[4.5rem] rounded-t-xl rounded-b-md transition-all duration-500 ease-out shadow-sm"
                  style={{ height: h, backgroundColor: item.color, minHeight: '12%' }}
                />
              </div>
              <div className="text-center w-full space-y-0.5">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 leading-tight line-clamp-2 min-h-[2.25rem] flex items-end justify-center">
                  {item.label}
                </p>
                <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatValue(item.value)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
