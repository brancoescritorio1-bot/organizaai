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
    border: 'border-black/[0.06] hover:border-black/[0.12]',
    iconBg: 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20',
    text: 'text-[#1d1d1f]',
    badge: 'bg-[#34c759]/10 text-[#28833e] border-[#34c759]/20',
  },
  red: {
    bg: 'bg-white',
    border: 'border-black/[0.06] hover:border-black/[0.12]',
    iconBg: 'bg-[#ff3b30]/10 text-[#ff3b30] border border-[#ff3b30]/20',
    text: 'text-[#1d1d1f]',
    badge: 'bg-[#ff3b30]/10 text-[#c92a24] border-[#ff3b30]/20',
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-black/[0.06] hover:border-black/[0.12]',
    iconBg: 'bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20',
    text: 'text-[#1d1d1f]',
    badge: 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20',
  },
  amber: {
    bg: 'bg-white',
    border: 'border-black/[0.06] hover:border-black/[0.12]',
    iconBg: 'bg-[#ff9500]/10 text-[#ff9500] border border-[#ff9500]/20',
    text: 'text-[#1d1d1f]',
    badge: 'bg-[#ff9500]/10 text-[#b26a00] border-[#ff9500]/20',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-black/[0.06] hover:border-black/[0.12]',
    iconBg: 'bg-[#f5f5f7] text-[#1d1d1f] border border-black/[0.06]',
    text: 'text-[#1d1d1f]',
    badge: 'bg-[#f5f5f7] text-[#515154] border-black/[0.06]',
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
        'p-5 rounded-2xl border shadow-xs transition-all flex flex-col justify-between min-h-[105px]',
        styles.bg,
        styles.border,
        onClick ? 'cursor-pointer hover:shadow-sm' : '',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('w-7 h-7 rounded-lg shrink-0 flex items-center justify-center', styles.iconBg)}>
            <Icon size={14} />
          </div>
          <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider truncate">
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
        <h3 className={cn('text-xl sm:text-2xl font-semibold tracking-tight truncate tabular-nums', styles.text)}>
          {formattedValue}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-[#86868b] font-normal mt-0.5 truncate">
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
  subtitle?: string;
  icon: LucideIcon;
  rightContent?: React.ReactNode;
}

export const FinancialHeader: React.FC<FinancialHeaderProps> = ({
  title,
  icon: Icon,
  rightContent,
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-black/[0.06] shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center shrink-0 border border-black/[0.06]">
          <Icon size={17} />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-[#1d1d1f] leading-tight tracking-tight">
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

  let colorClass = 'bg-[#f5f5f7] text-[#515154] border-black/[0.08]';
  let label = status || 'N/A';

  if (isPaid) {
    colorClass = 'bg-[#34c759]/10 text-[#247c3b] border-[#34c759]/20';
    label = 'Pago';
  } else if (isPending) {
    colorClass = 'bg-[#ff9500]/10 text-[#b26a00] border-[#ff9500]/20';
    label = 'Pendente';
  } else if (isOverdue) {
    colorClass = 'bg-[#ff3b30]/10 text-[#c92a24] border-[#ff3b30]/20';
    label = 'Vencida';
  } else if (isRetained) {
    colorClass = 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/20';
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

