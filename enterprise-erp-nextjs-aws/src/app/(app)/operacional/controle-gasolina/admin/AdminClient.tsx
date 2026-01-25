'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Fuel,
  MapPin,
  Route,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type DashboardMetrics = {
  totalKm: number;
  totalValorAbastecido: number;
  totalValorSemParar?: number;
  totalGeral?: number;
  totalPorTipo: {
    KM: number;
    ABASTECIMENTO: number;
    SEM_PARAR?: number;
  };
  historicoComparativo?: {
    kmAnterior: number;
    valorAbastecidoAnterior: number;
    valorSemPararAnterior?: number;
    qtdKmAnterior: number;
    qtdAbastecimentoAnterior: number;
    qtdSemPararAnterior?: number;
  };
};

type RotaMetrics = {
  totalKmRodados: number;
  totalRotas: number;
  totalUsuarios: number;
  totalVeiculos: number;
  kmPorVeiculo: Record<string, number>;
  kmPorUsuario: Record<string, number>;
  topUsuarios: Array<{ usuario: string; km: number }>;
  topVeiculos: Array<{ placa: string; km: number }>;
};

type VehicleRow = {
  id: string;
  placa: string;
  modelo: string | null;
  ano: number | null;
  tipoCombustivel: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  vehicles: Array<{ id: string; placa: string; modelo: string | null }>;
  totalAbastecido?: number;
};

type ImportSummary = {
  processed: number;
  inserted: number;
  duplicates: number;
  invalid: number;
  notFoundVehicle: number;
  insertedItems?: {
    row: number;
    placa: string;
    data: string;
    litros: number;
    valor: number;
    kmAtual: number;
  }[];
  details?: { row: number; placa?: string; reason: string }[];
};

type SemPararSummary = {
  processados: number;
  inseridos: number;
  erros: Array<{ linha: number; motivo: string }>;
};

type GastosPorSupervisor = {
  supervisor: {
    id: string;
    name: string;
    email: string;
  };
  totalAbastecimentos: number;
  totalSemParar: number;
  totalGasto: number;
  qtdAbastecimentos: number;
  qtdSemParar: number;
};

type KmPorSupervisor = {
  supervisor: {
    id: string;
    name: string;
    email: string;
  };
  kmDiretos: number;
  kmVeiculos: number;
  totalKm: number;
  qtdRegistros: number;
};

const rolesOptions = [
  { value: 'MASTER', label: 'Master' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'OPERACIONAL', label: 'Operacional' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'RH', label: 'RH' },
];

