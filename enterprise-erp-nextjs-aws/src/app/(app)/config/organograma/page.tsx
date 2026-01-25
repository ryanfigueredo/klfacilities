'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OrganogramaData {
  ceo: {
    id: string;
    name: string;
    email: string;
    photoUrl: string | null;
  } | null;
  departamentos: Array<{
    nome: string;
    usuarios: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      photoUrl: string | null;
    }>;
  }>;
  grupos: Array<{
    id: string;
    nome: string;
  }>;
  unidades: Array<{
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
    grupoId: string | null;
    grupoNome: string | null;
    funcionarios: Array<{
      id: string;
      nome: string;
      cargo: string | null;
    }>;
  }>;
  supervisores: Array<{
    id: string;
    name: string;
    email: string;
    photoUrl: string | null;
    scopes: Array<{
      grupoId: string | null;
      grupoNome: string | null;
      unidadeId: string | null;
      unidadeNome: string | null;
    }>;
  }>;
}

// Cores para grupos (mesmas do mapa)
const GRUPO_COLORS = [
  '#3b82f6', // azul
  '#ef4444', // vermelho
  '#10b981', // verde
  '#f59e0b', // laranja
  '#8b5cf6', // roxo
  '#ec4899', // rosa
  '#06b6d4', // ciano
  '#84cc16', // verde limão
  '#f97316', // laranja escuro
  '#6366f1', // índigo
  '#14b8a6', // teal
  '#a855f7', // violeta
];

// Função para gerar uma cor consistente baseada no nome do grupo (mesma do mapa)
const getColorForGrupo = (
  grupoNome: string | null
): {
  hex: string;
  bg: string;
  text: string;
  light: string;
  lightText: string;
  border: string;
} => {
  if (!grupoNome) {
    return {
      hex: '#9ca3af',
      bg: 'bg-gray-500',
      text: 'text-white',
      light: 'bg-gray-100',
      lightText: 'text-gray-800',
      border: 'border-gray-600',
    };
  }

  // Gerar um hash simples do nome do grupo para obter uma cor consistente
  let hash = 0;
  for (let i = 0; i < grupoNome.length; i++) {
    hash = grupoNome.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRUPO_COLORS.length;
  const hex = GRUPO_COLORS[index];

  // Mapear hex para classes Tailwind
  const colorMap: Record<
    string,
    {
      bg: string;
      text: string;
      light: string;
      lightText: string;
      border: string;
    }
  > = {
    '#3b82f6': {
      bg: 'bg-blue-500',
      text: 'text-white',
      light: 'bg-blue-100',
      lightText: 'text-blue-800',
      border: 'border-blue-600',
    },
    '#ef4444': {
      bg: 'bg-red-500',
      text: 'text-white',
      light: 'bg-red-100',
      lightText: 'text-red-800',
      border: 'border-red-600',
    },
    '#10b981': {
      bg: 'bg-green-500',
      text: 'text-white',
      light: 'bg-green-100',
      lightText: 'text-green-800',
      border: 'border-green-600',
    },
    '#f59e0b': {
      bg: 'bg-yellow-500',
      text: 'text-white',
      light: 'bg-yellow-100',
      lightText: 'text-yellow-800',
      border: 'border-yellow-600',
    },
    '#8b5cf6': {
      bg: 'bg-purple-500',
      text: 'text-white',
      light: 'bg-purple-100',
      lightText: 'text-purple-800',
      border: 'border-purple-600',
    },
    '#ec4899': {
      bg: 'bg-pink-500',
      text: 'text-white',
      light: 'bg-pink-100',
      lightText: 'text-pink-800',
      border: 'border-pink-600',
    },
    '#06b6d4': {
      bg: 'bg-cyan-500',
      text: 'text-white',
      light: 'bg-cyan-100',
      lightText: 'text-cyan-800',
      border: 'border-cyan-600',
    },
    '#84cc16': {
      bg: 'bg-lime-500',
      text: 'text-white',
      light: 'bg-lime-100',
      lightText: 'text-lime-800',
      border: 'border-lime-600',
    },
    '#f97316': {
      bg: 'bg-orange-500',
      text: 'text-white',
      light: 'bg-orange-100',
      lightText: 'text-orange-800',
      border: 'border-orange-600',
    },
    '#6366f1': {
      bg: 'bg-indigo-500',
      text: 'text-white',
      light: 'bg-indigo-100',
      lightText: 'text-indigo-800',
      border: 'border-indigo-600',
    },
    '#14b8a6': {
      bg: 'bg-teal-500',
      text: 'text-white',
      light: 'bg-teal-100',
      lightText: 'text-teal-800',
      border: 'border-teal-600',
    },
    '#a855f7': {
      bg: 'bg-violet-500',
      text: 'text-white',
      light: 'bg-violet-100',
      lightText: 'text-violet-800',
      border: 'border-violet-600',
    },
  };

  return { hex, ...(colorMap[hex] || colorMap['#3b82f6']) };
};

// Estilo corporativo - azul padrão para todos os elementos
const corporateBlue = {
  bg: 'bg-blue-600',
  text: 'text-white',
  border: 'border-blue-700',
  stroke: '#2563eb',
  lineColor: '#000000', // Linhas pretas sólidas
};

// Cor única para supervisores
const supervisorColor = corporateBlue;

// Cores para departamentos - todos azuis corporativos
const departamentoColors: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    stroke: string;
    lineColor: string;
  }
