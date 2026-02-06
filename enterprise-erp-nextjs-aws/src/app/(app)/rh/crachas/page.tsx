'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { hasRouteAccess } from '@/lib/rbac';
import { RefreshCw, CheckCircle, XCircle, Camera, Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type Row = {
  id: string;
  nome: string;
  cpf: string | null;
  grupo: string;
  grupoId: string;
  unidadeId: string | null;
  unidadeNome: string | null;
  temCracha: boolean;
  fotoCracha: string | null;
  cargo: string | null;
};

function PageInner() {
  const { data: session } = useSession();
  const canView = hasRouteAccess(session?.user?.role as any, [
    'MASTER',
    'RH',
  ]);
  const sp = useSearchParams();
  const router = useRouter();

  const grupoFiltro = sp.get('grupoId') ?? '__all';
  const unidadeFiltro = sp.get('unidadeId') ?? '__all';
  const statusFiltro = sp.get('status') ?? '__all'; // __all, com_cracha, sem_cracha

  const [rows, setRows] = useState<Row[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editarCrachaDialogOpen, setEditarCrachaDialogOpen] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Row | null>(null);
  const [salvandoCracha, setSalvandoCracha] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (grupoFiltro && grupoFiltro !== '__all') {
      p.set('grupoId', grupoFiltro);
    }
    if (unidadeFiltro && unidadeFiltro !== '__all') {
      p.set('unidadeId', unidadeFiltro);
    }
    return p.toString();
  }, [grupoFiltro, unidadeFiltro]);

  useEffect(() => {
    if (!canView) return;
    setLoading(true);
    (async () => {
      const [funcsRes, unitsRes, gruposRes] = await Promise.all([
        fetch('/api/funcionarios?' + qs),
        fetch('/api/unidades'),
        fetch('/api/grupos'),
      ]);
      const funcs = await funcsRes.json().catch(() => []);
      const units = await unitsRes.json().catch(() => []);
      const grps = await gruposRes.json().catch(() => []);
      
      let filteredRows = Array.isArray(funcs?.rows) ? funcs.rows : funcs;
      
      // Filtrar por unidade se necessário
      if (unidadeFiltro !== '__all') {
        if (unidadeFiltro === '__none') {
          filteredRows = filteredRows.filter((r: Row) => !r.unidadeId);
        } else {
          filteredRows = filteredRows.filter((r: Row) => r.unidadeId === unidadeFiltro);
        }
      }
      
      // Filtrar por status de crachá
      if (statusFiltro === 'com_cracha') {
        filteredRows = filteredRows.filter((r: Row) => r.temCracha);
      } else if (statusFiltro === 'sem_cracha') {
        filteredRows = filteredRows.filter((r: Row) => !r.temCracha);
      }
      
      setRows(filteredRows);
      setUnidades(Array.isArray(units?.rows) ? units.rows : units);
      setGrupos(
        Array.isArray(grps?.data)
          ? grps.data
          : Array.isArray(grps?.rows)
            ? grps.rows
            : Array.isArray(grps)
              ? grps
              : []
      );
      setLoading(false);
    })();
  }, [qs, canView, unidadeFiltro, statusFiltro]);

  const handleGrupoFilter = (value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value === '__all') {
      p.delete('grupoId');
    } else {
      p.set('grupoId', value);
    }
    router.push('/rh/crachas?' + p.toString());
  };

  const handleUnidadeFilter = (value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value === '__all') {
      p.delete('unidadeId');
    } else {
      p.set('unidadeId', value);
    }
    router.push('/rh/crachas?' + p.toString());
  };

  const handleStatusFilter = (value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value === '__all') {
      p.delete('status');
    } else {
      p.set('status', value);
    }
    router.push('/rh/crachas?' + p.toString());
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const comCracha = rows.filter(r => r.temCracha).length;
    const semCracha = total - comCracha;
    return { total, comCracha, semCracha };
  }, [rows]);

  const handleMarcarTemCracha = async (colaborador: Row) => {
    setSalvandoCracha(true);
    try {
      const response = await fetch(`/api/funcionarios/${colaborador.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temCracha: true }),
      });

      if (response.ok) {
        toast.success(`Crachá marcado para ${colaborador.nome}`);
        // Atualizar a lista
        const funcsRes = await fetch('/api/funcionarios?' + qs);
        const funcs = await funcsRes.json().catch(() => []);
        let filteredRows = Array.isArray(funcs?.rows) ? funcs.rows : funcs;
        
        if (unidadeFiltro !== '__all') {
          if (unidadeFiltro === '__none') {
            filteredRows = filteredRows.filter((r: Row) => !r.unidadeId);
          } else {
            filteredRows = filteredRows.filter((r: Row) => r.unidadeId === unidadeFiltro);
          }
        }
        
        if (statusFiltro === 'com_cracha') {
          filteredRows = filteredRows.filter((r: Row) => r.temCracha);
        } else if (statusFiltro === 'sem_cracha') {
          filteredRows = filteredRows.filter((r: Row) => !r.temCracha);
        }
        
        setRows(filteredRows);
        setEditarCrachaDialogOpen(false);
        setColaboradorSelecionado(null);
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error?.error || 'Erro ao marcar crachá');
      }
    } catch (error) {
      toast.error('Erro ao marcar crachá');
      console.error(error);
    } finally {
      setSalvandoCracha(false);
    }
  };

  const handleDesmarcarCracha = async (colaborador: Row) => {
    setSalvandoCracha(true);
    try {
      const response = await fetch(`/api/funcionarios/${colaborador.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temCracha: false }),
      });

      if (response.ok) {
        toast.success(`Crachá desmarcado para ${colaborador.nome}`);
        // Atualizar a lista
        const funcsRes = await fetch('/api/funcionarios?' + qs);
        const funcs = await funcsRes.json().catch(() => []);
        let filteredRows = Array.isArray(funcs?.rows) ? funcs.rows : funcs;
        
        if (unidadeFiltro !== '__all') {
          if (unidadeFiltro === '__none') {
            filteredRows = filteredRows.filter((r: Row) => !r.unidadeId);
          } else {
            filteredRows = filteredRows.filter((r: Row) => r.unidadeId === unidadeFiltro);
          }
        }
        
        if (statusFiltro === 'com_cracha') {
          filteredRows = filteredRows.filter((r: Row) => r.temCracha);
        } else if (statusFiltro === 'sem_cracha') {
          filteredRows = filteredRows.filter((r: Row) => !r.temCracha);
        }
        
        setRows(filteredRows);
        setEditarCrachaDialogOpen(false);
        setColaboradorSelecionado(null);
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error?.error || 'Erro ao desmarcar crachá');
      }
    } catch (error) {
      toast.error('Erro ao desmarcar crachá');
      console.error(error);
    } finally {
      setSalvandoCracha(false);
    }
  };

  if (!canView) return <div className="p-6">Acesso negado</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Crachás</h2>
          <p className="text-muted-foreground">
            Mapeamento de crachás por grupos e unidades
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Colaboradores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Com Crachá</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.comCracha}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.comCracha / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sem Crachá</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.semCracha}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.semCracha / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Colaboradores</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.refresh();
                (async () => {
                  const funcsRes = await fetch('/api/funcionarios?' + qs);
                  const funcs = await funcsRes.json().catch(() => []);
                  setRows(Array.isArray(funcs?.rows) ? funcs.rows : funcs);
                })();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
          <div className="flex gap-2 items-center flex-wrap mt-4">
            <Select value={grupoFiltro} onValueChange={handleGrupoFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os grupos</SelectItem>
                {grupos.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={unidadeFiltro} onValueChange={handleUnidadeFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas as unidades</SelectItem>
                <SelectItem value="__none">Sem unidade</SelectItem>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFiltro} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status do crachá" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="com_cracha">Com Crachá</SelectItem>
                <SelectItem value="sem_cracha">Sem Crachá</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum colaborador encontrado com os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-center">Status Crachá</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>
                      {r.cpf
                        ? r.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                        : '—'}
                    </TableCell>
                    <TableCell>{r.cargo || '—'}</TableCell>
                    <TableCell>{r.grupo}</TableCell>
                    <TableCell>{r.unidadeNome || '—'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {r.temCracha ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Com Crachá
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Sem Crachá
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setColaboradorSelecionado(r);
                            setEditarCrachaDialogOpen(true);
                          }}
                          className="h-7 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar status do crachá */}
      <Dialog open={editarCrachaDialogOpen} onOpenChange={setEditarCrachaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Status do Crachá</DialogTitle>
            <DialogDescription>
              {colaboradorSelecionado && (
                <>
                  Colaborador: <strong>{colaboradorSelecionado.nome}</strong>
                  <br />
                  CPF: {colaboradorSelecionado.cpf
                    ? colaboradorSelecionado.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                    : '—'}
                  <br />
                  Status atual: {colaboradorSelecionado.temCracha ? (
                    <Badge variant="default" className="bg-green-600">Com Crachá</Badge>
                  ) : (
                    <Badge variant="destructive">Sem Crachá</Badge>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione a ação desejada:
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditarCrachaDialogOpen(false);
                setColaboradorSelecionado(null);
              }}
              disabled={salvandoCracha}
            >
              Cancelar
            </Button>
            {colaboradorSelecionado && (
              <>
                {colaboradorSelecionado.temCracha ? (
                  <Button
                    variant="destructive"
                    onClick={() => colaboradorSelecionado && handleDesmarcarCracha(colaboradorSelecionado)}
                    disabled={salvandoCracha}
                  >
                    {salvandoCracha ? 'Salvando...' : 'Desmarcar Crachá'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => colaboradorSelecionado && handleMarcarTemCracha(colaboradorSelecionado)}
                    disabled={salvandoCracha}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {salvandoCracha ? 'Salvando...' : 'Marcar como Tem Crachá'}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <PageInner />
    </Suspense>
  );
}

