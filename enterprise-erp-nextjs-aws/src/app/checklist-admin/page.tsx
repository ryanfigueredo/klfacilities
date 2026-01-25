'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  QrCode,
  Phone,
  ChevronUp,
  ChevronDown,
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChecklistItem {
  id: string;
  tipo: 'LIMPEZA' | 'INSUMOS' | 'SATISFACAO';
  servicosLimpeza: string[];
  insumosSolicitados: string[];
  avaliacaoLimpeza?: string;
  fatoresInfluencia: string[];
  comentarios?: string;
  timestamp: string;
  unidade: {
    id: string;
    nome: string;
  };
  ticket?: {
    id: string;
    status: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO';
    concluidoEm?: string;
    concluidoPor?: string;
  };
}

interface DashboardData {
  checklists: ChecklistItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    porTipo: Record<string, number>;
    porUnidade: Record<string, Record<string, number>>;
    tickets: {
      total: number;
      pendentes: number;
      concluidos: number;
      cancelados: number;
      taxaConclusao: number;
    };
  };
}

interface Unidade {
  id: string;
  nome: string;
}

// Cores para os gráficos
const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

export default function ChecklistAdminPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsappStatus, setWhatsAppStatus] = useState<{
    status: string;
    healthy: boolean;
    message: string;
    dashboardUrl?: string;
  } | null>(null);
  const [expandedUnidades, setExpandedUnidades] = useState<Set<string>>(
    new Set()
  );

  // Filtros com debounce
  const [filtros, setFiltros] = useState({
    unidadeId: '',
    tipo: '',
    dataInicio: '',
    dataFim: '',
    page: 1,
  });

  // Filtros para debounce (valores temporários enquanto usuário digita)
  const [filtrosTemp, setFiltrosTemp] = useState(filtros);

  const fetchUnidades = async () => {
    try {
      const response = await fetch('/api/checklist/unidades');
      const result = await response.json();
      if (response.ok) {
        setUnidades(result.data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar unidades:', err);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      const result = await response.json();
      setWhatsAppStatus(result);
    } catch (err) {
      console.error('Erro ao buscar status WhatsApp:', err);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.unidadeId) params.append('unidadeId', filtros.unidadeId);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      params.append('page', filtros.page.toString());

      const response = await fetch(`/api/checklist/dashboard?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar dados');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [
    filtros.unidadeId,
    filtros.tipo,
    filtros.dataInicio,
    filtros.dataFim,
    filtros.page,
  ]);

  useEffect(() => {
    fetchUnidades();
    fetchWhatsAppStatus();

    // Atualizar status do WhatsApp a cada 30 segundos
    const interval = setInterval(fetchWhatsAppStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debounce nos filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros(filtrosTemp);
    }, 300); // 300ms de debounce

    return () => clearTimeout(timer);
  }, [filtrosTemp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFiltrosTemp(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset page when filters change
    }));
  };

  const toggleUnidade = (unidadeNome: string) => {
    setExpandedUnidades(prev => {
      const next = new Set(prev);
      if (next.has(unidadeNome)) {
        next.delete(unidadeNome);
      } else {
        next.add(unidadeNome);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTipoLabel = (tipo: string) => {
    const labels = {
      LIMPEZA: 'Serviços de Limpeza',
      INSUMOS: 'Reposição de Insumos',
      SATISFACAO: 'Pesquisa de Satisfação',
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const getAvaliacaoLabel = (avaliacao: string) => {
    const labels = {
      MUITO_RUIM: 'Muito ruim',
      RUIM: 'Ruim',
      REGULAR: 'Regular',
      BOM: 'Bom',
      MUITO_BOM: 'Muito bom',
    };
    return labels[avaliacao as keyof typeof labels] || avaliacao;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDENTE: 'bg-yellow-100 text-yellow-800',
      CONCLUIDO: 'bg-green-100 text-green-800',
      CANCELADO: 'bg-red-100 text-red-800',
    };

    const labels = {
      PENDENTE: 'Pendente',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // Dados para gráficos
  const chartDataPorTipo = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.stats.porTipo).map(([tipo, count]) => ({
      nome: getTipoLabel(tipo),
      valor: count,
    }));
  }, [data]);

  const chartDataPorUnidade = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.stats.porUnidade)
      .map(([unidade, stats]) => {
        const total = Object.values(stats).reduce((a, b) => a + b, 0);
        return {
          unidade,
          total,
          ...stats,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 unidades
  }, [data]);

  const pieDataTickets = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: 'Concluídos',
        value: data.stats.tickets.concluidos,
        color: '#10b981',
      },
      {
        name: 'Pendentes',
        value: data.stats.tickets.pendentes,
        color: '#f59e0b',
      },
      {
        name: 'Cancelados',
        value: data.stats.tickets.cancelados,
        color: '#ef4444',
      },
    ].filter(item => item.value > 0);
  }, [data]);

  // Filtrar unidades baseado no filtro aplicado
  const unidadesToShow = useMemo(() => {
    if (!data) return [];
    let unidadesFiltradas = Object.entries(data.stats.porUnidade);

    // Se há filtro de unidade, mostrar apenas ela
    if (filtros.unidadeId) {
      const unidadeSelecionada = unidades.find(u => u.id === filtros.unidadeId);
      if (unidadeSelecionada) {
        unidadesFiltradas = unidadesFiltradas.filter(
          ([nome]) => nome === unidadeSelecionada.nome
        );
      }
    }

    return unidadesFiltradas.sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [data, filtros.unidadeId, unidades]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback das Unidades</h1>
          <p className="text-sm text-muted-foreground">
            Dashboard de feedback das unidades
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/checklist-admin/contatos"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Contatos
          </a>
          <a
            href="/checklist-admin/qr-codes"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            QR Codes
          </a>
        </div>
      </div>

      {/* Status do WhatsApp */}
      {whatsappStatus && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg border ${
            whatsappStatus.healthy
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                whatsappStatus.healthy
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <div className="flex items-center gap-2">
              {whatsappStatus.healthy ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {whatsappStatus.healthy
                    ? 'WhatsApp Conectado'
                    : 'WhatsApp Desconectado'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {whatsappStatus.message}
                </p>
              </div>
            </div>
          </div>
          {!whatsappStatus.healthy && whatsappStatus.dashboardUrl && (
            <a
              href={whatsappStatus.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Reconectar
            </a>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Filtros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Unidade</label>
            <select
              value={filtrosTemp.unidadeId}
              onChange={e => handleFilterChange('unidadeId', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as unidades</option>
              {unidades.map(unidade => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={filtrosTemp.tipo}
              onChange={e => handleFilterChange('tipo', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os tipos</option>
              <option value="LIMPEZA">Serviços de Limpeza</option>
              <option value="INSUMOS">Reposição de Insumos</option>
              <option value="SATISFACAO">Pesquisa de Satisfação</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtrosTemp.dataInicio}
              onChange={e => handleFilterChange('dataInicio', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data Fim</label>
            <input
              type="date"
              value={filtrosTemp.dataFim}
              onChange={e => handleFilterChange('dataFim', e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      {data && (
        <>
          {/* Card de Chamados - Destaque */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-600" />
                <h3 className="text-2xl font-bold text-gray-900">
                  Chamados WhatsApp
                </h3>
              </div>
              <div className="bg-blue-100 border border-blue-300 rounded-full px-4 py-2">
                <span className="text-3xl font-bold text-blue-700">
                  {data.stats.tickets.taxaConclusao}%
                </span>
                <span className="text-sm ml-1 text-blue-600">
                  Taxa de Conclusão
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Pendentes
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {data.stats.tickets.pendentes}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Concluídos
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {data.stats.tickets.concluidos}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total</div>
                <div className="text-3xl font-bold text-gray-900">
                  {data.stats.tickets.total}
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras - Por Tipo */}
            <div className="border rounded-lg p-6 bg-white shadow-sm">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Chamados por Tipo
              </h3>
              {chartDataPorTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDataPorTipo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>

            {/* Gráfico de Pizza - Status dos Tickets */}
            <div className="border rounded-lg p-6 bg-white shadow-sm">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Status dos Tickets
              </h3>
              {pieDataTickets.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieDataTickets}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieDataTickets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas por Tipo e Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-lg font-medium mb-4">Por Tipo</h3>
              <div className="space-y-2">
                {Object.entries(data.stats.porTipo).map(([tipo, count]) => (
                  <div key={tipo} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {getTipoLabel(tipo)}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Por Unidade - EXPANDÍVEL */}
            <div className="border rounded-lg p-4 bg-white shadow-sm md:col-span-2">
              <h3 className="text-lg font-medium mb-4">Por Unidade</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unidadesToShow.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhuma unidade encontrada
                  </div>
                ) : (
                  unidadesToShow.map(([unidadeNome, stats]) => {
                    const total = Object.values(stats).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const isExpanded = expandedUnidades.has(unidadeNome);

                    return (
                      <div key={unidadeNome} className="border-b pb-2">
                        <button
                          onClick={() => toggleUnidade(unidadeNome)}
                          className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="transition-transform duration-300">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium">{unidadeNome}</span>
                            <span className="text-sm text-muted-foreground">
                              ({total} total)
                            </span>
                          </div>
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isExpanded
                              ? 'max-h-[200px] opacity-100'
                              : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="text-sm text-muted-foreground ml-6 mt-2">
                            {Object.entries(stats).map(([tipo, count]) => (
                              <div
                                key={tipo}
                                className="flex justify-between py-1"
                              >
                                <span>{getTipoLabel(tipo)}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Lista de Checklists */}
      <div className="border rounded-lg bg-white shadow-sm">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-medium">Respostas Recentes</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : data && data.checklists.length > 0 ? (
          <div className="divide-y">
            {data.checklists.map(checklist => (
              <div key={checklist.id} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-medium">
                        {getTipoLabel(checklist.tipo)}
                      </h3>
                      {checklist.ticket &&
                        getStatusBadge(checklist.ticket.status)}
                    </div>
                    <p className="text-muted-foreground">
                      {checklist.unidade.nome}
                    </p>
                    {checklist.ticket?.concluidoEm && (
                      <p className="text-xs text-green-600">
                        Concluído em {formatDate(checklist.ticket.concluidoEm)}
                        {checklist.ticket.concluidoPor &&
                          ` por ${checklist.ticket.concluidoPor}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(checklist.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {checklist.tipo === 'LIMPEZA' &&
                    checklist.servicosLimpeza.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">
                          Serviços solicitados:
                        </p>
                        <p className="text-muted-foreground">
                          {checklist.servicosLimpeza
                            .map(servico =>
                              servico === 'LIMPEZA'
                                ? 'Limpeza'
                                : 'Retirada de lixo'
                            )
                            .join(', ')}
                        </p>
                      </div>
                    )}

                  {checklist.tipo === 'INSUMOS' &&
                    checklist.insumosSolicitados.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">
                          Insumos solicitados:
                        </p>
                        <p className="text-muted-foreground">
                          {checklist.insumosSolicitados
                            .map(insumo => {
                              const labels = {
                                ALCOOL_HIGIENIZACAO: 'Álcool higienização',
                                PAPEL_HIGIENICO: 'Papel higiênico',
                                PAPEL_TOALHA: 'Papel toalha',
                                SABONETE: 'Sabonete',
                              };
                              return (
                                labels[insumo as keyof typeof labels] || insumo
                              );
                            })
                            .join(', ')}
                        </p>
                      </div>
                    )}

                  {checklist.tipo === 'SATISFACAO' && (
                    <div className="space-y-2">
                      {checklist.avaliacaoLimpeza && (
                        <div>
                          <p className="text-sm font-medium">Avaliação:</p>
                          <p className="text-muted-foreground">
                            {getAvaliacaoLabel(checklist.avaliacaoLimpeza)}
                          </p>
                        </div>
                      )}
                      {checklist.fatoresInfluencia.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">
                            Fatores de influência:
                          </p>
                          <p className="text-muted-foreground">
                            {checklist.fatoresInfluencia
                              .map(fator => {
                                const labels = {
                                  CHEIRO: 'Cheiro',
                                  DISPONIBILIDADE_INSUMOS:
                                    'Disponibilidade de insumos',
                                  LIMPEZA_SUPERFICIES:
                                    'Limpeza das superfícies',
                                  POSTURA_EQUIPE: 'Postura da equipe',
                                  RECOLHIMENTO_LIXO: 'Recolhimento do lixo',
                                };
                                return (
                                  labels[fator as keyof typeof labels] || fator
                                );
                              })
                              .join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {checklist.comentarios && (
                    <div>
                      <p className="text-sm font-medium">Comentários:</p>
                      <p className="text-muted-foreground italic">
                        &ldquo;{checklist.comentarios}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            Nenhuma resposta encontrada com os filtros aplicados.
          </div>
        )}

        {/* Paginação */}
        {data && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t flex justify-between items-center">
            <button
              onClick={() =>
                handleFilterChange('page', (filtros.page - 1).toString())
              }
              disabled={filtros.page <= 1}
              className="px-4 py-2 border rounded text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            <span className="text-muted-foreground">
              Página {filtros.page} de {data.pagination.totalPages}
            </span>

            <button
              onClick={() =>
                handleFilterChange('page', (filtros.page + 1).toString())
              }
              disabled={filtros.page >= data.pagination.totalPages}
              className="px-4 py-2 border rounded text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
