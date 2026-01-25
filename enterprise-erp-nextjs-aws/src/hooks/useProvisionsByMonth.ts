'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ProvisionEvent } from '@/components/provisionamento/ProvisionCalendar';

export function useProvisionsByMonth(month: Date, filters: URLSearchParams) {
  const [data, setData] = useState<ProvisionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = new URLSearchParams(filters);
    qs.set('start', format(startOfMonth(month), 'yyyy-MM-dd'));
    qs.set('end', format(endOfMonth(month), 'yyyy-MM-dd'));
    // status pendentes + pagos + cancelados para dots
    // Se a API aceitar múltiplos, remova este set fixo; aqui trazemos todos
    // e o backend deve ignorar ausência de status para retornar todos

    setLoading(true);
    qs.set('from', format(startOfMonth(month), 'yyyy-MM-dd'));
    qs.set('to', format(endOfMonth(month), 'yyyy-MM-dd'));
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
  }, [month.toISOString(), filters.toString()]);

  return { data, loading };
}
