'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { toast } from 'sonner';

interface GrupoOption {
  id: string;
  nome: string;
  ativo: boolean;
}

interface UnidadeOption {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  grupos: Array<{ id: string | null; nome: string | null }>;
}

interface OperacionalFiltersContextValue {
  grupos: GrupoOption[];
  unidades: UnidadeOption[];
  selectedGrupos: string[];
  selectedUnidade: string | null;
  loading: boolean;
  setSelectedGrupos: (grupos: string[]) => void;
  setSelectedUnidade: (unidade: string | null) => void;
}

const OperacionalFiltersContext = createContext<OperacionalFiltersContextValue | null>(null);

export function useOperacionalFilters() {
  const context = useContext(OperacionalFiltersContext);
  if (!context) {
    throw new Error('useOperacionalFilters must be used within OperacionalFiltersProvider');
  }
  return context;
}

export function OperacionalFiltersProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Ler filtros da URL
  const selectedGrupos = useMemo(() => {
    if (!searchParams) return [];
    const gruposFromUrl = searchParams.getAll('grupoId');
    return gruposFromUrl.filter(Boolean);
  }, [searchParams]);

  const selectedUnidade = useMemo(() => {
    if (!searchParams) return null;
    return searchParams.get('unidadeId') || null;
  }, [searchParams]);

  // Carregar opções
  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        setLoading(true);
        const response = await fetch('/api/checklists-operacionais/options', {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Não foi possível carregar opções.');
        }
        const data = await response.json();
        if (!isMounted) return;
        setGrupos(data.grupos ?? []);
        setUnidades(data.unidades ?? []);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        toast.error('Erro ao carregar opções de filtros.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Atualizar URL quando filtros mudarem
  const setSelectedGrupos = useCallback((grupos: string[]) => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('grupoId');
    grupos.forEach(grupoId => {
      if (grupoId) params.append('grupoId', grupoId);
    });
    // Se não há grupos selecionados, remover o parâmetro
    if (grupos.length === 0) {
      params.delete('grupoId');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl);
  }, [pathname, searchParams, router]);

  const setSelectedUnidade = useCallback((unidade: string | null) => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (unidade) {
      params.set('unidadeId', unidade);
    } else {
      params.delete('unidadeId');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl);
  }, [pathname, searchParams, router]);

  // Filtrar unidades baseado nos grupos selecionados
  const unidadesFiltradas = useMemo(() => {
    if (selectedGrupos.length === 0) return unidades;
    return unidades.filter(unidade =>
      unidade.grupos?.some(grupo => grupo?.id && selectedGrupos.includes(grupo.id))
    );
  }, [unidades, selectedGrupos]);

  const value: OperacionalFiltersContextValue = {
    grupos,
    unidades: unidadesFiltradas,
    selectedGrupos,
    selectedUnidade,
    loading,
    setSelectedGrupos,
    setSelectedUnidade,
  };

  return (
    <OperacionalFiltersContext.Provider value={value}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-12 md:p-8">
        <OperacionalFiltersBar />
        {children}
      </div>
    </OperacionalFiltersContext.Provider>
  );
}

// Função para gerar um código curto a partir de um UUID
function getShortCode(id: string): string {
  if (!id) return '';
  // Pegar os primeiros 8 caracteres do UUID e formatar como código
  const short = id.replace(/-/g, '').substring(0, 8).toUpperCase();
  return short.match(/.{1,4}/g)?.join('-') || short;
}

function OperacionalFiltersBar() {
  const {
    grupos,
    unidades,
    selectedGrupos,
    selectedUnidade,
    loading,
    setSelectedGrupos,
    setSelectedUnidade,
  } = useOperacionalFilters();

  const gruposAtivos = grupos.filter(g => g.ativo);
  const gruposDisponiveis = gruposAtivos.filter(g => !selectedGrupos.includes(g.id));
  const hasActiveFilters = selectedGrupos.length > 0 || selectedUnidade !== null;

  const handleAddGrupo = (grupoId: string) => {
    if (!selectedGrupos.includes(grupoId)) {
      setSelectedGrupos([...selectedGrupos, grupoId]);
    }
  };

  const handleRemoveGrupo = (grupoId: string) => {
    setSelectedGrupos(selectedGrupos.filter(id => id !== grupoId));
  };

  const handleClearFilters = () => {
    setSelectedGrupos([]);
    setSelectedUnidade(null);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {selectedGrupos.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedGrupos.map(grupoId => {
              const grupo = gruposAtivos.find(g => g.id === grupoId);
              // Só mostrar badge se encontrar o grupo, caso contrário ocultar
              if (!grupo) return null;
              return (
                <Badge
                  key={grupoId}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveGrupo(grupoId)}
                >
                  {grupo.nome}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              );
            })}
          </div>
        )}
        {selectedUnidade && (() => {
          const unidade = unidades.find(u => u.id === selectedUnidade);
          // Só mostrar badge se encontrar a unidade, caso contrário ocultar
          if (!unidade) return null;
          return (
            <Badge
              key={selectedUnidade}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setSelectedUnidade(null)}
            >
              {unidade.nome}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          );
        })()}
        {!hasActiveFilters && (
          <span className="text-sm text-muted-foreground">
            Nenhum filtro aplicado
          </span>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {selectedGrupos.length + (selectedUnidade ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-7 text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="filter-grupo" className="text-xs">
                  Grupo <span className="text-destructive">*</span>
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={undefined}
                      onValueChange={handleAddGrupo}
                      disabled={gruposDisponiveis.length === 0}
                    >
                      <SelectTrigger id="filter-grupo" className="h-9">
                        <SelectValue placeholder="Adicionar grupo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {gruposDisponiveis.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Todos os grupos já foram selecionados
                          </div>
                        ) : (
                          gruposDisponiveis.map(grupo => (
                            <SelectItem key={grupo.id} value={grupo.id}>
                              {grupo.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedGrupos.length === 0 && (
                      <p className="text-xs text-destructive">
                        Selecione pelo menos um grupo
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-unidade" className="text-xs">
                  Unidade (opcional)
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    value={selectedUnidade || '__ALL__'}
                    onValueChange={value => setSelectedUnidade(value === '__ALL__' ? null : value)}
                    disabled={selectedGrupos.length === 0}
                  >
                    <SelectTrigger id="filter-unidade" className="h-9">
                      <SelectValue placeholder="Todas as unidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">Todas as unidades</SelectItem>
                      {unidades.map(unidade => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                          {unidade.cidade ? ` · ${unidade.cidade}` : ''}
                          {unidade.estado ? `/${unidade.estado}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

