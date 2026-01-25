'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { removeLeadsterScript } from '@/components/landing/LeadsterIntegration';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlusCircle,
  ClipboardCheck,
  CheckCircle2,
  Eye,
  Download,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { ChecklistDashboardMetrics } from '@/lib/checklists-operacionais/metrics';
import { useOperacionalFilters } from '../../_components/OperacionalFiltersProvider';

interface RespostaResumo {
  id: string;
  status: 'RASCUNHO' | 'CONCLUIDO';
  observacoes: string | null;
  createdAt: string;
  submittedAt: string | null;
  supervisorId: string;
}

interface EscopoItem {
  id: string;
  ativo: boolean;
  ultimoEnvioEm: string | null;
  ultimoSupervisorId: string | null;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    titulo: string;
    descricao: string | null;
  };
  unidade: {
    id: string;
    nome: string;
  } | null;
  grupo: {
    id: string;
    nome: string;
  } | null;
  respostasRecentes: RespostaResumo[];
}

interface GrupoOption {
  id: string;
  nome: string;
  ativo: boolean;
}

interface UnidadeOption {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  grupos: Array<{ id: string | null; nome: string | null }>; // principal grupo vem em primeiro
}

interface TemplateOption {
  id: string;
  titulo: string;
  descricao: string | null;
  escopos: Array<{ id: string; unidadeId: string; ativo: boolean }>;
}

interface ChecklistsDashboardClientProps {
  canManageTemplates: boolean;
  isSupervisor: boolean;
}

