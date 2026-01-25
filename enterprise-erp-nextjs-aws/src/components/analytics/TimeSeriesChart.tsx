'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSeries } from '@/hooks/useAnalyticsQueries';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { toBRL } from '@/lib/utils/analytics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TimeSeriesChart() {
  const { filters } = useAnalyticsFilters();
  // Usar filtros atuais sem forçar janela fixa; backend retorna todos os meses com dados
  const { data, isLoading, error } = useSeries(filters as any);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Série Temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Série Temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Formatar dados e garantir ordenação por competência
  const sorted = [...data].sort(
    (a: any, b: any) =>
      new Date(a.competencia).getTime() - new Date(b.competencia).getTime()
  );
  const chartData = sorted.map(item => ({
    ...item,
    competencia: format(new Date(item.competencia), 'MMM/yy', { locale: ptBR }),
    receitas: Math.abs(item.receitas),
    despesas: Math.abs(item.despesas),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {toBRL(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="competencia"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={value => toBRL(value)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="receitas"
              stackId="1"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#gradReceitas)"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              name="Receitas"
            />
            <Area
              type="monotone"
              dataKey="despesas"
              stackId="1"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#gradDespesas)"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              name="Despesas"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
