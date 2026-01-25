'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';

export default function HeatmapChart() {
  const { filters } = useAnalyticsFilters();
  const [matrix, setMatrix] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)));

  useEffect(() => {
    let active = true;
    (async () => {
      const params = new URLSearchParams();
      if (filters.start) params.set('start', filters.start);
      if (filters.end) params.set('end', filters.end);
      (filters.grupoId || []).forEach(g => params.append('grupoId', g));
      (filters.unidadeId || []).forEach(u => params.append('unidadeId', u));
      (filters.categoria || []).forEach(c => params.append('categoria', c));
      const r = await fetch(`/api/analytics/heatmap?${params}`);
      if (!r.ok) return;
      const j = await r.json();
      if (!active) return;
      setMatrix(j.heatMap || matrix);
    })();
    return () => {
      active = false;
    };
  }, [filters.start, filters.end, JSON.stringify(filters.grupoId), JSON.stringify(filters.unidadeId), JSON.stringify(filters.categoria)]);

  const max = Math.max(...matrix.flat());
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Picos por Dia/Hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="p-1"></th>
                {Array.from({ length: 24 }).map((_, h) => (
                  <th key={h} className="p-1 text-center w-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, d) => (
                <tr key={d}>
                  <td className="p-1 pr-2 text-right whitespace-nowrap">{days[d]}</td>
                  {row.map((v, h) => {
                    const intensity = max > 0 ? v / max : 0;
                    const bg = `rgba(139,92,246,${0.1 + intensity * 0.7})`;
                    return <td key={h} className="w-6 h-6" style={{ backgroundColor: bg }} title={`${days[d]} ${h}:00 → ${v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


