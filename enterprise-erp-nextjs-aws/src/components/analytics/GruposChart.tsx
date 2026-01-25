'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useByGrupo } from '@/hooks/useAnalyticsQueries';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { toBRL } from '@/lib/utils/analytics';

type GruposChartProps = {
  onBarClick?: (payload: { groupId: string; groupName: string }) => void;
};

export function GruposChart({ onBarClick }: GruposChartProps) {
  const { filters, addFilter } = useAnalyticsFilters();
  const { data, isLoading, error } = useByGrupo(filters);
  const [selectedGrupo, setSelectedGrupo] = useState<any>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Por Grupo</CardTitle>
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
          <CardTitle>Por Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...data.grupos]
    .sort((a: any, b: any) => b.total - a.total)
    .map(grupo => ({
      ...grupo,
      nome: grupo.grupo,
      grupo:
        grupo.grupo.length > 18
          ? grupo.grupo.substring(0, 18) + '...'
          : grupo.grupo,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.grupo}</p>
          <p className="text-blue-600">Total: {toBRL(data.total)}</p>
          <p className="text-sm text-muted-foreground">
            {data.percentual.toFixed(1)}% do total • {data.count} movimento
            {data.count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (entry: any) => {
    const original = data.grupos.find(
      g => (g as any).grupo === entry.nome || (g as any).grupo === entry.grupo
    );
    if (onBarClick && entry?.id) {
      onBarClick({
        groupId: String(entry.id),
        groupName: entry.nome || entry.grupo,
      });
      return;
    }
    if (original) setSelectedGrupo(original);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Por Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              {/* Grupos na horizontal (eixo X) */}
              <XAxis
                dataKey="grupo"
                type="category"
                tick={{ fontSize: 12 }}
                interval={0}
                height={50}
              />
              {/* Valores na vertical (eixo Y) */}
              <YAxis
                type="number"
                tickFormatter={value => toBRL(value)}
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="total"
                fill="#8B5CF6"
                onClick={payload => handleBarClick((payload as any).payload)}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawer de detalhes do grupo */}
      <Drawer
        open={!!selectedGrupo}
        onOpenChange={() => setSelectedGrupo(null)}
      >
        <DrawerContent className="w-96">
          <DrawerHeader>
            <DrawerTitle>{selectedGrupo?.grupo}</DrawerTitle>
          </DrawerHeader>
          <div className="mt-6 space-y-6">
            {/* Resumo */}
            <div className="space-y-2">
              <h3 className="font-semibold">Resumo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">
                    {toBRL(selectedGrupo?.total || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">% do Total</p>
                  <p className="text-lg font-bold">
                    {selectedGrupo?.percentual.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Movimentos</p>
                  <p className="text-lg font-bold">{selectedGrupo?.count}</p>
                </div>
              </div>
            </div>

            {/* Por Unidade */}
            <div className="space-y-2">
              <h3 className="font-semibold">Por Unidade</h3>
              <div className="space-y-2">
                {selectedGrupo?.children.map((unidade: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{unidade.unidade}</p>
                      <p className="text-sm text-muted-foreground">
                        {unidade.percentual.toFixed(1)}% • {unidade.count}{' '}
                        movimento{unidade.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{toBRL(unidade.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão para filtrar */}
            <Button
              onClick={() => {
                // Aqui você pode implementar a lógica para filtrar por grupo
                // Por enquanto, apenas fecha o drawer
                setSelectedGrupo(null);
              }}
              className="w-full"
            >
              Filtrar por este Grupo
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
