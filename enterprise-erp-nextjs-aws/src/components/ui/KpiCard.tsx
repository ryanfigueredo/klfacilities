import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function KpiCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = 'default',
  className,
}: KpiCardProps) {
  const variantClasses = {
    default: 'bg-card border-border',
    success: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
  };

  const trendClasses = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border p-6 transition-all hover:shadow-lg',
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {icon && (
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              trend.isPositive ? trendClasses.positive : trendClasses.negative
            )}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-sm text-muted-foreground">
            vs. mês anterior
          </span>
        </div>
      )}
    </div>
  );
}
