'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { TemplateFormDialog } from './TemplateFormDialog';
import { Loader2, Plus, RefreshCw, Trash2, Edit } from 'lucide-react';

type Template = {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  periodicidade: string;
  diaVencimento: number;
  ativo: boolean;
  dataInicio: string;
  dataFim?: string | null;
  grupo?: { nome: string } | null;
  unidade?: { nome: string } | null;
  categoria?: { nome: string } | null;
  ultimaGeracao?: string | null;
};

export function TemplatesTable() {
  const [rows, setRows] = useState<Template[]>([]);
  const [q, setQ] = useState('');
  const [ativo, setAtivo] = useState<string>('true');
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (ativo !== 'all') params.set('ativo', ativo);

      const r = await fetch(`/api/provisionamento-templates?${params.toString()}`);
      const j = await r.json();
      const arr = Array.isArray(j?.rows) ? j.rows : [];
      setRows(
        arr.map((x: any) => ({
          ...x,
          valor: Number(x.valor),
        }))
      );
    } catch (e) {
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gerarProvisoes = async () => {
    if (!confirm('Gerar provisões para os próximos 3 meses?')) return;
    
    setGerando(true);
    try {
      const r = await fetch('/api/provisionamento-templates/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meses: 3 }),
      });
      const data = await r.json();
      if (r.ok) {
        toast.success(
          `${data.gerados} provisão(ões) gerada(s) de ${data.templates} template(s)`
        );
        // Recarregar página para ver novas provisões
        if (typeof window !== 'undefined') window.location.reload();
      } else {
        throw new Error(data.error || 'Erro ao gerar provisões');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar provisões');
    } finally {
      setGerando(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const r = await fetch(`/api/provisionamento-templates/${id}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        toast.success('Template excluído');
        await refresh();
      } else {
        const err = await r.json().catch(() => ({}));
        toast.error(err?.error || 'Erro ao excluir');
      }
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const periodicidadeLabels: Record<string, string> = {
    MENSAL: 'Mensal',
    QUINZENAL: 'Quinzenal',
    SEMANAL: 'Semanal',
    BIMESTRAL: 'Bimestral',
    TRIMESTRAL: 'Trimestral',
    SEMESTRAL: 'Semestral',
    ANUAL: 'Anual',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Templates de Provisões Recorrentes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure provisões mensais/anuais que serão geradas automaticamente
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={gerarProvisoes}
              disabled={gerando}
            >
              {gerando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Gerar Provisões
            </Button>
            <TemplateFormDialog onSaved={refresh} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Buscar template"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && refresh()}
            className="max-w-sm"
          />
          <Select value={ativo} onValueChange={setAtivo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Ativos</SelectItem>
              <SelectItem value="false">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refresh}>
            Buscar
          </Button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Nenhum template encontrado
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {rows.map(template => (
              <div
                key={template.id}
                className="p-4 flex items-center justify-between hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium truncate">{template.nome}</div>
                    <Badge variant={template.ativo ? 'default' : 'secondary'}>
                      {template.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline">
                      {periodicidadeLabels[template.periodicidade] ||
                        template.periodicidade}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {template.descricao}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {template.grupo?.nome && `Grupo: ${template.grupo.nome} `}
                    {template.unidade?.nome &&
                      `• Unidade: ${template.unidade.nome} `}
                    {template.categoria?.nome &&
                      `• Categoria: ${template.categoria.nome}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Dia vencimento: {template.diaVencimento} • Valor:{' '}
                    {template.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                    {template.ultimaGeracao &&
                      ` • Última geração: ${new Date(template.ultimaGeracao).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <TemplateFormDialog
            mode="edit"
            initialData={editing}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onOpenChange={open => !open && setEditing(null)}
          />
        )}

        <Dialog
          open={!!deleteId}
          onOpenChange={v => !v && setDeleteId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Template?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. Template com provisões pendentes
              não pode ser excluído.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteId && handleDelete(deleteId)}
                disabled={deleting}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