export function ChecklistsDashboardClient({
  canManageTemplates,
  isSupervisor,
}: ChecklistsDashboardClientProps) {
  const router = useRouter();
  const { selectedGrupos, selectedUnidade } = useOperacionalFilters();

  const [loading, setLoading] = useState(true);
  const [escopos, setEscopos] = useState<EscopoItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  const [metrics, setMetrics] = useState<ChecklistDashboardMetrics | null>(
    null
  );
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Novo checklist dialog state (para supervisor)
  const [novoChecklistDialogOpen, setNovoChecklistDialogOpen] = useState(false);
  const [novoChecklistGrupo, setNovoChecklistGrupo] = useState<string>('');
  const [novoChecklistUnidade, setNovoChecklistUnidade] = useState<string>('');
  const [novoChecklistTemplate, setNovoChecklistTemplate] =
    useState<string>('');
  const [novoChecklistLoading, setNovoChecklistLoading] = useState(false);

  // Checklists em aberto
  const [checklistsEmAberto, setChecklistsEmAberto] = useState<any[]>([]);
  const [loadingEmAberto, setLoadingEmAberto] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const [visualizandoRelatorio, setVisualizandoRelatorio] = useState<
    string | null
  >(null);
  const [relatorioDialogOpen, setRelatorioDialogOpen] = useState(false);

  // Remover Leadster ao montar o componente
  useEffect(() => {
    removeLeadsterScript();
    // Remover periodicamente para garantir que não apareça
    const interval = setInterval(() => {
      removeLeadsterScript();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadEscopos() {
      try {
        setLoading(true);
        const response = await fetch('/api/checklists-operacionais/pendentes', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar checklists');
        }

        const data = await response.json();
        if (!isMounted) return;
        setEscopos(data.escopos ?? []);
        setError(null);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError('Não foi possível carregar os checklists.');
        toast.error('Não foi possível carregar os checklists.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEscopos();
    return () => {
      isMounted = false;
    };
  }, []);

  // Carregar checklists em aberto para supervisor
  useEffect(() => {
    if (!isSupervisor || canManageTemplates) return;

    let isMounted = true;

    async function loadChecklistsEmAberto() {
      try {
        setLoadingEmAberto(true);
        const response = await fetch('/api/checklists-operacionais/em-aberto', {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Falha ao carregar checklists em aberto');
        }
        const data = await response.json();
        if (!isMounted) return;
        console.log(
          'Checklists em aberto carregados:',
          data.respostas?.length || 0,
          data.respostas
        );
        setChecklistsEmAberto(data.respostas ?? []);
      } catch (err) {
        console.error('Erro ao carregar checklists em aberto:', err);
      } finally {
        if (isMounted) {
          setLoadingEmAberto(false);
        }
      }
    }

    loadChecklistsEmAberto();

    // Refresh apenas quando a página recebe foco (usuário volta para a aba)
    const handleFocus = () => {
      if (isMounted) {
        loadChecklistsEmAberto();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSupervisor, canManageTemplates]);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        setOptionsLoading(true);
        const response = await fetch('/api/checklists-operacionais/options', {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Não foi possível carregar opções de checklists.');
        }
        const data = await response.json();
        if (!isMounted) return;
        setGrupos(data.grupos ?? []);
        setUnidades(data.unidades ?? []);
        setTemplates(data.templates ?? []);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        toast.error(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar opções de checklists.'
        );
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canManageTemplates) return;

    let isMounted = true;
    async function loadMetrics() {
      try {
        setMetricsLoading(true);
        const params = new URLSearchParams();
        // Adicionar grupos apenas se houver seleção (filtro ativo)
        selectedGrupos.forEach(grupoId => params.append('grupoId', grupoId));
        if (selectedUnidade) {
          params.set('unidadeId', selectedUnidade);
        }
        const response = await fetch(
          `/api/checklists-operacionais/dashboard?${params.toString()}`,
          {
            cache: 'no-store',
          }
        );
        if (!response.ok) {
          throw new Error('Erro ao carregar métricas do checklist.');
        }
        const payload = await response.json();
        if (!isMounted) return;
        setMetrics(payload.metrics ?? null);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        toast.error(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar o dashboard.'
        );
      } finally {
        if (isMounted) {
          setMetricsLoading(false);
        }
      }
    }

    loadMetrics();
    return () => {
      isMounted = false;
    };
  }, [canManageTemplates, selectedGrupos, selectedUnidade]);

  const escoposFiltrados = useMemo(() => {
    // Para supervisor, mostrar todos os checklists disponíveis (já filtrados pela API)
    if (isSupervisor && !canManageTemplates) {
      return escopos.filter(escopo => escopo.ativo);
    }

    // Para admin, aplicar filtros globais
    return escopos
      .filter(escopo => escopo.ativo)
      .filter(escopo => {
        // Filtrar por unidade se selecionada
        if (selectedUnidade && escopo.unidade?.id !== selectedUnidade) {
          return false;
        }
        // Filtrar por grupos selecionados
        if (
          selectedGrupos.length > 0 &&
          escopo.grupo?.id &&
          !selectedGrupos.includes(escopo.grupo.id)
        ) {
          return false;
        }
        return true;
      });
  }, [
    escopos,
    selectedGrupos,
    selectedUnidade,
    isSupervisor,
    canManageTemplates,
  ]);

  const unidadeSelecionada = useMemo(() => {
    if (!selectedUnidade) return null;
    return unidades.find(unidade => unidade.id === selectedUnidade) ?? null;
  }, [selectedUnidade, unidades]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header diferente para supervisor vs admin */}
      {isSupervisor && !canManageTemplates ? (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Meus Checklists
            </h1>
            <p className="text-sm text-muted-foreground">
              Responda os checklists das unidades sob sua responsabilidade
            </p>
          </div>

          {/* Banner destacado para supervisor iniciar checklist */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Iniciar Novo Checklist
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Selecione o grupo, unidade e template para responder um
                      checklist operacional
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="lg"
                    onClick={() => setNovoChecklistDialogOpen(true)}
                    className="gap-2"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Iniciar Checklist
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de rascunhos embaixo do botão Iniciar Checklist */}
          <Card className="border-dashed border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Rascunhos em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEmAberto ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="flex items-center justify-between rounded-lg border bg-card p-4"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ))}
                </div>
              ) : checklistsEmAberto.length > 0 ? (
                <div className="space-y-3">
                  {checklistsEmAberto.map(rascunho => (
                    <div
                      key={rascunho.id}
                      className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Rascunho
                          </Badge>
                          {rascunho.grupo && (
                            <span className="text-sm text-muted-foreground">
                              {rascunho.grupo.nome}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {rascunho.template?.titulo || 'Checklist'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rascunho.unidade?.nome || 'Unidade não informada'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Atualizado em{' '}
                          {new Date(rascunho.updatedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (
                              !confirm(
                                'Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.'
                              )
                            ) {
                              return;
                            }

                            try {
                              setDeletandoId(rascunho.id);
                              const response = await fetch(
                                `/api/checklists-operacionais/${rascunho.id}`,
                                { method: 'DELETE' }
                              );

                              if (!response.ok) {
                                const errorData = await response
                                  .json()
                                  .catch(() => ({}));
                                throw new Error(
                                  errorData.error || 'Erro ao excluir rascunho'
                                );
                              }

                              toast.success('Rascunho excluído com sucesso!');
                              setChecklistsEmAberto(prev =>
                                prev.filter(r => r.id !== rascunho.id)
                              );
                            } catch (error) {
                              console.error('Erro ao excluir rascunho:', error);
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : 'Erro ao excluir rascunho'
                              );
                            } finally {
                              setDeletandoId(null);
                            }
                          }}
                          disabled={deletandoId === rascunho.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!rascunho.escopoId) {
                              console.error('Rascunho sem escopoId:', rascunho);
                              toast.error(
                                'Erro: Checklist sem escopo. Entre em contato com o suporte.'
                              );
                              return;
                            }

                            // Construir URL com parâmetros de query se disponíveis
                            const searchParams = new URLSearchParams();
                            if (rascunho.grupo?.id) {
                              searchParams.set('grupoId', rascunho.grupo.id);
                            }
                            if (rascunho.unidade?.id) {
                              searchParams.set(
                                'unidadeId',
                                rascunho.unidade.id
                              );
                            }

                            const responderPath = `/operacional/checklists/responder/${rascunho.escopoId}${
                              searchParams.toString()
                                ? `?${searchParams.toString()}`
                                : ''
                            }`;

                            console.log(
                              'Navegando para checklist:',
                              responderPath
                            );
                            router.push(responderPath);
                          }}
                          className="gap-2"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Continuar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ClipboardCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum rascunho em andamento
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Os rascunhos aparecerão aqui quando você iniciar um
                    checklist
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Checklists Operacionais
            </h1>
            <p className="text-sm text-muted-foreground">
              Supervisores registram o status das unidades com base nos modelos
              definidos pelo time operacional.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManageTemplates && (
              <Button
                onClick={() => router.push('/operacional/checklists/admin')}
              >
                Gerenciar modelos
              </Button>
            )}
          </div>
        </div>
      )}

      {canManageTemplates && (
        <>
          <AdminOverview metrics={metrics} loading={metricsLoading} />
          {unidadeSelecionada && (
            <Card className="border-dashed border-muted-foreground/40 bg-muted/20">
              <CardContent className="py-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Unidade selecionada:
                </p>
                <p>
                  {unidadeSelecionada.nome}
                  {unidadeSelecionada.cidade
                    ? ` · ${unidadeSelecionada.cidade}`
                    : ''}
                  {unidadeSelecionada.estado
                    ? `/${unidadeSelecionada.estado}`
                    : ''}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Para supervisor: mostrar apenas o banner, não a lista completa */}
      {isSupervisor && !canManageTemplates ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Use o botão acima para iniciar um novo checklist
                </p>
                <p className="text-xs text-muted-foreground">
                  Você verá apenas os grupos e unidades vinculados ao seu perfil
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-${index}`}>
              <CardHeader>
                <Skeleton className="h-5 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : escoposFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {isSupervisor && !canManageTemplates
                    ? 'Nenhum checklist disponível no momento'
                    : 'Nenhum checklist disponível para os filtros selecionados'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSupervisor && !canManageTemplates
                    ? 'Use o botão "Iniciar Checklist" acima para começar um novo checklist'
                    : 'Ajuste os filtros ou aguarde novos checklists serem criados'}
                </p>
              </div>
              {isSupervisor && !canManageTemplates && (
                <Button
                  onClick={() => setNovoChecklistDialogOpen(true)}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Iniciar Novo Checklist
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {escoposFiltrados.map(escopo => {
            const ultimaResposta = escopo.respostasRecentes.at(0) ?? null;
            const ultimaData =
              ultimaResposta?.submittedAt ?? escopo.ultimoEnvioEm;
            const unidadeNome = escopo.unidade?.nome ?? 'Unidade não informada';

            const searchParams = new URLSearchParams();
            if (escopo.grupo?.id) searchParams.set('grupoId', escopo.grupo.id);
            if (escopo.unidade?.id)
              searchParams.set('unidadeId', escopo.unidade.id);
            const responderPath = `/operacional/checklists/responder/${escopo.id}${
              searchParams.toString() ? `?${searchParams.toString()}` : ''
            }`;

            return (
              <Card
                key={escopo.id}
                className={cn(
                  'flex h-full flex-col overflow-hidden border',
                  ultimaResposta?.status === 'CONCLUIDO'
                    ? 'border-emerald-200/80 dark:border-emerald-500/40'
                    : 'border-border'
                )}
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-semibold text-foreground">
                      {escopo.template.titulo}
                    </CardTitle>
                    <Badge variant={ultimaResposta ? 'secondary' : 'outline'}>
                      {ultimaResposta ? 'Respondido' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{unidadeNome}</p>
                  {escopo.template.descricao && (
                    <p className="text-xs text-muted-foreground">
                      {escopo.template.descricao}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Último envio</span>
                      <span>
                        {ultimaData
                          ? new Date(ultimaData).toLocaleString('pt-BR')
                          : 'Nunca'}
                      </span>
                    </div>
                    {ultimaResposta?.observacoes && (
                      <p className="mt-2 text-[11px] text-muted-foreground/90">
                        Observações: {ultimaResposta.observacoes}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => router.push(responderPath)}
                    size={isSupervisor ? 'lg' : 'default'}
                    className={isSupervisor ? 'w-full' : ''}
                  >
                    {isSupervisor ? (
                      <>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Responder Checklist
                      </>
                    ) : (
                      'Abrir checklist'
                    )}
                  </Button>
                  {escopo.respostasRecentes.length > 1 && (
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <p className="font-medium text-foreground/90">
                        Histórico recente
                      </p>
                      {escopo.respostasRecentes.slice(1).map(resposta => (
                        <div
                          key={resposta.id}
                          className="flex justify-between gap-3"
                        >
                          <span>
                            {new Date(resposta.createdAt).toLocaleString(
                              'pt-BR'
                            )}
                          </span>
                          <span>
                            {resposta.status === 'CONCLUIDO'
                              ? 'Concluído'
                              : 'Rascunho'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para supervisor criar novo checklist */}
      {isSupervisor && (
        <NovoChecklistDialog
          open={novoChecklistDialogOpen}
          onOpenChange={setNovoChecklistDialogOpen}
          grupos={grupos.filter(g => g.ativo)}
          unidades={unidades}
          templates={templates}
          selectedGrupo={novoChecklistGrupo}
          selectedUnidade={novoChecklistUnidade}
          selectedTemplate={novoChecklistTemplate}
          onSelectGrupo={setNovoChecklistGrupo}
          onSelectUnidade={setNovoChecklistUnidade}
          onSelectTemplate={setNovoChecklistTemplate}
          optionsLoading={optionsLoading}
          onConfirm={async () => {
            if (!novoChecklistUnidade) {
              toast.error('Selecione uma unidade');
              return;
            }

            // Buscar o template selecionado ou disponível para esta unidade
            const templatesDisponiveis = templates.filter(template =>
              template.escopos.some(
                escopo =>
                  escopo.unidadeId === novoChecklistUnidade && escopo.ativo
              )
            );

            // Usar o template selecionado ou o primeiro disponível
            const templateId =
              novoChecklistTemplate || templatesDisponiveis[0]?.id;

            if (!templateId) {
              toast.error(
                'Selecione um tipo de checklist ou esta unidade não possui um modelo definido'
              );
              return;
            }

            setNovoChecklistLoading(true);
            try {
              // Buscar o escopo correspondente para esta unidade e template
              const escoposResponse = await fetch(
                '/api/checklists-operacionais/pendentes',
                {
                  cache: 'no-store',
                }
              );
              const escoposData = await escoposResponse.json();
              const escopo = escoposData.escopos?.find(
                (e: EscopoItem) =>
                  e.unidade?.id === novoChecklistUnidade &&
                  e.template.id === templateId &&
                  e.ativo
              );

              if (!escopo) {
                toast.error(
                  'Nenhum checklist disponível para esta unidade e template'
                );
                setNovoChecklistLoading(false);
                return;
              }

              // Criar rascunho imediatamente ao clicar em "Iniciar Checklist"
              const formData = new FormData();
              formData.append('escopoId', escopo.id);
              formData.append('isDraft', 'true');
              formData.append('answers', JSON.stringify([])); // Array vazio para rascunho inicial

              const criarRascunhoResponse = await fetch(
                '/api/checklists-operacionais/respostas',
                {
                  method: 'POST',
                  body: formData,
                }
              );

              if (!criarRascunhoResponse.ok) {
                const errorData = await criarRascunhoResponse.json();
                console.error('Erro ao criar rascunho:', errorData);
                // Continuar mesmo se falhar, o rascunho será criado na página de responder
              } else {
                // Recarregar lista de rascunhos após criar
                const emAbertoResponse = await fetch(
                  '/api/checklists-operacionais/em-aberto',
                  {
                    cache: 'no-store',
                  }
                );
                if (emAbertoResponse.ok) {
                  const emAbertoData = await emAbertoResponse.json();
                  setChecklistsEmAberto(emAbertoData.respostas ?? []);
                }
              }

              const searchParams = new URLSearchParams();
              if (escopo.grupo?.id)
                searchParams.set('grupoId', escopo.grupo.id);
              if (escopo.unidade?.id)
                searchParams.set('unidadeId', escopo.unidade.id);
              const responderPath = `/operacional/checklists/responder/${escopo.id}${
                searchParams.toString() ? `?${searchParams.toString()}` : ''
              }`;

              router.push(responderPath);
              setNovoChecklistDialogOpen(false);
              setNovoChecklistGrupo('');
              setNovoChecklistUnidade('');
              setNovoChecklistTemplate('');
            } catch (error) {
              console.error(error);
              toast.error('Erro ao buscar checklist');
            } finally {
              setNovoChecklistLoading(false);
            }
          }}
          loading={novoChecklistLoading}
        />
      )}

      {/* Dialog para visualizar relatório */}
      <Dialog open={relatorioDialogOpen} onOpenChange={setRelatorioDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Relatório</DialogTitle>
            <DialogDescription>
              Visualize o relatório do checklist
            </DialogDescription>
          </DialogHeader>
          {visualizandoRelatorio && (
            <VisualizarRelatorioDialog
              respostaId={visualizandoRelatorio}
              onClose={() => {
                setRelatorioDialogOpen(false);
                setVisualizandoRelatorio(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NovoChecklistDialog({
  open,
  onOpenChange,
  grupos,
  unidades,
  templates,
  selectedGrupo,
  selectedUnidade,
  selectedTemplate,
  onSelectGrupo,
  onSelectUnidade,
  onSelectTemplate,
  onConfirm,
  loading,
  optionsLoading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupos: GrupoOption[];
  unidades: UnidadeOption[];
  templates: TemplateOption[];
  selectedGrupo: string;
  selectedUnidade: string;
  selectedTemplate: string;
  onSelectGrupo: (value: string) => void;
  onSelectUnidade: (value: string) => void;
  onSelectTemplate: (value: string) => void;
  onConfirm: () => void;
  loading: boolean;
  optionsLoading?: boolean;
}) {
  // Filtrar unidades baseado no grupo selecionado
  const unidadesFiltradas = useMemo(() => {
    if (!selectedGrupo) return unidades;
    return unidades.filter(unidade =>
      unidade.grupos?.some(grupo => grupo?.id === selectedGrupo)
    );
  }, [unidades, selectedGrupo]);

  // Filtrar templates baseado na unidade selecionada
  // Pode haver múltiplos templates para a mesma unidade
  const templatesDaUnidade = useMemo(() => {
    if (!selectedUnidade) return [];
    return templates.filter(template =>
      template.escopos.some(
        escopo => escopo.unidadeId === selectedUnidade && escopo.ativo
      )
    );
  }, [templates, selectedUnidade]);

  // Template selecionado (pode ser manual ou automático se houver apenas um)
  const templateSelecionado = useMemo(() => {
    if (selectedTemplate) {
      return templatesDaUnidade.find(t => t.id === selectedTemplate) || null;
    }
    // Se houver apenas um template, usar automaticamente
    if (templatesDaUnidade.length === 1) {
      return templatesDaUnidade[0];
    }
    return null;
  }, [templatesDaUnidade, selectedTemplate]);

  // Resetar seleções quando o grupo muda
  useEffect(() => {
    if (selectedGrupo) {
      const unidadeAtual = unidades.find(u => u.id === selectedUnidade);
      if (
        unidadeAtual &&
        !unidadeAtual.grupos?.some(grupo => grupo?.id === selectedGrupo)
      ) {
        onSelectUnidade('');
        onSelectTemplate('');
      }
    }
  }, [
    selectedGrupo,
    unidades,
    selectedUnidade,
    onSelectUnidade,
    onSelectTemplate,
  ]);

  // Auto-selecionar template quando uma unidade for selecionada e houver apenas um
  useEffect(() => {
    if (selectedUnidade && templatesDaUnidade.length === 1) {
      // Se houver apenas um template, selecionar automaticamente
      onSelectTemplate(templatesDaUnidade[0].id);
    } else if (selectedUnidade && templatesDaUnidade.length === 0) {
      // Se não houver templates para a unidade, limpar seleção
      onSelectTemplate('');
    } else if (!selectedUnidade) {
      // Se não houver unidade selecionada, limpar template
      onSelectTemplate('');
    }
    // Se houver múltiplos templates, não auto-selecionar - deixar o usuário escolher
  }, [selectedUnidade, templatesDaUnidade, onSelectTemplate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Checklist</DialogTitle>
          <DialogDescription>
            Selecione o grupo, unidade e tipo de checklist para iniciar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novo-checklist-grupo">Grupo *</Label>
            <Select
              value={selectedGrupo}
              onValueChange={onSelectGrupo}
              disabled={optionsLoading}
            >
              <SelectTrigger id="novo-checklist-grupo">
                <SelectValue
                  placeholder={
                    optionsLoading ? 'Carregando...' : 'Selecione o grupo'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {grupos.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {optionsLoading
                      ? 'Carregando grupos...'
                      : 'Nenhum grupo disponível'}
                  </div>
                ) : (
                  grupos.map(grupo => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="novo-checklist-unidade">Unidade *</Label>
            <Select
              value={selectedUnidade}
              onValueChange={onSelectUnidade}
              disabled={!selectedGrupo}
            >
              <SelectTrigger id="novo-checklist-unidade">
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent
                side="bottom"
                position="popper"
                className="max-h-[300px]"
              >
                {unidadesFiltradas.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nenhuma unidade disponível
                  </div>
                ) : (
                  unidadesFiltradas.map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                      {unidade.cidade ? ` · ${unidade.cidade}` : ''}
                      {unidade.estado ? `/${unidade.estado}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedUnidade && templatesDaUnidade.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="novo-checklist-template">
                Tipo de Checklist *
              </Label>
              <Select
                value={selectedTemplate}
                onValueChange={onSelectTemplate}
                disabled={!selectedUnidade}
              >
                <SelectTrigger id="novo-checklist-template">
                  <SelectValue placeholder="Selecione o tipo de checklist" />
                </SelectTrigger>
                <SelectContent>
                  {templatesDaUnidade.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.titulo}
                      {template.descricao ? ` — ${template.descricao}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedUnidade && templateSelecionado && (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium text-foreground">
                Tipo de Checklist
              </p>
              <p className="text-sm text-muted-foreground">
                {templateSelecionado.titulo}
                {templateSelecionado.descricao
                  ? ` — ${templateSelecionado.descricao}`
                  : ''}
              </p>
            </div>
          )}
          {selectedUnidade && templatesDaUnidade.length === 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">
                Nenhum checklist disponível
              </p>
              <p className="text-sm text-destructive/80">
                Esta unidade não possui um modelo de checklist definido. Entre
                em contato com o administrador.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={
              loading ||
              !selectedGrupo ||
              !selectedUnidade ||
              !templateSelecionado
            }
          >
            {loading ? 'Carregando...' : 'Iniciar Checklist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminOverview({
  metrics,
  loading,
}: {
  metrics: ChecklistDashboardMetrics | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumo das avaliações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Resumo das avaliações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <DashboardStat
            label="Checklists concluídos"
            value={metrics.totalRespostas.toLocaleString('pt-BR')}
          />
          <DashboardStat
            label="Unidades avaliadas"
            value={metrics.totalUnidadesAvaliadas.toLocaleString('pt-BR')}
          />
          <DashboardStat
            label="Supervisores ativos"
            value={metrics.totalSupervisoresAtivos.toLocaleString('pt-BR')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Métricas de Conformidade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <DashboardStat
            label="Taxa de Conformidade"
            value={`${metrics.taxaConformidade}%`}
          />
          <DashboardStat
            label="Não Conformidades"
            value={metrics.totalNaoConformidades.toLocaleString('pt-BR')}
          />
          <DashboardStat
            label="Resolvidas"
            value={metrics.naoConformidadesResolvidas.toLocaleString('pt-BR')}
          />
          <DashboardStat
            label="Pendentes"
            value={(
              metrics.totalNaoConformidades - metrics.naoConformidadesResolvidas
            ).toLocaleString('pt-BR')}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Produção por modelo</CardTitle>
            <p className="text-xs text-muted-foreground">
              Total de checklists concluídos por modelo nos últimos meses.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.respostasPorTemplate.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há registros suficientes para exibir.
              </p>
            ) : (
              metrics.respostasPorTemplate.map(item => (
                <div key={item.templateId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{item.titulo}</span>
                    <span>{item.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, (item.total / metrics.totalRespostas) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Ranking de supervisores</CardTitle>
            <p className="text-xs text-muted-foreground">
              Supervisores com maior volume de checklists concluídos.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.rankingSupervisores.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há registros suficientes para exibir.
              </p>
            ) : (
              metrics.rankingSupervisores.map((item, index) => (
                <div
                  key={item.supervisorId}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      #{index + 1} · {item.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.unidadesAvaliadas} unidades avaliadas
                    </p>
                  </div>
                  <span className="text-muted-foreground">
                    {item.totalRespostas} checklists
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Não Conformidades por Modelo</CardTitle>
            <p className="text-xs text-muted-foreground">
              Distribuição de não conformidades por tipo de checklist.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.naoConformidadesPorTemplate.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma não conformidade registrada.
              </p>
            ) : (
              metrics.naoConformidadesPorTemplate.map(item => {
                const taxaResolucao =
                  item.total > 0
                    ? Math.round((item.resolvidas / item.total) * 100)
                    : 0;
                return (
                  <div key={item.templateId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.titulo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {item.resolvidas}/{item.total}
                        </span>
                        <Badge
                          variant={
                            taxaResolucao === 100
                              ? 'default'
                              : taxaResolucao >= 80
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {taxaResolucao}% resolvidas
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${taxaResolucao}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Perguntas com Não Conformidades</CardTitle>
            <p className="text-xs text-muted-foreground">
              Perguntas que mais geraram não conformidades.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.topPerguntasNaoConformes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma não conformidade registrada.
              </p>
            ) : (
              metrics.topPerguntasNaoConformes.map((item, index) => {
                const taxaResolucao =
                  item.total > 0
                    ? Math.round((item.resolvidas / item.total) * 100)
                    : 0;
                return (
                  <div
                    key={item.perguntaId}
                    className="rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          #{index + 1} {item.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.templateTitulo}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-medium text-foreground">
                          {item.total} ocorrências
                        </span>
                        <Badge
                          variant={
                            taxaResolucao === 100
                              ? 'default'
                              : taxaResolucao >= 80
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="text-xs"
                        >
                          {item.resolvidas} resolvidas
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Evolução mensal</CardTitle>
          <p className="text-xs text-muted-foreground">
            Total de checklists concluídos por mês
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {metrics.seriesMensal.map(item => (
              <div
                key={item.mes}
                className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {formatMesPt(item.mes)}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {item.total}
                </span>
                <span className="text-xs text-muted-foreground">
                  checklists
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seção de Pontuações */}
      {metrics.pontuacaoMedia > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pontuação Média Geral</CardTitle>
              <p className="text-xs text-muted-foreground">
                Média de todas as avaliações (nota de 1 a 5)
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">
                  {metrics.pontuacaoMedia.toFixed(1)}
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${(metrics.pontuacaoMedia / 5) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escala de 1 (Péssimo) a 5 (Ótimo)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pontuação por Template</CardTitle>
              <p className="text-xs text-muted-foreground">
                Média de avaliações por tipo de checklist
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.pontuacaoPorTemplate.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ainda não há avaliações com notas registradas.
                </p>
              ) : (
                metrics.pontuacaoPorTemplate.slice(0, 5).map(item => (
                  <div key={item.templateId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.titulo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {item.media.toFixed(1)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {item.totalAvaliacoes} avaliações
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(item.media / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Unidades por Pontuação */}
      {metrics.pontuacaoPorUnidade.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Unidades por Pontuação</CardTitle>
            <p className="text-xs text-muted-foreground">
              Unidades com melhor média de avaliações
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.pontuacaoPorUnidade.map((item, index) => (
              <div
                key={item.unidadeId}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {item.unidadeNome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.totalAvaliacoes} avaliações
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">
                    {item.media.toFixed(1)}
                  </span>
                  <div className="h-2 w-16 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(item.media / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface VisualizarRelatorioDialogProps {
  respostaId: string;
  onClose: () => void;
}

function VisualizarRelatorioDialog({
  respostaId,
  onClose,
}: VisualizarRelatorioDialogProps) {
  const [loading, setLoading] = useState(true);
  const [resposta, setResposta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResposta() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/checklists-operacionais/${respostaId}`,
          { cache: 'no-store' }
        );
        if (!response.ok) throw new Error('Erro ao carregar resposta');
        const data = await response.json();
        setResposta(data);
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar relatório');
      } finally {
        setLoading(false);
      }
    }
    loadResposta();
  }, [respostaId]);

  async function handleGerarPDF() {
    if (!resposta) return;
    try {
      const params = new URLSearchParams();
      params.append('templateId', resposta.resposta.templateId);
      if (resposta.resposta.grupoId) {
        params.append('grupoId', resposta.resposta.grupoId);
      }
      if (resposta.resposta.unidadeId) {
        params.append('unidadeId', resposta.resposta.unidadeId);
      }
      // Pegar o mês da resposta
      const dataResposta = new Date(
        resposta.resposta.submittedAt || resposta.resposta.createdAt
      );
      params.append(
        'mes',
        `${dataResposta.getFullYear()}-${String(dataResposta.getMonth() + 1).padStart(2, '0')}`
      );

      const response = await fetch(
        `/api/checklists-operacionais/relatorios/mensal/pdf?${params.toString()}`,
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Erro ao gerar PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${resposta.resposta.unidade.nome}-${resposta.resposta.grupo?.nome || 'sem-grupo'}-${new Date(resposta.resposta.submittedAt || resposta.resposta.createdAt).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar PDF');
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !resposta) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive">
          {error || 'Resposta não encontrada'}
        </p>
      </div>
    );
  }

  const respostaData = resposta.resposta;
  const templateData = resposta.template;
  const respostasData = resposta.respostas || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Template</p>
          <p className="text-sm">{respostaData.template.titulo}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Unidade</p>
          <p className="text-sm">{respostaData.unidade.nome}</p>
        </div>
        {respostaData.grupo && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Grupo</p>
            <p className="text-sm">{respostaData.grupo.nome}</p>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Supervisor
          </p>
          <p className="text-sm">{respostaData.supervisor.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Data</p>
          <p className="text-sm">
            {new Date(
              respostaData.submittedAt || respostaData.createdAt
            ).toLocaleString('pt-BR')}
          </p>
        </div>
        {respostaData.protocolo && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Protocolo
            </p>
            <p className="text-sm font-mono">{respostaData.protocolo}</p>
          </div>
        )}
      </div>

      {respostaData.observacoes && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Observações
          </p>
          <p className="text-sm bg-muted p-3 rounded-md">
            {respostaData.observacoes}
          </p>
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Respostas do Checklist</p>
          <Button size="sm" variant="outline" onClick={handleGerarPDF}>
            <Download className="h-4 w-4 mr-2" />
            Gerar PDF (Grupo/Unidade)
          </Button>
        </div>
        {templateData?.grupos?.map((grupo: any) => (
          <Card key={grupo.id}>
            <CardHeader>
              <CardTitle className="text-sm">{grupo.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grupo.perguntas.map((pergunta: any) => {
                const respostaPergunta = respostasData.find(
                  (r: any) => r.perguntaId === pergunta.id
                );
                if (!respostaPergunta) return null;

                return (
                  <div
                    key={pergunta.id}
                    className="space-y-2 border-b pb-3 last:border-0"
                  >
                    <p className="text-sm font-medium">{pergunta.titulo}</p>
                    <div className="space-y-1">
                      {respostaPergunta.valorTexto && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Texto:</strong> {respostaPergunta.valorTexto}
                        </p>
                      )}
                      {respostaPergunta.valorBoolean !== null && (
                        <Badge
                          variant={
                            respostaPergunta.valorBoolean
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {respostaPergunta.valorBoolean
                            ? 'Conforme'
                            : 'Não Conforme'}
                        </Badge>
                      )}
                      {respostaPergunta.valorNumero !== null && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Número:</strong>{' '}
                          {respostaPergunta.valorNumero}
                        </p>
                      )}
                      {respostaPergunta.valorOpcao && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Opção:</strong> {respostaPergunta.valorOpcao}
                        </p>
                      )}
                      {respostaPergunta.fotoUrl && (
                        <div className="mt-2">
                          <img
                            src={respostaPergunta.fotoUrl}
                            alt="Evidência"
                            className="max-w-xs rounded-md border"
                          />
                        </div>
                      )}
                      {respostaPergunta.nota !== null &&
                        respostaPergunta.nota !== undefined && (
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className={`w-4 h-4 rounded-full ${
                                respostaPergunta.nota === 1
                                  ? 'bg-red-500'
                                  : respostaPergunta.nota === 2
                                    ? 'bg-orange-500'
                                    : respostaPergunta.nota === 3
                                      ? 'bg-yellow-500'
                                      : respostaPergunta.nota === 4
                                        ? 'bg-green-500'
                                        : 'bg-green-400'
                              }`}
                            />
                            <span className="text-xs font-medium">
                              Nota: {respostaPergunta.nota} -{' '}
                              {respostaPergunta.nota === 1
                                ? 'Péssimo'
                                : respostaPergunta.nota === 2
                                  ? 'Ruim'
                                  : respostaPergunta.nota === 3
                                    ? 'Regular'
                                    : respostaPergunta.nota === 4
                                      ? 'Bom'
                                      : 'Ótimo'}
                            </span>
                          </div>
                        )}
                      {respostaPergunta.observacao && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {respostaPergunta.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </DialogFooter>
    </div>
  );
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatMesPt(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}
