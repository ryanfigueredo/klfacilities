'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { Plus, Trash2, ChevronDown, X, RefreshCw } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

import { hasRouteAccess } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Supervisor = {
  id: string;
  name: string;
  email: string;
  whatsapp?: string | null;
};

type Grupo = {
  id: string;
  nome: string;
};

type Unidade = {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  grupoIds: string[];
};

type SupervisorScopeRow = {
  id: string;
  supervisor: Supervisor;
  grupo: Grupo | null;
  unidade: Unidade | null;
  createdAt: string;
};

type GroupedAssignment = {
  supervisor: Supervisor;
  grupos: Array<{ scopeId: string; nome: string }>;
  unidades: Array<{
    scopeId: string;
    nome: string;
    cidade?: string | null;
    estado?: string | null;
  }>;
};

export default function SupervisoresPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  const canView = hasRouteAccess(role, ['MASTER', 'ADMIN', 'OPERACIONAL']);
  const canManage = hasRouteAccess(role, ['MASTER', 'ADMIN', 'OPERACIONAL']);
  // OPERACIONAL pode ver o botão mas precisa criar solicitação ao invés de excluir diretamente
  const canDelete = hasRouteAccess(role, ['MASTER', 'ADMIN', 'OPERACIONAL']);

  const [loading, setLoading] = useState(true);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [assignments, setAssignments] = useState<SupervisorScopeRow[]>([]);
  const [contactDrafts, setContactDrafts] = useState<Record<string, string>>(
    {}
  );
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const formatWhatsappDisplay = useCallback((value?: string | null) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return value;
  }, []);

  useEffect(() => {
    if (!supervisores.length) {
      setContactDrafts({});
      return;
    }
    const mapped: Record<string, string> = {};
    supervisores.forEach(supervisor => {
      mapped[supervisor.id] = formatWhatsappDisplay(supervisor.whatsapp) || '';
    });
    setContactDrafts(mapped);
  }, [supervisores, formatWhatsappDisplay]);

  const handleContactDraftChange = useCallback((id: string, value: string) => {
    setContactDrafts(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleSaveContact = useCallback(
    async (id: string) => {
      const whatsapp = contactDrafts[id] ?? '';
      try {
        setSavingContactId(id);
        const response = await fetch(`/api/supervisores/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Erro ao atualizar contato');
        }
        const updated = data?.supervisor;
        setSupervisores(prev =>
          prev.map(supervisor =>
            supervisor.id === id
              ? { ...supervisor, whatsapp: updated?.whatsapp ?? null }
              : supervisor
          )
        );
        toast.success('Contato do supervisor atualizado');
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Erro ao atualizar contato'
        );
      } finally {
        setSavingContactId(null);
      }
    },
    [contactDrafts]
  );

  const [selectedSupervisor, setSelectedSupervisor] = useState<string | null>(
    null
  );
  const [selectedGrupoIds, setSelectedGrupoIds] = useState<string[]>([]);
  const [selectedUnidadeIds, setSelectedUnidadeIds] = useState<string[]>([]);
  const [filterTerm, setFilterTerm] = useState('');
  const [grupoSearch, setGrupoSearch] = useState('');
  const [unidadeSearch, setUnidadeSearch] = useState('');
  const [grupoPopoverOpen, setGrupoPopoverOpen] = useState(false);
  const [unidadePopoverOpen, setUnidadePopoverOpen] = useState(false);
  const [expandedSupervisores, setExpandedSupervisores] = useState<Set<string>>(
    () => new Set()
  );
  const [whatsappDialogSupervisor, setWhatsappDialogSupervisor] = useState<
    Supervisor | null
  >(null);
  const [selectedUnidadesToDelete, setSelectedUnidadesToDelete] = useState<Set<string>>(
    () => new Set()
  );

  const fetchData = useCallback(async () => {
    if (!canView) return;
    try {
      setLoading(true);
      const [supRes, gruposRes, scopesRes, unidadesRes] = await Promise.all([
        fetch('/api/supervisores/list'),
        fetch('/api/grupos'),
        fetch('/api/supervisores/scopes'),
        fetch('/api/unidades'),
      ]);

      if (supRes.ok) {
        const data = await supRes.json();
        setSupervisores(data);
      }

      if (gruposRes.ok) {
        const data = await gruposRes.json();
        const formatted: Grupo[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? ((data as any).data as any[]).map((g: any) => ({
                id: g.id,
                nome: g.nome,
              }))
            : [];
        setGrupos(formatted.sort((a, b) => a.nome.localeCompare(b.nome)));
      }

      if (scopesRes.ok) {
        const data = await scopesRes.json();
        setAssignments(data);
      }

      if (unidadesRes.ok) {
        const data = await unidadesRes.json();
        const mapped: Unidade[] = Array.isArray(data)
          ? data.map((u: any) => ({
              id: u.id,
              nome: u.nome,
              cidade: u.cidade ?? null,
              estado: u.estado ?? null,
              grupoIds: Array.isArray(u.mapeamentos)
                ? u.mapeamentos
                    .map((m: any) => m?.grupoId)
                    .filter((gid: string | undefined) => Boolean(gid))
                : [],
            }))
          : [];
        setUnidades(mapped);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados de supervisores');
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSupervisorExpanded = useCallback((id: string) => {
    setExpandedSupervisores(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleOpenWhatsappDialog = useCallback(
    (supervisor: Supervisor) => {
      setWhatsappDialogSupervisor(supervisor);
      setContactDrafts(prev => {
        if (prev[supervisor.id] !== undefined) {
          return prev;
        }
        return {
          ...prev,
          [supervisor.id]:
            formatWhatsappDisplay(supervisor.whatsapp) || '',
        };
      });
    },
    [formatWhatsappDisplay]
  );

  const groupedAssignments = useMemo<GroupedAssignment[]>(() => {
    if (!assignments.length) return [];
    const map = new Map<string, GroupedAssignment>();

    assignments.forEach(scope => {
      const key = scope.supervisor.id;
      if (!map.has(key)) {
        map.set(key, {
          supervisor: scope.supervisor,
          grupos: [],
          unidades: [],
        });
      }
      const entry = map.get(key)!;

      if (scope.grupo) {
        if (!entry.grupos.some(g => g.scopeId === scope.id)) {
          entry.grupos.push({ scopeId: scope.id, nome: scope.grupo.nome });
        }
      } else if (scope.unidade) {
        entry.unidades.push({
          scopeId: scope.id,
          nome: scope.unidade.nome,
          cidade: scope.unidade.cidade,
          estado: scope.unidade.estado,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.supervisor.name.localeCompare(b.supervisor.name)
    );
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    if (!filterTerm) return groupedAssignments;
    const term = filterTerm.toLowerCase();
    return groupedAssignments.filter(item => {
      const supervisorText =
        `${item.supervisor.name} ${item.supervisor.email}`.toLowerCase();
      if (supervisorText.includes(term)) return true;
      if (item.grupos.some(grupo => grupo.nome.toLowerCase().includes(term))) {
        return true;
      }
      if (
        item.unidades.some(unidade =>
          `${unidade.nome} ${unidade.cidade ?? ''} ${unidade.estado ?? ''}`
            .toLowerCase()
            .includes(term)
        )
      ) {
        return true;
      }
      return false;
    });
  }, [groupedAssignments, filterTerm]);

  const filteredGruposList = useMemo(() => {
    if (!grupoSearch) return grupos;
    const term = grupoSearch.toLowerCase();
    return grupos.filter(grupo => grupo.nome.toLowerCase().includes(term));
  }, [grupos, grupoSearch]);

  const filteredUnidadesList = useMemo(() => {
    const baseList =
      selectedGrupoIds.length === 0
        ? unidades
        : unidades.filter(unidade =>
            unidade.grupoIds.some(grupoId =>
              selectedGrupoIds.includes(grupoId)
            )
          );

    if (!unidadeSearch) return baseList;
    const term = unidadeSearch.toLowerCase();
    return baseList.filter(unidade =>
      `${unidade.nome} ${unidade.cidade ?? ''} ${unidade.estado ?? ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [unidades, unidadeSearch, selectedGrupoIds]);

  useEffect(() => {
    if (!selectedGrupoIds.length) return;
    setSelectedUnidadeIds(prev => {
      // Remover duplicatas e filtrar unidades que pertencem aos grupos selecionados
      const unique = Array.from(new Set(prev));
      return unique.filter(id => {
        const unidade = unidades.find(u => u.id === id);
        if (!unidade) return false;
        return unidade.grupoIds.some(grupoId =>
          selectedGrupoIds.includes(grupoId)
        );
      });
    });
  }, [selectedGrupoIds, unidades]);

  const closeWhatsappDialog = useCallback(() => {
    setWhatsappDialogSupervisor(null);
  }, []);

  const handleCreateAssignment = async () => {
    if (!canManage) return;

    if (!selectedSupervisor) {
      toast.error('Selecione um supervisor');
      return;
    }

    // Remover duplicatas dos arrays antes de enviar
    const grupoIdsUnicos = Array.from(new Set(selectedGrupoIds));
    const unidadeIdsUnicos = Array.from(new Set(selectedUnidadeIds));

    if (!grupoIdsUnicos.length && !unidadeIdsUnicos.length) {
      toast.error('Selecione ao menos um grupo ou unidade');
      return;
    }

    try {
      const response = await fetch('/api/supervisores/scopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisorId: selectedSupervisor,
          grupoIds: grupoIdsUnicos,
          unidadeIds: unidadeIdsUnicos,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao vincular supervisor');
      }

      await fetchData();
      const createdCount = Array.isArray(data?.created)
        ? data.created.length
        : 0;
      const skippedGrupos = data?.skipped?.grupos?.length ?? 0;
      const skippedUnidades = data?.skipped?.unidades?.length ?? 0;

      if (createdCount) {
        toast.success(
          `${createdCount} vínculo${createdCount > 1 ? 's' : ''} criado${
            createdCount > 1 ? 's' : ''
          } com sucesso`
        );
      } else if (skippedGrupos || skippedUnidades) {
        toast.success('Todos os vínculos selecionados já existiam');
      } else {
        toast.success('Nada para atualizar');
      }

      setSelectedGrupoIds([]);
      setSelectedUnidadeIds([]);
      setGrupoSearch('');
      setUnidadeSearch('');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao vincular supervisor'
      );
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!canManage) return;
    try {
      // Se for OPERACIONAL, criar solicitação de exclusão
      if (role === 'OPERACIONAL') {
        const response = await fetch('/api/config/solicitacoes-exclusao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'supervisor-scope',
            resourceId: assignmentId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao solicitar exclusão');
        }

        toast.success('Solicitação de exclusão enviada. Aguardando aprovação do MASTER.');
        return;
      }

      // MASTER e ADMIN podem excluir diretamente
      const response = await fetch(`/api/supervisores/scopes/${assignmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erro ao remover vínculo');
      }
      await fetchData();
      toast.success('Vínculo removido');
    } catch (error) {
      toast.error('Erro ao remover vínculo');
    }
  };

  const handleToggleUnidadeSelection = useCallback((scopeId: string) => {
    setSelectedUnidadesToDelete(prev => {
      const next = new Set(prev);
      if (next.has(scopeId)) {
        next.delete(scopeId);
      } else {
        next.add(scopeId);
      }
      return next;
    });
  }, []);

  const handleDeleteMultiple = async () => {
    if (!canManage || selectedUnidadesToDelete.size === 0) return;
    
    const scopeIds = Array.from(selectedUnidadesToDelete);
    
    try {
      // Se for OPERACIONAL, criar solicitações de exclusão
      if (role === 'OPERACIONAL') {
        const promises = scopeIds.map(scopeId =>
          fetch('/api/config/solicitacoes-exclusao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: 'supervisor-scope',
              resourceId: scopeId,
            }),
          })
        );

        const responses = await Promise.all(promises);
        const errors = responses.filter(r => !r.ok);
        
        if (errors.length > 0) {
          throw new Error(`Erro ao solicitar exclusão de ${errors.length} vínculo(s)`);
        }

        toast.success(`${scopeIds.length} solicitação(ões) de exclusão enviada(s). Aguardando aprovação do MASTER.`);
        setSelectedUnidadesToDelete(new Set());
        return;
      }

      // MASTER e ADMIN podem excluir diretamente
      const response = await fetch('/api/supervisores/scopes/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover vínculos');
      }

      await fetchData();
      toast.success(`${scopeIds.length} vínculo(s) removido(s) com sucesso`);
      setSelectedUnidadesToDelete(new Set());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao remover vínculos'
      );
    }
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso negado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Supervisores</h1>
          <p className="text-muted-foreground">
            Vincule supervisores a grupos e unidades para limitar o acesso às
            suas regiões
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Vínculo</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            No app (checklists e pontos), o supervisor vê apenas as <strong>unidades</strong> vinculadas. Se vincular só por grupo, ele verá todas as lojas do grupo. Para restringir a lojas específicas (ex.: Itapevi, Tamboré), vincule pelas unidades.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select
                value={selectedSupervisor ?? undefined}
                onValueChange={value => setSelectedSupervisor(value)}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisores.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grupos (opcional)</Label>
              <Popover
                open={grupoPopoverOpen}
                onOpenChange={setGrupoPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={!canManage || grupos.length === 0}
                  >
                    <span>
                      {selectedGrupoIds.length
                        ? `${selectedGrupoIds.length} grupo${
                            selectedGrupoIds.length > 1 ? 's' : ''
                          } selecionado${
                            selectedGrupoIds.length > 1 ? 's' : ''
                          }`
                        : 'Selecionar grupos'}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] space-y-2 p-2">
                  <Input
                    placeholder="Buscar grupo..."
                    value={grupoSearch}
                    onChange={e => setGrupoSearch(e.target.value)}
                    className="h-8"
                    disabled={!grupos.length}
                  />
                  <div className="max-h-60 overflow-auto rounded border">
                    {filteredGruposList.length ? (
                      filteredGruposList.map(grupo => {
                        const checked = selectedGrupoIds.includes(grupo.id);
                        return (
                          <button
                            key={grupo.id}
                            type="button"
                            onClick={() =>
                              setSelectedGrupoIds(prev => {
                                // Remover duplicatas e garantir que só adiciona se não existir
                                const unique = Array.from(new Set(prev));
                                if (checked) {
                                  return unique.filter(id => id !== grupo.id);
                                }
                                if (unique.includes(grupo.id)) {
                                  return unique; // Já existe, não adiciona
                                }
                                return [...unique, grupo.id];
                              })
                            }
                            className={cn(
                              'flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-muted',
                              checked && 'bg-muted'
                            )}
                          >
                            <span>{grupo.nome}</span>
                            {checked && (
                              <Badge variant="secondary">selecionado</Badge>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-2 py-3 text-sm text-muted-foreground">
                        Nenhum grupo encontrado
                      </p>
                    )}
                  </div>
                  {selectedGrupoIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedGrupoIds([])}
                    >
                      <X className="mr-1 h-4 w-4" />
                      limpar seleção
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
              {selectedGrupoIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedGrupoIds.map(id => {
                    const grupo = grupos.find(g => g.id === id);
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <span>{grupo?.nome ?? 'Grupo removido'}</span>
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:text-foreground"
                          onClick={() =>
                            setSelectedGrupoIds(prev =>
                              prev.filter(value => value !== id)
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Unidades (opcional)</Label>
              <Popover
                open={unidadePopoverOpen}
                onOpenChange={setUnidadePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={!canManage || unidades.length === 0}
                  >
                    <span>
                      {selectedUnidadeIds.length
                        ? `${selectedUnidadeIds.length} unidade${
                            selectedUnidadeIds.length > 1 ? 's' : ''
                          } selecionada${
                            selectedUnidadeIds.length > 1 ? 's' : ''
                          }`
                        : 'Selecionar unidades'}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] space-y-2 p-2">
                  <Input
                    placeholder="Buscar unidade..."
                    value={unidadeSearch}
                    onChange={e => setUnidadeSearch(e.target.value)}
                    className="h-8"
                    disabled={!unidades.length}
                  />
                  <div className="max-h-60 overflow-auto rounded border">
                    {filteredUnidadesList.length ? (
                      filteredUnidadesList.map(unidade => {
                        const checked = selectedUnidadeIds.includes(unidade.id);
                        return (
                          <button
                            key={unidade.id}
                            type="button"
                            onClick={() =>
                              setSelectedUnidadeIds(prev => {
                                // Remover duplicatas e garantir que só adiciona se não existir
                                const unique = Array.from(new Set(prev));
                                if (checked) {
                                  return unique.filter(id => id !== unidade.id);
                                }
                                if (unique.includes(unidade.id)) {
                                  return unique; // Já existe, não adiciona
                                }
                                return [...unique, unidade.id];
                              })
                            }
                            className={cn(
                              'flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-muted',
                              checked && 'bg-muted'
                            )}
                          >
                            <span>
                              {unidade.nome}
                              {unidade.cidade
                                ? ` — ${unidade.cidade}${
                                    unidade.estado ? `/${unidade.estado}` : ''
                                  }`
                                : ''}
                            </span>
                            {checked && (
                              <Badge variant="secondary">selecionada</Badge>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-2 py-3 text-sm text-muted-foreground">
                        Nenhuma unidade encontrada
                      </p>
                    )}
                  </div>
                  {selectedUnidadeIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUnidadeIds([])}
                    >
                      <X className="mr-1 h-4 w-4" />
                      limpar seleção
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
              {selectedUnidadeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedUnidadeIds.map(id => {
                    const unidade = unidades.find(u => u.id === id);
                    return (
                      <Badge
                        key={id}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <span>
                          {unidade?.nome ?? 'Unidade removida'}
                          {unidade?.cidade
                            ? ` — ${unidade.cidade}${
                                unidade.estado ? `/${unidade.estado}` : ''
                              }`
                            : ''}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:text-foreground"
                          onClick={() =>
                            setSelectedUnidadeIds(prev =>
                              prev.filter(value => value !== id)
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreateAssignment}
              disabled={
                !canManage ||
                !selectedSupervisor ||
                (selectedGrupoIds.length === 0 &&
                  selectedUnidadeIds.length === 0)
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Vincular Supervisor
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vínculos Ativos</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchData();
                toast.success('Vínculos atualizados com sucesso');
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Vínculos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Filtrar por supervisor, grupo, cidade..."
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
          />

          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : filteredAssignments.length === 0 ? (
            <p className="text-muted-foreground">Nenhum vínculo cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Grupos</TableHead>
                  <TableHead className="w-24 text-center">WhatsApp</TableHead>
                  <TableHead>Unidades específicas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map(item => {
                  const supervisorHasWhatsapp = Boolean(
                    item.supervisor.whatsapp &&
                      item.supervisor.whatsapp.trim().length > 0
                  );
                  const isExpanded = expandedSupervisores.has(
                    item.supervisor.id
                  );
                  return (
                    <TableRow key={item.supervisor.id} className="align-top">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="font-medium">
                              {item.supervisor.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.supervisor.email}
                            </div>
                          </div>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Tem certeza que deseja desativar o supervisor ${item.supervisor.name}? Os registros históricos (checklists, pontos, etc.) serão mantidos, mas ele não aparecerá mais nas listas ativas.`
                                  )
                                ) {
                                  return;
                                }
                                try {
                                  const response = await fetch(
                                    `/api/supervisores/${item.supervisor.id}`,
                                    { method: 'DELETE' }
                                  );
                                  if (!response.ok) {
                                    const errorData = await response
                                      .json()
                                      .catch(() => ({}));
                                    throw new Error(
                                      errorData.error ||
                                        'Erro ao desativar supervisor'
                                    );
                                  }
                                  toast.success(
                                    'Supervisor desativado com sucesso'
                                  );
                                  await fetchData();
                                } catch (error) {
                                  console.error(
                                    'Erro ao desativar supervisor:',
                                    error
                                  );
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : 'Erro ao desativar supervisor'
                                  );
                                }
                              }}
                              title="Desativar supervisor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.grupos.length ? (
                          <div className="flex flex-wrap gap-2">
                            {item.grupos.map(grupo => (
                              <div
                                key={grupo.scopeId}
                                className="flex items-center gap-1"
                              >
                                <Badge variant="secondary">{grupo.nome}</Badge>
                                {canManage && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleDelete(grupo.scopeId)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-9 w-9 rounded-full border border-border hover:border-white',
                            supervisorHasWhatsapp
                              ? 'text-green-600 hover:text-white hover:bg-green-600'
                              : 'text-muted-foreground hover:text-white hover:bg-muted-foreground'
                          )}
                          onClick={() => handleOpenWhatsappDialog(item.supervisor)}
                          title="Editar WhatsApp"
                        >
                          {supervisorHasWhatsapp ? (
                            <WhatsAppIcon className="h-5 w-5" size={20} />
                          ) : (
                            <WhatsAppIcon className="h-5 w-5 opacity-50" size={20} />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {item.unidades.length}{' '}
                            {item.unidades.length === 1
                              ? 'unidade'
                              : 'unidades'}
                          </Badge>
                          {item.unidades.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleSupervisorExpanded(item.supervisor.id)
                              }
                            >
                              {isExpanded ? 'Ocultar' : 'Ver unidades'}
                            </Button>
                          )}
                        </div>
                        {isExpanded && item.unidades.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {selectedUnidadesToDelete.size > 0 && (
                              <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <span className="text-sm font-medium">
                                  {selectedUnidadesToDelete.size} unidade(s) selecionada(s)
                                </span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedUnidadesToDelete(new Set())}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDeleteMultiple}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Excluir selecionadas
                                  </Button>
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {item.unidades.map(unidade => {
                                const isSelected = selectedUnidadesToDelete.has(unidade.scopeId);
                                return (
                                  <div
                                    key={unidade.scopeId}
                                    className="flex items-center gap-1"
                                  >
                                    {canManage ? (
                                      <label
                                        className={cn(
                                          "flex items-center gap-2 cursor-pointer rounded-full border transition-all px-3 py-1.5",
                                          isSelected
                                            ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1"
                                            : "border-border hover:bg-muted/50"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() =>
                                            handleToggleUnidadeSelection(unidade.scopeId)
                                          }
                                          className="sr-only"
                                        />
                                        <span className={cn(
                                          "text-sm",
                                          isSelected && "text-primary font-medium"
                                        )}>
                                          {unidade.nome}
                                          {unidade.cidade
                                            ? ` — ${unidade.cidade}${
                                                unidade.estado
                                                  ? `/${unidade.estado}`
                                                  : ''
                                              }`
                                            : ''}
                                        </span>
                                      </label>
                                    ) : (
                                      <Badge variant="outline">
                                        {unidade.nome}
                                        {unidade.cidade
                                          ? ` — ${unidade.cidade}${
                                              unidade.estado
                                                ? `/${unidade.estado}`
                                                : ''
                                            }`
                                          : ''}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(whatsappDialogSupervisor)}
        onOpenChange={open => {
          if (!open) {
            closeWhatsappDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp do supervisor</DialogTitle>
            <DialogDescription>
              Defina o número que será utilizado nas comunicações com este supervisor.
            </DialogDescription>
          </DialogHeader>

          {whatsappDialogSupervisor && (
            <>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">
                    {whatsappDialogSupervisor.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {whatsappDialogSupervisor.email}
                  </p>
                </div>
                <Input
                  autoFocus
                  placeholder="(11) 99999-9999"
                  value={
                    contactDrafts[whatsappDialogSupervisor.id] ??
                    formatWhatsappDisplay(whatsappDialogSupervisor.whatsapp) ??
                    ''
                  }
                  onChange={e =>
                    handleContactDraftChange(
                      whatsappDialogSupervisor.id,
                      e.target.value
                    )
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingContactId === whatsappDialogSupervisor.id}
                  onClick={closeWhatsappDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={savingContactId === whatsappDialogSupervisor.id}
                  onClick={async () => {
                    await handleSaveContact(whatsappDialogSupervisor.id);
                    closeWhatsappDialog();
                  }}
                >
                  {savingContactId === whatsappDialogSupervisor.id
                    ? 'Salvando...'
                    : 'Salvar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
