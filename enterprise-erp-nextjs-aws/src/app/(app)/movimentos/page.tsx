'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { MovFormDialog } from '@/components/movimentos/MovFormDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import FolhaImportDialog from '@/components/movimentos/FolhaImportDialog';
import { toast } from 'sonner';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UploadMovimentosButton from '@/components/movimentos/UploadMovimentosButton';
import { FilterBar } from '@/components/filters/FilterBar';
import { currentMonthRange } from '@/lib/date-range';

interface Movimento {
  id: string;
  tipo: 'RECEITA' | 'DESPESA';
  dataLanc: Date;
  competencia: Date;
  descricao: string;
  grupoId: string | null;
  grupo: { nome: string } | null;
  unidadeId: string | null;
  unidade: { nome: string } | null;
  categoria: string | null;
  subcategoria: string | null;
  centroCusto: string | null;
  documento: string | null;
  formaPagamento: string | null;
  valor: any; // Prisma Decimal
  valorAssinado: any; // Prisma Decimal
  criadoPor: { name: string };
  criadoEm: Date;
}

export const dynamic = 'force-dynamic';

function MovimentosPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // Proteção: RH não pode acessar movimentos
  useEffect(() => {
    if (session?.user?.role === 'RH') {
      router.replace('/ponto/admin');
    } else if (session?.user?.role && !['ADMIN'].includes(session.user.role)) {
      router.replace('/dashboard');
    }
  }, [session, router]);
  
  // Hooks devem ser chamados antes de qualquer return condicional
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const DEFAULT_LIMIT = 25;
  const GROUP_LIMIT = 500; // limite seguro para evitar timeouts
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<
    null | (Partial<Movimento> & { id: string })
  >(null);
  const [folhaOpen, setFolhaOpen] = useState(false);
  const [filterGrupo, setFilterGrupo] = useState<null | {
    id: string;
    nome: string;
  }>(null);
  const [groupByGrupo, setGroupByGrupo] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Permissões
  const canDelete =
    (session?.user?.email || '').toLowerCase().trim() ===
    'ryan@klfacilities.com.br';
  const canEdit = session?.user?.role === 'ADMIN';

  const carregarMovimentos = async (opts?: {
    page?: number;
    append?: boolean;
  }) => {
    try {
      const isAppend = Boolean(opts?.append);
      if (isAppend) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const currentPage = opts?.page ?? 1;
      const qs = new URLSearchParams(searchParams.toString());
      qs.set('page', String(currentPage));
      qs.set('limit', String(groupByGrupo ? GROUP_LIMIT : DEFAULT_LIMIT));
      if (filterGrupo?.id) qs.set('grupoId', filterGrupo.id);
      const response = await fetch(`/api/movimentos?${qs.toString()}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API /movimentos ${response.status}: ${text}`);
      }
      const result = await response.json();

      if (result.success && result.movimentos) {
        const movimentosProcessados = result.movimentos.map(
          (movimento: any) => ({
            ...movimento,
            dataLanc: new Date(movimento.dataLanc),
            competencia: new Date(movimento.competencia),
            criadoEm: new Date(movimento.criadoEm),
          })
        );
        setMovimentos(prev =>
          isAppend ? [...prev, ...movimentosProcessados] : movimentosProcessados
        );
        setPage(result.currentPage || currentPage);
        setPages(result.pages || 1);
        setTotal(result.total || 0);
      } else {
        setError(result.error || 'Erro ao carregar movimentos');
      }
    } catch (err) {
      setError('Erro ao carregar movimentos');
      console.error('Erro ao carregar movimentos:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Recarrega ao alterar filtros na URL, filtro de grupo local, ou agrupamento
  useEffect(() => {
    carregarMovimentos();
  }, [searchParams, filterGrupo?.id, groupByGrupo]);

  // Default para mês atual quando não há from/to na URL
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!from && !to) {
      const r = currentMonthRange();
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', r.from!.toISOString().slice(0, 10));
      params.set('to', r.to!.toISOString().slice(0, 10));
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, router, pathname]);

  const formatarValor = (valor: any) => {
    const numValor =
      typeof valor === 'string' ? parseFloat(valor) : Number(valor);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(numValor));
  };

  const formatarData = (data: Date) => {
    // Garantir que a data seja tratada corretamente
    const dataObj = data instanceof Date ? data : new Date(data);
    return format(dataObj, 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusColor = (tipo: 'RECEITA' | 'DESPESA') => {
    return tipo === 'RECEITA' ? 'bg-green-500' : 'bg-red-500';
  };

  const getValorColor = (tipo: 'RECEITA' | 'DESPESA') => {
    return tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600';
  };

  const getValorPrefix = (tipo: 'RECEITA' | 'DESPESA') => {
    return tipo === 'RECEITA' ? '+' : '-';
  };

  const grupos = useMemo(() => {
    if (!groupByGrupo)
      return [] as { id: string; nome: string; items: Movimento[] }[];
    const map = new Map<
      string,
      { id: string; nome: string; items: Movimento[] }
    >();
    for (const mov of movimentos) {
      const id = mov.grupoId ?? '__sem_grupo';
      const nome = mov.grupo?.nome ?? 'Não vinculado';
      if (!map.has(id)) map.set(id, { id, nome, items: [] });
      map.get(id)!.items.push(mov);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => a.nome.localeCompare(b.nome));
    return arr;
  }, [movimentos, groupByGrupo]);

  // Se RH tentar acessar, não renderizar nada enquanto redireciona
  // (deve ser depois de todos os hooks)
  if (session?.user?.role === 'RH') {
    return null;
  }

  const toggleExpanded = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteMovimento = async (id: string) => {
    try {
      const response = await fetch(`/api/movimentos?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir movimento');
      }

      toast.success('Movimento excluído com sucesso');
      carregarMovimentos(); // Recarregar a lista
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao excluir movimento';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Movimentos"
        description="Gerencie todos os lançamentos financeiros"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFolhaOpen(true)}>
              Importar Folha
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Movimento
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <Card>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => carregarMovimentos({ page: 1, append: false })}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Atualizar
                </Button>

                <UploadMovimentosButton
                  onImported={() => carregarMovimentos({ page: 1 })}
                />

                {filterGrupo && (
                  <Button
                    variant="secondary"
                    onClick={() => setFilterGrupo(null)}
                    title={`Limpar filtro de grupo: ${filterGrupo.nome}`}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Grupo: {filterGrupo.nome}
                  </Button>
                )}
              </div>

              {/* Reusable filter bar (q, date range, unidades, categorias) */}
              <MovimentosFilters
                onApplied={() => carregarMovimentos({ page: 1 })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Movimentos List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Todos os Lançamentos {total ? `(${total})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg border animate-pulse"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-48" />
                        <div className="h-3 bg-gray-300 rounded w-32" />
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-24" />
                      <div className="h-3 bg-gray-300 rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => carregarMovimentos({ page: 1 })}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : movimentos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum movimento encontrado
                </p>
              </div>
            ) : groupByGrupo ? (
              <div className="space-y-2">
                {grupos.map(g => {
                  const isOpen = expanded[g.id] ?? false;
                  const totalGrupo = g.items.reduce(
                    (acc: number, it: Movimento) =>
                      acc + Math.abs(Number(it.valor)),
                    0
                  );
                  return (
                    <div key={g.id} className="rounded-lg border">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(g.id)}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {g.nome}{' '}
                            <span className="text-muted-foreground">
                              ({g.items.length})
                            </span>
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(totalGrupo)}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="space-y-2 p-2">
                          {g.items.map((movimento: Movimento) => (
                            <div
                              key={movimento.id}
                              className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-3 h-3 rounded-full ${getStatusColor(movimento.tipo)}`}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    {movimento.grupo?.nome &&
                                      movimento.grupoId && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFilterGrupo({
                                              id: movimento.grupoId!,
                                              nome: movimento.grupo!.nome,
                                            })
                                          }
                                          className="px-2 py-0.5 text-xs rounded-full bg-muted text-foreground/80 hover:bg-accent"
                                          title={`Filtrar por grupo: ${movimento.grupo.nome}`}
                                        >
                                          {movimento.grupo.nome}
                                        </button>
                                      )}
                                    {movimento.unidade?.nome && (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-foreground/80">
                                        {movimento.unidade.nome}
                                      </span>
                                    )}
                                  </div>
                                  {(() => {
                                    const isImported =
                                      (movimento.descricao || '')
                                        .trim()
                                        .toLowerCase() === 'importado do csv';
                                    const title = isImported
                                      ? movimento.categoria ||
                                        movimento.descricao ||
                                        'Sem descrição'
                                      : movimento.descricao || 'Sem descrição';
                                    return (
                                      <>
                                        <p className="font-medium mt-1">
                                          {title}
                                        </p>
                                        {movimento.categoria && (
                                          <p className="text-sm text-muted-foreground">
                                            Categoria: {movimento.categoria}
                                          </p>
                                        )}
                                        {isImported &&
                                          (movimento as any).responsavel && (
                                            <p className="text-sm text-muted-foreground">
                                              Funcionário:{' '}
                                              {(movimento as any).responsavel}
                                            </p>
                                          )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p
                                    className={`font-medium ${getValorColor(movimento.tipo)}`}
                                  >
                                    {getValorPrefix(movimento.tipo)}
                                    {formatarValor(movimento.valor)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatarData(movimento.dataLanc)}
                                  </p>
                                </div>
                                {canEdit && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditing({
                                        id: movimento.id,
                                        tipo: movimento.tipo,
                                        descricao: movimento.descricao,
                                        valor: Number(movimento.valor),
                                        data: format(
                                          movimento.dataLanc,
                                          'yyyy-MM-dd'
                                        ),
                                        grupoId: movimento.grupoId || undefined,
                                        unidadeId:
                                          movimento.unidadeId || undefined,
                                        formaPagamento:
                                          movimento.formaPagamento || undefined,
                                        categoriaId:
                                          (movimento as any).categoriaId ||
                                          undefined,
                                        responsavelId:
                                          (movimento as any).responsavel ||
                                          undefined,
                                      } as any);
                                      setEditOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <ConfirmDialog
                                    title="Excluir Movimento"
                                    description="Tem certeza que deseja excluir este movimento? Esta ação não pode ser desfeita."
                                    onConfirm={() =>
                                      handleDeleteMovimento(movimento.id)
                                    }
                                  >
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </ConfirmDialog>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {page < pages && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        carregarMovimentos({ page: page + 1, append: true })
                      }
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Carregando...' : 'Carregar mais'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {movimentos.map(movimento => (
                  <div
                    key={movimento.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(movimento.tipo)}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          {movimento.grupo?.nome && movimento.grupoId && (
                            <button
                              type="button"
                              onClick={() =>
                                setFilterGrupo({
                                  id: movimento.grupoId!,
                                  nome: movimento.grupo!.nome,
                                })
                              }
                              className="px-2 py-0.5 text-xs rounded-full bg-muted text-foreground/80 hover:bg-accent"
                              title={`Filtrar por grupo: ${movimento.grupo.nome}`}
                            >
                              {movimento.grupo.nome}
                            </button>
                          )}
                          {movimento.unidade?.nome && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-foreground/80">
                              {movimento.unidade.nome}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const isImported =
                            (movimento.descricao || '').trim().toLowerCase() ===
                            'importado do csv';
                          const title = isImported
                            ? movimento.categoria ||
                              movimento.descricao ||
                              'Sem descrição'
                            : movimento.descricao || 'Sem descrição';
                          return (
                            <>
                              <p className="font-medium mt-1">{title}</p>
                              {movimento.categoria && (
                                <p className="text-sm text-muted-foreground">
                                  Categoria: {movimento.categoria}
                                </p>
                              )}
                              {isImported && (movimento as any).responsavel && (
                                <p className="text-sm text-muted-foreground">
                                  Funcionário: {(movimento as any).responsavel}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`font-medium ${getValorColor(movimento.tipo)}`}
                        >
                          {getValorPrefix(movimento.tipo)}
                          {formatarValor(movimento.valor)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatarData(movimento.dataLanc)}
                        </p>
                      </div>
                      {/* Ações */}
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing({
                              id: movimento.id,
                              tipo: movimento.tipo,
                              descricao: movimento.descricao,
                              valor: Number(movimento.valor),
                              data: format(movimento.dataLanc, 'yyyy-MM-dd'),
                              grupoId: movimento.grupoId || undefined,
                              unidadeId: movimento.unidadeId || undefined,
                              formaPagamento:
                                movimento.formaPagamento || undefined,
                              categoriaId:
                                (movimento as any).categoriaId || undefined,
                              responsavelId:
                                (movimento as any).responsavel || undefined,
                            } as any);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <ConfirmDialog
                          title="Excluir Movimento"
                          description="Tem certeza que deseja excluir este movimento? Esta ação não pode ser desfeita."
                          onConfirm={() => handleDeleteMovimento(movimento.id)}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDialog>
                      )}
                    </div>
                  </div>
                ))}
                {page < pages && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        carregarMovimentos({ page: page + 1, append: true })
                      }
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Carregando...' : 'Carregar mais'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Dialog para criar movimento */}
      <MovFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <FolhaImportDialog open={folhaOpen} onOpenChange={setFolhaOpen} />
      {/* Dialog para editar movimento (ADMIN) */}
      {canEdit && (
        <MovFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          initialData={editing as any}
        />
      )}
    </div>
  );
}

export default function MovimentosPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      }
    >
      <MovimentosPageInner />
    </Suspense>
  );
}

type Option = { label: string; value: string };

function MovimentosFilters({ onApplied }: { onApplied?: () => void }) {
  const searchParams = useSearchParams();
  const [units, setUnits] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [groups, setGroups] = useState<Option[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/catalogos');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        const g: Option[] = (data.grupos || []).map((x: any) => ({
          label: x.nome,
          value: x.id,
        }));
        const u: Option[] = (data.unidades || []).map((x: any) => ({
          label: x.nome,
          value: x.id,
        }));
        const c: Option[] = (data.categorias || []).map((x: any) => ({
          label: x.nome,
          value: x.id,
        }));
        setGroups(g);
        setUnits(u);
        setCategories(c);
      } catch {}
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const fromStr = searchParams.get('from') || undefined;
  const toStr = searchParams.get('to') || undefined;
  const initial = {
    q: searchParams.get('q') || searchParams.get('search') || undefined,
    range:
      fromStr || toStr
        ? {
            from: fromStr ? new Date(`${fromStr}T00:00:00`) : undefined,
            to: toStr ? new Date(`${toStr}T00:00:00`) : undefined,
          }
        : undefined,
    groupIds: (() => {
      const many = searchParams.getAll('grupoId');
      return many && many.length ? many : undefined;
    })(),
    unidadeIds: (() => {
      const csv = searchParams.get('unidades');
      if (csv)
        return csv
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      const many = searchParams.getAll('unidadeId');
      return many && many.length ? many : undefined;
    })(),
    categoriaIds: (() => {
      const csv = searchParams.get('categorias');
      if (csv)
        return csv
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      const many = searchParams.getAll('categoriaId');
      return many && many.length ? many : undefined;
    })(),
  } as any;

  return (
    <FilterBar
      groups={groups}
      units={units}
      categories={categories}
      initial={initial}
      onApply={() => onApplied?.()}
    />
  );
}
