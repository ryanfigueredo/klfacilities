'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyResult {
  mes: string;
  receita: number;
  despesa: number;
  resultado: number;
}

interface AreaMonthlyProps {
  data: MonthlyResult[];
}

export function AreaMonthly({ data }: AreaMonthlyProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatMonth = (mes: string) => {
    const date = new Date(mes);
    return date.toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado Mensal (18 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis
              dataKey="mes"
              tickFormatter={formatMonth}
              className="text-xs"
            />
            <YAxis tickFormatter={formatCurrency} className="text-xs" />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Valor']}
              labelFormatter={formatMonth}
            />
            <Area
              type="monotone"
              dataKey="resultado"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
              name="Resultado"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
