'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import {
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
} from 'lucide-react';
import {
  DateRangePicker as DateRangeMini,
} from '@/components/DateRangePicker';
import { DateRange } from '@/lib/date-range';
import { hasRouteAccess } from '@/lib/rbac';

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template: string | null;
  emailId: string | null;
  success: boolean;
  error: string | null;
  sentAt: string;
  context: string | null;
  contextId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export default function EmailsEnviadosPage() {
  const { data: session, status } = useSession();
  const userRole = session?.user?.role as Role | undefined;

  const canView = hasRouteAccess(userRole, [
    'MASTER',
    'ADMIN',
    'OPERACIONAL',
  ]);

  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [template, setTemplate] = useState('');
  const [successFilter, setSuccessFilter] = useState<string | undefined>(undefined);
  const [range, setRange] = useState<DateRange>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadEmails = useCallback(
    async (reset = false) => {
      if (!canView) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('to', search);
        if (template) params.set('template', template);
        if (successFilter) params.set('success', successFilter);
        if (range?.from)
          params.set('start', range.from.toISOString().slice(0, 10));
        if (range?.to)
          params.set('end', range.to.toISOString().slice(0, 10));
        params.set('take', '50');
        if (!reset && nextCursor) params.set('cursor', nextCursor);

        const response = await fetch(`/api/administracao/emails?${params}`);
        if (!response.ok) throw new Error('Erro ao carregar emails');

        const data = await response.json();
        if (reset) {
          setEmails(data.emails || []);
        } else {
          setEmails(prev => [...prev, ...(data.emails || [])]);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Erro ao carregar emails:', error);
        toast.error('Erro ao carregar emails');
      } finally {
        setLoading(false);
      }
    },
    [canView, search, template, successFilter, range, nextCursor]
  );

  useEffect(() => {
    if (canView && status === 'authenticated') {
      loadEmails(true);
    }
  }, [canView, status, search, template, successFilter, range, loadEmails]);

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
        Você não tem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-12 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Emails Enviados
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Visualize todos os emails enviados pelo sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Buscar por email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={successFilter} onValueChange={setSuccessFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sucesso</SelectItem>
                  <SelectItem value="false">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Template</Label>
            <Input
              placeholder="Filtrar por template..."
              value={template}
              onChange={e => setTemplate(e.target.value)}
            />
          </div>
          <div>
            <Label>Período</Label>
            <DateRangeMini
              value={range}
              onChange={setRange}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setTemplate('');
                setSuccessFilter(undefined);
                setRange({});
              }}
            >
              Limpar
            </Button>
            <Button variant="outline" onClick={() => loadEmails(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emails Enviados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Contexto</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum email encontrado
                  </TableCell>
                </TableRow>
              ) : (
                emails.map(email => (
                  <TableRow key={email.id}>
                    <TableCell>
                      {new Date(email.sentAt).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {email.to}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={email.subject}>
                        {email.subject}
                      </div>
                    </TableCell>
                    <TableCell>
                      {email.template ? (
                        <Badge variant="outline">{email.template}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {email.context ? (
                        <Badge variant="secondary">
                          {email.context}
                          {email.contextId && ` #${email.contextId.substring(0, 8)}`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {email.success ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Enviado
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <XCircle className="mr-1 h-3 w-3" />
                          Erro
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => loadEmails(false)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Carregar mais
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

