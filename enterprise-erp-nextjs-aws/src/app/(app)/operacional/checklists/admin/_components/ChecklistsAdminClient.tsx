'use client';

import { useEffect, useMemo, useState } from 'react';
import { removeLeadsterScript } from '@/components/landing/LeadsterIntegration';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Trash2, X, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ChecklistPerguntaTipo =
  | 'TEXTO'
  | 'FOTO'
  | 'BOOLEANO'
  | 'NUMERICO'
  | 'SELECAO';

function createTempId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `tmp_${Math.random().toString(36).slice(2, 11)}`;
}

type PerguntaModel = {
  tempId: string;
  id?: string;
  titulo: string;
  descricao: string;
  tipo: ChecklistPerguntaTipo;
  obrigatoria: boolean;
  instrucoes: string;
  opcoes: string[];
  peso?: number | null; // Peso da pergunta (1-5)
  permiteMultiplasFotos?: boolean; // Permite múltiplas fotos quando tipo é FOTO
  permiteAnexarFoto?: boolean; // Permite anexar foto em qualquer tipo de pergunta
};

type GrupoModel = {
  tempId: string;
  id?: string;
  titulo: string;
  descricao: string;
  perguntas: PerguntaModel[];
};

type TemplateModel = {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  grupos: Array<{
    id: string;
    titulo: string;
    descricao: string | null;
    ordem: number;
    perguntas: Array<{
      id: string;
      titulo: string;
      descricao: string | null;
      tipo: ChecklistPerguntaTipo;
      obrigatoria: boolean;
      ordem: number;
      instrucoes: string | null;
      opcoes: string[];
      peso: number | null;
      permiteMultiplasFotos: boolean;
      permiteAnexarFoto: boolean;
    }>;
  }>;
  escopos: Array<{
    id: string;
    ativo: boolean;
    unidade: { id: string; nome: string } | null;
    grupo: { id: string; nome: string } | null;
    ultimoEnvioEm: string | null;
  }>;
  stats: {
    escopos: number;
    respostas: number;
  };
};

type UnidadeOption = {
  id: string;
  nome: string;
  grupoNome?: string;
  grupoIds: string[];
  cidade?: string | null;
  estado?: string | null;
  grupos?: Array<{ id: string | null; nome: string | null }>;
};

type SupervisorOption = {
  id: string;
  nome: string;
  email: string;
};

type SupervisorScopeAssignment = {
  supervisorId: string;
  grupoId?: string | null;
  unidadeId?: string | null;
};

function buildEmptyPergunta(): PerguntaModel {
  return {
    tempId: createTempId(),
    titulo: '',
    descricao: '',
    tipo: 'TEXTO',
    obrigatoria: false,
    instrucoes: '',
    opcoes: [],
      peso: null,
      permiteMultiplasFotos: false,
      permiteAnexarFoto: false,
    };
  }

function buildEmptyGrupo(): GrupoModel {
  return {
    tempId: createTempId(),
    titulo: '',
    descricao: '',
    perguntas: [buildEmptyPergunta()],
  };
}

