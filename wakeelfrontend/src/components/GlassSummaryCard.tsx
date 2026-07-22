import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * كارد إحصائيات بنمط زجاجي خفيف — ظل ناعم، تدرج لوني خفيف، backdrop-blur.
 * يُعاد استخدامه في ملخص المبيعات، ملخص الحسابات، وأي لوحات مشابهة.
 */
export type GlassSummaryVariant = 'emerald' | 'sky' | 'violet' | 'rose' | 'amber';

const VARIANT_STYLES: Record<
  GlassSummaryVariant,
  { shell: string; title: string; value: string }
> = {
  emerald: {
    shell:
      'border-emerald-300/45 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-100/55 via-white/35 to-teal-50/25 dark:from-emerald-950/45 dark:via-slate-900/50 dark:to-slate-950/35 shadow-[0_10px_36px_-8px_rgba(16,185,129,0.22)] dark:shadow-[0_12px_40px_-10px_rgba(16,185,129,0.18)]',
    title: 'text-emerald-900/80 dark:text-emerald-200/95',
    value: 'text-emerald-950 dark:text-emerald-50',
  },
  sky: {
    shell:
      'border-sky-300/45 dark:border-sky-500/30 bg-gradient-to-br from-sky-100/50 via-white/35 to-cyan-50/20 dark:from-sky-950/40 dark:via-slate-900/50 dark:to-slate-950/35 shadow-[0_10px_36px_-8px_rgba(14,165,233,0.2)] dark:shadow-[0_12px_40px_-10px_rgba(14,165,233,0.15)]',
    title: 'text-sky-900/80 dark:text-sky-200/95',
    value: 'text-sky-950 dark:text-sky-50',
  },
  violet: {
    shell:
      'border-violet-300/45 dark:border-violet-500/28 bg-gradient-to-br from-violet-100/50 via-white/35 to-fuchsia-50/22 dark:from-violet-950/42 dark:via-slate-900/50 dark:to-slate-950/35 shadow-[0_10px_36px_-8px_rgba(139,92,246,0.2)] dark:shadow-[0_12px_40px_-10px_rgba(139,92,246,0.14)]',
    title: 'text-violet-900/82 dark:text-violet-200/95',
    value: 'text-violet-950 dark:text-violet-50',
  },
  rose: {
    shell:
      'border-rose-300/45 dark:border-rose-500/28 bg-gradient-to-br from-rose-100/48 via-white/35 to-orange-50/18 dark:from-rose-950/38 dark:via-slate-900/50 dark:to-slate-950/35 shadow-[0_10px_36px_-8px_rgba(244,63,94,0.18)] dark:shadow-[0_12px_40px_-10px_rgba(244,63,94,0.12)]',
    title: 'text-rose-900/82 dark:text-rose-200/95',
    value: 'text-rose-950 dark:text-rose-50',
  },
  amber: {
    shell:
      'border-amber-300/55 dark:border-amber-500/35 bg-gradient-to-br from-amber-100/60 via-amber-50/35 to-yellow-50/25 dark:from-amber-950/50 dark:via-amber-950/25 dark:to-slate-950/40 shadow-[0_12px_40px_-8px_rgba(245,158,11,0.28)] dark:shadow-[0_14px_44px_-10px_rgba(245,158,11,0.22)] ring-1 ring-amber-200/60 dark:ring-amber-500/25',
    title: 'text-amber-950/90 dark:text-amber-100/95',
    value: 'text-amber-950 dark:text-amber-50',
  },
};

const BASE_SHELL =
  'rounded-2xl border backdrop-blur-xl px-3 py-3 sm:p-4 text-right min-h-[72px] flex flex-col justify-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl';

export interface GlassSummaryCardProps {
  title: string;
  variant?: GlassSummaryVariant;
  className?: string;
  /** رقم أو نص الإحصائية */
  children?: React.ReactNode;
  /** نص ثانٍ صغير (مثل تلميح «اضغط للتحميل») */
  footer?: React.ReactNode;
  /** يعرض العنوان مع أيقونة يميناً — لبطاقات إجراء مثل تقارير الإكسل */
  endIcon?: LucideIcon;
}

export const GlassSummaryCard: React.FC<GlassSummaryCardProps> = ({
  title,
  variant = 'emerald',
  className = '',
  children,
  footer,
  endIcon: EndIcon,
}) => {
  const v = VARIANT_STYLES[variant];

  if (EndIcon) {
    return (
      <div className={`${BASE_SHELL} ${v.shell} ${className}`.trim()}>
        <div className="flex items-center justify-between gap-3">
          <div className={`text-sm sm:text-base lg:text-lg font-semibold leading-snug min-w-0 ${v.title}`}>
            {title}
          </div>
          <div className="rounded-full p-2 sm:p-3 shrink-0 bg-white/40 dark:bg-black/25 ring-1 ring-white/60 dark:ring-white/10 shadow-sm">
            <EndIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${v.value}`} aria-hidden />
          </div>
        </div>
        {children != null && children !== false && (
          <div
            className={`text-lg sm:text-xl font-bold mt-2 tabular-nums leading-tight ${v.value}`}
          >
            {children}
          </div>
        )}
        {footer != null && footer !== false && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{footer}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`${BASE_SHELL} ${v.shell} ${className}`.trim()}>
      <div className={`text-xs sm:text-sm font-semibold truncate ${v.title}`}>{title}</div>
      <div
        className={`text-lg sm:text-xl font-bold mt-1 tabular-nums leading-tight ${v.value}`}
      >
        {children}
      </div>
      {footer != null && footer !== false && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{footer}</p>
      )}
    </div>
  );
};
