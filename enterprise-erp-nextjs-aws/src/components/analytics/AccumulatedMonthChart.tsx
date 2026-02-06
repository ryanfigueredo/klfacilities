'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { toBRL } from '@/lib/utils/analytics';

type Row = { data: string; receitas: number; despesas: number };

export default function AccumulatedMonthChart() {
  const { filters } = useAnalyticsFilters();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const grupoIdKey = JSON.stringify(filters.grupoId ?? []);
  const unidadeIdKey = JSON.stringify(filters.unidadeId ?? []);
  const categoriaKey = JSON.stringify(filters.categoria ?? []);
  const tipoKey = JSON.stringify(filters.tipo ?? []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.start) params.set('start', filters.start);
        if (filters.end) params.set('end', filters.end);
        (filters.grupoId || []).forEach(g => params.append('grupoId', g));
        (filters.unidadeId || []).forEach(u => params.append('unidadeId', u));
        (filters.categoria || []).forEach(c => params.append('categoria', c));
        (filters.tipo || []).forEach(t => params.append('tipo', t));
        const r = await fetch(`/api/analytics/heatmap?granularity=day&${params}`);
        if (!r.ok) throw new Error('Falha ao carregar');
        const j = await r.json();
        if (!active) return;
        const daily: Array<{ date: string; receitas: number; despesas: number }> = j.daily || [];
        let accR = 0;
        let accD = 0;
        const out = daily
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(d => {
            accR += Math.abs(d.receitas || 0);
            accD += Math.abs(d.despesas || 0);
            return { data: d.date.slice(8, 10), receitas: accR, despesas: accD };
          });
        setRows(out);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filters.start, filters.end, filters.grupoId, filters.unidadeId, filters.categoria, filters.tipo, grupoIdKey, unidadeIdKey, categoriaKey, tipoKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acumulado no Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <defs>
                <linearGradient id="gradLineR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradLineD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => toBRL(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => toBRL(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="receitas" stroke="url(#gradLineR)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Receitas" />
              <Line type="monotone" dataKey="despesas" stroke="url(#gradLineD)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Despesas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}


