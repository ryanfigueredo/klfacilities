'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Calculator,
  FileText,
} from 'lucide-react';
import { useSummary } from '@/hooks/useAnalyticsQueries';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { toBRL, formatVariation } from '@/lib/utils/analytics';

export function KpiCards() {
  const { filters } = useAnalyticsFilters();
  const { data, isLoading, error } = useSummary(filters);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Erro ao carregar KPIs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Receitas',
      value: data.receitas,
      variation: data.variacoes.receitas,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: 'Despesas',
      value: data.despesas,
      variation: data.variacoes.despesas,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: 'Resultado',
      value: data.resultado,
      variation: data.variacoes.resultado,
      icon: Calculator,
      color:
        data.resultado >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        data.resultado >= 0
          ? 'bg-green-50 dark:bg-green-950/20'
          : 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: 'Movimentos',
      value: data.qtdMovimentos,
      variation: data.variacoes.qtdMovimentos,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        const isPositive = kpi.variation >= 0;

        return (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.title === 'Movimentos'
                  ? kpi.value.toLocaleString('pt-BR')
                  : toBRL(kpi.value)}
              </div>
              {/* Sparkline removido a pedido: manter KPIs limpos e legíveis */}
              <div className="flex items-center space-x-2 mt-2">
                {kpi.variation !== 0 && (
                  <>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <Badge
                      variant={isPositive ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {formatVariation(kpi.variation)}
                    </Badge>
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  vs período anterior
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
