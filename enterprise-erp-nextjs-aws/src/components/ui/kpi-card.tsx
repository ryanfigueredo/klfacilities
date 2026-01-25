import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  className,
}: KpiCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(val);
    }
    return val;
  };

  return (
    <Card className={cn('border-white/5', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-400 dark:text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {subtitle && (
          <p className="text-xs text-neutral-500 dark:text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div
            className={cn(
              'flex items-center text-xs mt-2',
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            )}
          >
            <span className={cn('mr-1', trend.isPositive ? '↑' : '↓')}>
              {trend.isPositive ? '↗' : '↘'}
            </span>
            {Math.abs(trend.value)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
