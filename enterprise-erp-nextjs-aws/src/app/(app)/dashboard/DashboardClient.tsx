'use client';

import { KpiCard } from '@/components/ui/KpiCard';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  FileText,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useDashboardRefresh,
  type DashboardData,
} from '@/hooks/useDashboardRefresh';

// Using shared DashboardData type from the hook

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const { data, isRefreshing, lastUpdate, error, refreshData } =
    useDashboardRefresh(initialData);

  const handleUpdate = () => {
    refreshData(false);
  };

  return (
    <div className="space-y-4">
      {/* Header com botão de atualização */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            {isRefreshing && (
              <span className="ml-2 text-blue-600">• Atualizando...</span>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              Erro na atualização
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receitas"
          value={`R$ ${data.totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          description="Total do mês"
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          trend={{
            value: Math.abs(data.variacaoReceitas),
            isPositive: data.variacaoReceitas >= 0,
          }}
          variant="success"
        />
        <KpiCard
          title="Despesas"
          value={`R$ ${data.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          description="Total do mês"
          icon={<DollarSign className="h-6 w-6 text-red-600" />}
          trend={{
            value: Math.abs(data.variacaoDespesas),
            isPositive: data.variacaoDespesas <= 0,
          }}
          variant="danger"
        />
        <KpiCard
          title="Saldo"
          value={`R$ ${data.saldoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          description="Receitas - Despesas"
          icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
          trend={{
            value: Math.abs(data.saldoMes),
            isPositive: data.saldoMes >= 0,
          }}
          variant={data.saldoMes >= 0 ? 'success' : 'danger'}
        />
      </div>
    </div>
  );
}
