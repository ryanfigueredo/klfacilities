'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { CheckCircle, Clock, ShieldAlert, XCircle } from 'lucide-react';

type Solicitacao = {
  id: string;
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA';
  motivo: string | null;
  observacoes?: string | null;
  aprovadoEm?: string | null;
  funcionario: {
    id: string;
    nome: string;
    grupo?: { nome: string | null } | null;
    unidade?: { nome: string | null } | null;
  };
  solicitadoPor: {
    id: string;
    name: string | null;
    email: string | null;
  };
  aprovadoPor?: {
    id: string;
    name: string | null;
  } | null;
  createdAt: string;
};

const statusOptions = [
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'APROVADA', label: 'Aprovadas' },
  { value: 'REJEITADA', label: 'Rejeitadas' },
  { value: 'all', label: 'Todas' },
];

function PageInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const canView = hasRouteAccess(session?.user?.role as any, ['MASTER']);
  const [statusFilter, setStatusFilter] = useState<string>('PENDENTE');
  const [loading, setLoading] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') {
      params.set('status', statusFilter);
    } else {
      params.set('status', 'all');
    }
    return params.toString();
  }, [statusFilter]);

  const carregarSolicitacoes = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/funcionarios/solicitacoes-exclusao?${queryString}`
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.error || 'Não foi possível carregar as solicitações'
        );
      }
      setSolicitacoes(Array.isArray(data.solicitacoes) ? data.solicitacoes : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [canView, queryString]);

  useEffect(() => {
    carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  async function processarAprovacao(
    solicitacaoId: string,
    aprovado: boolean
  ) {
    if (!canView) return;
    try {
      const response = await fetch(
        `/api/funcionarios/solicitacoes-exclusao/${solicitacaoId}/aprovar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aprovado }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao processar a solicitação');
      }

      toast.success(data?.message || 'Solicitação processada com sucesso');
      await carregarSolicitacoes();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    }
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5" />
            Acesso exclusivo do MASTER
          </CardTitle>
        </CardHeader>
        <CardContent>
          Somente o MASTER pode avaliar as solicitações de exclusão de colaboradores.
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
              Solicitações de Exclusão de Colaboradores
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Aprove ou rejeite solicitações enviadas pelo RH e mantenha o histórico centralizado.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={value => setStatusFilter(value)}
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
            <Button variant="outline" onClick={carregarSolicitacoes} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Solicitado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && solicitacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhuma solicitação encontrada para o filtro selecionado.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Carregando solicitações...
                  </TableCell>
                </TableRow>
              )}
              {solicitacoes.map(solicitacao => {
                const statusLabel =
                  solicitacao.status === 'PENDENTE'
                    ? { label: 'Pendente', variant: 'outline' as const }
                    : solicitacao.status === 'APROVADA'
                      ? { label: 'Aprovada', variant: 'default' as const }
                      : { label: 'Rejeitada', variant: 'secondary' as const };

                return (
                  <TableRow key={solicitacao.id}>
                    <TableCell className="font-medium">
                      {solicitacao.funcionario?.nome || 'N/A'}
                      {solicitacao.motivo && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Motivo: {solicitacao.motivo}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {solicitacao.funcionario?.grupo?.nome || '—'}
                    </TableCell>
                    <TableCell>
                      {solicitacao.funcionario?.unidade?.nome || '—'}
                    </TableCell>
                    <TableCell>
                      {solicitacao.solicitadoPor?.name || '—'}
                      <p className="text-xs text-muted-foreground">
                        {solicitacao.solicitadoPor?.email || 'Sem e-mail'}
                      </p>
                    </TableCell>
                    <TableCell>
                      {new Date(solicitacao.createdAt).toLocaleString('pt-BR')}
                      {solicitacao.aprovadoEm && (
                        <p className="text-xs text-muted-foreground">
                          Processado em{' '}
                          {new Date(solicitacao.aprovadoEm).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabel.variant} className="flex items-center gap-1">
                        {solicitacao.status === 'PENDENTE' && <Clock className="h-3 w-3" />}
                        {solicitacao.status === 'APROVADA' && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {solicitacao.status === 'REJEITADA' && <XCircle className="h-3 w-3" />}
                        {statusLabel.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {solicitacao.status === 'PENDENTE' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => processarAprovacao(solicitacao.id, true)}
                            disabled={loading}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => processarAprovacao(solicitacao.id, false)}
                            disabled={loading}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {solicitacao.aprovadoPor?.name
                            ? `Processado por ${solicitacao.aprovadoPor.name}`
                            : 'Processado automaticamente'}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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


