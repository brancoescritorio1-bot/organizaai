import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

// --- Standard Metric Card (Apple-inspired) ---
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
    border: 'border-slate-200/80 hover:border-emerald-300',
    iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    text: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  red: {
    bg: 'bg-white',
    border: 'border-slate-200/80 hover:border-rose-300',
    iconBg: 'bg-rose-50 text-rose-700 border border-rose-100',
    text: 'text-rose-700',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-slate-200/80 hover:border-indigo-300',
    iconBg: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    text: 'text-indigo-900',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  },
  amber: {
    bg: 'bg-white',
    border: 'border-slate-200/80 hover:border-amber-300',
    iconBg: 'bg-amber-50 text-amber-700 border border-amber-100',
    text: 'text-amber-800',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-slate-200/80 hover:border-slate-300',
    iconBg: 'bg-slate-100 text-slate-800 border border-slate-200/60',
    text: 'text-slate-900',
    badge: 'bg-slate-100 text-slate-700 border-slate-200/80',
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
        'p-5 rounded-2xl border shadow-xs transition-all flex flex-col justify-between min-h-[110px]',
        styles.bg,
        styles.border,
        onClick ? 'cursor-pointer hover:shadow-sm' : '',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('p-1.5 rounded-lg shrink-0 flex items-center justify-center', styles.iconBg)}>
            <Icon size={15} />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
        {badge && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md border', styles.badge)}>
            {badge}
          </span>
        )}
      </div>

      <div>
        <h3 className={cn('text-xl sm:text-2xl font-bold tracking-tight truncate', styles.text)}>
          {formattedValue}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// --- Standard Sub-tab Header (Apple-inspired) ---
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
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/80">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight tracking-tight">
            {title}
          </h2>
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

// --- Standard Status Badge (Apple-inspired) ---
export const FinancialStatusBadge: React.FC<{
  status: string;
  className?: string;
}> = ({ status, className }) => {
  const norm = (status || '').toLowerCase();
  const isPaid = norm === 'pago';
  const isPending = norm === 'pendente';
  const isOverdue = norm === 'vencida';
  const isRetained = norm === 'retida';

  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status || 'N/A';

  if (isPaid) {
    colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    label = 'Pago';
  } else if (isPending) {
    colorClass = 'bg-amber-50 text-amber-800 border-amber-200/80';
    label = 'Pendente';
  } else if (isOverdue) {
    colorClass = 'bg-rose-50 text-rose-800 border-rose-200/80';
    label = 'Vencida';
  } else if (isRetained) {
    colorClass = 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
    label = 'Retida';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border tracking-wide uppercase',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
};
