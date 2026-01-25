'use client';

import { useEffect, useState } from 'react';
import { Bell, MessageSquare, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

type DueItem = {
  id: string;
  descricao: string;
  dataVenc: string;
  valor: number;
};

type ManifestacaoItem = {
  id: string;
  tipo: string;
  mensagem: string;
  funcionarioNome: string | null;
  grupoNome: string;
  unidadeNome: string;
  createdAt: string;
};

export function NotificationsBell() {
  const [total, setTotal] = useState(0);
  const [provisoes, setProvisoes] = useState<DueItem[]>([]);
  const [manifestacoes, setManifestacoes] = useState<ManifestacaoItem[]>([]);
  const [provisoesCount, setProvisoesCount] = useState(0);
  const [manifestacoesCount, setManifestacoesCount] = useState(0);

  const load = async () => {
    try {
      const r = await fetch('/api/notifications');
      const j = await r.json();
      setTotal(Number(j?.total || 0));
      setProvisoesCount(Number(j?.provisoes?.venceHoje || 0));
      setManifestacoesCount(Number(j?.manifestacoes?.pendentes || 0));
      setProvisoes(Array.isArray(j?.provisoes?.items) ? j.provisoes.items : []);
      setManifestacoes(Array.isArray(j?.manifestacoes?.items) ? j.manifestacoes.items : []);
    } catch {}
  };

  useEffect(() => {
    load();
    // Recarregar a cada 30 segundos
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const onConfirm = async (id: string) => {
    await fetch(`/api/provisionamentos/${id}/pagar`, { method: 'POST' });
    load();
  };
  const onCancel = async (id: string) => {
    await fetch(`/api/provisionamentos/${id}/cancelar`, { method: 'POST' });
    load();
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'ELOGIO':
        return 'Elogio';
      case 'SUGESTAO':
        return 'Sugestão';
      case 'DENUNCIA':
        return 'Denúncia';
      default:
        return tipo;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ELOGIO':
        return 'text-green-600';
      case 'SUGESTAO':
        return 'text-blue-600';
      case 'DENUNCIA':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-600 text-white text-[10px] px-1 flex items-center justify-center">
              {total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-y-auto">
        <DropdownMenuLabel>Notificações ({total})</DropdownMenuLabel>
        
        {provisoesCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Provisões de hoje ({provisoesCount})
            </DropdownMenuLabel>
            {provisoes.length === 0 ? (
              <DropdownMenuItem disabled>Nenhuma provisão hoje</DropdownMenuItem>
            ) : (
              provisoes.map(it => (
                <DropdownMenuItem key={it.id} className="block whitespace-normal">
                  <div className="text-sm font-medium">{it.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(it.dataVenc).toLocaleDateString('pt-BR')} •{' '}
                    {it.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => onConfirm(it.id)}>
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onCancel(it.id)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </>
        )}

        {manifestacoesCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Manifestações pendentes ({manifestacoesCount})
            </DropdownMenuLabel>
            {manifestacoes.length === 0 ? (
              <DropdownMenuItem disabled>Nenhuma manifestação pendente</DropdownMenuItem>
            ) : (
              manifestacoes.map(m => (
                <DropdownMenuItem 
                  key={m.id} 
                  className="block whitespace-normal"
                  asChild
                >
                  <Link 
                    href="/config/manifestacoes" 
                    className="block w-full"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className={`h-4 w-4 mt-0.5 ${getTipoColor(m.tipo)}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          <span className={getTipoColor(m.tipo)}>
                            {getTipoLabel(m.tipo)}
                          </span>
                          {m.funcionarioNome && (
                            <span className="text-muted-foreground ml-1">
                              • {m.funcionarioNome}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {m.mensagem}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {m.grupoNome} • {m.unidadeNome}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(m.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </>
        )}

        {total === 0 && (
          <DropdownMenuItem disabled>Nenhuma notificação</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
