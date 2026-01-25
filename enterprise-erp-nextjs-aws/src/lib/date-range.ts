import {
  startOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DateRange = { from?: Date; to?: Date };

export function todayRange(): DateRange {
  const d = startOfDay(new Date());
  return { from: d, to: d };
}

export function yesterdayRange(): DateRange {
  const d = startOfDay(subDays(new Date(), 1));
  return { from: d, to: d };
}

export function currentMonthRange(): DateRange {
  const from = startOfMonth(new Date());
  const to = endOfMonth(new Date());
  return { from, to };
}

export function last30DaysRange(): DateRange {
  const to = startOfDay(new Date());
  const from = startOfDay(subDays(to, 29));
  return { from, to };
}

export function formatRangeLabel(r: DateRange) {
  if (r?.from && r?.to) {
    return `${format(r.from, 'dd/MM/yyyy', { locale: ptBR })} – ${format(r.to, 'dd/MM/yyyy', { locale: ptBR })}`;
  }
  if (r?.from && !r?.to) {
    return `${format(r.from, 'dd/MM/yyyy', { locale: ptBR })} …`;
  }
  return 'Selecionar período';
}
