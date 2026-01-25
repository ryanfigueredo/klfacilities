import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AnalyticsFilters } from '@/app/api/analytics/_schemas';

export function useAnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filtros da URL
  const filters = useMemo((): AnalyticsFilters => {
    const unidadesCsv = searchParams.get('unidades');
    const unidadesFromCsv = unidadesCsv
      ? unidadesCsv
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];
    const categoriasCsv = searchParams.get('categorias');
    const categoriasFromCsv = categoriasCsv
      ? categoriasCsv
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];
    const start =
      searchParams.get('start') || searchParams.get('from') || undefined;
    const end = searchParams.get('end') || searchParams.get('to') || undefined;
    return {
      start,
      end,
      grupoId: searchParams.getAll('grupoId'),
      unidadeId: (searchParams.getAll('unidadeId') || []).concat(
        unidadesFromCsv
      ),
      categoria: (searchParams.getAll('categoria') || []).concat(
        categoriasFromCsv
      ),
      tipo: searchParams.getAll('tipo') as any,
      search: searchParams.get('search') || searchParams.get('q') || undefined,
    };
  }, [searchParams]);

  // Atualizar filtros
  const setFilters = useCallback(
    (newFilters: Partial<AnalyticsFilters>) => {
      const params = new URLSearchParams(searchParams);

      // Limpar filtros existentes
      params.delete('start');
      params.delete('end');
      params.delete('grupoId');
      params.delete('unidadeId');
      params.delete('categoria');
      params.delete('tipo');
      params.delete('search');

      // Adicionar novos filtros
      if (newFilters.start) params.set('start', newFilters.start);
      if (newFilters.end) params.set('end', newFilters.end);
      if (newFilters.grupoId?.length) {
        newFilters.grupoId.forEach(id => params.append('grupoId', id));
      }
      if (newFilters.unidadeId?.length) {
        newFilters.unidadeId.forEach(id => params.append('unidadeId', id));
      }
      if (newFilters.categoria?.length) {
        newFilters.categoria.forEach(cat => params.append('categoria', cat));
      }
      if (newFilters.tipo?.length) {
        newFilters.tipo.forEach(t => params.append('tipo', t));
      }
      if (newFilters.search) params.set('search', newFilters.search);

      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  // Adicionar filtro (append)
  const addFilter = useCallback(
    (key: keyof AnalyticsFilters, value: string) => {
      const currentValues = (filters[key] as string[]) || [];
      if (!currentValues.includes(value)) {
        setFilters({
          ...filters,
          [key]: [...currentValues, value],
        });
      }
    },
    [filters, setFilters]
  );

  // Remover filtro
  const removeFilter = useCallback(
    (key: keyof AnalyticsFilters, value: string) => {
      const currentValues = (filters[key] as string[]) || [];
      const newValues = currentValues.filter(v => v !== value);

      setFilters({
        ...filters,
        [key]: newValues.length > 0 ? newValues : undefined,
      });
    },
    [filters, setFilters]
  );

  // Limpar todos os filtros
  const reset = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  // Limpar filtro específico
  const clearFilter = useCallback(
    (key: keyof AnalyticsFilters) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    },
    [filters, setFilters]
  );

  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.start ||
      filters.end ||
      filters.grupoId?.length ||
      filters.unidadeId?.length ||
      filters.categoria?.length ||
      filters.tipo?.length ||
      filters.search
    );
  }, [filters]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.start) count++;
    if (filters.end) count++;
    if (filters.grupoId?.length) count += filters.grupoId.length;
    if (filters.unidadeId?.length) count += filters.unidadeId.length;
    if (filters.categoria?.length) count += filters.categoria.length;
    if (filters.tipo?.length) count += filters.tipo.length;
    if (filters.search) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    addFilter,
    removeFilter,
    reset,
    clearFilter,
    hasActiveFilters,
    activeFiltersCount,
  };
}
