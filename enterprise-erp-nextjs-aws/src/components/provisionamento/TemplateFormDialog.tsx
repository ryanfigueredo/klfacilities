'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Plus } from 'lucide-react';

type Template = {
  id?: string;
  nome?: string;
  descricao?: string;
  valor?: number | string;
  tipo?: 'RECEITA' | 'DESPESA';
  periodicidade?: string;
  diaVencimento?: number;
  ativo?: boolean;
  dataInicio?: string;
  dataFim?: string | null;
  grupoId?: string;
  unidadeId?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  centroCustoId?: string;
  contaId?: string;
  formaPagamento?: string;
  documento?: string;
  obs?: string;
};

export function TemplateFormDialog({
  mode = 'create',
  initialData,
  onSaved,
  onOpenChange,
}: {
  mode?: 'create' | 'edit';
  initialData?: Template;
  onSaved?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [grupos, setGrupos] = React.useState<{ id: string; nome: string }[]>([]);
  const [unidades, setUnidades] = React.useState<
    { id: string; nome: string }[]
  >([]);
  const [categorias, setCategorias] = React.useState<
    { id: string; nome: string }[]
  >([]);
  const [form, setForm] = React.useState<Template>({
    nome: initialData?.nome || '',
    descricao: initialData?.descricao || '',
    valor: initialData?.valor || 0,
    tipo: initialData?.tipo || 'DESPESA',
    periodicidade: initialData?.periodicidade || 'MENSAL',
    diaVencimento: initialData?.diaVencimento || 5,
    ativo: initialData?.ativo ?? true,
    dataInicio: initialData?.dataInicio || new Date().toISOString().slice(0, 10),
    dataFim: initialData?.dataFim || null,
    grupoId: initialData?.grupoId || '',
    unidadeId: initialData?.unidadeId || '',
    categoriaId: initialData?.categoriaId || '',
  });

  const loadGrupos = React.useCallback(async () => {
    try {
      const r = await fetch('/api/grupos');
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setGrupos(arr);
    } catch {}
  }, []);

  const loadCategorias = React.useCallback(async () => {
    try {
      const r = await fetch(`/api/categorias?tipo=${form.tipo ?? 'DESPESA'}`);
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setCategorias(arr);
    } catch {}
  }, [form.tipo]);

  const loadUnidades = React.useCallback(async (grupoId: string) => {
    if (!grupoId) {
      setUnidades([]);
      return;
    }
    try {
      const r = await fetch(
        `/api/mapeamento?grupoId=${encodeURIComponent(grupoId)}`
      );
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.unidades) ? j.unidades : [];
      setUnidades(arr);
    } catch {}
  }, []);

  React.useEffect(() => {
    if (open) {
      loadGrupos();
      loadCategorias();
      if (form.grupoId) loadUnidades(form.grupoId);
    }
  }, [open, form.grupoId, loadGrupos, loadCategorias, loadUnidades]);

  React.useEffect(() => {
    if (form.grupoId) loadUnidades(form.grupoId);
  }, [form.grupoId, loadUnidades]);

  React.useEffect(() => {
    loadCategorias();
  }, [form.tipo, loadCategorias]);

  const handleChange =
    (key: keyof Template) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        e.target.type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm(prev => ({ ...prev, [key]: value }));
    };

  const setValue = (key: keyof Template, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (!form.nome || !form.descricao || !form.valor) {
      toast.error('Preencha Nome, Descrição e Valor');
      return;
    }

    try {
      setLoading(true);
      const url =
        mode === 'edit' && initialData?.id
          ? `/api/provisionamento-templates/${initialData.id}`
          : '/api/provisionamento-templates';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const payload = {
        ...form,
        valor:
          typeof form.valor === 'string'
            ? Number(form.valor.toString().replace(',', '.'))
            : form.valor,
        diaVencimento: Number(form.diaVencimento),
        dataFim: form.dataFim || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar');
      }

      toast.success(
        mode === 'edit' ? 'Template atualizado' : 'Template criado'
      );
      setOpen(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'create') {
    return (
      <>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Template de Provisão</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure uma provisão recorrente que será gerada automaticamente
                (ex: 13º salário, aluguel mensal, impostos)
              </p>
            </DialogHeader>
            <TemplateFormContent
              form={form}
              handleChange={handleChange}
              setValue={setValue}
              grupos={grupos}
              unidades={unidades}
              categorias={categorias}
              submit={submit}
              loading={loading}
              mode="create"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Dialog
      open={true}
      onOpenChange={v => {
        if (!v) onOpenChange?.(false);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Template de Provisão</DialogTitle>
        </DialogHeader>
        <TemplateFormContent
          form={form}
          handleChange={handleChange}
          setValue={setValue}
          grupos={grupos}
          unidades={unidades}
          categorias={categorias}
          submit={submit}
          loading={loading}
          mode="edit"
          onCancel={() => onOpenChange?.(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TemplateFormContent({
  form,
  handleChange,
  setValue,
  grupos,
  unidades,
  categorias,
  submit,
  loading,
  mode,
  onCancel,
}: {
  form: Template;
  handleChange: (key: keyof Template) => (e: any) => void;
  setValue: (key: keyof Template, value: any) => void;
  grupos: { id: string; nome: string }[];
  unidades: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  submit: () => void;
  loading: boolean;
  mode: 'create' | 'edit';
  onCancel?: () => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Nome e Tipo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nome">Nome do Template *</Label>
          <Input
            id="nome"
            value={String(form.nome || '')}
            onChange={handleChange('nome')}
            placeholder="Ex: Aluguel Mensal"
          />
        </div>
        <div>
          <Label htmlFor="tipo">Tipo *</Label>
          <Select
            value={String(form.tipo || 'DESPESA')}
            onValueChange={v => setValue('tipo', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DESPESA">Despesa</SelectItem>
              <SelectItem value="RECEITA">Receita</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <Label htmlFor="descricao">Descrição *</Label>
        <Textarea
          id="descricao"
          value={String(form.descricao || '')}
          onChange={handleChange('descricao')}
          placeholder="Descrição que aparecerá nas provisões geradas"
        />
      </div>

      {/* Periodicidade e Dia Vencimento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="periodicidade">Periodicidade *</Label>
          <Select
            value={String(form.periodicidade || 'MENSAL')}
            onValueChange={v => setValue('periodicidade', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MENSAL">Mensal</SelectItem>
              <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
              <SelectItem value="SEMANAL">Semanal</SelectItem>
              <SelectItem value="BIMESTRAL">Bimestral</SelectItem>
              <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
              <SelectItem value="SEMESTRAL">Semestral</SelectItem>
              <SelectItem value="ANUAL">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="diaVencimento">Dia Vencimento *</Label>
          <Input
            id="diaVencimento"
            type="number"
            min="1"
            max="31"
            value={String(form.diaVencimento || 5)}
            onChange={handleChange('diaVencimento')}
          />
        </div>
      </div>

      {/* Valor e Ativo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valor">Valor *</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            value={String(form.valor || 0)}
            onChange={handleChange('valor')}
          />
        </div>
        <div>
          <Label htmlFor="ativo">Status</Label>
          <Select
            value={String(form.ativo ? 'true' : 'false')}
            onValueChange={v => setValue('ativo', v === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Ativo</SelectItem>
              <SelectItem value="false">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grupo, Unidade, Categoria */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="grupoId">Grupo</Label>
          <Select
            value={String(form.grupoId || '')}
            onValueChange={v => {
              setValue('grupoId', v);
              setValue('unidadeId', '');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {grupos.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="unidadeId">Unidade</Label>
          <Select
            value={String(form.unidadeId || '')}
            onValueChange={v => setValue('unidadeId', v)}
            disabled={!form.grupoId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {unidades.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="categoriaId">Categoria</Label>
          <Select
            value={String(form.categoriaId || '')}
            onValueChange={v => setValue('categoriaId', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dataInicio">Data Início</Label>
          <Input
            id="dataInicio"
            type="date"
            value={String(form.dataInicio || '')}
            onChange={handleChange('dataInicio')}
          />
        </div>
        <div>
          <Label htmlFor="dataFim">Data Fim (opcional)</Label>
          <Input
            id="dataFim"
            type="date"
            value={String(form.dataFim || '')}
            onChange={handleChange('dataFim')}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'edit' ? 'Salvar' : 'Criar Template'}
        </Button>
      </div>
    </form>
  );
}

