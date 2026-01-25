'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTopCategorias } from '@/hooks/useAnalyticsQueries';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { toBRL } from '@/lib/utils/analytics';
import { useMemo } from 'react';

export function TopCategoriasChart() {
  const { filters, addFilter } = useAnalyticsFilters();
  const { data, isLoading, error } = useTopCategorias(filters, 10);
  const items = data ?? [];

  // Mantém original + cria rótulo curto só pra exibir no eixo
  const chartData = useMemo(
    () =>
      items.map(item => ({
        ...item,
        categoriaOriginal: item.categoria,
        categoriaLabel:
          item.categoria.length > 20
            ? item.categoria.slice(0, 20) + '…'
            : item.categoria,
      })),
    [items]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{p.categoriaOriginal}</p>
          <p className="text-blue-600">Total: {toBRL(payload[0].value)}</p>
          <p className="text-sm text-muted-foreground">
            {p.count} movimento{p.count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  // Remover interação de clique para evitar filtros acidentais no mobile
  const handleClick = (_index: number) => {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Categorias por Valor</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="categoriaLabel"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tickFormatter={v => toBRL(v)} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total">
              {chartData.map((_, idx) => (
                <Cell
                  key={`bar-${idx}`}
                  cursor="default"
                  onClick={() => handleClick(idx)}
                  fill="url(#gradBar)"
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.2} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
