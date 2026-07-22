import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useDigits } from '../contexts/DigitsContext';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'orange';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isAmount?: boolean;
}

const colorClasses = {
  blue: {
    surface: 'bg-blue-100/45 dark:bg-blue-900/25',
    icon: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/75 dark:border-blue-700/45',
    glow: 'shadow-blue-200/35 dark:shadow-blue-950/30',
    iconWrap: 'bg-blue-100/70 dark:bg-blue-900/35 ring-1 ring-blue-200/65 dark:ring-blue-700/45'
  },
  green: {
    surface: 'bg-green-100/45 dark:bg-green-900/25',
    icon: 'text-green-700 dark:text-green-300',
    border: 'border-green-200/75 dark:border-green-700/45',
    glow: 'shadow-green-200/35 dark:shadow-green-950/30',
    iconWrap: 'bg-green-100/70 dark:bg-green-900/35 ring-1 ring-green-200/65 dark:ring-green-700/45'
  },
  yellow: {
    surface: 'bg-yellow-100/45 dark:bg-yellow-900/25',
    icon: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200/75 dark:border-yellow-700/45',
    glow: 'shadow-yellow-200/35 dark:shadow-yellow-950/30',
    iconWrap: 'bg-yellow-100/70 dark:bg-yellow-900/35 ring-1 ring-yellow-200/65 dark:ring-yellow-700/45'
  },
  red: {
    surface: 'bg-red-100/45 dark:bg-red-900/25',
    icon: 'text-red-700 dark:text-red-300',
    border: 'border-red-200/75 dark:border-red-700/45',
    glow: 'shadow-red-200/35 dark:shadow-red-950/30',
    iconWrap: 'bg-red-100/70 dark:bg-red-900/35 ring-1 ring-red-200/65 dark:ring-red-700/45'
  },
  purple: {
    surface: 'bg-purple-100/45 dark:bg-purple-900/25',
    icon: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200/75 dark:border-purple-700/45',
    glow: 'shadow-purple-200/35 dark:shadow-purple-950/30',
    iconWrap: 'bg-purple-100/70 dark:bg-purple-900/35 ring-1 ring-purple-200/65 dark:ring-purple-700/45'
  },
  indigo: {
    surface: 'bg-indigo-100/45 dark:bg-indigo-900/25',
    icon: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200/75 dark:border-indigo-700/45',
    glow: 'shadow-indigo-200/35 dark:shadow-indigo-950/30',
    iconWrap: 'bg-indigo-100/70 dark:bg-indigo-900/35 ring-1 ring-indigo-200/65 dark:ring-indigo-700/45'
  },
  orange: {
    surface: 'bg-orange-100/45 dark:bg-orange-900/25',
    icon: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200/75 dark:border-orange-700/45',
    glow: 'shadow-orange-200/35 dark:shadow-orange-950/30',
    iconWrap: 'bg-orange-100/70 dark:bg-orange-900/35 ring-1 ring-orange-200/65 dark:ring-orange-700/45'
  }
};

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend,
  isAmount = false
}) => {
  const colors = colorClasses[color];
  const { formatNumber } = useDigits();

  const formatValue = (val: number) => {
    if (isAmount) {
      return formatNumber(Number(val), { suffix: ' د.ع' });
    }
    return formatNumber(Number(val));
  };

  return (
    <div
      className={`stat-card min-w-0 rounded-2xl border p-4 sm:p-6 lg:p-8 ${colors.surface} ${colors.border} ${colors.glow} backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
            {title}
          </p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white break-all leading-tight">
            {formatValue(value)}
          </p>
          {trend && (
            <div className="flex items-center mt-1 sm:mt-2">
              <span className={`text-xs sm:text-sm font-medium ${
                trend.isPositive 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {isAmount ? `${formatNumber(trend.value)} مدين` : `${trend.value > 0 ? '+' : ''}${formatNumber(trend.value)}`}
              </span>
            </div>
          )}
        </div>
        <div className={`p-2 sm:p-3 lg:p-5 rounded-full ${colors.iconWrap}`}>
          <Icon className={`h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
};
