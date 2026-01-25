'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange as RdpDateRange } from 'react-day-picker';
import {
  type DateRange,
  todayRange,
  yesterdayRange,
  currentMonthRange,
  last30DaysRange,
  formatRangeLabel,
} from '@/lib/date-range';

export type Range = DateRange;

type Props = {
  value: Range;
  onChange: (range: Range) => void;
  className?: string;
  presets?: boolean;
};

export function DateRangePicker({
  value,
  onChange,
  className,
  presets = true,
}: Props) {
  const label = formatRangeLabel(value || {});

  function normalizeRange(r: Range): Range {
    if (!r?.from || !r?.to) return r;
    const end = new Date(r.to);
    end.setHours(23, 59, 59, 999);
    return { from: r.from, to: end };
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !value?.from && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[640px] p-3" align="start">
        {presets && (
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onChange(normalizeRange(todayRange()))}
            >
              Hoje
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onChange(normalizeRange(yesterdayRange()))}
            >
              Ontem
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onChange(normalizeRange(currentMonthRange()))}
            >
              Mês atual
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onChange(normalizeRange(last30DaysRange()))}
            >
              Últimos 30 dias
            </Button>
          </div>
        )}
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={value as unknown as RdpDateRange}
          onSelect={r => r && onChange(normalizeRange(r as any))}
          defaultMonth={value?.from ?? new Date()}
          pagedNavigation
          showOutsideDays
          fixedWeeks
          modifiersClassNames={
            { outside: 'text-muted-foreground opacity-50' } as any
          }
          classNames={{
            day_outside: 'text-muted-foreground opacity-50',
            day: 'h-9 w-9 p-0 aria-selected:opacity-100',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