export function ChecklistsAdminClient() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Remover Leadster ao montar o componente
  useEffect(() => {
    removeLeadsterScript();
    // Remover periodicamente para garantir que não apareça
    const interval = setInterval(() => {
      removeLeadsterScript();
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateModel | null>(
    null
  );
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [assignmentsTemplate, setAssignmentsTemplate] =
    useState<TemplateModel | null>(null);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [customizeTemplate, setCustomizeTemplate] =
    useState<TemplateModel | null>(null);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const response = await fetch('/api/checklists-operacionais/templates', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Falha ao carregar templates');
      }
      const data = await response.json();
      setTemplates(data.templates ?? []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os modelos de checklist.');
      toast.error('Não foi possível carregar os modelos de checklist.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  function handleCreateTemplate() {
    setEditingTemplate(null);
    setEditorOpen(true);
  }

  function handleEditTemplate(template: TemplateModel) {
    setEditingTemplate(template);
    setEditorOpen(true);
  }

  function handleManageAssignments(template: TemplateModel) {
    setAssignmentsTemplate(template);
    setAssignmentsOpen(true);
  }

  const totalTemplates = useMemo(() => templates.length, [templates]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Modelos de Checklists
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie modelos, organize perguntas por seção e defina quais unidades
            precisam responder.
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>Novo checklist</Button>
      </div>

      <Separator />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="border border-border/50">
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : totalTemplates === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-muted-foreground">
              Nenhum checklist cadastrado ainda. Crie o primeiro modelo para
              iniciar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(template => (
            <Card
              key={template.id}
              className={cn(
                'flex h-full flex-col justify-between border',
                template.ativo
                  ? 'border-emerald-200/80 dark:border-emerald-500/40'
                  : 'border-border/60'
              )}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {template.titulo}
                  </CardTitle>
                  <Badge variant={template.ativo ? 'secondary' : 'outline'}>
                    {template.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {template.descricao && (
                  <p className="text-sm text-muted-foreground">
                    {template.descricao}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2 rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Seções</span>
                    <span>{template.grupos.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unidades vinculadas</span>
                    <span>{template.stats.escopos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Respostas registradas</span>
                    <span>{template.stats.respostas}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomizeTemplate(template);
                      setCustomizeDialogOpen(true);
                    }}
                  >
                    Personalizar unidade
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleManageAssignments(template)}
                  >
                    Vincular Unidades
                  </Button>
                  {template.stats.escopos === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `/api/checklists-operacionais/templates/${template.id}/escopos`,
                            {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ unidadeIds: [] }), // Array vazio = todas as unidades
                            }
                          );
                          if (!response.ok) throw new Error();
                          toast.success(
                            'Checklist ativado para todas as unidades ativas.'
                          );
                          fetchTemplates();
                        } catch (error) {
                          toast.error(
                            'Erro ao ativar checklist para todas as unidades.'
                          );
                        }
                      }}
                    >
                      Ativar para todas unidades
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `/api/checklists-operacionais/templates/${template.id}`,
                            {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ativo: !template.ativo }),
                            }
                          );
                          if (!response.ok) {
                            throw new Error(
                              'Não foi possível atualizar o status.'
                            );
                          }
                          toast.success('Status atualizado com sucesso.');
                          fetchTemplates();
                        } catch (err) {
                          console.error(err);
                          toast.error('Erro ao atualizar status do checklist.');
                        }
                      }}
                    >
                      {template.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      onClick={async () => {
                        if (
                          !confirm(
                            `Tem certeza que deseja excluir o checklist "${template.titulo}"? Esta ação não pode ser desfeita.`
                          )
                        ) {
                          return;
                        }
                        try {
                          const response = await fetch(
                            `/api/checklists-operacionais/templates/${template.id}`,
                            {
                              method: 'DELETE',
                            }
                          );
                          if (!response.ok) {
                            const error = await response
                              .json()
                              .catch(() => null);
                            throw new Error(
                              error?.message ||
                                'Não foi possível excluir o checklist.'
                            );
                          }
                          toast.success('Checklist excluído com sucesso.');
                          fetchTemplates();
                        } catch (err) {
                          console.error(err);
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao excluir checklist.'
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditorDialog
        open={editorOpen}
        template={editingTemplate}
        onOpenChange={open => setEditorOpen(open)}
        onSaved={() => {
          setEditorOpen(false);
          fetchTemplates();
        }}
      />

      <AssignmentsDialog
        open={assignmentsOpen}
        template={assignmentsTemplate}
        onOpenChange={open => setAssignmentsOpen(open)}
        onSaved={() => {
          setAssignmentsOpen(false);
          fetchTemplates();
        }}
      />

      <CustomizeTemplateDialog
        open={customizeDialogOpen}
        template={customizeTemplate}
        onOpenChange={open => setCustomizeDialogOpen(open)}
        onTemplateCreated={() => {
          setCustomizeDialogOpen(false);
          fetchTemplates();
        }}
      />
    </div>
  );
}

interface TemplateEditorDialogProps {
  open: boolean;
  template: TemplateModel | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function TemplateEditorDialog({
  open,
  template,
  onOpenChange,
  onSaved,
}: TemplateEditorDialogProps) {
  const isEditing = !!template;
  const [titulo, setTitulo] = useState(template?.titulo ?? '');
  const [descricao, setDescricao] = useState(template?.descricao ?? '');
  const [ativo, setAtivo] = useState(template?.ativo ?? true);
  const [grupos, setGrupos] = useState<GrupoModel[]>(
    template
      ? template.grupos.map(grupo => ({
          tempId: createTempId(),
          id: grupo.id,
          titulo: grupo.titulo,
          descricao: grupo.descricao ?? '',
          perguntas: grupo.perguntas.map(pergunta => ({
            tempId: createTempId(),
            id: pergunta.id,
            titulo: pergunta.titulo,
            descricao: pergunta.descricao ?? '',
            tipo: pergunta.tipo,
            obrigatoria: pergunta.obrigatoria,
            instrucoes: pergunta.instrucoes ?? '',
            opcoes: pergunta.opcoes ?? [],
            peso: pergunta.peso ?? null,
            permiteMultiplasFotos: pergunta.permiteMultiplasFotos ?? false,
            permiteAnexarFoto: pergunta.permiteAnexarFoto ?? false,
          })),
        }))
      : [buildEmptyGrupo()]
  );
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (template) {
      setTitulo(template.titulo);
      setDescricao(template.descricao ?? '');
      setAtivo(template.ativo);
      setGrupos(
        template.grupos.map(grupo => ({
          tempId: createTempId(),
          id: grupo.id,
          titulo: grupo.titulo,
          descricao: grupo.descricao ?? '',
          perguntas: grupo.perguntas.map(pergunta => ({
            tempId: createTempId(),
            id: pergunta.id,
            titulo: pergunta.titulo,
            descricao: pergunta.descricao ?? '',
            tipo: pergunta.tipo,
            obrigatoria: pergunta.obrigatoria,
            instrucoes: pergunta.instrucoes ?? '',
            opcoes: pergunta.opcoes ?? [],
            peso: pergunta.peso ?? null,
            permiteMultiplasFotos: pergunta.permiteMultiplasFotos ?? false,
            permiteAnexarFoto: pergunta.permiteAnexarFoto ?? false,
          })),
        }))
      );
    } else {
      setTitulo('');
      setDescricao('');
      setAtivo(true);
      setGrupos([buildEmptyGrupo()]);
    }
  }, [template, open]);

  // Não expandir automaticamente - apenas quando o usuário clicar

  function handleAddGrupo() {
    const novoGrupo = buildEmptyGrupo();
    setGrupos(prev => [...prev, novoGrupo]);
    // Expandir apenas a nova seção
    setExpandedSections(prev => new Set([...prev, novoGrupo.tempId]));
  }

  function handleRemoveGrupo(tempId: string) {
    setGrupos(prev => prev.filter(grupo => grupo.tempId !== tempId));
  }

  function handleAddPergunta(grupoTempId: string) {
    setGrupos(prev =>
      prev.map(grupo =>
        grupo.tempId === grupoTempId
          ? { ...grupo, perguntas: [...grupo.perguntas, buildEmptyPergunta()] }
          : grupo
      )
    );
  }

  function handleRemovePergunta(grupoTempId: string, perguntaTempId: string) {
    setGrupos(prev =>
      prev.map(grupo =>
        grupo.tempId === grupoTempId
          ? {
              ...grupo,
              perguntas: grupo.perguntas.filter(
                pergunta => pergunta.tempId !== perguntaTempId
              ),
            }
          : grupo
      )
    );
  }

  async function handleSave() {
    if (!titulo.trim()) {
      toast.error('Informe um título para o checklist.');
      return;
    }

    if (grupos.some(grupo => !grupo.titulo.trim())) {
      toast.error('Toda seção precisa de um título.');
      return;
    }

    if (
      grupos.some(grupo =>
        grupo.perguntas.some(pergunta => !pergunta.titulo.trim())
      )
    ) {
      toast.error('Toda pergunta precisa de um título.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        ativo,
        grupos: grupos.map((grupo, grupoIndex) => ({
          id: grupo.id, // Incluir ID do grupo para atualização inteligente
          titulo: grupo.titulo.trim(),
          descricao: grupo.descricao.trim() || undefined,
          ordem: grupoIndex,
          perguntas: grupo.perguntas.map((pergunta, perguntaIndex) => ({
            id: pergunta.id, // Incluir ID da pergunta para atualização inteligente
            titulo: pergunta.titulo.trim(),
            descricao: pergunta.descricao.trim() || undefined,
            tipo: pergunta.tipo,
            obrigatoria: pergunta.obrigatoria,
            ordem: perguntaIndex,
            instrucoes: pergunta.instrucoes.trim() || undefined,
            opcoes:
              pergunta.tipo === 'SELECAO'
                ? pergunta.opcoes.filter(Boolean)
                : undefined,
            peso: pergunta.peso ?? undefined,
            permiteMultiplasFotos: pergunta.tipo === 'FOTO' ? (pergunta.permiteMultiplasFotos ?? false) : undefined,
            permiteAnexarFoto: pergunta.permiteAnexarFoto ?? false,
          })),
        })),
      };

      const response = await fetch(
        isEditing
          ? `/api/checklists-operacionais/templates/${template?.id}`
          : '/api/checklists-operacionais/templates',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message ?? data?.error ?? 'Não foi possível salvar o checklist.'
        );
      }

      toast.success('Checklist salvo com sucesso!');
      onSaved();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao salvar o checklist.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] max-w-[95vw] w-[95vw] flex-col overflow-hidden p-0 sm:h-[90vh] lg:max-w-[1600px]">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <DialogHeader className="space-y-2">
            <DialogTitle>
              {isEditing ? 'Editar checklist' : 'Novo checklist'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Defina as seções, perguntas e tipos de resposta que os
              supervisores precisam preencher.
            </p>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={event => setTitulo(event.target.value)}
                placeholder="Ex.: Checklist de Limpeza"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={event => setDescricao(event.target.value)}
                placeholder="Descreva o objetivo deste checklist."
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 px-4 py-3">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Checklist ativo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando desativado, os supervisores deixam de ver este
                  checklist na lista.
                </p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Seções do checklist
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddGrupo}
                >
                  Adicionar seção
                </Button>
              </div>

              {grupos.map((grupo, grupoIndex) => {
                const isExpanded = expandedSections.has(grupo.tempId);

                return (
                  <div
                    key={grupo.tempId}
                    className="space-y-4 rounded-lg border border-border/60 bg-card"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setExpandedSections(prev => {
                                const next = new Set(prev);
                                if (next.has(grupo.tempId)) {
                                  next.delete(grupo.tempId);
                                } else {
                                  next.add(grupo.tempId);
                                }
                                return next;
                              });
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <Input
                              value={grupo.titulo}
                              onChange={event =>
                                setGrupos(prev =>
                                  prev.map(item =>
                                    item.tempId === grupo.tempId
                                      ? { ...item, titulo: event.target.value }
                                      : item
                                  )
                                )
                              }
                              placeholder={`Título da seção ${grupoIndex + 1}`}
                              className="text-base font-medium"
                            />
                          </div>
                        </div>
                        {grupos.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveGrupo(grupo.tempId)}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-b-lg">
                        <div>
                          <Textarea
                            value={grupo.descricao}
                            onChange={event =>
                              setGrupos(prev =>
                                prev.map(item =>
                                  item.tempId === grupo.tempId
                                    ? { ...item, descricao: event.target.value }
                                    : item
                                )
                              )
                            }
                            placeholder="Descrição da seção (opcional)"
                          />
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">
                            Perguntas da seção
                          </h4>

                          {grupo.perguntas.map(pergunta => (
                             <div
                               key={pergunta.tempId}
                               className="space-y-2.5 rounded-md border border-border/40 bg-white dark:bg-slate-800/50 p-3 shadow-sm"
                             >
                               <div className="flex items-start justify-between gap-3">
                                 <div className="flex-1">
                                   <Input
                                     value={pergunta.titulo}
                                     onChange={event =>
                                       setGrupos(prev =>
                                         prev.map(item =>
                                           item.tempId === grupo.tempId
                                             ? {
                                                 ...item,
                                                 perguntas: item.perguntas.map(
                                                   p =>
                                                     p.tempId === pergunta.tempId
                                                       ? {
                                                           ...p,
                                                           titulo:
                                                             event.target.value,
                                                         }
                                                       : p
                                                 ),
                                               }
                                             : item
                                         )
                                       )
                                     }
                                     placeholder="Digite a pergunta"
                                     className="text-base font-medium"
                                   />
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5">
                                     <Label className="text-xs font-medium text-foreground whitespace-nowrap">
                                       Obrigatória
                                     </Label>
                                     <Switch
                                       checked={pergunta.obrigatoria}
                                       onCheckedChange={checked =>
                                         setGrupos(prev =>
                                           prev.map(item =>
                                             item.tempId === grupo.tempId
                                               ? {
                                                   ...item,
                                                   perguntas: item.perguntas.map(
                                                     p =>
                                                       p.tempId === pergunta.tempId
                                                         ? {
                                                             ...p,
                                                             obrigatoria: checked,
                                                           }
                                                         : p
                                                   ),
                                                 }
                                               : item
                                           )
                                         )
                                       }
                                       className="scale-75"
                                     />
                                   </div>
                                   <Button
                                     type="button"
                                     variant="ghost"
                                     size="sm"
                                     onClick={() =>
                                       handleRemovePergunta(
                                         grupo.tempId,
                                         pergunta.tempId
                                       )
                                     }
                                     disabled={grupo.perguntas.length === 1}
                                     className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                   >
                                     <Trash className="h-4 w-4" />
                                   </Button>
                                 </div>
                              </div>

                              <div>
                                <Label className="text-sm">Tipo de resposta</Label>
                                <Select
                                  value={pergunta.tipo}
                                  onValueChange={value =>
                                    setGrupos(prev =>
                                      prev.map(item =>
                                        item.tempId === grupo.tempId
                                          ? {
                                              ...item,
                                              perguntas: item.perguntas.map(
                                                p =>
                                                  p.tempId === pergunta.tempId
                                                    ? {
                                                        ...p,
                                                        tipo: value as ChecklistPerguntaTipo,
                                                        opcoes:
                                                          value === 'SELECAO'
                                                            ? p.opcoes
                                                            : [],
                                                      }
                                                    : p
                                              ),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="TEXTO">
                                      Resposta em texto
                                    </SelectItem>
                                    <SelectItem value="FOTO">
                                      Upload de foto
                                    </SelectItem>
                                    <SelectItem value="BOOLEANO">
                                      Conforme / Não Conforme
                                    </SelectItem>
                                    <SelectItem value="NUMERICO">
                                      Número
                                    </SelectItem>
                                    <SelectItem value="SELECAO">
                                      Lista de opções
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {pergunta.tipo === 'FOTO' && (
                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                  <div className="space-y-0.5">
                                    <Label className="text-sm">Permitir múltiplas fotos</Label>
                                    <p className="text-xs text-muted-foreground">
                                      Permite que o usuário adicione várias fotos nesta pergunta
                                    </p>
                                  </div>
                                  <Switch
                                    checked={pergunta.permiteMultiplasFotos ?? false}
                                    onCheckedChange={checked =>
                                      setGrupos(prev =>
                                        prev.map(item =>
                                          item.tempId === grupo.tempId
                                            ? {
                                                ...item,
                                                perguntas: item.perguntas.map(
                                                  p =>
                                                    p.tempId === pergunta.tempId
                                                      ? {
                                                          ...p,
                                                          permiteMultiplasFotos: checked,
                                                        }
                                                      : p
                                                ),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                <div className="space-y-0.5">
                                  <Label className="text-sm">Permitir anexar foto</Label>
                                  <p className="text-xs text-muted-foreground">
                                    Permite que o usuário anexe uma foto adicional nesta pergunta, independentemente do tipo
                                  </p>
                                </div>
                                <Switch
                                  checked={pergunta.permiteAnexarFoto ?? false}
                                  onCheckedChange={checked =>
                                    setGrupos(prev =>
                                      prev.map(item =>
                                        item.tempId === grupo.tempId
                                          ? {
                                              ...item,
                                              perguntas: item.perguntas.map(
                                                p =>
                                                  p.tempId === pergunta.tempId
                                                    ? {
                                                        ...p,
                                                        permiteAnexarFoto: checked,
                                                      }
                                                    : p
                                              ),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <Label className="text-sm">Peso da pergunta (opcional)</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Defina o peso (1-5) para gerar relatórios com pontuação. O supervisor verá as cores ao responder.
                                </p>
                                <Select
                                  value={pergunta.peso ? String(pergunta.peso) : 'none'}
                                  onValueChange={value => {
                                    setGrupos(prev =>
                                      prev.map(item =>
                                        item.tempId === grupo.tempId
                                          ? {
                                              ...item,
                                              perguntas: item.perguntas.map(
                                                p =>
                                                  p.tempId === pergunta.tempId
                                                    ? { ...p, peso: value === 'none' ? null : Number(value) }
                                                    : p
                                              ),
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                >
                                  <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue placeholder="Selecione o peso (opcional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem peso</SelectItem>
                                    <SelectItem value="1">1 - Péssimo</SelectItem>
                                    <SelectItem value="2">2 - Ruim</SelectItem>
                                    <SelectItem value="3">3 - Regular</SelectItem>
                                    <SelectItem value="4">4 - Bom</SelectItem>
                                    <SelectItem value="5">5 - Ótimo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                               <div>
                                 <Textarea
                                   value={pergunta.descricao}
                                   onChange={event =>
                                     setGrupos(prev =>
                                       prev.map(item =>
                                         item.tempId === grupo.tempId
                                           ? {
                                               ...item,
                                               perguntas: item.perguntas.map(
                                                 p =>
                                                   p.tempId === pergunta.tempId
                                                     ? {
                                                         ...p,
                                                         descricao:
                                                           event.target.value,
                                                       }
                                                     : p
                                               ),
                                             }
                                           : item
                                       )
                                     )
                                   }
                                   placeholder="Descrição da pergunta (opcional)"
                                 />
                               </div>

                              {pergunta.tipo === 'SELECAO' && (
                                <div className="space-y-2 mt-2">
                                  <Label className="text-sm">Opções disponíveis</Label>
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-background">
                                      {pergunta.opcoes.map((opcao, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className="flex items-center gap-1 pr-1"
                                        >
                                          {opcao}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setGrupos(prev =>
                                                prev.map(item =>
                                                  item.tempId === grupo.tempId
                                                    ? {
                                                        ...item,
                                                        perguntas:
                                                          item.perguntas.map(
                                                            p =>
                                                              p.tempId ===
                                                              pergunta.tempId
                                                                ? {
                                                                    ...p,
                                                                    opcoes:
                                                                      p.opcoes.filter(
                                                                        (
                                                                          _,
                                                                          i
                                                                        ) =>
                                                                          i !==
                                                                          idx
                                                                      ),
                                                                  }
                                                                : p
                                                          ),
                                                      }
                                                    : item
                                                )
                                              )
                                            }
                                            className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                      <Input
                                        className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
                                        placeholder="Digite uma opção e pressione Enter"
                                        onKeyDown={event => {
                                          if (
                                            event.key === 'Enter' ||
                                            event.key === ','
                                          ) {
                                            event.preventDefault();
                                            const value =
                                              event.currentTarget.value.trim();
                                            if (
                                              value &&
                                              !pergunta.opcoes.includes(value)
                                            ) {
                                              setGrupos(prev =>
                                                prev.map(item =>
                                                  item.tempId === grupo.tempId
                                                    ? {
                                                        ...item,
                                                        perguntas:
                                                          item.perguntas.map(
                                                            p =>
                                                              p.tempId ===
                                                              pergunta.tempId
                                                                ? {
                                                                    ...p,
                                                                    opcoes: [
                                                                      ...p.opcoes,
                                                                      value,
                                                                    ],
                                                                  }
                                                                : p
                                                          ),
                                                      }
                                                    : item
                                                )
                                              );
                                              event.currentTarget.value = '';
                                            }
                                          }
                                        }}
                                        onBlur={event => {
                                          const value =
                                            event.target.value.trim();
                                          if (
                                            value &&
                                            !pergunta.opcoes.includes(value)
                                          ) {
                                            setGrupos(prev =>
                                              prev.map(item =>
                                                item.tempId === grupo.tempId
                                                  ? {
                                                      ...item,
                                                      perguntas:
                                                        item.perguntas.map(p =>
                                                          p.tempId ===
                                                          pergunta.tempId
                                                            ? {
                                                                ...p,
                                                                opcoes: [
                                                                  ...p.opcoes,
                                                                  value,
                                                                ],
                                                              }
                                                            : p
                                                        ),
                                                    }
                                                  : item
                                              )
                                            );
                                            event.target.value = '';
                                          }
                                        }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Digite uma opção e pressione Enter ou
                                      vírgula para adicionar
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddPergunta(grupo.tempId)}
                            className="w-full"
                          >
                            Adicionar pergunta
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar checklist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AssignmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateModel | null;
  onSaved: () => void;
}

function AssignmentsDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: AssignmentsDialogProps) {
  const [supervisores, setSupervisores] = useState<SupervisorOption[]>([]);
  const [assignments, setAssignments] = useState<SupervisorScopeAssignment[]>(
    []
  );
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [mapeamentos, setMapeamentos] = useState<any[]>([]);
  const [selectedSupervisores, setSelectedSupervisores] = useState<string[]>(
    []
  );
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'supervisores' | 'unidades'>(
    'unidades'
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!open) return;
      try {
        setLoading(true);
        const [supRes, scopeRes, unidadesRes, mapeamentosRes] =
          await Promise.all([
            fetch('/api/supervisores/list', { cache: 'no-store' }),
            fetch('/api/supervisores/scopes', { cache: 'no-store' }),
            fetch('/api/unidades', { cache: 'no-store' }),
            fetch('/api/mapeamento-grupo-responsavel', { cache: 'no-store' }),
          ]);

        if (
          !supRes.ok ||
          !scopeRes.ok ||
          !unidadesRes.ok ||
          !mapeamentosRes.ok
        ) {
          throw new Error('Erro ao carregar dados de supervisores.');
        }

        const supData = await supRes.json();
        const scopesData = await scopeRes.json();
        const unidadesData = await unidadesRes.json();
        const mapeamentosData = await mapeamentosRes.json();

        const supOptions: SupervisorOption[] = Array.isArray(supData)
          ? supData.map((item: any) => ({
              id: item.id,
              nome: item.name ?? item.nome ?? 'Supervisor',
              email: item.email ?? '',
            }))
          : [];

        const scopeAssignments: SupervisorScopeAssignment[] = Array.isArray(
          scopesData
        )
          ? scopesData
              .map((item: any) => ({
                supervisorId: item.supervisor?.id as string | undefined,
                grupoId: item.grupo?.id ?? undefined,
                unidadeId: item.unidade?.id ?? undefined,
              }))
              .filter(scope => scope.supervisorId)
              .map(scope => ({
                supervisorId: scope.supervisorId!,
                grupoId: scope.grupoId ?? null,
                unidadeId: scope.unidadeId ?? null,
              }))
          : [];

        const formatUnidade = (item: any): UnidadeOption => ({
          id: item.id,
          nome: item.nome,
          grupoNome:
            item.grupos?.[0]?.nome ??
            item.mapeamentos?.[0]?.grupo?.nome ??
            undefined,
          grupoIds: Array.isArray(item.grupos)
            ? item.grupos
                .map((grupo: any) => grupo?.id)
                .filter((id: string | undefined) => Boolean(id))
            : Array.isArray(item.mapeamentos)
              ? item.mapeamentos
                  .map((m: any) => m?.grupoId)
                  .filter((id: string | undefined) => Boolean(id))
              : [],
          cidade: item.cidade ?? null,
          estado: item.estado ?? null,
          grupos: Array.isArray(item.grupos)
            ? item.grupos.map((grupo: any) => ({
                id: grupo?.id ?? null,
                nome: grupo?.nome ?? null,
              }))
            : Array.isArray(item.mapeamentos)
              ? item.mapeamentos.map((m: any) => ({
                  id: m?.grupo?.id ?? m?.grupoId ?? null,
                  nome: m?.grupo?.nome ?? null,
                }))
              : [],
        });

        const unidadeOptions: UnidadeOption[] = Array.isArray(unidadesData)
          ? (unidadesData as any[]).map(formatUnidade)
          : Array.isArray(unidadesData?.data)
            ? (unidadesData.data as any[]).map(formatUnidade)
            : [];

        // Filtrar apenas mapeamentos ativos e extrair grupoId e unidadeId
        const mapeamentosFormatados = Array.isArray(mapeamentosData)
          ? mapeamentosData
              .filter((m: any) => m.ativo !== false)
              .map((m: any) => ({
                grupoId: m.grupoId || m.grupo?.id,
                unidadeId: m.unidadeId || m.unidade?.id,
                ativo: m.ativo !== false,
              }))
              .filter((m: any) => m.grupoId && m.unidadeId)
          : [];

        setSupervisores(supOptions);
        setAssignments(scopeAssignments);
        setUnidades(unidadeOptions);
        setMapeamentos(mapeamentosFormatados);
      } catch (error) {
        console.error(error);
        toast.error('Não foi possível carregar supervisores ou unidades.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [open]);

  const unidadesPorSupervisor = useMemo(() => {
    const map = new Map<string, Set<string>>();

    // Criar mapa de grupoId -> unidadeIds baseado nos mapeamentos ativos
    const grupoParaUnidades = new Map<string, Set<string>>();

    mapeamentos.forEach((m: any) => {
      if (m.grupoId && m.unidadeId) {
        if (!grupoParaUnidades.has(m.grupoId)) {
          grupoParaUnidades.set(m.grupoId, new Set());
        }
        grupoParaUnidades.get(m.grupoId)!.add(m.unidadeId);
      }
    });

    // Agrupar assignments por supervisor
    const assignmentsPorSupervisor = new Map<
      string,
      SupervisorScopeAssignment[]
    >();
    assignments.forEach(assignment => {
      const supervisorId = assignment.supervisorId;
      if (!assignmentsPorSupervisor.has(supervisorId)) {
        assignmentsPorSupervisor.set(supervisorId, []);
      }
      assignmentsPorSupervisor.get(supervisorId)!.push(assignment);
    });

    // Para cada supervisor, calcular unidades baseado em seus assignments
    assignmentsPorSupervisor.forEach((supervisorAssignments, supervisorId) => {
      const unidadeSet = new Set<string>();

      // Adicionar unidades específicas
      supervisorAssignments.forEach(assignment => {
        if (assignment.unidadeId) {
          unidadeSet.add(assignment.unidadeId);
        }
      });

      // Para grupos, pegar apenas unidades que estão nos mapeamentos ativos
      const grupoIds = supervisorAssignments
        .map(a => a.grupoId)
        .filter((id): id is string => Boolean(id));

      grupoIds.forEach(grupoId => {
        const unidadesDoGrupo = grupoParaUnidades.get(grupoId);
        if (unidadesDoGrupo) {
          unidadesDoGrupo.forEach(unidadeId => unidadeSet.add(unidadeId));
        }
      });

      map.set(supervisorId, unidadeSet);
    });

    return map;
  }, [assignments, mapeamentos]);

  useEffect(() => {
    if (!open || !template) return;

    const unidadesTemplate = template.escopos
      .filter(escopo => escopo.ativo && escopo.unidade?.id)
      .map(escopo => escopo.unidade!.id);

    // Atualizar unidades selecionadas
    setSelectedUnidades(unidadesTemplate);

    // Atualizar supervisores selecionados
    if (supervisores.length === 0) {
      setSelectedSupervisores([]);
      return;
    }

    if (!unidadesTemplate.length) {
      setSelectedSupervisores([]);
      return;
    }

    const selecionados = supervisores
      .filter(supervisor => {
        const unidadeSet = unidadesPorSupervisor.get(supervisor.id);
        if (!unidadeSet) return false;
        return unidadesTemplate.some(unidadeId => unidadeSet.has(unidadeId));
      })
      .map(supervisor => supervisor.id);

    setSelectedSupervisores(selecionados);
  }, [open, template, supervisores, unidadesPorSupervisor]);

  const unidadesCobertas = useMemo(() => {
    const set = new Set<string>();
    selectedSupervisores.forEach(supervisorId => {
      const unitSet = unidadesPorSupervisor.get(supervisorId);
      unitSet?.forEach(id => set.add(id));
    });
    return set;
  }, [selectedSupervisores, unidadesPorSupervisor]);

  const unidadesTemplate = useMemo(() => {
    return template
      ? template.escopos
          .filter(escopo => escopo.unidade?.id && escopo.ativo)
          .map(escopo => escopo.unidade!)
      : [];
  }, [template]);

  async function handleSave() {
    if (!template) return;
    try {
      setSaving(true);

      let payload: { supervisorIds?: string[]; unidadeIds?: string[] } = {};

      if (activeTab === 'supervisores') {
        payload = { supervisorIds: selectedSupervisores };
      } else {
        payload = { unidadeIds: selectedUnidades };
      }

      const response = await fetch(
        `/api/checklists-operacionais/templates/${template.id}/escopos`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error('Não foi possível atualizar os escopos do checklist.');
      }
      toast.success(
        activeTab === 'supervisores'
          ? 'Supervisores atualizados com sucesso.'
          : 'Unidades atualizadas com sucesso.'
      );
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar escopos do checklist.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vincular Checklist às Unidades</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Escolha como deseja vincular este checklist: por supervisores ou
            diretamente por unidades.
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as 'supervisores' | 'unidades')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unidades">Vincular Unidades</TabsTrigger>
            <TabsTrigger value="supervisores">
              Vincular por Supervisores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unidades" className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton
                    key={`unidade-skeleton-${index}`}
                    className="h-10 w-full"
                  />
                ))}
              </div>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-auto rounded-md border border-border/60 p-2">
                {unidades.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    Nenhuma unidade encontrada.
                  </p>
                ) : (
                  unidades.map(unidade => {
                    const checked = selectedUnidades.includes(unidade.id);
                    return (
                      <div
                        key={unidade.id}
                        className={cn(
                          'flex items-center justify-between rounded-md border px-3 py-2 transition',
                          checked
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/60 bg-card text-foreground'
                        )}
                      >
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {unidade.nome}
                          </span>
                          {unidade.grupoNome && (
                            <p className="text-xs text-muted-foreground">
                              {unidade.grupoNome}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant={checked ? 'default' : 'outline'}
                          onClick={() =>
                            setSelectedUnidades(prev =>
                              checked
                                ? prev.filter(id => id !== unidade.id)
                                : [...prev, unidade.id]
                            )
                          }
                        >
                          {checked ? '✓' : '+'}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>
                Unidades selecionadas:{' '}
                <strong>{selectedUnidades.length}</strong>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="supervisores" className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton
                    key={`supervisor-skeleton-${index}`}
                    className="h-10 w-full"
                  />
                ))}
              </div>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-auto rounded-md border border-border/60 p-2">
                {supervisores.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    Nenhum supervisor encontrado.
                  </p>
                ) : (
                  supervisores.map(supervisor => {
                    const unidadeSet = unidadesPorSupervisor.get(supervisor.id);
                    const unidadesTotal = unidadeSet ? unidadeSet.size : 0;
                    const disabled = unidadesTotal === 0;
                    const checked = selectedSupervisores.includes(
                      supervisor.id
                    );
                    return (
                      <div
                        key={supervisor.id}
                        className={cn(
                          'flex flex-col rounded-md border px-3 py-2 text-left transition',
                          disabled
                            ? 'border-dashed text-muted-foreground'
                            : checked
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/60 bg-card text-foreground'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {supervisor.nome}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {supervisor.email}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant={checked ? 'default' : 'outline'}
                            disabled={disabled}
                            onClick={() =>
                              setSelectedSupervisores(prev =>
                                checked
                                  ? prev.filter(id => id !== supervisor.id)
                                  : [...prev, supervisor.id]
                              )
                            }
                          >
                            {checked ? '✓' : '+'}
                          </Button>
                        </div>
                        <span className="mt-1 text-xs text-muted-foreground">
                          {disabled
                            ? 'Sem unidades vinculadas. Configure em Config ▸ Supervisores.'
                            : `${unidadesTotal} unidade${unidadesTotal === 1 ? '' : 's'} no escopo`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>
                Supervisores selecionados:{' '}
                <strong>{selectedSupervisores.length}</strong>
              </p>
              <p>
                Unidades cobertas após salvar:{' '}
                <strong>{unidadesCobertas.size}</strong>
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !template}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomizeTemplateDialog({
  open,
  onOpenChange,
  template,
  onTemplateCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateModel | null;
  onTemplateCreated: () => void;
}) {
  const [unidades, setUnidades] = useState<Array<{ id: string; nome: string }>>(
    []
  );
  const [selectedUnidade, setSelectedUnidade] = useState('');
  const [titulo, setTitulo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setUnidades([]);
      setSelectedUnidade('');
      setTitulo('');
      return;
    }

    async function loadUnits() {
      try {
        setLoading(true);
        const response = await fetch('/api/unidades', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Não foi possível carregar as unidades.');
        }
        const payload = await response.json();
        const listaCruda: Array<{ id: string; nome: string }> = Array.isArray(
          payload
        )
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        const listaNormalizada = listaCruda.map((item: any) => ({
          id: item.id,
          nome: item.nome,
        }));

        setUnidades(listaNormalizada);
        const primeira = listaNormalizada[0];
        if (primeira) {
          setSelectedUnidade(primeira.id);
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar unidades para personalização.');
      } finally {
        setLoading(false);
      }
    }

    loadUnits();
  }, [open]);

  useEffect(() => {
    if (!template || !selectedUnidade) return;
    const unidadeNome = unidades.find(
      unidade => unidade.id === selectedUnidade
    )?.nome;
    if (unidadeNome) {
      setTitulo(`${template.titulo} · ${unidadeNome}`);
    }
  }, [template, selectedUnidade, unidades]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!template) return;
    if (!selectedUnidade) {
      toast.warning('Selecione uma unidade para personalizar.');
      return;
    }

    try {
      const response = await fetch(
        `/api/checklists-operacionais/templates/${template.id}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unidadeId: selectedUnidade, titulo }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.message || 'Não foi possível criar o checklist personalizado.'
        );
      }

      toast.success('Checklist personalizado criado para a unidade.');
      onTemplateCreated();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao personalizar checklist.'
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Personalizar checklist para unidade</DialogTitle>
        </DialogHeader>

        {template ? (
          <form className="grid gap-4 py-2" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label>Modelo base</Label>
              <Input value={template.titulo} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-unit">Unidade</Label>
              <select
                id="custom-unit"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedUnidade}
                onChange={event => setSelectedUnidade(event.target.value)}
                disabled={loading || unidades.length === 0}
              >
                {loading ? (
                  <option value="">Carregando...</option>
                ) : unidades.length === 0 ? (
                  <option value="">Nenhuma unidade disponível</option>
                ) : (
                  unidades.map(unidade => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-title">Título do novo checklist</Label>
              <Input
                id="custom-title"
                value={titulo}
                onChange={event => setTitulo(event.target.value)}
                placeholder="Informe um título para diferenciar esta versão"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!selectedUnidade || loading}>
                Criar checklist personalizado
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                Selecione um checklist para personalizar.
              </p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
