'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  isValid,
  parseISO,
  addMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type ProvisionStatus = 'PENDENTE' | 'EFETIVADO' | 'CANCELADO';
export type ProvisionTipo = 'RECEITA' | 'DESPESA';

export type ProvisionEvent = {
  id: string;
  dataPagamento: string; // ISO yyyy-MM-dd
  valor: number;
  tipo: ProvisionTipo;
  status: ProvisionStatus;
  descricao?: string;
  grupoNome?: string | null;
};

type Props = {
  month: Date;
  events: ProvisionEvent[];
  onMonthChange: (d: Date) => void;
  onSelectDate: (d: Date | null) => void;
  selectedDate?: Date | null;
  badgeMode?: 'count' | 'sum';
};

export default function ProvisionCalendar({
  month,
  events,
  onMonthChange,
  onSelectDate,
  selectedDate,
  badgeMode = 'count',
}: Props) {
  const byDate = React.useMemo(() => {
    const m = new Map<string, ProvisionEvent[]>();
    for (const ev of events || []) {
      const key = (ev.dataPagamento || '').slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(ev);
      m.set(key, arr);
    }
    return m;
  }, [events]);

  function renderDayContent(date: Date) {
    if (!date || !isValid(date)) return null;
    const key = format(date, 'yyyy-MM-dd');
    const items = byDate.get(key) ?? [];
    const total = items.reduce((acc, i) => acc + (i.valor || 0), 0);
    const overdue = items.some(i => {
      const d = parseISO(i.dataPagamento);
      return i.status === 'PENDENTE' && isValid(d) && d < new Date();
    });
    const hasPend = items.some(i => i.status === 'PENDENTE');
    const hasPaid = items.some(i => i.status === 'EFETIVADO');
    const hasCanc = items.some(i => i.status === 'CANCELADO');
    const hasDesp = items.some(i => i.tipo === 'DESPESA');
    const hasRec = items.some(i => i.tipo === 'RECEITA');
    const badgeText =
      badgeMode === 'sum'
        ? total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          })
        : String(items.length > 99 ? '99+' : items.length);
    const title =
      items.length > 0
        ? `${items.length} provisão(ões)\nTotal: ${total.toLocaleString(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          )}`
        : format(date, 'PPP', { locale: ptBR });
    const outside = !isSameMonth(date, month);

    // Cor única e prioritária para a "bolinha" de status (uma por dia)
    const dotColor = overdue
      ? 'bg-red-500'
      : hasPend
        ? 'bg-yellow-500'
        : hasPaid
          ? 'bg-green-500'
          : hasCanc
            ? 'bg-zinc-400'
            : hasRec && !hasDesp
              ? 'bg-emerald-500'
              : hasDesp && !hasRec
                ? 'bg-rose-500'
                : 'bg-transparent';
    return (
      <div
        className={cn(
          'relative flex h-8 w-8 items-center justify-center',
          outside && 'opacity-50'
        )}
        title={title}
      >
        <span
          className={cn(
            'relative z-10 text-sm leading-none',
            outside ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          {format(date, 'd')}
        </span>
        {/* Única bolinha de status abaixo da data */}
        {items.length > 0 && (
          <div className="absolute -bottom-1 left-1/2 z-0 -translate-x-1/2">
            <span className={cn('block h-1.5 w-1.5 rounded-full', dotColor)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4">
      <Calendar
        mode="single"
        month={startOfMonth(month)}
        onMonthChange={onMonthChange}
        selected={selectedDate ?? undefined}
        onSelect={(d: Date | undefined) => {
          if (!d) return;
          if (selectedDate && +d === +selectedDate) {
            onSelectDate(null);
            return;
          }
          onSelectDate(d);
        }}
        locale={ptBR}
        showOutsideDays
        numberOfMonths={1}
        captionLayout="dropdown"
        classNames={{ caption_label: 'hidden' }}
        fromMonth={new Date(new Date().getFullYear() - 1, 0, 1)}
        toMonth={new Date(new Date().getFullYear() + 1, 11, 31)}
        hideNavigation
        footer={
          <div className="mt-2 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Mês anterior"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-accent"
              onClick={() => onMonthChange(addMonths(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Próximo mês"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-accent"
              onClick={() => onMonthChange(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
        components={
          {
            // TS: DayContent is not declared in v9 types; cast to any for custom slot content.
            DayContent: ({ date }: any) => renderDayContent(date),
          } as any
        }
        formatters={{
          formatWeekdayName: (date: Date) =>
            ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][date.getDay()],
        }}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Pendente
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Pago
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-zinc-400" /> Cancelado
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Vencido
        </div>
      </div>
    </div>
  );
}
