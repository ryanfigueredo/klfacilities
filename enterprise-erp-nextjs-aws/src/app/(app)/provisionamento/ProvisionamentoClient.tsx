'use client';

import * as React from 'react';
import { startOfMonth } from 'date-fns';
import ProvisionCalendar, {
  ProvisionEvent,
} from '@/components/provisionamento/ProvisionCalendar';
import { ProvisionamentosTable } from '@/components/provisionamento/ProvisionamentosTable';
import { ProvisionKpis } from '@/components/provisionamento/ProvisionKpis';
import { useProvisionsByMonth } from '@/hooks/useProvisionsByMonth';
import { ProvisaoForm } from '@/components/provisionamento/ProvisaoForm';

export function ProvisionamentoClient() {
  const [month, setMonth] = React.useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const filters = new URLSearchParams();
  const { data: monthEvents } = useProvisionsByMonth(month, filters);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ProvisaoForm />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="space-y-4">
          <ProvisionamentosTable
            dateFilter={
              selectedDate ? selectedDate.toISOString().slice(0, 10) : undefined
            }
          />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20">
          <ProvisionKpis />
          <ProvisionCalendar
            month={month}
            events={monthEvents as ProvisionEvent[]}
            onMonthChange={setMonth}
            onSelectDate={d => {
              if (!d || isNaN(d.getTime())) {
                setSelectedDate(null);
                const url = new URL(window.location.href);
                url.searchParams.delete('date');
                history.replaceState(null, '', url.toString());
                return;
              }
              setSelectedDate(d);
              const iso = d.toISOString().slice(0, 10);
              const url = new URL(window.location.href);
              url.searchParams.set('date', iso);
              history.replaceState(null, '', url.toString());
            }}
            selectedDate={selectedDate ?? undefined}
          />
        </aside>
      </div>
    </div>
  );
}
