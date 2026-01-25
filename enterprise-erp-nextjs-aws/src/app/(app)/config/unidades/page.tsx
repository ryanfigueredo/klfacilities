'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Search, Building2, Pencil, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { hasRouteAccess } from '@/lib/rbac';
import NovaUnidadeDialog from './_components/NovaUnidadeDialog';
import EditarCoordenadasDialog from './_components/EditarCoordenadasDialog';
import UnidadesMap from '@/components/maps/UnidadesMap';
import type { UnidadeRow } from '@/types/unidades';

// Estados brasileiros com siglas
const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

type ApiResult = {
  rows: UnidadeRow[];
  page: number;
  pageSize: number;
  total: number;
};

function UnidadesPageInner() {
  const { data: session } = useSession();
  const userRole = session?.user?.role as
    | 'MASTER'
    | 'ADMIN'
    | 'RH'
    | 'SUPERVISOR'
    | 'OPERACIONAL'
    | undefined;
  const router = useRouter();
  const sp = useSearchParams();
  const [rows, setRows] = useState<UnidadeRow[]>([]);
  const [allUnidadesForMap, setAllUnidadesForMap] = useState<UnidadeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<UnidadeRow | null>(null);
  const [editNome, setEditNome] = useState<string>('');
  const [editGrupoId, setEditGrupoId] = useState<string>('');
  const [editCidade, setEditCidade] = useState<string>('');
  const [editEstado, setEditEstado] = useState<string>('');
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  const [editCoordenadasRow, setEditCoordenadasRow] =
    useState<UnidadeRow | null>(null);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [responsaveis, setResponsaveis] = useState<
    { id: string; nome: string }[]
  >([]);

  // Filtrar estados que têm unidades disponíveis
  const estadosDisponiveis = useMemo(() => {
    const estadosComUnidades = new Set(
      rows.map(r => r.estado).filter((e): e is string => Boolean(e))
    );
    return ESTADOS_BRASIL.filter(estado =>
      estadosComUnidades.has(estado.sigla)
    );
  }, [rows]);

  // MASTER tem acesso total, ADMIN e OPERACIONAL podem editar, RH e SUPERVISOR apenas visualizar
  const canEdit = hasRouteAccess(
    userRole as
      | 'MASTER'
      | 'ADMIN'
      | 'RH'
      | 'SUPERVISOR'
      | 'OPERACIONAL'
      | undefined,
    ['MASTER', 'ADMIN', 'OPERACIONAL']
  );
  const canView = hasRouteAccess(
    userRole as
      | 'MASTER'
      | 'ADMIN'
      | 'RH'
      | 'SUPERVISOR'
      | 'OPERACIONAL'
      | undefined,
    ['MASTER', 'ADMIN', 'RH', 'OPERACIONAL']
  );
  // OPERACIONAL pode ver o botão mas precisa criar solicitação ao invés de excluir diretamente
  const canDelete = hasRouteAccess(
    userRole as
      | 'MASTER'
      | 'ADMIN'
      | 'RH'
      | 'SUPERVISOR'
      | 'OPERACIONAL'
      | undefined,
    ['MASTER', 'ADMIN', 'OPERACIONAL']
  );

  const q = sp.get('q') ?? '';
  const grupoId = sp.get('grupoId') ?? '';
  const responsavelId = sp.get('responsavelId') ?? '';
  const cidade = sp.get('cidade') ?? '';
  const coordenadas = sp.get('coordenadas') ?? 'todas'; // 'todas', 'com', 'sem'
  const status = sp.get('status') ?? 'todas';
  const sort = sp.get('sort') ?? 'unidade';
  const order = sp.get('order') ?? 'asc';
  const page = Number(sp.get('page') ?? 1);
  const pageSize = Number(sp.get('pageSize') ?? 25);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (grupoId) p.set('grupoId', grupoId);
    if (responsavelId) p.set('responsavelId', responsavelId);
    if (cidade) p.set('cidade', cidade);
    if (coordenadas !== 'todas') p.set('coordenadas', coordenadas);
    if (status !== 'todas') p.set('status', status);
    if (sort !== 'unidade') p.set('sort', sort);
    if (order !== 'asc') p.set('order', order);
    if (page !== 1) p.set('page', String(page));
    if (pageSize !== 25) p.set('pageSize', String(pageSize));
    return p.toString();
  }, [
    q,
    grupoId,
    responsavelId,
    cidade,
    coordenadas,
    status,
    sort,
    order,
    page,
    pageSize,
  ]);

  const onHeaderSort = (
    col: 'unidade' | 'grupo' | 'cidade' | 'estado' | 'createdAt'
  ) => {
    const nextOrder = sort === col && order === 'asc' ? 'desc' : 'asc';
    const p = new URLSearchParams(sp.toString());
    p.set('sort', col);
    p.set('order', nextOrder);
    p.delete('page'); // reset de página ao mudar a ordenação
    router.push(`/config/unidades?${p.toString()}`);
  };

  const setParam = (k: string, v?: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (!v || v === '') p.delete(k);
    else p.set(k, v);
    if (k !== 'page') p.delete('page');
    router.push(`/config/unidades?${p.toString()}`);
  };

  useEffect(() => {
    if (!canView) return;
    setLoading(true);
    setErrorMsg(null);
    const controller = new AbortController();
    let isMounted = true;

    (async () => {
      try {
        // Buscar todas as unidades para o mapa (sem filtros)
        const allUnidadesPromise = fetch(
          '/api/unidades?view=table&status=todas&includeUnlinked=true&pageSize=1000',
          {
            signal: controller.signal,
          }
        );

        const [unidadesRes, optsRes, allUnidadesRes] = await Promise.all([
          fetch(`/api/unidades?view=table&${qs}`, {
            signal: controller.signal,
          }),
          fetch('/api/unidades/form-options', { signal: controller.signal }),
          allUnidadesPromise,
        ]);

        // Verificar se o componente ainda está montado antes de atualizar o estado
        if (!isMounted) return;

        // Processar todas as unidades para o mapa
        if (allUnidadesRes.ok) {
          try {
            const allJson = await allUnidadesRes.json();
            if (!isMounted) return;
            const allRows: UnidadeRow[] = Array.isArray((allJson as any)?.rows)
              ? (allJson as any).rows
              : Array.isArray(allJson)
                ? (allJson as any)
                : [];
            setAllUnidadesForMap(Array.isArray(allRows) ? allRows : []);
          } catch (e) {
            if (!(e instanceof DOMException && e.name === 'AbortError')) {
              console.warn('Erro ao processar unidades para mapa:', e);
            }
          }
        }

        if (!unidadesRes.ok) {
          if (!isMounted) return;
          const body = await unidadesRes.text().catch(() => '');
          const msg = `Erro ao buscar unidades (${unidadesRes.status}).`;
          console.error('GET /api/unidades?view=table failed', {
            status: unidadesRes.status,
            body: body?.slice(0, 500),
          });
          throw new Error(msg);
        }

        const json = await unidadesRes
          .json()
          .catch(() => null as unknown as ApiResult | any);

        if (!isMounted) return;

        const normalizedRows: UnidadeRow[] = Array.isArray((json as any)?.rows)
          ? (json as any).rows
          : Array.isArray(json)
            ? (json as any)
            : Array.isArray((json as any)?.data)
              ? (json as any).data
              : [];
        const normalizedTotal =
          typeof (json as any)?.total === 'number'
            ? (json as any).total
            : normalizedRows.length;

        setRows(Array.isArray(normalizedRows) ? normalizedRows : []);
        setTotal(Number.isFinite(normalizedTotal) ? normalizedTotal : 0);

        if (optsRes.ok) {
          try {
            const opts = await optsRes.json();
            if (!isMounted) return;
            setGrupos(Array.isArray(opts?.grupos) ? opts.grupos : []);
            setResponsaveis(
              Array.isArray(opts?.responsaveis) ? opts.responsaveis : []
            );
          } catch (e) {
            if (!(e instanceof DOMException && e.name === 'AbortError')) {
              console.warn('Erro ao processar opções:', e);
            }
          }
        }
      } catch (e) {
        if (!isMounted) return;
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          const msg = e instanceof Error ? e.message : 'Erro ao carregar';
          setErrorMsg(msg);
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [qs, canView]);

  const handleDelete = async (id: string) => {
    try {
      // Se for OPERACIONAL, criar solicitação de exclusão
      if (userRole === 'OPERACIONAL') {
        const response = await fetch('/api/config/solicitacoes-exclusao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'unidade',
            resourceId: id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao solicitar exclusão');
        }

        toast.success(
          'Solicitação de exclusão enviada. Aguardando aprovação do MASTER.'
        );
        return;
      }

      // MASTER e ADMIN podem excluir diretamente
      const response = await fetch(`/api/unidades/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Erro ao excluir';
        throw new Error(errorMessage);
      }

      toast.success('Unidade excluída com sucesso');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao excluir unidade'
      );
    }
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      router.refresh();
    }
  };

  async function vincular(row: UnidadeRow) {
    setEditRow(row);
    setEditNome(row.unidadeNome || '');
    setEditGrupoId(row.grupoId || '');
    setEditCidade(row.cidade || '');
    setEditEstado(row.estado || '');

    // Extrair cidades únicas das unidades já carregadas
    const cidadesUnicas = Array.from(
      new Set(rows.map(r => r.cidade).filter((c): c is string => Boolean(c)))
    ).sort();
    setCidadesDisponiveis(cidadesUnicas);

    // carrega opções de grupos e responsáveis
    try {
      const opts = await fetch('/api/unidades/form-options').then(r =>
        r.json()
      );
      setGrupos(Array.isArray(opts.grupos) ? opts.grupos : []);
      setResponsaveis(
        Array.isArray(opts?.responsaveis) ? opts.responsaveis : []
      );
    } catch {}
  }

  async function salvarVinculo() {
    if (!editRow || !editNome.trim() || !editGrupoId || !editCidade || !editEstado) return;
    try {
      // Atualizar o nome, cidade e estado da unidade
      const resUnidade = await fetch(`/api/unidades/${editRow.unidadeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editNome.trim(),
          cidade: editCidade.trim(),
          estado: editEstado.trim(),
          ativa: editRow.ativa,
        }),
      });

      if (!resUnidade.ok) {
        const err = await resUnidade.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao atualizar unidade');
      }

      // Vincular grupo (sempre atualizar/criar mapeamento)
      // Buscar responsável padrão "Sem Responsável" ou usar o primeiro disponível
      let responsavelId = '';
      if (responsaveis.length > 0) {
        // Tentar encontrar "Sem Responsável"
        const semResp = responsaveis.find(r => r.nome === 'Sem Responsável');
        responsavelId = semResp?.id || responsaveis[0].id;
      }

      // Criar ou atualizar mapeamento
      const res = await fetch('/api/mapeamento-grupo-responsavel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupoId: editGrupoId,
          responsavelId: responsavelId || '',
          unidadeId: editRow.unidadeId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Não falhar se não tiver responsável, apenas logar
        console.warn(
          'Aviso ao vincular grupo:',
          err.error || 'Falha ao vincular grupo'
        );
      }

      toast.success('Unidade atualizada com sucesso');
      setEditRow(null);
      router.refresh();
      // Forçar reload completo da página para atualizar todas as alterações
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  async function salvarCoordenadas(data: {
    lat: number | null;
    lng: number | null;
    radiusM: number | null;
  }) {
    if (!editCoordenadasRow) return;
    try {
      // Garantir que radiusM sempre tenha um valor válido (mínimo 10m)
      const radiusMValue = data.radiusM && data.radiusM > 0 ? data.radiusM : 100;
      
      const res = await fetch(`/api/unidades/${editCoordenadasRow.unidadeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editCoordenadasRow.unidadeNome,
          ativa: editCoordenadasRow.ativa,
          lat: data.lat,
          lng: data.lng,
          radiusM: radiusMValue,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao salvar coordenadas');
      }
      toast.success('Coordenadas e raio de alcance salvos com sucesso');
      setEditCoordenadasRow(null);
      router.refresh();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro ao salvar coordenadas';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso negado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Unidades</h2>
          <p className="text-muted-foreground">
            Gerencie as unidades organizacionais do sistema
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Unidade
          </Button>
        )}
      </div>

      {/* Mapa das Unidades - sempre mostra todas as unidades com coordenadas */}
      <UnidadesMap
        unidades={allUnidadesForMap.map(r => ({
          id: r.id,
          nome: r.unidadeNome,
          grupoNome: r.grupoNome,
          responsavelNome: r.responsavelNome,
          ativa: r.ativa,
          lat: r.lat,
          lng: r.lng,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Unidades</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por unidade, grupo ou cidade"
                defaultValue={q}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const v = (e.target as HTMLInputElement).value;
                    setParam('q', v);
                  }
                }}
                className="pl-10 w-64"
              />
            </div>
            <Select
              value={grupoId || '__all'}
              onValueChange={v => setParam('grupoId', v === '__all' ? '' : v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os grupos</SelectItem>
                {(Array.isArray(grupos) ? grupos : []).map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={cidade || '__all'}
              onValueChange={v => setParam('cidade', v === '__all' ? '' : v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas as cidades</SelectItem>
                {Array.from(
                  new Set(
                    rows
                      .map(r => r.cidade)
                      .filter((c): c is string => Boolean(c))
                  )
                )
                  .sort()
                  .map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={coordenadas}
              onValueChange={v =>
                setParam('coordenadas', v === 'todas' ? '' : v)
              }
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Coordenadas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="com">Com coordenadas</SelectItem>
                <SelectItem value="sem">Sem coordenadas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => setParam('status', v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativas">Ativas</SelectItem>
                <SelectItem value="inativas">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={v => setParam('sort', v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unidade">Unidade</SelectItem>
                <SelectItem value="grupo">Grupo</SelectItem>
                <SelectItem value="cidade">Cidade</SelectItem>
                <SelectItem value="estado">Estado</SelectItem>
                <SelectItem value="createdAt">Criação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={order} onValueChange={v => setParam('order', v)}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Ordem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">ASC</SelectItem>
                <SelectItem value="desc">DESC</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => router.push('/config/unidades')}
            >
              Limpar filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-destructive">{errorMsg}</p>
            </div>
          ) : Array.isArray(rows) && rows.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                Nenhuma unidade encontrada.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="text-left w-full"
                      onClick={() => onHeaderSort('unidade')}
                    >
                      Nome
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="text-left w-full"
                      onClick={() => onHeaderSort('grupo')}
                    >
                      Grupo
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="text-left w-full"
                      onClick={() => onHeaderSort('cidade')}
                    >
                      Cidade
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="text-left w-full"
                      onClick={() => onHeaderSort('estado')}
                    >
                      Estado
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  {(canEdit || canDelete) && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(rows) ? rows : []).map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {r.unidadeNome}
                        {r.dupTotal > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {r.dupIndex} de {r.dupTotal}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={r.grupoNome ? '' : 'text-muted-foreground'}
                      >
                        {r.grupoNome ?? 'Não vinculado'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={r.cidade ? '' : 'text-muted-foreground'}>
                        {r.cidade ?? 'Não informada'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={r.estado ? '' : 'text-muted-foreground'}>
                        {r.estado ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.ativa ? 'default' : 'secondary'}>
                        {r.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditCoordenadasRow(r)}
                                title="Editar coordenadas"
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => vincular(r)}
                                title={
                                  !r.grupoNome || !r.responsavelNome
                                    ? 'Vincular grupo/responsável'
                                    : 'Editar vínculo'
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent a11yTitle="Confirmar exclusão">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmar exclusão
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a unidade
                                    &quot;
                                    {r.unidadeNome}&quot;? Esta ação não pode
                                    ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(r.unidadeId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NovaUnidadeDialog
        open={isCreateDialogOpen}
        onOpenChange={handleDialogClose}
      />

      {/* Dialog de Edição de Unidade */}
      {editRow && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20">
          <div className="bg-background w-[480px] rounded-lg border p-4 shadow-lg">
            <div className="mb-3">
              <h3 className="font-semibold">Editar Unidade</h3>
              <p className="text-sm text-muted-foreground">
                {editRow.unidadeNome}
              </p>
            </div>
            <div className="grid gap-3">
              <div>
                <Label>Nome da Unidade *</Label>
                <Input
                  type="text"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  placeholder="Digite o nome da unidade"
                  className="w-full"
                />
              </div>
              <div>
                <Label>Grupo *</Label>
                <Select value={editGrupoId} onValueChange={setEditGrupoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(grupos || []).map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado *</Label>
                <Select value={editEstado} onValueChange={setEditEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosDisponiveis.map(estado => (
                      <SelectItem key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade *</Label>
                <div className="space-y-2">
                  <Select
                    value={
                      editCidade && cidadesDisponiveis.includes(editCidade)
                        ? editCidade
                        : undefined
                    }
                    onValueChange={v => {
                      setEditCidade(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma cidade existente ou digite uma nova" />
                    </SelectTrigger>
                    <SelectContent>
                      {cidadesDisponiveis.map(cidade => (
                        <SelectItem key={cidade} value={cidade}>
                          {cidade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border"></div>
                    <span className="text-xs text-muted-foreground">ou</span>
                    <div className="h-px flex-1 bg-border"></div>
                  </div>
                  <Input
                    type="text"
                    value={
                      editCidade && !cidadesDisponiveis.includes(editCidade)
                        ? editCidade
                        : ''
                    }
                    onChange={e => setEditCidade(e.target.value)}
                    placeholder="Digite para criar uma nova cidade"
                    className="w-full"
                    onFocus={e => {
                      // Se já tinha uma cidade selecionada da lista, limpa para permitir digitar nova
                      if (
                        editCidade &&
                        cidadesDisponiveis.includes(editCidade)
                      ) {
                        setEditCidade('');
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {cidadesDisponiveis.length > 0
                    ? `Selecione uma das ${cidadesDisponiveis.length} cidades existentes ou digite para criar uma nova.`
                    : 'Digite o nome da cidade. Cidades são compartilhadas entre unidades.'}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditRow(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={salvarVinculo}
                  disabled={
                    !editNome.trim() || !editGrupoId || !editCidade.trim() || !editEstado.trim()
                  }
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Edição de Coordenadas */}
      {editCoordenadasRow && (
        <EditarCoordenadasDialog
          unidade={{
            id: editCoordenadasRow.unidadeId,
            nome: editCoordenadasRow.unidadeNome,
            lat: editCoordenadasRow.lat,
            lng: editCoordenadasRow.lng,
            radiusM: editCoordenadasRow.radiusM,
          }}
          onSave={salvarCoordenadas}
          onClose={() => setEditCoordenadasRow(null)}
        />
      )}
    </div>
  );
}

export default function UnidadesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      }
    >
      <UnidadesPageInner />
    </Suspense>
  );
}
