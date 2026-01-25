'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MovFormDialog } from '@/components/movimentos/MovFormDialog';

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  movId?: string;
};

export function MovDetailSheet({ open, onOpenChange, movId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mov, setMov] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!open || !movId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const r = await fetch(`/api/movimentos/${movId}`);
        if (r.status === 404) {
          setMov(null);
          setError('NOT_FOUND');
        } else if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || 'Erro');
        } else {
          const j = await r.json();
          setMov(j);
        }
      } catch (e: any) {
        setError(e?.message || 'Erro');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, movId]);

  const initialEditData = useMemo(() => {
    if (!mov) return undefined;
    return {
      id: mov.id as string,
      tipo: mov.tipo as 'RECEITA' | 'DESPESA',
      data: new Date(mov.dataLanc).toISOString().slice(0, 10),
      descricao: String(mov.descricao || ''),
      valor: Number(mov.valor ?? 0),
      grupoId: mov.grupoId || undefined,
      unidadeId: mov.unidadeId || undefined,
      categoriaId: mov.categoriaId || undefined,
      formaPagamento: mov.formaPagamento || undefined,
    } as const;
  }, [mov]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full">
        <DialogHeader>
          <DialogTitle>Detalhes do Lançamento</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="mt-4 space-y-3">
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-6 bg-muted animate-pulse rounded" />
          </div>
        ) : error === 'NOT_FOUND' ? (
          <p className="mt-4 text-muted-foreground">Lançamento removido.</p>
        ) : error ? (
          <p className="mt-4 text-destructive">{error}</p>
        ) : mov ? (
          <div className="mt-4 space-y-3">
            <div className="text-2xl font-semibold">
              R${' '}
              {Number(mov.valor).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(mov.dataLanc).toLocaleDateString('pt-BR')}
            </div>
            <div>
              <div className="font-medium">{mov.descricao}</div>
              <div className="text-sm text-muted-foreground">
                {mov.grupo?.nome || '-'}{' '}
                {mov.unidade?.nome ? `• ${mov.unidade?.nome}` : ''}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm">Categoria:</span>
              <Badge variant={mov.categoriaRel ? 'outline' : 'destructive'}>
                {mov.categoriaRel?.nome || 'Sem categoria'}
              </Badge>
              {mov.flags?.duplicado && (
                <Badge variant="outline">Duplicado</Badge>
              )}
              {mov.flags?.outlier && <Badge variant="outline">Outlier</Badge>}
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            </div>
          </div>
        ) : null}
        {initialEditData && (
          <MovFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            mode="edit"
            initialData={initialEditData as any}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
