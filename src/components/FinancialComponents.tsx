import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

// --- Standard Metric Card ---
interface FinancialMetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'emerald' | 'red' | 'indigo' | 'amber' | 'slate';
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
  className?: string;
}

const variantStyles = {
  emerald: {
    bg: 'bg-white',
    border: 'border-gray-100 hover:border-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-600',
    text: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  red: {
    bg: 'bg-white',
    border: 'border-gray-100 hover:border-red-200',
    iconBg: 'bg-red-50 text-red-600',
    text: 'text-red-600',
    badge: 'bg-red-50 text-red-700 border-red-100',
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-gray-100 hover:border-indigo-200',
    iconBg: 'bg-indigo-50 text-indigo-600',
    text: 'text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  amber: {
    bg: 'bg-white',
    border: 'border-gray-100 hover:border-amber-200',
    iconBg: 'bg-amber-50 text-amber-600',
    text: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-gray-100 hover:border-gray-200',
    iconBg: 'bg-gray-100 text-gray-700',
    text: 'text-gray-900',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

export const FinancialMetricCard: React.FC<FinancialMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  variant = 'slate',
  subtitle,
  badge,
  onClick,
  className,
}) => {
  const styles = variantStyles[variant];
  const formattedValue =
    typeof value === 'number'
      ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : value;

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-5 rounded-2xl border shadow-sm transition-all flex flex-col justify-between min-h-[120px]',
        styles.bg,
        styles.border,
        onClick ? 'cursor-pointer hover:shadow-md' : '',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('p-2 rounded-xl shrink-0 flex items-center justify-center', styles.iconBg)}>
            <Icon size={18} />
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
        {badge && (
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', styles.badge)}>
            {badge}
          </span>
        )}
      </div>

      <div>
        <h3 className={cn('text-xl sm:text-2xl font-black tracking-tight truncate', styles.text)}>
          {formattedValue}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-gray-400 font-medium mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// --- Standard Sub-tab Header ---
interface FinancialHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  rightContent?: React.ReactNode;
}

export const FinancialHeader: React.FC<FinancialHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  rightContent,
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100/60">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            {title}
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      {rightContent && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {rightContent}
        </div>
      )}
    </div>
  );
};

// --- Standard Status Badge ---
export const FinancialStatusBadge: React.FC<{
  status: string;
  className?: string;
}> = ({ status, className }) => {
  const norm = (status || '').toLowerCase();
  const isPaid = norm === 'pago';
  const isPending = norm === 'pendente';
  const isOverdue = norm === 'vencida';
  const isRetained = norm === 'retida';

  let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
  let label = status || 'N/A';

  if (isPaid) {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Pago';
  } else if (isPending) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Pendente';
  } else if (isOverdue) {
    colorClass = 'bg-red-50 text-red-700 border-red-200';
    label = 'Vencida';
  } else if (isRetained) {
    colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    label = 'Retida';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
};
