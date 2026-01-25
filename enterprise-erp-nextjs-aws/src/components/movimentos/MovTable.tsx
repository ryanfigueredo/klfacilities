'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CalendarIcon, ChevronDownIcon, FilterIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { MovDrawer } from './MovDrawer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { Eye, Trash2, Plus, Search, Filter } from 'lucide-react';
import { MovFormDialog } from './MovFormDialog';

interface Movimento {
  id: string;
  tipo: 'RECEITA' | 'DESPESA';
  dataLanc: Date;
  competencia: Date;
  descricao: string;
  grupoId: string | null;
  grupo: { nome: string } | null;
  unidadeId: string | null;
  unidade: { nome: string } | null;
  categoriaId: string | null;
  categoriaRel: { nome: string } | null;
  categoria: string | null;
  subcategoria: string | null;
  centroCusto: string | null;
  documento: string | null;
  formaPagamento: string | null;
  valor: any; // Prisma Decimal
  valorAssinado: any; // Prisma Decimal
  criadoPor: { name: string };
  criadoEm: Date;
}

// Columns will be defined inside the component to access isAdmin

export function MovTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Verificar se o usuário é admin
  const isAdmin = session?.user?.role === 'ADMIN';

  // Define columns inside component to access isAdmin
  const columns: ColumnDef<Movimento>[] = [
    {
      accessorKey: 'dataLanc',
      header: 'Data',
      cell: ({ row }) => {
        const data = row.getValue('dataLanc') as Date;
        // Garantir que a data seja tratada corretamente
        const dataObj = data instanceof Date ? data : new Date(data);
        return format(dataObj, 'dd/MM/yyyy', { locale: ptBR });
      },
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => {
        const tipo = row.getValue('tipo') as string;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              tipo === 'RECEITA'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {tipo}
          </span>
        );
      },
    },
    {
      accessorKey: 'descricao',
      header: 'Descrição',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.getValue('descricao')}>
          {row.getValue('descricao')}
        </div>
      ),
    },
    {
      accessorKey: 'grupo.nome',
      header: 'Grupo',
      cell: ({ row }) => row.original.grupo?.nome || '-',
    },
    {
      accessorKey: 'unidade.nome',
      header: 'Unidade',
      cell: ({ row }) => row.original.unidade?.nome || '-',
    },
    {
      accessorKey: 'categoriaRel.nome',
      header: 'Categoria',
      cell: ({ row }) => row.original.categoriaRel?.nome || '-',
    },
    {
      accessorKey: 'valor',
      header: 'Valor',
      cell: ({ row }) => {
        const valor = row.getValue('valor') as number;
        const tipo = row.getValue('tipo') as string;
        return (
          <span
            className={`font-mono ${
              tipo === 'DESPESA' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(valor)}
          </span>
        );
      },
    },
    {
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => {
        const movimento = row.original;
        return (
          <div className="flex gap-2">
            <MovDrawer movimento={movimento} />
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            {/* Botão de exclusão apenas para administradores */}
            {isAdmin && (
              <ConfirmDialog
                title="Excluir Movimento"
                description="Tem certeza que deseja excluir este movimento? Esta ação não pode ser desfeita."
                onConfirm={async () => {
                  try {
                    await fetch(`/api/movimentos?id=${movimento.id}`, {
                      method: 'DELETE',
                    });
                    toast.success('Movimento excluído com sucesso');
                    window.location.reload();
                  } catch (error) {
                    toast.error('Erro ao excluir movimento');
                  }
                }}
              >
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ConfirmDialog>
            )}
          </div>
        );
      },
    },
  ];

  // Filtros
  const [filtros, setFiltros] = useState({
    periodo: undefined as { from: Date; to: Date } | undefined,
    tipo: '',
    unidadeId: '',
    grupoId: '',
    categoria: '',
  });

  // Opções dos filtros
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>(
    []
  );

  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        // Filtrar apenas valores válidos para URLSearchParams
        const filtrosValidos = Object.fromEntries(
          Object.entries(filtros)
            .filter(([_, v]) => v !== '' && v !== undefined && v !== null)
            .map(([k, v]) => [
              k,
              typeof v === 'object' && v !== null
                ? `${v.from.toISOString()}_${v.to.toISOString()}`
                : String(v),
            ])
        );

        const [movimentosData, gruposData, unidadesData, categoriasData] =
          await Promise.all([
            fetch(
              `/api/movimentos?page=${page}&limit=${limit}&${new URLSearchParams(filtrosValidos).toString()}`
            ).then(res => res.json()),
            fetch('/api/grupos').then(res => res.json()),
            fetch('/api/unidades').then(res => res.json()),
            fetch('/api/categorias').then(res => res.json()),
          ]);

        // Garantir que as datas sejam convertidas corretamente
        const movimentosProcessados =
          movimentosData.movimentos?.map((movimento: any) => ({
            ...movimento,
            dataLanc: new Date(movimento.dataLanc),
            competencia: new Date(movimento.competencia),
            criadoEm: new Date(movimento.criadoEm),
          })) || [];
        setMovimentos(movimentosProcessados);
        setTotal(movimentosData.total);
        setPages(movimentosData.pages);
        setGrupos(gruposData);
        setUnidades(unidadesData);
        setCategorias(categoriasData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [page, filtros]);

  const table = useReactTable({
    data: movimentos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const aplicarFiltros = (novosFiltros: typeof filtros) => {
    setFiltros(novosFiltros);
    router.push('/movimentos?page=1');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar de Filtros */}
      <div className="flex gap-4 flex-wrap items-center">
        {/* Filtro de Período */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filtros.periodo
                ? `${format(filtros.periodo.from, 'dd/MM/yyyy')} - ${format(filtros.periodo.to, 'dd/MM/yyyy')}`
                : 'Período'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={filtros.periodo}
              onSelect={range => {
                if (range?.from && range?.to) {
                  aplicarFiltros({
                    ...filtros,
                    periodo: { from: range.from, to: range.to },
                  });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Filtro de Tipo */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {filtros.tipo || 'Tipo'}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-0">
            <Command>
              <CommandList>
                <CommandItem
                  onSelect={() => aplicarFiltros({ ...filtros, tipo: '' })}
                >
                  Todos
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    aplicarFiltros({ ...filtros, tipo: 'RECEITA' })
                  }
                >
                  Receita
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    aplicarFiltros({ ...filtros, tipo: 'DESPESA' })
                  }
                >
                  Despesa
                </CommandItem>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filtro de Unidade */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {unidades.find(u => u.id === filtros.unidadeId)?.nome ||
                'Unidade'}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0">
            <Command>
              <CommandInput placeholder="Buscar unidade..." />
              <CommandList>
                <CommandItem
                  onSelect={() => aplicarFiltros({ ...filtros, unidadeId: '' })}
                >
                  Todas
                </CommandItem>
                {unidades.map(unidade => (
                  <CommandItem
                    key={unidade.id}
                    onSelect={() =>
                      aplicarFiltros({ ...filtros, unidadeId: unidade.id })
                    }
                  >
                    {unidade.nome}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filtro de Grupo */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {grupos.find(g => g.id === filtros.grupoId)?.nome || 'Grupo'}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0">
            <Command>
              <CommandInput placeholder="Buscar grupo..." />
              <CommandList>
                <CommandItem
                  onSelect={() => aplicarFiltros({ ...filtros, grupoId: '' })}
                >
                  Todos
                </CommandItem>
                {grupos.map(grupo => (
                  <CommandItem
                    key={grupo.id}
                    onSelect={() =>
                      aplicarFiltros({ ...filtros, grupoId: grupo.id })
                    }
                  >
                    {grupo.nome}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filtro de Categoria */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {categorias.find(c => c.id === filtros.categoria)?.nome ||
                'Categoria'}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0">
            <Command>
              <CommandInput placeholder="Buscar categoria..." />
              <CommandList>
                <CommandItem
                  onSelect={() => aplicarFiltros({ ...filtros, categoria: '' })}
                >
                  Todas
                </CommandItem>
                {categorias.map(categoria => (
                  <CommandItem
                    key={categoria.id}
                    onSelect={() =>
                      aplicarFiltros({ ...filtros, categoria: categoria.id })
                    }
                  >
                    {categoria.nome}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Botão Limpar Filtros */}
        <Button
          variant="ghost"
          onClick={() => {
            setFiltros({
              periodo: undefined,
              tipo: '',
              unidadeId: '',
              grupoId: '',
              categoria: '',
            });
            router.push('/movimentos?page=1');
          }}
        >
          Limpar
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum movimento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)}{' '}
            de {total} resultados
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(`/movimentos?page=${page - 1}`)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => router.push(`/movimentos?page=${page + 1}`)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
