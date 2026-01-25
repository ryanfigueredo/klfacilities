'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getCompetencia } from '@/lib/date/competencia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Loader2 } from 'lucide-react';

type Tipo = 'RECEITA' | 'DESPESA';

export type ProvFormInitialData = {
  id?: string;
  tipo?: Tipo;
  descricao?: string;
  dataPrevista?: string; // yyyy-MM-dd
  valor?: number | string;
  grupoId?: string;
  unidadeId?: string;
  categoriaId?: string;
  subcategoria?: string;
  centroCusto?: string;
  formaPagamento?: string;
  documento?: string;
  responsavelId?: string;
};

export function ProvFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialData,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: 'create' | 'edit';
  initialData?: ProvFormInitialData;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [grupos, setGrupos] = React.useState<
    Array<{ id: string; nome: string }>
  >([]);
  const [unidades, setUnidades] = React.useState<
    Array<{ id: string; nome: string }>
  >([]);
  const [responsaveis, setResponsaveis] = React.useState<
    Array<{ id: string; nome: string }>
  >([]);
  const [categorias, setCategorias] = React.useState<
    Array<{ id: string; nome: string }>
  >([]);
  const [nomeCategoria, setNomeCategoria] = React.useState('');
  const [form, setForm] = React.useState<ProvFormInitialData>({
    tipo: initialData?.tipo ?? 'DESPESA',
    descricao: initialData?.descricao ?? '',
    dataPrevista:
      initialData?.dataPrevista ?? new Date().toISOString().slice(0, 10),
    valor: initialData?.valor ?? 0,
    grupoId: initialData?.grupoId ?? '',
    unidadeId: initialData?.unidadeId ?? '',
    categoriaId: initialData?.categoriaId ?? '',
    subcategoria: initialData?.subcategoria ?? '',
    centroCusto: initialData?.centroCusto ?? '',
    formaPagamento: initialData?.formaPagamento ?? '',
    documento: initialData?.documento ?? '',
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      tipo: initialData?.tipo ?? 'DESPESA',
      descricao: initialData?.descricao ?? '',
      dataPrevista:
        initialData?.dataPrevista ?? new Date().toISOString().slice(0, 10),
      valor: initialData?.valor ?? 0,
      grupoId: initialData?.grupoId ?? '',
      unidadeId: initialData?.unidadeId ?? '',
      categoriaId: initialData?.categoriaId ?? '',
      subcategoria: initialData?.subcategoria ?? '',
      centroCusto: initialData?.centroCusto ?? '',
      formaPagamento: initialData?.formaPagamento ?? '',
      documento: initialData?.documento ?? '',
    });
  }, [open, initialData]);

  const handleChange =
    (k: keyof ProvFormInitialData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  // helpers: set programaticamente
  const setValue = (key: keyof ProvFormInitialData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const loadGrupos = async () => {
    try {
      const r = await fetch('/api/grupos');
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setGrupos(arr);
    } catch {}
  };

  const loadCategorias = async () => {
    try {
      const r = await fetch(`/api/categorias?tipo=${form.tipo ?? 'DESPESA'}`);
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setCategorias(arr);
    } catch {}
  };

  const loadUnidades = async (grupoId?: string) => {
    if (!grupoId) {
      setUnidades([]);
      setResponsaveis([]);
      return;
    }
    try {
      const r = await fetch(
        `/api/mapeamento?grupoId=${encodeURIComponent(grupoId)}`
      );
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.unidades) ? j.unidades : [];
      setUnidades(arr);
      setResponsaveis([]);
    } catch {}
  };

  const loadResponsaveis = async (grupoId?: string, unidadeId?: string) => {
    if (!grupoId || !unidadeId) {
      setResponsaveis([]);
      return;
    }
    try {
      const r = await fetch(
        `/api/mapeamento?grupoId=${encodeURIComponent(grupoId)}&unidadeId=${encodeURIComponent(unidadeId)}`
      );
      const j = await r.json().catch(() => ({}));
      const arr = Array.isArray(j?.responsaveis) ? j.responsaveis : [];
      setResponsaveis(arr);
    } catch {}
  };

  React.useEffect(() => {
    if (!open) return;
    loadGrupos();
    loadCategorias();
    if (form.grupoId) loadUnidades(form.grupoId);
    if (form.grupoId && form.unidadeId)
      loadResponsaveis(form.grupoId, form.unidadeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    loadCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tipo]);

  const submit = async () => {
    if (
      !form.descricao ||
      !form.dataPrevista ||
      form.valor === '' ||
      form.valor === undefined ||
      form.valor === null
    ) {
      toast.error('Preencha Descrição, Data e Valor.');
      return;
    }
    const dataVenc = new Date(form.dataPrevista || new Date());
    const competencia = getCompetencia(dataVenc); // Competência = primeiro dia do mês
    
    const payload = {
      ...form,
      // Mapeia para Provisionamento (dataVenc)
      dataVenc: form.dataPrevista,
      competencia: competencia.toISOString().slice(0, 10), // Adiciona competência
      valor:
        typeof form.valor === 'string'
          ? Number(form.valor.toString().replace(',', '.'))
          : form.valor,
    } as any;
    delete (payload as any).dataPrevista;

    try {
      setLoading(true);
      const url =
        mode === 'edit' && initialData?.id
          ? `/api/provisionamentos/${initialData.id}`
          : `/api/provisionamentos`;
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Erro ao salvar provisão');
      }
      toast.success(
        mode === 'edit' ? 'Provisão atualizada.' : 'Provisão criada.'
      );
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar provisão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !loading && onOpenChange(v)}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        a11yTitle={mode === 'edit' ? 'Editar Provisão' : 'Nova Provisão'}
        aria-describedby="nova-provisao-desc"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Provisão' : 'Nova Provisão Contábil'}
          </DialogTitle>
          <DialogDescription id="nova-provisao-desc">
            {mode === 'edit'
              ? 'Atualize os campos da provisão.'
              : 'Crie uma reserva para despesa futura conhecida (ex: 13º salário, impostos, férias). A competência será o primeiro dia do mês de vencimento.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            submit();
          }}
        >
          {/* Tipo e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={(form.tipo as string) || 'DESPESA'}
                onValueChange={value => setValue('tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={String(form.dataPrevista || '')}
                onChange={handleChange('dataPrevista')}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={String(form.descricao || '')}
              onChange={(e: any) => setValue('descricao', e.target.value)}
              placeholder="Descrição do movimento"
            />
          </div>

          {/* Grupo, Unidade, Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="grupoId">Grupo</Label>
              <Select
                value={String(form.grupoId || '')}
                onValueChange={value => {
                  setValue('grupoId', value);
                  setValue('unidadeId', '');
                  setValue('responsavelId' as any, '');
                  loadUnidades(value);
                }}
              >
                <SelectTrigger>
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

            <div>
              <Label htmlFor="unidadeId">Unidade</Label>
              <Select
                value={String(form.unidadeId || '')}
                onValueChange={value => {
                  setValue('unidadeId', value);
                  const g = String(form.grupoId || '');
                  if (g) loadResponsaveis(g, value);
                }}
                disabled={!form.grupoId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.grupoId
                        ? 'Selecione a unidade'
                        : 'Escolha o grupo primeiro'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="responsavelId">Responsável</Label>
              <Select
                value={String((form as any).responsavelId || '')}
                onValueChange={value => setValue('responsavelId' as any, value)}
                disabled={!form.unidadeId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.unidadeId
                        ? 'Selecione o responsável'
                        : 'Escolha a unidade primeiro'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categoria + Nova categoria */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoriaId">Categoria</Label>
              <Select
                value={String(form.categoriaId || '')}
                onValueChange={value => setValue('categoriaId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(categoria => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <div className="grow">
                <Label htmlFor="nomeCategoria">Nova categoria</Label>
                <Input
                  id="nomeCategoria"
                  placeholder="Ex.: Material de Limpeza"
                  value={nomeCategoria}
                  onChange={e => setNomeCategoria(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={async () => {
                  const nome = nomeCategoria.trim();
                  if (!nome) return;
                  try {
                    const res = await fetch('/api/categorias', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        nome,
                        tipo: form.tipo ?? 'DESPESA',
                      }),
                    });
                    if (res.ok) {
                      const created = await res.json();
                      setValue('categoriaId', created.id);
                      setNomeCategoria('');
                      loadCategorias();
                      toast.success('Categoria criada com sucesso!');
                    } else {
                      const error = await res.json();
                      toast.error(error.error || 'Erro ao criar categoria');
                    }
                  } catch (error) {
                    toast.error('Erro ao criar categoria');
                  }
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>

          {/* Valor + Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={String(form.valor ?? 0)}
                onChange={handleChange('valor')}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="formaPagamento">
                Forma de Pagamento (opcional)
              </Label>
              <Input
                id="formaPagamento"
                value={String(form.formaPagamento || '')}
                onChange={handleChange('formaPagamento')}
                placeholder="Ex: PIX, Cartão, Boleto"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'edit' ? 'Salvar alterações' : 'Criar Provisão'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
