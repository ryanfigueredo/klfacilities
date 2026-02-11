'use client';

import { useState, useEffect, useMemo } from 'react';
import { removeLeadsterScript } from '@/components/landing/LeadsterIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle2, Clock, Mail, FileText, Download, Search, Eye, Trash, Archive, PlayCircle, User } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ClienteFinal {
  id: string;
  nome: string;
  email: string;
}

interface Confirmacao {
  id: string;
  confirmado: boolean;
  confirmadoEm: string | null;
  clienteFinal: ClienteFinal;
}

interface Resposta {
  id: string;
  template: {
    id: string;
    titulo: string;
    descricao: string | null;
  };
  unidade: {
    id: string;
    nome: string;
  };
  grupo: {
    id: string;
    nome: string;
  } | null;
  supervisor: {
    id: string;
    name: string;
    email: string;
  };
  observacoes: string | null;
  protocolo: string | null;
  status: 'RASCUNHO' | 'PENDENTE_APROVACAO' | 'CONCLUIDO';
  escopoId: string;
  submittedAt: string;
  createdAt: string;
  confirmacoes: Confirmacao[];
}

interface ChecklistsRespondidosClientProps {
  respostasIniciais: Resposta[];
  userRole: string;
}

interface Grupo {
  id: string;
  nome: string;
  ativo: boolean;
}

