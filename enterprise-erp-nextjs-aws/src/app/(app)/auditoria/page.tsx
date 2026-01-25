'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  User,
  Calendar,
  Plus,
  Trash2,
  Pencil,
  Lock,
  LogOut,
  RefreshCw,
  UserCog,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  DateRangePicker as DateRangeMini,
  Range as MiniRange,
} from '@/components/DateRangePicker';

export const dynamic = 'force-dynamic';

export default function AuditoriaPage() {
  const { data: session } = useSession();
  const isMaster = session?.user?.role === 'MASTER';
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [usuarios, setUsuarios] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});

  const load = useCallback(
    async (reset = false, cursorParam?: string | null) => {
      setLoading(true);
      const url = new URL('/api/auditoria', window.location.origin);
      if (q) url.searchParams.set('q', q);
      if (selectedUserId) url.searchParams.set('userId', selectedUserId);
      if (range?.from)
        url.searchParams.set('start', range.from.toISOString().slice(0, 10));
      if (range?.to)
        url.searchParams.set('end', range.to.toISOString().slice(0, 10));
      url.searchParams.set('take', '50');
      if (!reset && cursorParam) url.searchParams.set('cursor', cursorParam);
      const res = await fetch(url);
      const data = await res.json();
      setItems(prev => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
      setLoading(false);
    },
    [q, selectedUserId, range?.from, range?.to]
  );

  // Carregar lista de usuários
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/usuarios');
        if (res.ok) {
          const data = await res.json();
          setUsuarios(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    })();
  }, []);

  useEffect(() => {
    load(true);
  }, [q, selectedUserId, range?.from, range?.to, load]);

  const handleRevert = async (logId: string) => {
    try {
      const res = await fetch(`/api/auditoria/${logId}/reverter`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao reverter ação');
      }
      toast.success('Status revertido com sucesso');
      setItems(prev =>
        prev.map(item =>
          item.id === logId
            ? {
                ...item,
                details: {
                  ...(item.details ?? {}),
                  revertedAt: new Date().toISOString(),
                  revertedBy: session?.user?.email ?? session?.user?.id,
                },
              }
            : item
        )
      );
      load(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao reverter ação'
      );
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('add')) return Plus;
    if (action.includes('delete') || action.includes('remove')) return Trash2;
    if (action.includes('update') || action.includes('edit')) return Pencil;
    if (action.includes('login')) return Lock;
    if (action.includes('logout')) return LogOut;
    if (action.includes('status')) return RefreshCw;
    if (action.includes('role')) return UserCog;
    return FileText;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add'))
      return 'bg-green-100 text-green-800';
    if (action.includes('delete') || action.includes('remove'))
      return 'bg-red-100 text-red-800';
    if (action.includes('update') || action.includes('edit'))
      return 'bg-blue-100 text-blue-800';
    if (action.includes('login')) return 'bg-purple-100 text-purple-800';
    if (action.includes('logout')) return 'bg-gray-100 text-gray-800';
    if (action.includes('status')) return 'bg-orange-100 text-orange-800';
    if (action.includes('role')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'movimento.create': 'Criou movimento',
      'movimento.delete': 'Removeu movimento',
      'movimento.update': 'Atualizou movimento',
      'proposta.create': 'Criou proposta',
      'proposta.status_change': 'Alterou status da proposta',
      'user.create': 'Criou usuário',
      'user.delete': 'Removeu usuário',
      'user.role_change': 'Alterou perfil de usuário',
      'user.login': 'Fez login',
      'user.logout': 'Fez logout',
      'categoria.create': 'Criou categoria',
      'unidade.create': 'Criou unidade',
      'grupo.create': 'Criou grupo',
      'ponto.create': 'Registrou ponto',
    };
    return actionMap[action] || action;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoria</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de ações realizadas no sistema. Você vê apenas os logs relacionados às páginas que você acessa.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por ação, descrição, recurso..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 sm:w-auto">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="border rounded px-2 py-2 text-sm min-w-[200px]"
          >
            <option value="">Todos os usuários</option>
            {usuarios.map(usuario => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.name || usuario.email} ({usuario.role})
              </option>
            ))}
          </select>
          <div className="min-w-[260px]">
            <DateRangeMini value={range} onChange={setRange} />
          </div>
        </div>
        <Button onClick={() => load(true)} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {items
              // Oculta ações de listagem para reduzir ruído
              .filter((l: any) => !/\.list$/.test(l.action || ''))
              .filter(
                (l: any) =>
                  l.action !== 'user.login' && l.action !== 'user.logout'
              )
              .map((l: any) => (
                <div
                  key={l.id}
                  className="p-6 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Cabeçalho com ícone e ação */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          {(() => {
                            const IconComponent = getActionIcon(l.action);
                            return <IconComponent className="h-4 w-4" />;
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getActionColor(l.action)}
                          >
                            {formatAction(l.action)}
                          </Badge>
                          {/* Mantém o recurso, mas compacto */}
                          {l.resource ? (
                            <Badge variant="secondary" className="text-xs">
                              {l.resource}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      {/* Descrição amigável */}
                      {l.description ? (
                        <div className="text-base font-medium text-foreground line-clamp-2">
                          {l.description}
                        </div>
                      ) : null}

                      {l.action === 'curriculo.status_change' ? (
                        <div className="text-sm text-muted-foreground">
                          Status: <strong>{l.details?.oldStatus ?? 'N/A'}</strong> →{' '}
                          <strong>{l.details?.newStatus ?? 'N/A'}</strong>
                          {l.details?.oldObservacoes !== undefined ||
                          l.details?.newObservacoes !== undefined ? (
                            <span className="block text-xs">
                              Observações:{' '}
                              {l.details?.oldObservacoes ?? '—'} →{' '}
                              {l.details?.newObservacoes ?? '—'}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Usuário e timestamp (IP/UA ocultos para compacidade) */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>
                            {l.user || (l.userId ? `Usuário ${l.userId.substring(0, 8)}...` : 'Sistema')}
                            {l.userRole ? (
                              <span className="ml-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                                {l.userRole}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(l.ts).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Status + detalhes */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            l.success
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {l.success ? 'Sucesso' : 'Erro'}
                        </div>
                        {l.error ? (
                          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            Erro: {l.error}
                          </div>
                        ) : null}
                        {l.requestId ? (
                          <div className="text-xs text-muted-foreground">
                            Req: {l.requestId}
                          </div>
                        ) : null}
                      </div>
                      {isMaster &&
                      l.action === 'curriculo.status_change' &&
                      !l.details?.revertedAt ? (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevert(l.id)}
                            disabled={loading}
                            className="flex items-center gap-1"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reverter status
                          </Button>
                        </div>
                      ) : null}
                      {l.details?.revertedAt ? (
                        <div className="text-xs text-muted-foreground">
                          Revertido em{' '}
                          {new Date(l.details.revertedAt).toLocaleString('pt-BR')}
                          {l.details.revertedBy
                            ? ` por ${l.details.revertedBy}`
                            : ''}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

            {/* Botão carregar mais */}
            <div className="p-6">
              {cursor ? (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={() => load(false, cursor)}
                >
                  {loading ? 'Carregando...' : 'Carregar mais registros'}
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  {items.length === 0
                    ? 'Nenhum registro encontrado.'
                    : 'Fim dos resultados.'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
