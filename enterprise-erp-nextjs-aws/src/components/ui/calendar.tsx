'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';

import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR as any}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-2',
        caption: 'flex justify-center items-center',
        caption_label: 'hidden',
        dropdowns: 'flex items-center justify-center gap-2 font-semibold',
        nav: 'hidden',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] capitalize',
        row: 'flex w-full mt-2',
        cell: 'h-10 w-10 text-center text-sm p-0 relative',
        day: 'h-10 w-10 p-0 font-normal text-foreground outline-none aria-selected:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/50',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'ring-2 ring-primary/30',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        ...classNames,
      }}
      components={{
        Chevron: chevProps => {
          const { orientation = 'left', className } = chevProps as any;
          if (orientation === 'right') {
            return <ChevronRight className={cn('h-4 w-4', className)} />;
          }
          if (orientation === 'up') {
            return (
              <ChevronLeft className={cn('h-4 w-4 -rotate-90', className)} />
            );
          }
          if (orientation === 'down') {
            return (
              <ChevronRight className={cn('h-4 w-4 rotate-90', className)} />
            );
          }
          return <ChevronLeft className={cn('h-4 w-4', className)} />;
        },
        ...props.components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';