export function AdminClient() {
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [rotaMetrics, setRotaMetrics] = useState<RotaMetrics | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [gastosPorSupervisor, setGastosPorSupervisor] = useState<
    GastosPorSupervisor[]
  >([]);
  const [kmPorSupervisor, setKmPorSupervisor] = useState<KmPorSupervisor[]>([]);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [semPararDialogOpen, setSemPararDialogOpen] = useState(false);

  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null
  );
  const [semPararSummary, setSemPararSummary] =
    useState<SemPararSummary | null>(null);

  const [periodStart, setPeriodStart] = useState<string | undefined>();
  const [periodEnd, setPeriodEnd] = useState<string | undefined>();
  const [filterVehicle, setFilterVehicle] = useState<string>('');
  const [vehiclesExpanded, setVehiclesExpanded] = useState(true);
  const [usersExpanded, setUsersExpanded] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);

      const searchParams = new URLSearchParams();
      if (periodStart) searchParams.set('startDate', periodStart);
      if (periodEnd) searchParams.set('endDate', periodEnd);
      if (filterVehicle) searchParams.set('veiculo', filterVehicle);

      const query = searchParams.size ? `?${searchParams.toString()}` : '';
      const metricsUrl = `/api/controle-gasolina/admin/dashboard-metrics${query}`;

      const [metricsRes, rotaRes, vehicleRes, usersRes, gastosRes, kmRes] =
        await Promise.all([
          fetch(metricsUrl),
          fetch(`/api/controle-gasolina/admin/rota-metrics${query}`),
          fetch('/api/controle-gasolina/admin/veiculos'),
          fetch('/api/controle-gasolina/admin/usuarios'),
          fetch(`/api/controle-gasolina/admin/gastos-por-supervisor${query}`),
          fetch(`/api/controle-gasolina/admin/km-por-supervisor${query}`),
        ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
      if (rotaRes.ok) {
        const data = await rotaRes.json();
        setRotaMetrics(data);
      }
      if (vehicleRes.ok) {
        const data = await vehicleRes.json();
        setVehicles(data);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }
      if (gastosRes.ok) {
        const data = await gastosRes.json();
        setGastosPorSupervisor(data.gastosPorSupervisor || []);
      }
      if (kmRes.ok) {
        const data = await kmRes.json();
        setKmPorSupervisor(data.kmPorSupervisor || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados administrativos:', error);
      toast.error('Não foi possível carregar os dados administrativos.');
    } finally {
      setMetricsLoading(false);
    }
  }, [filterVehicle, periodEnd, periodStart]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const kmPorUsuario = useMemo(() => {
    if (!rotaMetrics) return [];
    return Object.entries(rotaMetrics.kmPorUsuario)
      .map(([usuario, km]) => ({ usuario, km }))
      .sort((a, b) => b.km - a.km)
      .slice(0, 5);
  }, [rotaMetrics]);

  const vehicleOptions = useMemo(() => {
    return [...vehicles].sort((a, b) => a.placa.localeCompare(b.placa));
  }, [vehicles]);

  const kmPorVeiculo = useMemo(() => {
    if (!rotaMetrics) return [];
    return Object.entries(rotaMetrics.kmPorVeiculo)
      .map(([placa, km]) => ({ placa, km }))
      .sort((a, b) => b.km - a.km)
      .slice(0, 5);
  }, [rotaMetrics]);

  async function handleCreateUser(formData: FormData) {
    try {
      const response = await fetch('/api/controle-gasolina/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Erro ao criar usuário');
      }

      toast.success('Usuário criado com sucesso.');
      setUserDialogOpen(false);
      fetchMetrics();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao criar usuário.'
      );
    }
  }

  async function handleCreateVehicle(formData: FormData) {
    try {
      const response = await fetch('/api/controle-gasolina/admin/veiculos', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Erro ao cadastrar veículo');
      }

      toast.success('Veículo cadastrado com sucesso.');
      setVehicleDialogOpen(false);
      fetchMetrics();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao cadastrar veículo.'
      );
    }
  }

  async function handleLinkVehicle(formData: FormData) {
    try {
      const response = await fetch(
        '/api/controle-gasolina/admin/vincular-veiculo',
        {
          method: 'POST',
          body: JSON.stringify(Object.fromEntries(formData)),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Erro ao vincular usuário');
      }

      toast.success('Vínculo atualizado.');
      setLinkDialogOpen(false);
      fetchMetrics();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao vincular usuário.'
      );
    }
  }

  async function handleImportTicketLog(formData: FormData) {
    try {
      const response = await fetch(
        '/api/controle-gasolina/admin/importar-abastecimentos',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Erro ao importar planilha');
      }

      const summary = (await response.json()) as ImportSummary;
      setImportSummary(summary);
      toast.success('Importação processada.');
      fetchMetrics();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao importar planilha.'
      );
    }
  }

  async function handleImportSemParar(formData: FormData) {
    try {
      const response = await fetch(
        '/api/controle-gasolina/admin/sem-parar/import',
        {
          method: 'POST',
          body: formData,
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.erros) {
          setSemPararSummary({
            processados: 0,
            inseridos: 0,
            erros: payload.erros,
          });
        }
        throw new Error(
          payload?.error || 'Erro ao importar relatório Sem Parar'
        );
      }

      const summary = payload as SemPararSummary;
      setSemPararSummary({
        ...summary,
        erros: summary.erros ?? [],
      });
      toast.success('Importação do Sem Parar concluída.');
      fetchMetrics();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao importar o relatório Sem Parar.'
      );
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">
          Painel Administrativo · Controle de Gasolina
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe métricas, cadastre veículos e usuários e gerencie
          importações do Ticket Log.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setUserDialogOpen(true)}>Novo usuário</Button>
        <Button variant="outline" onClick={() => setVehicleDialogOpen(true)}>
          Novo veículo
        </Button>
        <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
          Vincular usuário/veículo
        </Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          Importar Ticket Log
        </Button>
        <Button variant="outline" onClick={() => setSemPararDialogOpen(true)}>
          Importar Sem Parar
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            if (
              !confirm(
                'Isso irá calcular os registros de KM a partir dos abastecimentos existentes. Deseja continuar?'
              )
            ) {
              return;
            }

            try {
              const response = await fetch(
                '/api/controle-gasolina/admin/calcular-km-records',
                { method: 'POST' }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'Erro ao calcular KM');
              }

              toast.success(
                data.message ||
                  `${data.totalCreated} registros de KM criados com sucesso!`
              );

              // Recarregar métricas
              fetchMetrics();
            } catch (error) {
              console.error('Erro ao calcular KM:', error);
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Erro ao calcular registros de KM'
              );
            }
          }}
        >
          Calcular KM dos Abastecimentos
        </Button>
      </div>

      <div className="rounded-lg border bg-card/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">Filtros</CardTitle>
            <p className="text-xs text-muted-foreground">
              Selecione um período e, opcionalmente, um veículo para analisar os
              indicadores.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPeriodStart(undefined);
              setPeriodEnd(undefined);
              setFilterVehicle('');
            }}
            disabled={!periodStart && !periodEnd && !filterVehicle}
          >
            Limpar filtros
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-1">
            <Label htmlFor="filtro-inicio">Data inicial</Label>
            <Input
              id="filtro-inicio"
              type="date"
              value={periodStart ?? ''}
              onChange={event =>
                setPeriodStart(event.target.value || undefined)
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="filtro-fim">Data final</Label>
            <Input
              id="filtro-fim"
              type="date"
              value={periodEnd ?? ''}
              onChange={event => setPeriodEnd(event.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1 md:col-span-2">
            <Label htmlFor="filtro-veiculo">Veículo</Label>
            <select
              id="filtro-veiculo"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filterVehicle}
              onChange={event => setFilterVehicle(event.target.value)}
            >
              <option value="">Todos os veículos</option>
              {vehicleOptions.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa}
                  {vehicle.modelo ? ` · ${vehicle.modelo}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              KM registrados
            </CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {metricsLoading
                ? '—'
                : (metrics?.totalKm?.toLocaleString('pt-BR') ?? '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.historicoComparativo
                ? `${metrics.historicoComparativo.kmAnterior.toLocaleString(
                    'pt-BR'
                  )} no mês anterior`
                : 'Sem referência anterior'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor abastecido
            </CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {metricsLoading
                ? '—'
                : (metrics?.totalValorAbastecido.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }) ?? '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma de abastecimentos + Sem Parar no período
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Parar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {metricsLoading
                ? '—'
                : (metrics?.totalValorSemParar?.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }) ?? '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              Despesas registradas via Sem Parar
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total geral</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {metricsLoading
                ? '—'
                : (metrics?.totalGeral?.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }) ?? '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              Combustível + Sem Parar no período
            </p>
            {metrics?.historicoComparativo && (
              <p className="text-xs text-muted-foreground mt-1">
                Último mês:{' '}
                {metrics.historicoComparativo.valorAbastecidoAnterior.toLocaleString(
                  'pt-BR',
                  { style: 'currency', currency: 'BRL' }
                )}{' '}
                (+ Sem Parar{' '}
                {metrics.historicoComparativo.valorSemPararAnterior?.toLocaleString(
                  'pt-BR',
                  { style: 'currency', currency: 'BRL' }
                ) ?? 'R$ 0,00'}
                )
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Veículos monit.
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {metricsLoading
                ? '—'
                : (rotaMetrics?.totalVeiculos.toLocaleString('pt-BR') ?? '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              {vehicles.length} veículos cadastrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Motoristas ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {metricsLoading
                ? '—'
                : (rotaMetrics?.totalUsuarios.toLocaleString('pt-BR') ?? '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              {users.length} usuários cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top motoristas (km)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kmPorUsuario.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dado disponível.
              </p>
            ) : (
              kmPorUsuario.map(item => (
                <div
                  key={item.usuario}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {item.usuario}
                  </span>
                  <span className="text-muted-foreground">
                    {item.km.toLocaleString('pt-BR')} km
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top veículos (km)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kmPorVeiculo.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dado disponível.
              </p>
            ) : (
              kmPorVeiculo.map(item => (
                <div
                  key={item.placa}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {item.placa}
                  </span>
                  <span className="text-muted-foreground">
                    {item.km.toLocaleString('pt-BR')} km
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Veículos cadastrados</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVehiclesExpanded(!vehiclesExpanded)}
                className="h-8 w-8"
              >
                {vehiclesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {vehiclesExpanded && (
            <CardContent className="max-h-[360px] overflow-y-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Combustível</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map(vehicle => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        {vehicle.placa}
                      </TableCell>
                      <TableCell>{vehicle.modelo ?? '—'}</TableCell>
                      <TableCell className="capitalize">
                        {vehicle.tipoCombustivel.toLowerCase()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {vehicles.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  Nenhum veículo cadastrado.
                </p>
              )}
            </CardContent>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usuários cadastrados</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUsersExpanded(!usersExpanded)}
                className="h-8 w-8"
              >
                {usersExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {usersExpanded && (
            <CardContent className="max-h-[360px] overflow-y-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Veículos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.vehicles.length === 0
                          ? '—'
                          : user.vehicles
                              .map(vehicle => vehicle.placa)
                              .join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  Nenhum usuário cadastrado.
                </p>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Supervisor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize quanto cada supervisor gastou no período selecionado.
          </p>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto p-0">
          {metricsLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : gastosPorSupervisor.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum dado disponível.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead className="text-right">Abastecimentos</TableHead>
                  <TableHead className="text-right">Sem Parar</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosPorSupervisor.map(item => (
                  <TableRow key={item.supervisor.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {item.supervisor.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.supervisor.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">
                          {item.totalAbastecimentos.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.qtdAbastecimentos} registro(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">
                          {item.totalSemParar.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.qtdSemParar} registro(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-lg">
                        {item.totalGasto.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>KM Rodados por Supervisor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize quantos quilômetros cada supervisor rodou no período
            selecionado.
          </p>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto p-0">
          {metricsLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : kmPorSupervisor.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum dado disponível.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead className="text-right">Total KM Rodados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kmPorSupervisor.map(item => (
                  <TableRow key={item.supervisor.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {item.supervisor.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.supervisor.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-lg">
                          {item.totalKm.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}{' '}
                          km
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.qtdRegistros} registro(s)
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Exportar registros</CardTitle>
            <p className="text-sm text-muted-foreground">
              Baixe os registros atuais em Excel ou PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  '/api/controle-gasolina/admin/exportar?formato=excel',
                  '_blank'
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  '/api/controle-gasolina/admin/exportar?formato=pdf',
                  '_blank'
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Dialogs */}
      <CreateUserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        vehicles={vehicles}
        onSubmit={handleCreateUser}
      />
      <CreateVehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        onSubmit={handleCreateVehicle}
      />
      <LinkVehicleDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        users={users}
        vehicles={vehicles}
        onSubmit={handleLinkVehicle}
      />
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        summary={importSummary}
        onSubmit={handleImportTicketLog}
      />
      <SemPararImportDialog
        open={semPararDialogOpen}
        onOpenChange={setSemPararDialogOpen}
        onSubmit={handleImportSemParar}
        summary={semPararSummary}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  vehicles,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: VehicleRow[];
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={async event => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            await onSubmit(formData);
            form.reset();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha temporária</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Cargo</Label>
            <select
              id="role"
              name="role"
              defaultValue="OPERACIONAL"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {rolesOptions.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vehicle-select">Vincular veículo (opcional)</Label>
            <select
              id="vehicle-select"
              name="vehicleId"
              defaultValue=""
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Sem vínculo inicial</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar usuário</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateVehicleDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Novo veículo</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={async event => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            await onSubmit(formData);
            form.reset();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="placa">Placa</Label>
            <Input id="placa" name="placa" placeholder="ABC1234" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="modelo">Modelo</Label>
            <Input id="modelo" name="modelo" placeholder="Modelo do veículo" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ano">Ano</Label>
            <Input id="ano" name="ano" type="number" min="1980" max="2100" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tipoCombustivel">Combustível</Label>
            <select
              id="tipoCombustivel"
              name="tipoCombustivel"
              defaultValue="GASOLINA"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="GASOLINA">Gasolina</option>
              <option value="ALCOOL">Álcool</option>
              <option value="DIESEL">Diesel</option>
              <option value="FLEX">Flex</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar veículo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LinkVehicleDialog({
  open,
  onOpenChange,
  users,
  vehicles,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserRow[];
  vehicles: VehicleRow[];
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Vincular usuário a veículo</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={async event => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            await onSubmit(formData);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="link-user">Usuário</Label>
            <select
              id="link-user"
              name="userId"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-vehicle">Veículo</Label>
            <select
              id="link-vehicle"
              name="vehicleId"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar vínculo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  summary,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ImportSummary | null;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar planilha do Ticket Log</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={async event => {
            event.preventDefault();
            if (!file) {
              toast.warning('Selecione um arquivo XLSX.');
              return;
            }
            const formData = new FormData();
            formData.append('file', file);
            await onSubmit(formData);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="arquivo">Arquivo XLSX</Label>
            <Input
              id="arquivo"
              type="file"
              accept=".xlsx"
              onChange={event => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use o relatório exportado do Ticket Log (formato .xlsx).
            </p>
          </div>
          <DialogFooter>
            <Button type="submit">Processar planilha</Button>
          </DialogFooter>
        </form>
        {summary && (
          <div className="rounded-md border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">
              Resumo da última importação
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>Processados: {summary.processed}</li>
              <li>Inseridos: {summary.inserted}</li>
              <li>Duplicados: {summary.duplicates}</li>
              <li>Inválidos: {summary.invalid}</li>
              <li>Veículos não encontrados: {summary.notFoundVehicle}</li>
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SemPararImportDialog({
  open,
  onOpenChange,
  onSubmit,
  summary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => Promise<void>;
  summary: SemPararSummary | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!open) {
      setFile(null);
      setLabel('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Importar planilha de Sem Parar</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={async event => {
            event.preventDefault();
            if (!file) {
              toast.warning('Selecione um arquivo XLSX.');
              return;
            }
            const formData = new FormData();
            formData.append('file', file);
            if (label) formData.append('label', label);
            await onSubmit(formData);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="sem-parar-arquivo">Arquivo XLSX</Label>
            <Input
              id="sem-parar-arquivo"
              type="file"
              accept=".xlsx,.xls"
              onChange={event => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use o relatório exportado do Sem Parar (formato .xlsx/.xls).
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sem-parar-label">Descrição (opcional)</Label>
            <Input
              id="sem-parar-label"
              placeholder="Ex.: Relatório Sem Parar - Novembro/2025"
              value={label}
              onChange={event => setLabel(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Processar planilha</Button>
          </DialogFooter>
        </form>
        {summary && (
          <div className="rounded-md border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">
              Resumo da última importação
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>Processados: {summary.processados}</li>
              <li>Inseridos: {summary.inseridos}</li>
            </ul>
            {summary.erros.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-destructive">
                  Ocorreram {summary.erros.length} erros:
                </p>
                <ul className="mt-1 max-h-40 overflow-y-auto space-y-1 text-xs text-muted-foreground">
                  {summary.erros.slice(0, 25).map((erro, index) => (
                    <li key={`${erro.linha}-${index}`}>
                      Linha {erro.linha}: {erro.motivo}
                    </li>
                  ))}
                  {summary.erros.length > 25 && (
                    <li>
                      {summary.erros.length - 25} erros adicionais não exibidos.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
