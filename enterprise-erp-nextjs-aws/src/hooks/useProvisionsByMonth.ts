'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ProvisionEvent } from '@/components/provisionamento/ProvisionCalendar';

export function useProvisionsByMonth(month: Date, filters: URLSearchParams) {
  const [data, setData] = useState<ProvisionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const monthKey = month.toISOString();
  const filtersKey = filters.toString();

  useEffect(() => {
    const m = new Date(monthKey);
    const qs = new URLSearchParams(filters);
    qs.set('start', format(startOfMonth(m), 'yyyy-MM-dd'));
    qs.set('end', format(endOfMonth(m), 'yyyy-MM-dd'));

    setLoading(true);
    qs.set('from', format(startOfMonth(m), 'yyyy-MM-dd'));
    qs.set('to', format(endOfMonth(m), 'yyyy-MM-dd'));
    fetch(`/api/provisionamentos?${qs.toString()}`)
      .then(r => r.json())
      .then(j => {
        const arr = Array.isArray(j?.rows)
          ? j.rows
          : Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j?.provisoes)
              ? j.provisoes
              : [];
        const out: ProvisionEvent[] = (arr || []).map((p: any) => ({
          id: String(p.id),
          dataPagamento: (
            p.dataPrevista ||
            p.dataVenc ||
            p.dataPagamento ||
            p.data
          )?.slice(0, 10),
          valor: Number(p.valor),
          tipo: (p.tipo || 'DESPESA') as any,
          status: (p.status || 'PENDENTE') as any,
          descricao: p.descricao,
          grupoNome: p.grupo?.nome || null,
        }));
        setData(out);
      })
      .finally(() => setLoading(false));
  }, [monthKey, filtersKey, month, filters]);

  return { data, loading };
}
