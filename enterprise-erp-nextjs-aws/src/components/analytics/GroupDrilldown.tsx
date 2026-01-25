'use client';

import { PizzaGrupo } from './PizzaGrupo';
import { TabelaDetalheGrupo } from './TabelaDetalheGrupo';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useGroupBreakdown } from '@/hooks/useAnalyticsQueries';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';

interface GroupDrilldownProps {
  selectedGroupId?: string;
  selectedGroupName?: string;
  onClear?: () => void;
}

export function GroupDrilldown({
  selectedGroupId,
  selectedGroupName,
  onClear,
}: GroupDrilldownProps) {
  const { filters } = useAnalyticsFilters();
  const { data, isLoading, error, refetch, isRefetching } = useGroupBreakdown(
    selectedGroupId,
    filters
  );

  if (!selectedGroupId) {
    return (
      <Card>
        <CardContent>
          <div className="h-40 flex items-center justify-between px-4">
            <p className="text-muted-foreground">
              Clique em um grupo acima para ver a distribuição.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="text-sm text-muted-foreground">
            Grupo: {selectedGroupName}
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpar seleção
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent>
              <Skeleton className="h-80" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton className="h-80" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent>
          <div className="p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Erro ao carregar drill-down.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClear}>
                Limpar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = data.pie.map(p => ({
    categoria: p.categoria,
    total: p.total,
    pct: p.pct,
  }));
  const tableData = data.table.map(t => ({
    categoria: t.categoria,
    unidade: t.unidade,
    total: t.total,
    pct: t.pct,
  }));

  return (
    <>
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="text-sm text-muted-foreground">
          Grupo: {selectedGroupName}
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Limpar seleção
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <PizzaGrupo
            title={`Distribuição por Categoria (Grupo: ${selectedGroupName})`}
            data={pieData}
          />
        </div>
        <div>
          <TabelaDetalheGrupo data={tableData} />
        </div>
      </div>
    </>
  );
}
