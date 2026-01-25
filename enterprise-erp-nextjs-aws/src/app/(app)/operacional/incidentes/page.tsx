'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import Image from 'next/image';
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Undo2,
  Download,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { hasRouteAccess } from '@/lib/rbac';

type StatusIncidente = 'ABERTO' | 'CONCLUIDO';

const ALL_GROUPS_VALUE = '__ALL_GROUPS__';
const ALL_UNIDADES_VALUE = '__ALL_UNIDADES__';

interface GrupoOption {
  id: string;
  nome: string;
}

interface UnidadeOption {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  grupoIds: string[];
}

interface Incidente {
  id: string;
  titulo: string;
  categoria?: string | null;
  urgencia?: number | null;
  categoriaUrgencia?: {
    id: string;
    urgenciaNivel: 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAIXA' | 'MUITO_BAIXA';
    nome: string;
    prazoHoras: number;
    descricao: string | null;
  } | null;
  descricao: string;
  status: StatusIncidente;
  grupo: { id: string; nome: string };
  unidade: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
  };
  imagemUrl: string | null;
  imagemConclusaoUrl: string | null;
  createdAt: string;
  criadoPor: { id: string; name: string | null; email?: string | null };
  clienteFinal?: { id: string; email: string; nome: string } | null;
  concluidoPor: { id: string; name: string | null } | null;
  concluidoEm: string | null;
  conclusaoNotas: string | null;
}

import { getUrgenciaColor, getUrgenciaLabel } from '@/lib/urgencia-helper';

const STATUS_STYLES: Record<
  StatusIncidente,
  { label: string; className: string }
