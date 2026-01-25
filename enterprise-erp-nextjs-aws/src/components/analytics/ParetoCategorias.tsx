'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useGroupBreakdown } from '@/hooks/useAnalyticsQueries';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';

export default function ParetoCategorias({ groupId, groupName }: { groupId?: string; groupName?: string }) {
  const { filters } = useAnalyticsFilters();
  const { data, isLoading } = useGroupBreakdown(groupId || '', filters);

  if (!groupId) return null;

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pareto de Categorias {groupName ? `(${groupName})` : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const base = [...data.pie]
    .sort((a, b) => b.total - a.total)
    .map(p => ({ categoria: p.categoria, total: p.total }));
  const totalGeral = base.reduce((a, b) => a + b.total, 0) || 1;
  let acc = 0;
  const chart = base.map(r => {
    acc += r.total;
    return { categoria: r.categoria, total: r.total, cumul: (acc / totalGeral) * 100 };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pareto de Categorias {groupName ? `(${groupName})` : ''}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 11 }} interval={0} height={60} angle={-30} textAnchor="end" />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="total" fill="url(#gradPareto)" />
              <LineChart data={chart}>
                <Line yAxisId="right" type="monotone" dataKey="cumul" stroke="#F59E0B" dot={false} />
              </LineChart>
              <defs>
                <linearGradient id="gradPareto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.2} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}