> = {
  RH: corporateBlue,
  ADM: corporateBlue,
  Financeiro: corporateBlue,
  Operacional: corporateBlue,
  TI: corporateBlue,
};

// Cor padrão caso o departamento não esteja mapeado
const defaultDeptColor = corporateBlue;

export default function OrganogramaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrganogramaData | null>(null);
  const [expandedDepartamentos, setExpandedDepartamentos] = useState<
    Set<string>
  >(new Set(['Operacional']));
  const [expandedSupervisors, setExpandedSupervisors] = useState<Set<string>>(
    new Set()
  );
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<{
    tipo: 'departamento' | 'supervisor';
    nome: string;
    dados: any;
  } | null>(null);

  // Informações sobre responsabilidades de cada cargo
  const cargoInfo: Record<
    string,
    {
      responsavel: string;
      recebeDe: string;
      acao: string;
      processo: string;
      entregaPara: string;
      prazo?: string;
    }
  > = {
    TI: {
      responsavel: 'Ryan Figueredo',
      recebeDe: 'Luciano e Análise própria',
      acao: 'Análise de sistemas, desenvolvimento de novas soluções e elaboração de propostas técnicas.',
      processo:
        'Identifico necessidades internas, realizo a análise de viabilidade técnica/custo e crio o escopo da solução. Apresento as propostas para aprovação e supervisiono a implementação.',
      entregaPara: 'Luciano',
    },
    RH: {
      responsavel: 'Nagila, Carol, Helena e Cris',
      recebeDe: 'Luciano, Helton, Gabriel e Supervisores',
      acao: 'O setor de RH/DP é responsável pelo recrutamento e seleção de colaboradores, administração de benefícios, controle de ponto, gestão de férias, admissões e desligamentos, além do processamento da folha de pagamento, atualização cadastral, acompanhamento de documentação trabalhista e suporte às demandas',
      processo:
        'As atividades são realizadas por meio da triagem e seleção de candidatos, cadastro e integração de novos colaboradores, conferência de folhas de ponto, administração de benefícios como VT, VR e assistência, controle dos períodos aquisitivos de férias, emissão de documentos admissionais e demissionais, processamento da folha de pagamento dentro dos prazos legais e manutenção do cumprimento das normas trabalhistas e internas.',
      entregaPara: 'Luciano, Helton, Gabriel e Supervisores',
    },
    Financeiro: {
      responsavel: 'Gabriel Fabri',
      recebeDe: 'Luciano e Análise própria',
      acao: 'Realizo o controle de contas a pagar e a receber, faço a conferência diária dos extratos bancários, organizo e envio os comprovantes de pagamentos, além de conduzir a solicitação de antecipação de recebíveis quando necessário.',
      processo:
        'As atividades são executadas por meio da conferência diária de boletos, notas e extratos bancários, controle em planilhas e sistemas internos, comunicação direta com fornecedores e clientes, e envio dos comprovantes e solicitações por e-mail e portais financeiros.',
      entregaPara: 'Luciano',
    },
    ADM: {
      responsavel: 'Gabriel Fabri',
      recebeDe: 'Luciano',
      acao: 'Gestão administrativa da empresa',
      processo: 'Administração geral',
      entregaPara: 'Luciano',
    },
    Jurídico: {
      responsavel: 'Dr. Rodrigo Medeiros',
      recebeDe: 'Luciano, Helton, Gabriel e RH',
      acao: 'O setor jurídico é responsável pela análise e elaboração de contratos, acompanhamento de processos judiciais e administrativos, orientação legal às áreas internas, gestão de riscos jurídicos e suporte nas negociações com clientes, fornecedores e parceiros.',
      processo:
        'As atividades são realizadas por meio da análise documental, revisão e elaboração de contratos, acompanhamento dos processos nos sistemas dos tribunais, emissão de pareceres jurídicos, contato com escritórios parceiros e suporte direto às áreas internas sempre que necessário.',
      entregaPara: 'Luciano, Helton, Gabriel e RH',
    },
    Operacional: {
      responsavel: 'Helton Rufino',
      recebeDe: 'Luciano',
      acao: 'Coordenação operacional e supervisão de equipes',
      processo: 'Gestão operacional através dos supervisores',
      entregaPara: 'Luciano',
    },
    Supervisor: {
      responsavel: 'Supervisores',
      recebeDe: 'Helton Rufino (Operacional)',
      acao: 'Supervisão de grupos e unidades, gestão de equipes, acompanhamento de processos operacionais e garantia da qualidade dos serviços.',
      processo:
        'Através do acompanhamento diário das equipes, verificação de processos, comunicação com grupos e unidades, e relatórios para o Operacional.',
      entregaPara: 'Helton Rufino (Operacional)',
    },
  };

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const res = await fetch('/api/organograma');
        if (res.status === 403) {
          setError(
            'Acesso negado. Apenas usuários com role MASTER podem visualizar o organograma.'
          );
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error('Erro ao carregar dados');
        }
        const json = await res.json();
        if (json.ok) {
          setData(json.data);
        } else {
          throw new Error(json.error || 'Erro ao carregar dados');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar organograma');
      } finally {
        setLoading(false);
      }
    };
    checkPermission();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  // Mapear supervisores e seus grupos/unidades
  // Agrupar por grupo primeiro, depois unidades de cada grupo
  const supervisorGruposMap = new Map<
    string,
    Map<string, Array<{ id: string; nome: string }>>
  >();

  data.supervisores.forEach(supervisor => {
    const gruposMap = new Map<string, Array<{ id: string; nome: string }>>();

    supervisor.scopes.forEach(scope => {
      if (scope.grupoId && scope.grupoNome) {
        if (!gruposMap.has(scope.grupoId)) {
          gruposMap.set(scope.grupoId, []);
        }
      }
      if (scope.unidadeId && scope.unidadeNome) {
        const unidade = data.unidades.find(u => u.id === scope.unidadeId);
        const grupoId = unidade?.grupoId || scope.grupoId || 'sem-grupo';
        const grupoNome = unidade?.grupoNome || scope.grupoNome || 'Sem Grupo';

        if (!gruposMap.has(grupoId)) {
          gruposMap.set(grupoId, []);
        }
        gruposMap
          .get(grupoId)!
          .push({ id: scope.unidadeId, nome: scope.unidadeNome });
      }
    });

    if (gruposMap.size > 0) {
      supervisorGruposMap.set(supervisor.id, gruposMap);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organograma</h1>
        <p className="text-muted-foreground">
          Visualização hierárquica da estrutura organizacional em tempo real
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estrutura Organizacional</CardTitle>
              <CardDescription>
                Hierarquia: CEO → Departamentos → Supervisores → Grupos →
                Unidades
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                disabled={zoom >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-auto pb-8" style={{ maxHeight: '80vh' }}>
            <div
              className="relative flex flex-col items-center min-w-max py-4 px-4 origin-top"
              style={{
                minHeight: '800px',
                width: '100%',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
              }}
            >
              {/* Nível 1: CEO */}
              {data.ceo && (
                <div className="w-full mb-8">
                  <div className="bg-blue-600 text-white px-12 py-7 rounded-lg shadow-lg border border-blue-700 text-center max-w-lg mx-auto">
                    <div className="font-bold text-3xl">{data.ceo.name}</div>
                    <div className="text-lg mt-1">CEO</div>
                  </div>
                </div>
              )}

              {/* Nível 2: Departamentos */}
              {data.departamentos && data.departamentos.length > 0 && (
                <div className="w-full mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {data.departamentos.map((dept, idx) => {
                      const isOperacional = dept.nome === 'Operacional';
                      const isExpanded = expandedDepartamentos.has(dept.nome);

                      // Mapear responsáveis por departamento
                      const responsaveis: Record<string, string> = {
                        Operacional: 'Helton Rufino',
                        TI: 'Ryan Figueredo',
                        RH: 'Nagila, Carol, Helena e Cris',
                        Financeiro: 'Gabriel Fabri',
                        ADM: 'Gabriel Fabri',
                        Jurídico: 'Dr. Rodrigo Medeiros',
                      };

                      return (
                        <div
                          key={dept.nome}
                          className="bg-blue-600 text-white px-8 py-5 rounded-lg shadow-md border border-blue-700 relative min-w-[280px]"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInfo({
                                tipo: 'departamento',
                                nome: dept.nome,
                                dados: cargoInfo[dept.nome] || cargoInfo.ADM,
                              });
                              setInfoDialogOpen(true);
                            }}
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-white hover:bg-blue-700"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <div className="font-semibold text-xl mb-2 pr-8">
                            {dept.nome}
                          </div>
                          {responsaveis[dept.nome] && (
                            <div className="text-sm opacity-90 mb-2">
                              {responsaveis[dept.nome]}
                            </div>
                          )}

                          {/* Botão para expandir/colapsar (apenas Operacional tem supervisores) */}
                          {isOperacional && data.supervisores.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newExpanded = new Set(
                                  expandedDepartamentos
                                );
                                if (isExpanded) {
                                  newExpanded.delete(dept.nome);
                                } else {
                                  newExpanded.add(dept.nome);
                                }
                                setExpandedDepartamentos(newExpanded);
                              }}
                              className="h-7 px-2 mt-2 text-white hover:bg-blue-700"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              <span className="ml-1 text-xs">
                                {data.supervisores.length}{' '}
                                {data.supervisores.length === 1
                                  ? 'supervisor'
                                  : 'supervisores'}
                              </span>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nível 3: Supervisores e seus Grupos/Unidades (apenas Operacional) */}
              {expandedDepartamentos.has('Operacional') &&
                data.supervisores.length > 0 && (
                  <div className="w-full mb-8">
                    <div className="mb-4 pl-4 border-l-4 border-blue-600">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Supervisores do Operacional
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
                      {data.supervisores.map((supervisor, idx) => {
                        const gruposMap = supervisorGruposMap.get(
                          supervisor.id
                        );
                        const isExpanded = expandedSupervisors.has(
                          supervisor.id
                        );

                        return (
                          <div
                            key={supervisor.id}
                            className="bg-blue-500 text-white px-7 py-5 rounded-lg shadow-md border border-blue-600 relative min-w-[260px]"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInfo({
                                  tipo: 'supervisor',
                                  nome: supervisor.name,
                                  dados: cargoInfo.Supervisor,
                                });
                                setInfoDialogOpen(true);
                              }}
                              className="absolute top-2 right-2 h-6 w-6 p-0 text-white hover:bg-blue-600"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            <div className="font-semibold text-lg mb-2 pr-8">
                              {supervisor.name}
                            </div>
                            <div className="text-sm opacity-90 mb-3">
                              SUPERVISOR
                            </div>

                            {gruposMap && gruposMap.size > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newExpanded = new Set(
                                    expandedSupervisors
                                  );
                                  if (isExpanded) {
                                    newExpanded.delete(supervisor.id);
                                  } else {
                                    newExpanded.add(supervisor.id);
                                  }
                                  setExpandedSupervisors(newExpanded);
                                }}
                                className="h-7 px-2 text-white hover:bg-blue-600"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                                <span className="ml-1 text-xs">
                                  {gruposMap.size}{' '}
                                  {gruposMap.size === 1 ? 'grupo' : 'grupos'}
                                </span>
                              </Button>
                            )}

                            {/* Nível 4: Grupos do Supervisor */}
                            {isExpanded && gruposMap && gruposMap.size > 0 && (
                              <div className="mt-4 space-y-4">
                                <div className="text-xs font-semibold text-gray-600 mb-2">
                                  Grupos:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {Array.from(gruposMap.entries()).map(
                                    ([grupoId, unidades], grupoIndex) => {
                                      const grupo = data.grupos.find(
                                        g => g.id === grupoId
                                      ) || {
                                        id: grupoId,
                                        nome:
                                          unidades.length > 0
                                            ? data.unidades.find(
                                                u => u.grupoId === grupoId
                                              )?.grupoNome || 'Sem Grupo'
                                            : 'Sem Grupo',
                                      };
                                      const isGrupoExpanded =
                                        expandedGrupos.has(
                                          `${supervisor.id}-${grupoId}`
                                        );

                                      return (
                                        <div
                                          key={grupoId}
                                          className="bg-blue-400 text-white px-6 py-4 rounded-lg shadow-sm border border-blue-500 min-w-[240px]"
                                        >
                                          <div className="font-semibold text-base mb-1">
                                            {grupo.nome}
                                          </div>
                                          <div className="text-xs opacity-90 mb-2">
                                            GRUPO
                                          </div>

                                          {/* Botão para expandir/colapsar unidades do grupo */}
                                          {unidades.length > 0 && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const newExpanded = new Set(
                                                  expandedGrupos
                                                );
                                                const key = `${supervisor.id}-${grupoId}`;
                                                if (isGrupoExpanded) {
                                                  newExpanded.delete(key);
                                                } else {
                                                  newExpanded.add(key);
                                                }
                                                setExpandedGrupos(newExpanded);
                                              }}
                                              className="h-6 px-2 text-white hover:bg-blue-500"
                                            >
                                              {isGrupoExpanded ? (
                                                <ChevronUp className="h-3 w-3" />
                                              ) : (
                                                <ChevronDown className="h-3 w-3" />
                                              )}
                                              <span className="ml-1 text-xs">
                                                {unidades.length}{' '}
                                                {unidades.length === 1
                                                  ? 'unidade'
                                                  : 'unidades'}
                                              </span>
                                            </Button>
                                          )}

                                          {/* Nível 5: Unidades do grupo */}
                                          {isGrupoExpanded &&
                                            unidades.length > 0 && (
                                              <div className="mt-3 space-y-2">
                                                {unidades.map(
                                                  (unidadeItem, unidIndex) => {
                                                    const unidade =
                                                      data.unidades.find(
                                                        u =>
                                                          u.id ===
                                                          unidadeItem.id
                                                      );

                                                    // Agrupar cargos
                                                    const cargosPorUnidade =
                                                      new Map<string, number>();
                                                    if (unidade) {
                                                      unidade.funcionarios.forEach(
                                                        func => {
                                                          if (func.cargo) {
                                                            cargosPorUnidade.set(
                                                              func.cargo,
                                                              (cargosPorUnidade.get(
                                                                func.cargo
                                                              ) || 0) + 1
                                                            );
                                                          }
                                                        }
                                                      );
                                                    }

                                                    const cargosArray =
                                                      Array.from(
                                                        cargosPorUnidade.entries()
                                                      ).map(
                                                        ([
                                                          cargo,
                                                          quantidade,
                                                        ]) => ({
                                                          cargo,
                                                          quantidade,
                                                        })
                                                      );

                                                    return (
                                                      <div
                                                        key={unidadeItem.id}
                                                        className="bg-blue-300 text-white px-5 py-3 rounded shadow-sm border border-blue-400 text-sm min-w-[220px]"
                                                      >
                                                        <div className="font-semibold mb-2">
                                                          {unidadeItem.nome}
                                                        </div>
                                                        {cargosArray.length >
                                                        0 ? (
                                                          <div className="flex gap-1 flex-wrap text-xs">
                                                            {cargosArray.map(
                                                              (
                                                                cargoItem,
                                                                idx
                                                              ) => (
                                                                <span
                                                                  key={idx}
                                                                  className="bg-white/90 text-blue-800 px-1.5 py-0.5 rounded font-medium"
                                                                >
                                                                  {
                                                                    cargoItem.cargo
                                                                  }{' '}
                                                                  (
                                                                  {
                                                                    cargoItem.quantidade
                                                                  }
                                                                  )
                                                                </span>
                                                              )
                                                            )}
                                                          </div>
                                                        ) : (
                                                          <div className="text-xs opacity-70">
                                                            Sem cargos
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  }
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Informações do Cargo */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedInfo?.tipo === 'departamento' ? 'Departamento' : 'Cargo'}
              : {selectedInfo?.nome}
            </DialogTitle>
            <DialogDescription>
              Informações sobre responsabilidades e processos
            </DialogDescription>
          </DialogHeader>

          {selectedInfo?.dados && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">
                  Responsável
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedInfo.dados.responsavel}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-sm text-green-900 mb-2">
                  De Quem Recebe
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedInfo.dados.recebeDe}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-sm text-purple-900 mb-2">
                  O que é feito (Ação)
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedInfo.dados.acao}
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-sm text-orange-900 mb-2">
                  Como é feito (Processo/Fluxo)
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedInfo.dados.processo}
                </p>
              </div>

              {selectedInfo.dados.prazo && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-sm text-yellow-900 mb-2">
                    Prazo para cada tarefa
                  </h4>
                  <p className="text-sm text-gray-700">
                    {selectedInfo.dados.prazo}
                  </p>
                </div>
              )}

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-sm text-red-900 mb-2">
                  Para Quem Entrega
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedInfo.dados.entregaPara}
                </p>
              </div>

              {selectedInfo.tipo === 'supervisor' && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">
                    Manual do Supervisor
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Consulte o manual completo do supervisor para mais detalhes
                    sobre processos, procedimentos e responsabilidades.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Aqui você pode adicionar a lógica para abrir o manual
                      // Por exemplo: window.open('/manual-supervisor.pdf', '_blank')
                    }}
                  >
                    Consultar Manual
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