> = {
  ABERTO: {
    label: 'Aberto',
    className: 'border-sky-200 bg-sky-100 text-sky-800',
  },
  CONCLUIDO: {
    label: 'Concluído',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  },
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatUnidade(unidade: Incidente['unidade']) {
  const parts = [unidade.nome];
  if (unidade.cidade) {
    parts.push(
      unidade.estado ? `${unidade.cidade}/${unidade.estado}` : unidade.cidade
    );
  } else if (unidade.estado) {
    parts.push(unidade.estado);
  }
  return parts.join(' • ');
}

export default function IncidentesOperacionaisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role as Role | undefined;

  const canView = hasRouteAccess(userRole, [
    'MASTER',
    'ADMIN',
    'OPERACIONAL',
    'SUPERVISOR',
  ]);
  const canCreate = hasRouteAccess(userRole, [
    'MASTER',
    'ADMIN',
    'OPERACIONAL',
  ]);
  const canReopen = hasRouteAccess(userRole, [
    'MASTER',
    'ADMIN',
    'OPERACIONAL',
  ]);

  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loadingIncidentes, setLoadingIncidentes] = useState(false);
  const [statusActionId, setStatusActionId] = useState<string | null>(null);
  const [imageLoadingId, setImageLoadingId] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    status: StatusIncidente | 'TODOS';
    grupoId: string;
    unidadeId: string;
    search: string;
  }>({
    status: 'ABERTO',
    grupoId: ALL_GROUPS_VALUE,
    unidadeId: ALL_UNIDADES_VALUE,
    search: '',
  });

  const [statusModal, setStatusModal] = useState<{
    id: string;
    action: StatusIncidente;
  } | null>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [conclusaoImagem, setConclusaoImagem] = useState<File | null>(null);
  const [conclusaoImagemPreview, setConclusaoImagemPreview] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const response = await fetch('/api/incidentes/options');
        if (response.status === 403) {
          setGrupos([]);
          setUnidades([]);
          toast.warning('Você não tem permissão para visualizar as opções.');
        } else if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        } else {
          const data = await response.json();
          setGrupos(data.grupos ?? []);
          setUnidades(data.unidades ?? []);
        }
      } catch (error) {
        console.error('Erro ao carregar opções de incidentes:', error);
        toast.error('Não foi possível carregar grupos e unidades.');
      } finally {
        setOptionsLoading(false);
      }
    };

    loadOptions();
  }, []);

  const unidadesForFilters = useCallback(
    (grupoId: string) => {
      if (!grupoId || grupoId === ALL_GROUPS_VALUE) return unidades;
      return unidades.filter(unidade => {
        if (!unidade.grupoIds.length) return true;
        return unidade.grupoIds.includes(grupoId);
      });
    },
    [unidades]
  );

  useEffect(() => {
    const available = unidadesForFilters(filters.grupoId);
    if (
      filters.unidadeId !== ALL_UNIDADES_VALUE &&
      !available.some(unidade => unidade.id === filters.unidadeId)
    ) {
      setFilters(prev => ({ ...prev, unidadeId: ALL_UNIDADES_VALUE }));
    }
  }, [filters.grupoId, filters.unidadeId, unidadesForFilters]);

  const fetchIncidentes = useCallback(
    async (signal?: AbortSignal) => {
      if (signal?.aborted) return;
      setLoadingIncidentes(true);
      try {
        const params = new URLSearchParams();
        if (filters.status !== 'TODOS') {
          params.set('status', filters.status);
        }
        if (filters.grupoId !== ALL_GROUPS_VALUE) {
          params.set('grupoId', filters.grupoId);
        }
        if (filters.unidadeId !== ALL_UNIDADES_VALUE) {
          params.set('unidadeId', filters.unidadeId);
        }
        if (filters.search.trim()) {
          params.set('q', filters.search.trim());
        }

        const url =
          params.toString().length > 0
            ? `/api/incidentes?${params.toString()}`
            : '/api/incidentes';
        const response = await fetch(url, { signal });

        if (response.status === 403) {
          setIncidentes([]);
          toast.warning(
            'Você não tem permissão para listar incidentes neste escopo.'
          );
        } else if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        } else {
          const data = await response.json();
          setIncidentes(data.incidentes ?? []);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Erro ao carregar incidentes:', error);
        toast.error('Não foi possível carregar os incidentes.');
      } finally {
        setLoadingIncidentes(false);
      }
    },
    [filters.grupoId, filters.search, filters.status, filters.unidadeId]
  );

  useEffect(() => {
    if (optionsLoading || !canView) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetchIncidentes(controller.signal);
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [fetchIncidentes, optionsLoading, canView]);

  const handleStatusUpdate = async (
    id: string,
    action: StatusIncidente,
    notas?: string,
    imagem?: File | null
  ) => {
    setStatusActionId(id);
    try {
      let response: Response;

      if (action === 'CONCLUIDO') {
        // Validações no frontend
        if (!notas || notas.trim().length === 0) {
          toast.error('Observação é obrigatória ao concluir um incidente');
          setStatusActionId(null);
          return;
        }

        if (!imagem || imagem.size === 0) {
          toast.error('Imagem de prova de conclusão é obrigatória');
          setStatusActionId(null);
          return;
        }

        // Enviar FormData com imagem
        const formData = new FormData();
        formData.append('status', action);
        formData.append('conclusaoNotas', notas);
        formData.append('imagemConclusao', imagem);

        response = await fetch(`/api/incidentes/${id}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        // Reabertura - JSON simples
        response = await fetch(`/api/incidentes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: action,
            conclusaoNotas: null,
          }),
        });
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao atualizar incidente');
      }

      const updated: Incidente = payload.incidente;
      setIncidentes(prev =>
        prev.map(item => (item.id === updated.id ? updated : item))
      );

      toast.success(
        action === 'CONCLUIDO'
          ? 'Incidente concluído com sucesso!'
          : 'Incidente reaberto.'
      );
    } catch (error: any) {
      console.error('Erro ao atualizar incidente:', error);
      toast.error(error?.message || 'Não foi possível atualizar o incidente.');
    } finally {
      setStatusActionId(null);
    }
  };

  const handleViewImage = async (id: string) => {
    setImageLoadingId(id);
    try {
      const response = await fetch(`/api/incidentes/${id}/image`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Imagem indisponível');
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error('Erro ao abrir imagem do incidente:', error);
      toast.error(error?.message || 'Não foi possível abrir a imagem.');
    } finally {
      setImageLoadingId(null);
    }
  };

  const filteredUnidadesForFilters = useMemo(
    () => unidadesForFilters(filters.grupoId),
    [filters.grupoId, unidadesForFilters]
  );

  const handleOpenStatusModal = (
    incidente: Incidente,
    action: StatusIncidente
  ) => {
    setStatusModal({ id: incidente.id, action });
    setStatusNotes(
      action === 'CONCLUIDO' ? (incidente.conclusaoNotas ?? '') : ''
    );
    setConclusaoImagem(null);
    setConclusaoImagemPreview(null);
  };

  const closeStatusModal = () => {
    setStatusModal(null);
    setStatusNotes('');
    setConclusaoImagem(null);
    setConclusaoImagemPreview(null);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande (máximo 5MB)');
        return;
      }
      setConclusaoImagem(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setConclusaoImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6 text-muted-foreground">
        Você não tem permissão para acessar o Registro Central de Incidentes.
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 pb-12 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Registro Central de Incidentes
          </h1>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Acompanhe e conclua incidentes operacionais. Supervisores podem
            visualizar e concluir incidentes das unidades sob sua
            responsabilidade.
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button
              onClick={() => router.push('/operacional/incidentes/novo')}
              disabled={loadingIncidentes}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Chamado
            </Button>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (filters.status !== 'TODOS') {
                  params.set('status', filters.status);
                }
                if (filters.grupoId !== ALL_GROUPS_VALUE) {
                  params.set('grupoId', filters.grupoId);
                }
                if (filters.unidadeId !== ALL_UNIDADES_VALUE) {
                  params.set('unidadeId', filters.unidadeId);
                }
                if (filters.search.trim()) {
                  params.set('q', filters.search.trim());
                }

                const url = `/api/incidentes/export${params.toString() ? `?${params.toString()}` : ''}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Erro ao exportar');

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `relatorio-incidentes-${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);

                toast.success('Relatório exportado com sucesso');
              } catch (error) {
                console.error('Erro ao exportar:', error);
                toast.error('Erro ao exportar relatório');
              }
            }}
            disabled={loadingIncidentes}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de consulta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={value =>
                  setFilters(prev => ({
                    ...prev,
                    status: value as typeof prev.status,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="TODOS">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Grupo</Label>
              <Select
                value={filters.grupoId}
                onValueChange={value =>
                  setFilters(prev => ({
                    ...prev,
                    grupoId: value,
                    unidadeId: ALL_UNIDADES_VALUE,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_GROUPS_VALUE}>
                    Todos os grupos
                  </SelectItem>
                  {grupos.map(grupo => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1">
              <Label>Unidade</Label>
              <Select
                value={filters.unidadeId}
                onValueChange={value =>
                  setFilters(prev => ({ ...prev, unidadeId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_UNIDADES_VALUE}>Todas</SelectItem>
                  {filteredUnidadesForFilters.map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="search-incidente">Buscar</Label>
              <Input
                id="search-incidente"
                placeholder="Busque por título ou descrição"
                value={filters.search}
                onChange={event =>
                  setFilters(prev => ({ ...prev, search: event.target.value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFilters({
                    status: 'ABERTO',
                    grupoId: ALL_GROUPS_VALUE,
                    unidadeId: ALL_UNIDADES_VALUE,
                    search: '',
                  });
                }}
              >
                Limpar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchIncidentes()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incidentes registrados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registrado em</TableHead>
                <TableHead>Conclusão</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingIncidentes ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Carregando incidentes...
                    </div>
                  </TableCell>
                </TableRow>
              ) : incidentes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum incidente encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                incidentes.map(incidente => (
                  <TableRow key={incidente.id} className="align-top">
                    <TableCell className="max-w-[240px]">
                      <div className="flex items-center gap-2">
                        {incidente.categoriaUrgencia && (
                          <div
                            className={`h-4 w-4 rounded-full ${getUrgenciaColor(incidente.categoriaUrgencia.urgenciaNivel)}`}
                            title={`${getUrgenciaLabel(incidente.categoriaUrgencia.urgenciaNivel)} - ${incidente.categoriaUrgencia.nome} (${incidente.categoriaUrgencia.prazoHoras}h)`}
                          />
                        )}
                        <span className="font-medium text-foreground">
                          {incidente.titulo}
                        </span>
                        {incidente.categoriaUrgencia && (
                          <Badge variant="outline" className="text-xs">
                            {getUrgenciaLabel(
                              incidente.categoriaUrgencia.urgenciaNivel
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
                        {incidente.descricao}
                      </p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Criado por:{' '}
                        <span className="font-medium">
                          {incidente.clienteFinal
                            ? incidente.clienteFinal.email
                            : (incidente.criadoPor?.name ?? '—')}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell>{incidente.grupo?.nome ?? '—'}</TableCell>
                    <TableCell>{formatUnidade(incidente.unidade)}</TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_STYLES[incidente.status].className}
                      >
                        {STATUS_STYLES[incidente.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">
                        {formatDateTime(incidente.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {incidente.status === 'CONCLUIDO' ? (
                        <div className="text-xs text-foreground">
                          <div>{formatDateTime(incidente.concluidoEm)}</div>
                          <div className="text-muted-foreground">
                            {incidente.concluidoPor?.name ?? '—'}
                          </div>
                          {incidente.conclusaoNotas && (
                            <p className="text-muted-foreground mt-1 italic">
                              {incidente.conclusaoNotas}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {incidente.imagemUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewImage(incidente.id)}
                            disabled={imageLoadingId === incidente.id}
                          >
                            {imageLoadingId === incidente.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ImageIcon className="mr-2 h-4 w-4" />
                            )}
                            Ver imagem inicial
                          </Button>
                        )}
                        {incidente.imagemConclusaoUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              window.open(
                                incidente.imagemConclusaoUrl!,
                                '_blank',
                                'noopener,noreferrer'
                              );
                            }}
                          >
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Ver foto conclusão
                          </Button>
                        )}

                        {incidente.status === 'ABERTO' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              handleOpenStatusModal(incidente, 'CONCLUIDO')
                            }
                            disabled={statusActionId === incidente.id}
                          >
                            {statusActionId === incidente.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Concluir
                          </Button>
                        ) : (
                          canReopen && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenStatusModal(incidente, 'ABERTO')
                              }
                              disabled={statusActionId === incidente.id}
                            >
                              {statusActionId === incidente.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Undo2 className="mr-2 h-4 w-4" />
                              )}
                              Reabrir
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!statusModal}
        onOpenChange={open => {
          if (!open) closeStatusModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusModal?.action === 'CONCLUIDO'
                ? 'Concluir incidente'
                : 'Reabrir incidente'}
            </DialogTitle>
            <DialogDescription>
              {statusModal?.action === 'CONCLUIDO'
                ? 'Confirme a conclusão. Observações e foto de prova são obrigatórias.'
                : 'Confirme para reabrir o incidente para acompanhamento adicional.'}
            </DialogDescription>
          </DialogHeader>
          {statusModal?.action === 'CONCLUIDO' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-notes">
                  Observações <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="status-notes"
                  rows={4}
                  placeholder="Descreva o que foi feito para resolver o incidente..."
                  value={statusNotes}
                  onChange={event => setStatusNotes(event.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Campo obrigatório. Descreva as ações tomadas para resolver o
                  incidente.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conclusao-imagem">
                  Foto de Prova de Conclusão{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="conclusao-imagem"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Campo obrigatório. Envie uma foto comprovando que o incidente
                  foi resolvido.
                </p>
                {conclusaoImagemPreview && (
                  <div className="mt-2 relative w-full max-h-48 rounded-md border overflow-hidden">
                    <Image
                      src={conclusaoImagemPreview}
                      alt="Preview da foto de conclusão"
                      width={800}
                      height={400}
                      className="object-contain w-full h-auto max-h-48"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeStatusModal}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!statusModal) return;
                if (statusModal.action === 'CONCLUIDO') {
                  if (!statusNotes.trim()) {
                    toast.error('Observação é obrigatória');
                    return;
                  }
                  if (!conclusaoImagem) {
                    toast.error('Imagem de prova de conclusão é obrigatória');
                    return;
                  }
                  handleStatusUpdate(
                    statusModal.id,
                    statusModal.action,
                    statusNotes.trim(),
                    conclusaoImagem
                  );
                } else {
                  handleStatusUpdate(statusModal.id, statusModal.action);
                }
                closeStatusModal();
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
