'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { hasRouteAccess } from '@/lib/rbac';
import { RotateCcw, UserMinus, AlertTriangle, Loader2 } from 'lucide-react';

type AuditDetails = {
  curriculoId?: string | null;
  nome?: string | null;
  sobrenome?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  oldObservacoes?: string | null;
  newObservacoes?: string | null;
  revertedAt?: string | null;
  revertedBy?: string | null;
};

type CurriculoDiscardLog = {
  id: string;
  ts: string;
  user: string | null;
  userRole: string | null;
  details: AuditDetails;
  description?: string | null;
};

const statusOptions = [
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'REVERTIDO', label: 'Revertidos' },
  { value: 'all', label: 'Todos' },
];

function CurriculosDescartesInner() {
  const { data: session } = useSession();
  const canView = hasRouteAccess(session?.user?.role as any, ['MASTER']);
  const [logs, setLogs] = useState<CurriculoDiscardLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDENTE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const loadLogs = useCallback(
    async (reset = false) => {
      if (!canView) return;
      if (reset) {
        setLogs([]);
        setNextCursor(null);
      } else if (!reset && nextCursor === null && initialFetchDone) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('action', 'curriculo.status_change');
        params.set('take', '50');
        if (!reset && nextCursor) {
          params.set('cursor', nextCursor);
        }

        const response = await fetch(`/api/auditoria?${params.toString()}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Não foi possível carregar os descartes');
        }

        const fetchedItems: CurriculoDiscardLog[] = Array.isArray(data.items)
          ? data.items
              .filter(
                (item: any) =>
                  (item.details?.newStatus || '').toUpperCase() === 'DESCARTADO'
              )
              .map((item: any) => ({
                id: item.id,
                ts: item.ts,
                user: item.user ?? null,
                userRole: item.userRole ?? null,
                details: item.details ?? {},
                description: item.description ?? '',
              }))
          : [];

        setLogs(prev =>
          reset ? fetchedItems : [...prev, ...fetchedItems.filter(newItem => !prev.some(old => old.id === newItem.id))]
        );
        setNextCursor(data.nextCursor ?? null);
        setInitialFetchDone(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [canView, nextCursor, initialFetchDone]
  );

  useEffect(() => {
    loadLogs(true);
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (statusFilter === 'PENDENTE') {
        return !log.details?.revertedAt;
      }
      if (statusFilter === 'REVERTIDO') {
        return Boolean(log.details?.revertedAt);
      }
      return true;
    });
  }, [logs, statusFilter]);

  const handleRevert = useCallback(
    async (logId: string) => {
      if (!canView) return;
      try {
        const response = await fetch(`/api/auditoria/${logId}/reverter`, {
          method: 'POST',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Erro ao reverter descarte');
        }
        toast.success('Status do currículo revertido com sucesso');
        setLogs(prev =>
          prev.map(log =>
            log.id === logId
              ? {
                  ...log,
                  details: {
                    ...log.details,
                    revertedAt: new Date().toISOString(),
                    revertedBy: session?.user?.email ?? session?.user?.id ?? null,
                    newStatus: log.details?.oldStatus ?? null,
                  },
                  description: data?.curriculo
                    ? `Status revertido para ${data.curriculo.status ?? 'N/A'}`
                    : log.description,
                }
              : log
          )
        );
        await loadLogs(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(message);
      }
    },
    [canView, loadLogs, session?.user?.email, session?.user?.id]
  );

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Acesso restrito ao MASTER
          </CardTitle>
        </CardHeader>
        <CardContent>
          Apenas o MASTER pode auditar e reverter descartes de currículos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              Descartes de Currículos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Acompanhe descartes realizados no Banco de Talentos e reverta ações equivocadas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              disabled={loading}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => loadLogs(true)} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currículo</TableHead>
                <TableHead>Alteração</TableHead>
                <TableHead>Solicitado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhum descarte encontrado para o filtro selecionado.
                  </TableCell>
                </TableRow>
              )}

              {loading && filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando descartes...
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {filteredLogs.map(log => {
                const nomeCompleto = [log.details?.nome, log.details?.sobrenome]
                  .filter(Boolean)
                  .join(' ') || 'Currículo sem nome';

                const statusBadge =
                  log.details?.revertedAt
                    ? { label: 'Revertido', variant: 'secondary' as const }
                    : { label: 'Descartado', variant: 'destructive' as const };

                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {nomeCompleto}
                      {log.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {log.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="block text-muted-foreground">
                          Status: {log.details?.oldStatus ?? '—'} →{' '}
                          {log.details?.newStatus ?? '—'}
                        </span>
                        {(log.details?.oldObservacoes || log.details?.newObservacoes) && (
                          <span className="block text-xs text-muted-foreground mt-1">
                            Observações:{' '}
                            {log.details?.oldObservacoes ?? '—'} →{' '}
                            {log.details?.newObservacoes ?? '—'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{log.user || 'Usuário não identificado'}</span>
                        {log.userRole ? (
                          <span className="text-xs text-muted-foreground uppercase">
                            {log.userRole}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(log.ts).toLocaleString('pt-BR')}
                      {log.details?.revertedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Revertido em{' '}
                          {new Date(log.details.revertedAt).toLocaleString('pt-BR')}
                          {log.details?.revertedBy ? ` por ${log.details.revertedBy}` : ''}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                        <UserMinus className="h-3 w-3" />
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!log.details?.revertedAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleRevert(log.id)}
                          disabled={loading}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reverter descarte
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Ação revertida
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {nextCursor && (
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => loadLogs(false)} disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </span>
                ) : (
                  'Carregar mais'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CurriculosDescartesPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <CurriculosDescartesInner />
    </Suspense>
  );
}


