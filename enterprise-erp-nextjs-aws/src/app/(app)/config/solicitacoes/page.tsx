'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Users, RotateCcw, Mail, AlertTriangle } from 'lucide-react';
import { hasRouteAccess } from '@/lib/rbac';
import { toast } from 'sonner';

type PendenciaClienteFinal = {
  respostaId: string;
  templateTitulo: string;
  unidadeNome: string;
  grupoNome: string | null;
  grupoId: string | null;
  supervisorNome: string | null;
  submittedAt: string;
  protocolo: string | null;
};

type PendenciaPorGrupo = {
  grupoId: string;
  grupoNome: string;
  count: number;
  pendencias: PendenciaClienteFinal[];
};

export default function ConfigSolicitacoesPage() {
  const { data: session } = useSession();
  const canView = hasRouteAccess(session?.user?.role as any, ['MASTER']);
  const [loadingPendencias, setLoadingPendencias] = useState(true);
  const [pendencias, setPendencias] = useState<{
    total: number;
    porGrupo: PendenciaPorGrupo[];
    pendencias: PendenciaClienteFinal[];
  } | null>(null);

  useEffect(() => {
    if (!canView) return;

    async function loadPendencias() {
      try {
        setLoadingPendencias(true);
        const response = await fetch('/api/checklists-operacionais/sem-cliente-final');
        if (!response.ok) {
          throw new Error('Erro ao carregar pendências');
        }
        const data = await response.json();
        setPendencias(data);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar pendências de cliente final');
      } finally {
        setLoadingPendencias(false);
      }
    }

    loadPendencias();
  }, [canView]);

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            Somente usuários com perfil MASTER podem visualizar as solicitações.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Cliente Final não informado */}
      {pendencias && pendencias.total > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="h-5 w-5" />
              Cliente Final Não Informado
            </CardTitle>
            <CardDescription className="text-orange-800">
              {pendencias.total} checklist(s) concluído(s) sem cliente final cadastrado - email não enviado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendencias.porGrupo.map(grupo => (
                <div key={grupo.grupoId || 'sem-grupo'} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-orange-900">
                        {grupo.grupoNome}
                      </p>
                      <p className="text-sm text-orange-700">
                        {grupo.count} checklist(s) pendente(s)
                      </p>
                    </div>
                  </div>
                  {grupo.pendencias.length > 0 && (
                    <div className="ml-4 space-y-1 text-sm text-orange-800">
                      {grupo.pendencias.slice(0, 3).map(pendencia => (
                        <div key={pendencia.respostaId} className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>
                            {pendencia.templateTitulo} - {pendencia.unidadeNome} (
                            {new Date(pendencia.submittedAt).toLocaleDateString('pt-BR')})
                          </span>
                        </div>
                      ))}
                      {grupo.pendencias.length > 3 && (
                        <p className="text-xs text-orange-600">
                          + {grupo.pendencias.length - 3} mais...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Exclusão de Colaboradores
          </CardTitle>
          <CardDescription>
            Aprove ou rejeite solicitações enviadas pelo RH para remover colaboradores do ponto digital.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="text-sm text-muted-foreground">
            Histórico completo das solicitações e rastreabilidade das decisões.
          </div>
          <Link href="/config/solicitacoes/colaboradores">
            <Button>Ver solicitações</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Descartes de Currículos
          </CardTitle>
          <CardDescription>
            Monitore descartes realizados no Banco de Talentos e reverta alterações indevidas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="text-sm text-muted-foreground">
            Veja quem realizou o descarte, quando ocorreu e reverta se necessário.
          </div>
          <Link href="/config/solicitacoes/curriculos">
            <Button variant="outline">Abrir painel</Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Governança e Rastreabilidade
          </CardTitle>
          <CardDescription>
            Todas as ações ficam registradas na auditoria e podem ser revertidas pelo MASTER.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Utilize estas ferramentas para garantir que exclusões e descartes sejam feitos de forma controlada e
            reversível. Qualquer alteração realizada por supervisores ou operacional pode ser revertida aqui.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}


