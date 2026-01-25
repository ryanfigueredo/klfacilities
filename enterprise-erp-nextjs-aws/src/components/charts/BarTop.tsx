'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TopExpense {
  nome: string;
  valor: number;
  count: number;
}

interface BarTopProps {
  topCategorias: TopExpense[];
  topGrupos: TopExpense[];
}

export function BarTop({ topCategorias, topGrupos }: BarTopProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTooltip = (value: number, name: string) => {
    return [
      formatCurrency(value),
      name === 'valor' ? 'Valor Total' : 'Quantidade',
    ];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Despesas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categorias" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
            <TabsTrigger value="grupos">Por Grupo</TabsTrigger>
          </TabsList>

          <TabsContent value="categorias" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCategorias}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis
                  dataKey="nome"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={formatCurrency} className="text-xs" />
                <Tooltip formatter={formatTooltip} />
                <Bar dataKey="valor" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="grupos" className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topGrupos}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis
                  dataKey="nome"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={formatCurrency} className="text-xs" />
                <Tooltip formatter={formatTooltip} />
                <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
