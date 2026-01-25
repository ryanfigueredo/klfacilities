'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProvFormDialog } from './ProvFormDialog';
import {
  Dialog,
  DialogContent,
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
import { ProvisaoForm } from './ProvisaoForm';
import { toast } from 'sonner';

type Row = {
  id: string;
  descricao: string;
  dataVenc: string;
  valor: number;
  status: 'PENDENTE' | 'EFETIVADO' | 'CANCELADO';
  grupoId?: string | null;
  unidadeId?: string | null;
  categoriaId?: string | null;
  movimento?: { id: string } | null;
};

function colorBy(row: Row) {
  if (row.status === 'EFETIVADO') return 'bg-green-50 dark:bg-green-950/20';
  if (row.status === 'CANCELADO') return 'bg-muted';
  const today = new Date();
  const d = new Date(row.dataVenc);
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (d < today) return 'bg-red-50 dark:bg-red-950/20';
  if (isToday) return 'bg-amber-50 dark:bg-amber-950/20';
  return '';
}

export function ProvisionamentosTable({
  onChanged,
  dateFilter,
}: { onChanged?: () => void; dateFilter?: string | null } = {}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'pendentes' | 'efetivados' | 'cancelados'>(
    'pendentes'
  );
  const [editing, setEditing] = useState<null | Row>(null);
  const [grupoId, setGrupoId] = useState('__all');
  const [unidadeId, setUnidadeId] = useState('__all');
  const [categoriaId, setCategoriaId] = useState('__all');
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>(
    []
  );

  const refresh = async () => {
    const params = new URLSearchParams();
    params.set('status', tab === 'pendentes' ? 'PENDENTE' : tab === 'efetivados' ? 'EFETIVADO' : 'CANCELADO');
    if (q) params.set('q', q);
    if (grupoId !== '__all') params.set('grupoId', grupoId);
    if (unidadeId !== '__all') params.set('unidadeId', unidadeId);
    if (categoriaId !== '__all') params.set('categoriaId', categoriaId);
    if (dateFilter) {
      params.set('from', dateFilter);
      params.set('to', dateFilter);
    }
    
    const r = await fetch(`/api/provisionamentos?${params.toString()}`);
    const j = await r.json();
    const arr = Array.isArray(j?.rows) ? j.rows : j?.data || [];
    setRows(
      arr.map((x: any) => ({
        ...x,
        dataVenc: new Date(x.dataVenc).toISOString(),
        valor: Number(x.valor),
      }))
    );
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    (async () => {
      try {
        const [g, u, c] = await Promise.all([
          fetch('/api/grupos')
            .then(r => r.json())
            .catch(() => []),
          fetch('/api/unidades')
            .then(r => r.json())
            .catch(() => []),
          fetch('/api/categorias?tipo=DESPESA')
            .then(r => r.json())
            .catch(() => []),
        ]);
        setGrupos(Array.isArray(g?.data) ? g.data : Array.isArray(g) ? g : []);
        setUnidades(
          Array.isArray(u?.rows) ? u.rows : Array.isArray(u) ? u : u?.data || []
        );
        setCategorias(
          Array.isArray(c?.data) ? c.data : Array.isArray(c) ? c : []
        );
      } catch {}
    })();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState('');

  const onPagar = (row: Row) => setConfirmId(row.id);
  const onCancelar = (row: Row) => {
    setCancelId(row.id);
    setCancelReason('');
  };
  const onAdiar = (row: Row) => {
    setReschedId(row.id);
    setReschedDate(new Date(row.dataVenc).toISOString().slice(0, 10));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provisões Contábeis</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Reservas para despesas futuras conhecidas (ex: 13º salário, impostos, férias)
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Input
            placeholder="Buscar descrição"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && refresh()}
            className="max-w-sm"
          />
          <Select value={grupoId} onValueChange={setGrupoId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Grupo" />
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
          <Select value={unidadeId} onValueChange={setUnidadeId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as unidades</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as categorias</SelectItem>
              {categorias.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refresh}>
            Buscar
          </Button>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="efetivados">Pagos</TabsTrigger>
            <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4" />
          <TabsContent value="efetivados" className="mt-4" />
          <TabsContent value="cancelados" className="mt-4" />
        </Tabs>

        <div className="mt-4 divide-y rounded-md border">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum item
            </div>
          ) : (
            filtered.map(row => (
              <div
                key={row.id}
                className={`p-3 flex items-center justify-between ${colorBy(row)}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate max-w-[48ch]">
                    {row.descricao}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    vence {new Date(row.dataVenc).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      row.status === 'PENDENTE' ? 'destructive' : 'outline'
                    }
                  >
                    {row.status}
                  </Badge>
                  <div className="font-mono">
                    {row.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </div>
                  {row.status === 'PENDENTE' ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(row)}
                      >
                        Editar
                      </Button>
                      <Button size="sm" onClick={() => onPagar(row)}>
                        Pagar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAdiar(row)}
                      >
                        Adiar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onCancelar(row)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : row.status === 'EFETIVADO' ? (
                    <Badge variant="outline">Movimento gerado</Badge>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {editing && (
          <ProvFormDialog
            open={!!editing}
            onOpenChange={(v: boolean) => setEditing(v ? editing : null)}
            mode="edit"
            initialData={{
              id: editing.id,
              tipo: 'DESPESA',
              dataPrevista: new Date(editing.dataVenc)
                .toISOString()
                .slice(0, 10),
              descricao: editing.descricao,
              valor: editing.valor,
              grupoId: editing.grupoId || undefined,
              unidadeId: editing.unidadeId || undefined,
              categoriaId: editing.categoriaId || undefined,
            }}
            onSaved={refresh}
          />
        )}

        {/* Confirmar Modal */}
        <Dialog
          open={!!confirmId}
          onOpenChange={v => setConfirmId(v ? confirmId : null)}
        >
          <DialogContent a11yTitle="Confirmar pagamento de provisão">
            <DialogHeader>
              <DialogTitle>Confirmar pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Um Movimento será criado.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmId(null)}>
                  Fechar
                </Button>
                <Button
                  disabled={loadingAction}
                  onClick={async () => {
                    if (!confirmId) return;
                    try {
                      setLoadingAction(true);
                      const r = await fetch(
                        `/api/provisionamentos/${confirmId}/pagar`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
                      );
                      if (r.ok) {
                        const json = await r.json().catch(() => ({}));
                        setConfirmId(null);
                        await refresh();
                        onChanged?.();
                        const movId = json?.movimentoId;
                        toast('Movimento criado', {
                          description:
                            'O item foi pago e um movimento foi gerado.',
                          action: movId
                            ? {
                                label: 'Ver movimento',
                                onClick: () => {
                                  window.location.href = `/movimentos?focus=${encodeURIComponent(
                                    String(movId)
                                  )}`;
                                },
                              }
                            : undefined,
                        } as any);
                      } else {
                        const err = await r.json().catch(() => ({}));
                        toast.error('Falha ao pagar provisão', {
                          description: String(err?.error || r.statusText),
                        } as any);
                      }
                    } finally {
                      setLoadingAction(false);
                    }
                  }}
                >
                  {loadingAction ? 'Processando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Adiar Modal */}
        <Dialog
          open={!!reschedId}
          onOpenChange={v => setReschedId(v ? reschedId : null)}
        >
          <DialogContent a11yTitle="Adiar provisão">
            <DialogHeader>
              <DialogTitle>Adiar provisão</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={reschedDate}
                onChange={e => setReschedDate(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReschedId(null)}>
                  Cancelar
                </Button>
                <Button
                  disabled={loadingAction}
                  onClick={async () => {
                    if (!reschedId || !reschedDate) return;
                    try {
                      setLoadingAction(true);
                      const r = await fetch(
                        `/api/provisionamentos/${reschedId}/adiar`,
                        {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ novaData: reschedDate }),
                        }
                      );
                      if (r.ok) {
                        setReschedId(null);
                        await refresh();
                        onChanged?.();
                        toast('Provisão adiada', {
                          description: 'A data de vencimento foi atualizada.',
                        } as any);
                      } else {
                        const err = await r.json().catch(() => ({}));
                        toast.error('Falha ao adiar', {
                          description: String(err?.error || r.statusText),
                        } as any);
                      }
                    } finally {
                      setLoadingAction(false);
                    }
                  }}
                >
                  {loadingAction ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancelar Modal */}
        <Dialog
          open={!!cancelId}
          onOpenChange={v => setCancelId(v ? cancelId : null)}
        >
          <DialogContent a11yTitle="Cancelar provisão">
            <DialogHeader>
              <DialogTitle>Cancelar provisão</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Motivo (opcional)"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCancelId(null)}>
                  Fechar
                </Button>
                <Button
                  variant="destructive"
                  disabled={loadingAction}
                  onClick={async () => {
                    if (!cancelId) return;
                    try {
                      setLoadingAction(true);
                      const r = await fetch(
                        `/api/provisionamentos/${cancelId}/cancelar`,
                        {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            motivo: cancelReason || undefined,
                          }),
                        }
                      );
                      if (r.ok) {
                        setCancelId(null);
                        await refresh();
                        onChanged?.();
                        toast('Provisão cancelada', {
                          description: 'O item foi cancelado com sucesso.',
                        } as any);
                      } else {
                        const err = await r.json().catch(() => ({}));
                        toast.error('Falha ao cancelar', {
                          description: String(err?.error || r.statusText),
                        } as any);
                      }
                    } finally {
                      setLoadingAction(false);
                    }
                  }}
                >
                  {loadingAction ? 'Cancelando...' : 'Cancelar provisão'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
