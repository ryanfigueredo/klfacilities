import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  actions?: ReactNode;
}

export function Section({
  title,
  description,
  children,
  className,
  headerClassName,
  contentClassName,
  actions,
}: SectionProps) {
  return (
    <section className={cn('space-y-6', className)}>
      {/* Header */}
      <div className={cn('flex items-start justify-between', headerClassName)}>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {/* Content */}
      <div className={cn('space-y-6', contentClassName)}>{children}</div>
    </section>
  );
}
