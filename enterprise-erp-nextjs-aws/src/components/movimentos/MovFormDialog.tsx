'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { can as canPolicy } from '@/lib/auth/policy';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { movimentosSchema } from '@/lib/validations';
import { Loader2 } from 'lucide-react';
// Removed Gasolina tab; no tabs needed

type MovimentoFormData = {
  tipo: 'RECEITA' | 'DESPESA';
  data: string;
  descricao: string;
  unidadeId?: string;
  grupoId?: string;
  responsavelId?: string;
  formaPagamento?: string;
  valor: number;
  categoriaId?: string;
  nomeCategoria?: string;
};

interface MovFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  initialData?: Partial<MovimentoFormData> & { id?: string };
}

export function MovFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialData,
}: MovFormDialogProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [unidades, setUnidades] = useState<Array<{ id: string; nome: string }>>(
    []
  );
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string }>>([]);
  const [responsaveis, setResponsaveis] = useState<
    Array<{ id: string; nome: string }>
  >([]);
  const [categorias, setCategorias] = useState<
    Array<{ id: string; nome: string; tipo: string }>
  >([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<MovimentoFormData>({
    resolver: zodResolver(movimentosSchema),
    defaultValues: {
      tipo: 'DESPESA',
      data: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
      descricao: '',
      valor: 0,
    },
  });

  const tipo = watch('tipo');
  const userRole = session?.user?.role;
  const { toast: toastUI, toastForbidden } = useToast?.() ?? {
    toast: console.log,
    toastForbidden: () => {},
  };

  // Atalho: Adicionar Gasolina
  // Gasolina flow removed

  const loadGrupos = useCallback(async () => {
    try {
      const response = await fetch('/api/grupos');
      if (response.ok) {
        const result = await response.json();
        const arr = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];
        setGrupos(arr);
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    }
  }, []);

  const loadCategorias = useCallback(async () => {
    try {
      const response = await fetch(`/api/categorias?tipo=${tipo}`);
      if (response.ok) {
        const result = await response.json();
        const arr = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];
        setCategorias(arr);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }, [tipo]);

  // Recarregar categorias quando o tipo mudar
  useEffect(() => {
    if (open && tipo) {
      loadCategorias();
    }
  }, [tipo, open, loadCategorias]);

  // Quando abrir em modo edição, preencher com dados
  useEffect(() => {
    if (open && mode === 'edit' && initialData) {
      if (initialData.tipo) setValue('tipo', initialData.tipo);
      if (initialData.data) setValue('data', initialData.data);
      if (typeof initialData.descricao === 'string')
        setValue('descricao', initialData.descricao);
      if (typeof initialData.valor === 'number')
        setValue('valor', initialData.valor);
      if (initialData.grupoId) setValue('grupoId', initialData.grupoId);
      if (initialData.unidadeId) setValue('unidadeId', initialData.unidadeId);
      if (initialData.responsavelId)
        setValue('responsavelId', initialData.responsavelId);
      if (initialData.formaPagamento)
        setValue('formaPagamento', initialData.formaPagamento);
      if (initialData.categoriaId)
        setValue('categoriaId', initialData.categoriaId);
    } else if (open && mode === 'create') {
      reset({
        tipo: 'DESPESA',
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        valor: 0,
      });
    }
  }, [open, mode, initialData, reset, setValue]);

  // Carregar grupos quando o dialog abrir
  useEffect(() => {
    if (open) {
      loadGrupos();
      loadCategorias();
    }
  }, [open, loadGrupos, loadCategorias]);

  // Removed vehicles loading (Gasolina)

  const loadUnidades = async (grupoId?: string) => {
    if (!grupoId) {
      setUnidades([]);
      setResponsaveis([]);
      return;
    }

    try {
      const response = await fetch(`/api/mapeamento?grupoId=${grupoId}`);
      if (response.ok) {
        const result = await response.json();
        const unidadesSafe = Array.isArray(result?.unidades)
          ? result.unidades
          : [];
        setUnidades(unidadesSafe);
        setResponsaveis([]);
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  };

  const loadResponsaveis = async (grupoId?: string, unidadeId?: string) => {
    if (!grupoId || !unidadeId) {
      setResponsaveis([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/mapeamento?grupoId=${grupoId}&unidadeId=${unidadeId}`
      );
      if (response.ok) {
        const result = await response.json();
        const respSafe = Array.isArray(result?.responsaveis)
          ? result.responsaveis
          : [];
        setResponsaveis(respSafe);
      }
    } catch (error) {
      console.error('Erro ao carregar responsáveis:', error);
    }
  };

  const onSubmit = async (data: MovimentoFormData) => {
    setIsLoading(true);
    try {
      const action = mode === 'edit' ? 'update' : 'create';
      if (!canPolicy(userRole as any, 'movimentos', action as any)) {
        toastForbidden('movimentos', action);
        return;
      }
      const isEdit = mode === 'edit' && initialData?.id;
      const response = await fetch('/api/movimentos', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(isEdit ? { id: initialData!.id } : {}),
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar movimento');
      }

      const result = await response.json();
      if (result.success) {
        toast.success(
          isEdit
            ? 'Movimento atualizado com sucesso!'
            : 'Movimento criado com sucesso!'
        );
        reset();
        onOpenChange(false);
        // Revalidar a página de movimentos
        window.location.reload();
      } else {
        throw new Error(
          result.error ||
            (isEdit ? 'Erro ao atualizar movimento' : 'Erro ao criar movimento')
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : mode === 'edit'
            ? 'Erro ao atualizar movimento'
            : 'Erro ao criar movimento';
      toast.error(errorMessage);
      if ((error as any)?.code === 'FORBIDDEN') {
        toastForbidden((error as any).module, (error as any).action);
      }
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed Gasolina helpers

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        a11yTitle="Novo Movimento"
        aria-describedby="novo-mov-desc"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Movimento' : 'Novo Movimento'}
          </DialogTitle>
          <DialogDescription id="novo-mov-desc">
            {mode === 'edit'
              ? 'Atualize os campos do lançamento.'
              : 'Preencha os campos abaixo para registrar um novo lançamento.'}
          </DialogDescription>
        </DialogHeader>

        {/* Gasolina flow removed. Show only standard movement form. */}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo - RH só pode DESPESA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(value: 'RECEITA' | 'DESPESA') =>
                  setValue('tipo', value)
                }
                disabled={userRole === 'RH'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                  {userRole !== 'RH' && (
                    <SelectItem value="RECEITA">Receita</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.tipo.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                type="date"
                {...register('data')}
                className={errors.data ? 'border-red-500' : ''}
              />
              {errors.data && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.data.message}
                </p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              {...register('descricao')}
              placeholder="Descrição do movimento"
              className={errors.descricao ? 'border-red-500' : ''}
            />
            {errors.descricao && (
              <p className="text-sm text-red-500 mt-1">
                {errors.descricao.message}
              </p>
            )}
          </div>

          {/* Grupo, Unidade e Responsável */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="grupoId">Grupo</Label>
              <Select
                onValueChange={value => {
                  setValue('grupoId', value);
                  setValue('unidadeId', '');
                  setValue('responsavelId', '');
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
                onValueChange={value => {
                  setValue('unidadeId', value);
                  setValue('responsavelId', '');
                  const grupoId = watch('grupoId');
                  if (grupoId) {
                    loadResponsaveis(grupoId, value);
                  }
                }}
                disabled={!watch('grupoId')}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      watch('grupoId')
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
                onValueChange={value => setValue('responsavelId', value)}
                disabled={!watch('unidadeId')}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      watch('unidadeId')
                        ? 'Selecione o responsável'
                        : 'Escolha a unidade primeiro'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map(responsavel => (
                    <SelectItem key={responsavel.id} value={responsavel.id}>
                      {responsavel.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categoria */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoriaId">Categoria</Label>
              <Select
                value={watch('categoriaId') || ''}
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

            {/* Quick Add: cria uma categoria na hora */}
            <div className="flex items-end gap-2">
              <div className="grow">
                <Label htmlFor="nomeCategoria">Nova categoria</Label>
                <Input
                  placeholder="Ex.: Material de Limpeza"
                  value={watch('nomeCategoria') || ''}
                  onChange={e => setValue('nomeCategoria', e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={async () => {
                  const nome = watch('nomeCategoria')?.trim();
                  if (!nome) return;

                  try {
                    const res = await fetch('/api/categorias', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ nome, tipo }),
                    });

                    if (res.ok) {
                      const created = await res.json();
                      setValue('categoriaId', created.id);
                      setValue('nomeCategoria', '');
                      loadCategorias(); // Recarregar lista
                      toast.success('Categoria criada com sucesso!');
                    } else {
                      const error = await res.json();
                      toast.error(error.error || 'Erro ao criar categoria');
                    }
                  } catch (error) {
                    toast.error('Erro ao criar categoria');
                    console.error('Erro:', error);
                  }
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>

          {/* Forma de Pagamento e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor">Valor</Label>
              <Input
                type="number"
                step="0.01"
                {...register('valor', { valueAsNumber: true })}
                placeholder="0.00"
                className={errors.valor ? 'border-red-500' : ''}
              />
              {errors.valor && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.valor.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="formaPagamento">
                Forma de Pagamento (opcional)
              </Label>
              <Input
                {...register('formaPagamento')}
                placeholder="Ex: PIX, Cartão, Boleto"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'edit' ? 'Salvar alterações' : 'Criar Movimento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