export function ChecklistsRespondidosClient({
  respostasIniciais,
  userRole,
}: ChecklistsRespondidosClientProps) {
  const [respostas, setRespostas] = useState<Resposta[]>(respostasIniciais);
  const [loading, setLoading] = useState(false);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  // Remover Leadster ao montar o componente e corrigir footer azul
  useEffect(() => {
    removeLeadsterScript();
    
    // Adicionar estilo global para remover elementos azuis do footer
    const styleId = 'remove-blue-footer-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Remover elementos azuis do footer */
        [style*="background-color: rgb(0, 0, 255)"],
        [style*="background-color: #0000ff"],
        [style*="background-color: blue"],
        [style*="background: rgb(0, 0, 255)"],
        [style*="background: #0000ff"],
        [style*="background: blue"] {
          display: none !important;
        }
        
        /* Garantir que elementos fixos no bottom sejam brancos */
        [style*="position: fixed"][style*="bottom"] {
          background-color: white !important;
          background: white !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Função para remover elementos azuis do footer
    const removeBlueFooter = () => {
      // Remover elementos fixos azuis no footer
      const blueElements = document.querySelectorAll('[style*="background-color: rgb(0, 0, 255)"], [style*="background-color: #0000ff"], [style*="background-color: blue"], [style*="background: rgb(0, 0, 255)"], [style*="background: #0000ff"], [style*="background: blue"]');
      blueElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.display = 'none';
          el.remove();
        }
      });

      // Remover elementos com position fixed no bottom que sejam azuis
      const fixedElements = document.querySelectorAll('[style*="position: fixed"][style*="bottom"]');
      fixedElements.forEach(el => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el);
          const bgColor = style.backgroundColor;
          if (bgColor && (bgColor.includes('rgb(0, 0, 255)') || bgColor.includes('rgb(0, 0, 255)') || bgColor.includes('blue'))) {
            el.style.display = 'none';
            el.remove();
          }
        }
      });
    };

    removeBlueFooter();
    
    // Remover periodicamente para garantir que não apareça
    const interval = setInterval(() => {
      removeLeadsterScript();
      removeBlueFooter();
    }, 2000);
    return () => {
      clearInterval(interval);
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>('');
  const [selectedMes, setSelectedMes] = useState<string>('');
  const [exportando, setExportando] = useState(false);
  const isMaster = userRole === 'MASTER';

  // Buscar grupos ao montar o componente
  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const response = await fetch('/api/grupos');
        if (response.ok) {
          const data = await response.json();
          setGrupos(data.data?.filter((g: Grupo) => g.ativo) || []);
        }
      } catch (error) {
        console.error('Erro ao buscar grupos:', error);
      }
    };
    fetchGrupos();
  }, []);

  // Gerar lista de meses (últimos 12 meses)
  const meses = useMemo(() => {
    const mesesList = [];
    const hoje = new Date();
    for (let i = 0; i < 12; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      const mesLabel = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      mesesList.push({ value: mesStr, label: mesLabel });
    }
    return mesesList;
  }, []);

  // Filtro por status: concluídos, em aberto ou todos
  type FiltroStatus = 'concluidos' | 'abertos' | 'todos';
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('concluidos');

  // Aplicar filtro de status primeiro
  const respostasPorStatus = useMemo(() => {
    if (filtroStatus === 'todos') return respostas;
    if (filtroStatus === 'concluidos') {
      return respostas.filter(r => r.status === 'CONCLUIDO');
    }
    return respostas.filter(
      r => r.status === 'RASCUNHO' || r.status === 'PENDENTE_APROVACAO'
    );
  }, [respostas, filtroStatus]);

  // Filtrar respostas baseado no termo de busca (sobre respostasPorStatus)
  const respostasFiltradasPorBusca = useMemo(() => {
    if (!searchTerm.trim()) return respostasPorStatus;
    const term = searchTerm.toLowerCase().trim();
    return respostasPorStatus.filter(resposta => {
      if (resposta.grupo?.nome.toLowerCase().includes(term)) return true;
      if (resposta.unidade.nome.toLowerCase().includes(term)) return true;
      if (resposta.supervisor.name.toLowerCase().includes(term)) return true;
      if (resposta.supervisor.email.toLowerCase().includes(term)) return true;
      if (resposta.template.titulo.toLowerCase().includes(term)) return true;
      if (resposta.protocolo?.toLowerCase().includes(term)) return true;
      return false;
    });
  }, [respostasPorStatus, searchTerm]);

  // Supervisores únicos (para abas), ordenados por nome
  const supervisoresUnicos = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    respostasFiltradasPorBusca.forEach(r => {
      if (!map.has(r.supervisor.id)) {
        map.set(r.supervisor.id, {
          id: r.supervisor.id,
          name: r.supervisor.name,
          email: r.supervisor.email,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [respostasFiltradasPorBusca]);

  // Aba ativa: 'todos' ou id do supervisor
  const [abaSupervisorId, setAbaSupervisorId] = useState<string>('todos');

  // Respostas exibidas conforme a aba (busca já aplicada)
  const respostasPorAba = useMemo(() => {
    if (abaSupervisorId === 'todos') return respostasFiltradasPorBusca;
    return respostasFiltradasPorBusca.filter(r => r.supervisor.id === abaSupervisorId);
  }, [respostasFiltradasPorBusca, abaSupervisorId]);

  const handleDelete = async (respostaId: string) => {
    if (!confirm('Tem certeza que deseja excluir este checklist? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setDeletandoId(respostaId);
      const response = await fetch(
        `/api/checklists-operacionais/${respostaId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao excluir checklist');
      }

      toast.success('Checklist excluído com sucesso!');
      setRespostas(prev => prev.filter(r => r.id !== respostaId));
    } catch (error) {
      console.error('Erro ao excluir checklist:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao excluir checklist'
      );
    } finally {
      setDeletandoId(null);
    }
  };

  const handleDownloadPDF = async (respostaId: string) => {
    try {
      setBaixandoId(respostaId);
      const response = await fetch(
        `/api/checklists-operacionais/${respostaId}/pdf`,
        { 
          method: 'GET',
          headers: {
            'Accept': 'application/pdf',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gerar PDF');
      }

      const blob = await response.blob();
      
      // Verificar se é realmente um PDF
      if (blob.type !== 'application/pdf' && !blob.type.includes('pdf')) {
        // Tentar ler como JSON para ver se há erro
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || 'Erro ao gerar PDF');
        } catch {
          throw new Error('Resposta não é um PDF válido');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-${respostaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar após um tempo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao baixar PDF'
      );
    } finally {
      setBaixandoId(null);
    }
  };

  const handleExportBatch = async () => {
    if (!selectedGrupoId || !selectedMes) {
      toast.error('Selecione o grupo e o mês para exportar');
      return;
    }

    try {
      setExportando(true);
      const response = await fetch(
        `/api/checklists-operacionais/export/batch?grupoId=${encodeURIComponent(selectedGrupoId)}&mes=${encodeURIComponent(selectedMes)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/zip',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao exportar PDFs');
      }

      const blob = await response.blob();
      
      // Verificar se é realmente um ZIP
      if (blob.type !== 'application/zip' && !blob.type.includes('zip')) {
        // Tentar ler como JSON para ver se há erro
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || 'Erro ao exportar PDFs');
        } catch {
          throw new Error('Resposta não é um ZIP válido');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const grupoNome = grupos.find(g => g.id === selectedGrupoId)?.nome || 'grupo';
      a.download = `checklists-${grupoNome.replace(/[^a-zA-Z0-9]/g, '_')}-${selectedMes}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar após um tempo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast.success('PDFs exportados com sucesso!');
      setExportDialogOpen(false);
      setSelectedGrupoId('');
      setSelectedMes('');
    } catch (error) {
      console.error('Erro ao exportar PDFs:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao exportar PDFs'
      );
    } finally {
      setExportando(false);
    }
  };

  const countConcluidos = respostas.filter(r => r.status === 'CONCLUIDO').length;
  const countAbertos = respostas.filter(
    r => r.status === 'RASCUNHO' || r.status === 'PENDENTE_APROVACAO'
  ).length;

  const totalConfirmacoes = respostasPorAba.reduce(
    (acc, r) => acc + r.confirmacoes.length,
    0
  );
  const totalConfirmadas = respostasPorAba.reduce(
    (acc, r) =>
      acc + r.confirmacoes.filter(c => c.confirmado).length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/40 rounded-lg p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Checklists Respondidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize e filtre por status, supervisor e busca
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-border bg-card shadow-sm">
                <Archive className="h-4 w-4 mr-2" />
                Exportar em Lote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Checklists em Lote</DialogTitle>
                <DialogDescription>
                  Selecione o grupo e o mês para exportar todos os checklists respondidos em um arquivo ZIP.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="grupo">Grupo</Label>
                  <Select value={selectedGrupoId} onValueChange={setSelectedGrupoId}>
                    <SelectTrigger id="grupo">
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map(grupo => (
                        <SelectItem key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mes">Mês</Label>
                  <Select value={selectedMes} onValueChange={setSelectedMes}>
                    <SelectTrigger id="mes">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map(mes => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setExportDialogOpen(false);
                    setSelectedGrupoId('');
                    setSelectedMes('');
                  }}
                  disabled={exportando}
                >
                  Cancelar
                </Button>
                <Button onClick={handleExportBatch} disabled={exportando || !selectedGrupoId || !selectedMes}>
                  {exportando ? 'Exportando...' : 'Exportar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por grupo, unidade, supervisor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Filtro por status */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Status</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtroStatus === 'concluidos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('concluidos')}
              className="gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluídos ({countConcluidos})
            </Button>
            <Button
              variant={filtroStatus === 'abertos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('abertos')}
              className="gap-1.5"
            >
              <Clock className="h-4 w-4" />
              Em aberto ({countAbertos})
            </Button>
            <Button
              variant={filtroStatus === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus('todos')}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Todos ({respostas.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Abas por supervisor — destaque visual */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supervisor</p>
            <p className="text-sm text-foreground/80 mt-0.5">Clique em um nome para ver só os relatórios dele(a)</p>
          </div>
          <Tabs value={abaSupervisorId} onValueChange={setAbaSupervisorId} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-2 rounded-none border-0 border-t border-border bg-slate-100 dark:bg-slate-800/60 p-3 w-full justify-start">
              <TabsTrigger
                value="todos"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md px-4 py-2 rounded-lg font-medium"
              >
                <FileText className="h-4 w-4 shrink-0" />
                Todos ({respostasFiltradasPorBusca.length})
              </TabsTrigger>
              {supervisoresUnicos.map(sup => {
                const count = respostasFiltradasPorBusca.filter(r => r.supervisor.id === sup.id).length;
                return (
                  <TabsTrigger
                    key={sup.id}
                    value={sup.id}
                    className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md px-4 py-2 rounded-lg font-medium border border-transparent data-[state=inactive]:border-border data-[state=inactive]:bg-card data-[state=inactive]:text-foreground"
                    title={sup.name}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate max-w-[160px]">{sup.name}</span>
                    <span className="tabular-nums opacity-80">({count})</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Estatísticas (referentes à aba selecionada) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Checklists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{respostasPorAba.length}</div>
            {abaSupervisorId !== 'todos' && (
              <p className="text-xs text-muted-foreground mt-1">
                deste supervisor
              </p>
            )}
            {searchTerm && (
              <p className="text-xs text-muted-foreground mt-1">
                de {respostas.length} total
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmações Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalConfirmacoes}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmações Recebidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totalConfirmadas}
            </div>
            {totalConfirmacoes > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((totalConfirmadas / totalConfirmacoes) * 100)}% de confirmação
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Checklists */}
      <div className="space-y-4">
        {respostasPorAba.length === 0 ? (
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {searchTerm
                      ? 'Nenhum checklist encontrado com os filtros aplicados'
                      : filtroStatus === 'concluidos'
                        ? 'Nenhum checklist concluído'
                        : filtroStatus === 'abertos'
                          ? 'Nenhum checklist em aberto'
                          : 'Nenhum checklist encontrado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {searchTerm
                      ? 'Tente ajustar os termos de busca'
                      : 'Altere o filtro (Concluídos / Em aberto / Todos) ou aguarde novos envios'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          respostasPorAba.map(resposta => (
            <Card key={resposta.id} className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{resposta.template.titulo}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {resposta.unidade.nome}
                      {resposta.grupo && ` · ${resposta.grupo.nome}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {resposta.status === 'CONCLUIDO' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprovado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Em aberto
                      </Badge>
                    )}
                    {isMaster && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(resposta.id)}
                        disabled={deletandoId === resposta.id}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir checklist"
                      >
                        {deletandoId === resposta.id ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Supervisor</p>
                    <p className="font-medium">{resposta.supervisor.name}</p>
                    <p className="text-xs text-muted-foreground">{resposta.supervisor.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Último envio</p>
                    <p className="font-medium">
                      {new Date(resposta.submittedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {resposta.protocolo && (
                    <div>
                      <p className="text-muted-foreground">Protocolo</p>
                      <p className="font-medium font-mono text-xs">{resposta.protocolo}</p>
                    </div>
                  )}
                </div>

                {resposta.observacoes && (
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Observações
                    </p>
                    <p className="text-sm">{resposta.observacoes}</p>
                  </div>
                )}

                {/* Confirmações de Clientes Finais */}
                {resposta.confirmacoes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Confirmações de Clientes Finais</p>
                    <div className="space-y-2">
                      {resposta.confirmacoes.map(confirmacao => (
                        <div
                          key={confirmacao.id}
                          className="flex items-center justify-between p-2 rounded-md border bg-card"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {confirmacao.clienteFinal.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {confirmacao.clienteFinal.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {confirmacao.confirmado ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-green-600">
                                  Confirmado{' '}
                                  {confirmacao.confirmadoEm &&
                                    new Date(confirmacao.confirmadoEm).toLocaleDateString('pt-BR')}
                                </span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-orange-600" />
                                <span className="text-xs text-orange-600">Pendente</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  {/* Permitir Master e Operacional verem checklists não concluídos */}
                  {(userRole === 'MASTER' || userRole === 'OPERACIONAL' || resposta.status === 'CONCLUIDO') && (
                    <>
                      <Link href={`/operacional/checklists/visualizar/${resposta.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Checklist
                        </Button>
                      </Link>
                      {resposta.status === 'CONCLUIDO' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(resposta.id)}
                          disabled={baixandoId === resposta.id}
                        >
                          {baixandoId === resposta.id ? (
                            'Gerando...'
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Baixar PDF
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                  {resposta.status !== 'CONCLUIDO' && userRole !== 'MASTER' && userRole !== 'OPERACIONAL' && (
                    <Link href={`/operacional/checklists/responder/${resposta.escopoId}?respostaId=${resposta.id}`}>
                      <Button size="sm" variant="default">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Continuar Checklist
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

