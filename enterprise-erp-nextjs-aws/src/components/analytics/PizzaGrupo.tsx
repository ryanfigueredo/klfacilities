'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { generateColors, toBRL } from '@/lib/utils/analytics';

type PieDatum = { categoria: string; total: number; pct: number };

interface PizzaGrupoProps {
  title?: string;
  data: PieDatum[];
}

export function PizzaGrupo({
  title = 'Distribuição por Categoria',
  data,
}: PizzaGrupoProps) {
  const colors = generateColors(data.length || 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Nenhum dado para exibir
          </div>
        ) : (
          <div
            className="h-80"
            aria-label="Distribuição por categoria do grupo"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => {
                    const p = typeof percent === 'number' ? percent : 0;
                    return `${name} ${(p * 100).toFixed(0)}%`;
                  }}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    toBRL(Number(value)),
                    props?.payload?.categoria,
                  ]}
                />
                <Legend verticalAlign="bottom" height={24} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
