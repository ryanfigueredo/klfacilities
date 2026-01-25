'use client';

import { useState, useEffect } from 'react';
import { removeLeadsterScript } from '@/components/landing/LeadsterIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Clock, Download, ArrowLeft, Pen } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignaturePad } from '@/components/ui/signature-pad';
import { useSession } from 'next-auth/react';

interface ChecklistVisualizarClientProps {
  resposta: any;
}

export function ChecklistVisualizarClient({
  resposta,
}: ChecklistVisualizarClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [showAssinaturaGerenteDialog, setShowAssinaturaGerenteDialog] = useState(false);
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);

  // Remover Leadster ao montar o componente
  useEffect(() => {
    removeLeadsterScript();
    // Remover periodicamente para garantir que não apareça
    const interval = setInterval(() => {
      removeLeadsterScript();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadPDF = async () => {
    try {
      setBaixandoId(resposta.id);
      const response = await fetch(
        `/api/checklists-operacionais/${resposta.id}/pdf`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-${resposta.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao baixar PDF');
    } finally {
      setBaixandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/operacional/checklists">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">
            {resposta.template.titulo}
          </h1>
          <p className="text-sm text-muted-foreground">
            {resposta.unidade.nome}
            {resposta.grupo && ` · ${resposta.grupo.nome}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={
              resposta.status === 'CONCLUIDO'
                ? 'default'
                : 'secondary'
            }
            className={
              resposta.status === 'CONCLUIDO'
                ? 'bg-green-100 text-green-800'
                : ''
            }
          >
            {resposta.status === 'CONCLUIDO'
              ? 'Concluído'
              : 'Rascunho'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPDF}
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
        </div>
      </div>

      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Supervisor</p>
              <p className="font-medium">{resposta.supervisor.name}</p>
              <p className="text-xs text-muted-foreground">{resposta.supervisor.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data de Conclusão</p>
              <p className="font-medium">
                {new Date(resposta.submittedAt || resposta.createdAt).toLocaleString('pt-BR')}
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
                Observações Gerais
              </p>
              <p className="text-sm">{resposta.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Respostas por Grupo */}
      {resposta.template.grupos.map((grupo: any) => {
        const respostasGrupo = resposta.respostas.filter((r: any) =>
          grupo.perguntas.some((p: any) => p.id === r.pergunta.id)
        );

        if (respostasGrupo.length === 0) return null;

        return (
          <Card key={grupo.id}>
            <CardHeader>
              <CardTitle>{grupo.titulo}</CardTitle>
              {grupo.descricao && (
                <p className="text-sm text-muted-foreground">{grupo.descricao}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {grupo.perguntas.map((pergunta: any) => {
                const respostaPergunta = resposta.respostas.find(
                  (r: any) => r.pergunta.id === pergunta.id
                );

                if (!respostaPergunta) return null;

                return (
                  <div key={pergunta.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {pergunta.ordem}. {pergunta.titulo}
                        </p>
                        {pergunta.descricao && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {pergunta.descricao}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      {pergunta.tipo === 'BOOLEANO' && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              respostaPergunta.valorBoolean ? 'default' : 'destructive'
                            }
                            className={
                              respostaPergunta.valorBoolean
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {respostaPergunta.valorBoolean ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                CONFORME
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                NÃO CONFORME
                              </>
                            )}
                          </Badge>
                        </div>
                      )}

                      {pergunta.tipo === 'TEXTO' && (
                        <p className="text-sm">{respostaPergunta.valorTexto || 'Não informado'}</p>
                      )}

                      {pergunta.tipo === 'NUMERICO' && (
                        <p className="text-sm font-medium">
                          {respostaPergunta.valorNumero ?? 'Não informado'}
                        </p>
                      )}

                      {pergunta.tipo === 'SELECAO' && (
                        <p className="text-sm">{respostaPergunta.valorOpcao || 'Não informado'}</p>
                      )}

                      {/* Exibir fotos para qualquer tipo de pergunta que tenha foto anexada */}
                      {respostaPergunta.fotoUrl && (() => {
                        // Processar múltiplas fotos (quando fotoUrl é JSON array)
                        let fotos: string[] = [];
                        try {
                          const parsed = JSON.parse(respostaPergunta.fotoUrl);
                          if (Array.isArray(parsed)) {
                            fotos = parsed;
                          } else {
                            fotos = [respostaPergunta.fotoUrl];
                          }
                        } catch {
                          // Se não for JSON, é uma única foto
                          fotos = [respostaPergunta.fotoUrl];
                        }

                        return (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              {fotos.length > 1 ? `${fotos.length} fotos anexadas:` : 'Foto anexada:'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {fotos.map((fotoUrl, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={fotoUrl}
                                    alt={`Foto ${index + 1} da pergunta "${pergunta.titulo}"`}
                                    className="w-full h-48 object-cover rounded-md border-2 border-border hover:border-primary transition-colors cursor-pointer"
                                    onClick={() => {
                                      // Abrir foto em modal ou nova aba
                                      window.open(fotoUrl, '_blank');
                                    }}
                                  />
                                  {fotos.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                      {index + 1}/{fotos.length}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {respostaPergunta.observacao && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Observação: {respostaPergunta.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Assinatura do Supervisor */}
      <Card>
        <CardHeader>
          <CardTitle>Assinatura do Supervisor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supervisor</p>
              <p className="text-base font-semibold">{resposta.supervisor.name}</p>
              <p className="text-xs text-muted-foreground">{resposta.supervisor.email}</p>
            </div>
            {resposta.assinaturaFotoUrl ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Foto de Assinatura:</p>
                <img
                  src={resposta.assinaturaFotoUrl}
                  alt="Assinatura do supervisor"
                  className="w-full max-w-xs h-auto rounded-md border-2 border-border"
                />
                {resposta.submittedAt && (
                  <p className="text-xs text-muted-foreground">
                    Assinado em: {new Date(resposta.submittedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Assinatura não disponível
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assinatura do Gerente */}
      <Card>
        <CardHeader>
          <CardTitle>Assinatura do Gerente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resposta.gerenteAssinaturaFotoUrl ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Assinatura:</p>
                <img
                  src={resposta.gerenteAssinaturaFotoUrl}
                  alt="Assinatura do gerente"
                  className="w-full max-w-xs h-auto rounded-md border-2 border-border bg-white"
                />
                {resposta.gerenteAssinadoEm && (
                  <p className="text-xs text-muted-foreground">
                    Assinado em: {new Date(resposta.gerenteAssinadoEm).toLocaleString('pt-BR')}
                  </p>
                )}
                {resposta.gerenteAssinadoPor && (
                  <p className="text-xs text-muted-foreground">
                    Assinado por: {resposta.gerenteAssinadoPor.name}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground italic">
                  Assinatura do gerente pendente
                </p>
                {(session?.user?.role === 'MASTER' || session?.user?.role === 'ADMIN' || session?.user?.role === 'OPERACIONAL') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAssinaturaGerenteDialog(true)}
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    Assinar como Gerente
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Assinatura do Gerente */}
      <Dialog open={showAssinaturaGerenteDialog} onOpenChange={setShowAssinaturaGerenteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assinatura do Gerente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assine na tela abaixo para confirmar a visualização deste relatório.
            </p>
            <SignaturePad
              onSave={async (signatureDataUrl) => {
                try {
                  setSalvandoAssinatura(true);
                  const response = await fetch(
                    `/api/checklists-operacionais/respostas/${resposta.id}/assinatura-gerente`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ assinaturaDataUrl: signatureDataUrl }),
                    }
                  );

                  if (!response.ok) {
                    throw new Error('Erro ao salvar assinatura');
                  }

                  toast.success('Assinatura salva com sucesso!');
                  setShowAssinaturaGerenteDialog(false);
                  // Recarregar a página para mostrar a assinatura
                  router.refresh();
                } catch (error) {
                  console.error(error);
                  toast.error('Erro ao salvar assinatura. Tente novamente.');
                } finally {
                  setSalvandoAssinatura(false);
                }
              }}
              onCancel={() => setShowAssinaturaGerenteDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmações de Clientes Finais */}
      {resposta.status === 'CONCLUIDO' && resposta.confirmacoesRelatorio && resposta.confirmacoesRelatorio.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmações de Clientes Finais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resposta.confirmacoesRelatorio.map((confirmacao: any) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

