import React from 'react';
import { Wallet } from 'lucide-react';

export interface DashboardBalanceCreditCardProps {
  /** الرقم مُنسَّق بدون لاحقة العملة */
  formattedAmount: string;
  /** وصف تحت العنوان (مثلاً: الرصيد العام / رصيد المنطقة) */
  subtitle: string;
  className?: string;
}

/** بطاقة رصيد على شكل بطاقة ائتمان — العملة د.ع ثابتة في الواجهة */
export const DashboardBalanceCreditCard: React.FC<DashboardBalanceCreditCardProps> = ({
  formattedAmount,
  subtitle,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-[0_24px_48px_-12px_rgba(30,27,75,0.55)] min-h-[200px] flex flex-col ${className}`.trim()}
    >
      <div className="pointer-events-none absolute -top-16 end-0 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -start-8 h-36 w-36 rounded-full bg-violet-500/15 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-white/15 p-2 ring-1 ring-white/20">
            <Wallet className="h-5 w-5 text-amber-200" aria-hidden />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Wakeel
          </span>
        </div>
        <div className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200/90 to-amber-500/80 shadow-inner ring-1 ring-white/30" aria-hidden />
      </div>

      <p className="relative text-xs text-white/75 mb-1">{subtitle}</p>
      <p className="relative text-[10px] text-white/50 mb-3">الرصيد المتاح</p>

      <div className="relative mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight leading-none">
          {formattedAmount}
        </span>
        <span className="text-base sm:text-lg font-bold text-emerald-300/95 tabular-nums">د.ع</span>
      </div>

      <div className="relative mt-5 flex items-center gap-2 opacity-60" aria-hidden>
        <span className="text-xs tracking-[0.35em] font-mono">•••• •••• ••••</span>
        <span className="text-xs font-mono tabular-nums">IQD</span>
      </div>
    </div>
  );
};
