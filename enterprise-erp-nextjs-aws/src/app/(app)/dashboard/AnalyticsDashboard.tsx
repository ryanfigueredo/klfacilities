'use client';

import { useEffect, useState } from 'react';
import { Section } from '@/components/ui/Section';
import { FilterBar } from '@/components/filters/FilterBar';
import { currentMonthRange } from '@/lib/date-range';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { KpiCards } from '@/components/analytics/KpiCards';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { TopCategoriasChart } from '@/components/analytics/TopCategoriasChart';
import { GruposChart } from '@/components/analytics/GruposChart';
import { GroupDrilldown } from '@/components/analytics/GroupDrilldown';
import { AnomaliasTable } from '@/components/analytics/AnomaliasTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Filter } from 'lucide-react';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';

interface AnalyticsDashboardProps {
  grupos: { id: string; nome: string }[];
  unidades: { id: string; nome: string }[];
  categorias: { nome: string }[];
}

export function AnalyticsDashboard({
  grupos,
  unidades,
  categorias,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { activeFiltersCount, hasActiveFilters } = useAnalyticsFilters();

  // Mantém filtros conforme URL sem forçar mês atual
  return (
    <div className="space-y-8 mx-auto w-full max-w-[390px] sm:max-w-none sm:mx-0">
      {/* Filtros compartilhados (fixos no topo no mobile) */}
      <Section title="Filtros" description="Refine os dados do painel">
        <FilterBar
          groups={grupos.map(g => ({ label: g.nome, value: g.id }))}
          units={unidades.map(u => ({ label: u.nome, value: u.id }))}
          categories={categorias.map(c => ({ label: c.nome, value: c.nome }))}
          initial={{}}
        />
      </Section>

      {/* KPIs */}
      <Section
        title="Indicadores"
        description="Principais métricas financeiras"
      >
        <KpiCards />
      </Section>

      {/* Gráficos */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <div className="min-w-0">
          <TimeSeriesChart />
        </div>
        <div className="min-w-0">
          <TopCategoriasChart />
        </div>
      </div>

      {/* Análise por Grupo (somente visual; clique removido) */}
      <Section
        title="Análise por Grupo"
        description="Distribuição de valores por grupo organizacional"
      >
        <div className="-mx-2 sm:mx-0">
          <GruposChart
            onBarClick={({ groupId, groupName }) =>
              setSelectedGroup({ id: groupId, name: groupName })
            }
          />
        </div>
        <div className="mt-4">
          <GroupDrilldown
            selectedGroupId={selectedGroup?.id}
            selectedGroupName={selectedGroup?.name}
            onClear={() => setSelectedGroup(null)}
          />
        </div>
      </Section>

      {/* Anomalias */}
      <Section
        title="Anomalias"
        description="Detecção de inconsistências nos dados"
      >
        <AnomaliasTable />
      </Section>
    </div>
  );
}
