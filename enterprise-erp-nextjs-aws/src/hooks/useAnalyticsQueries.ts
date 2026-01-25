import { useQuery } from '@tanstack/react-query';
import {
  getSummary,
  getSeries,
  getTopCategorias,
  getByGrupo,
  getByUnidade,
  getDrilldown,
  getAnomalias,
  getGroupBreakdown,
  GroupBreakdownResponse,
} from '@/lib/api/analytics';
import { AnalyticsFilters } from '@/app/api/analytics/_schemas';
import { mergeFiltersToQueryKey } from '@/lib/utils/analytics';

// Query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (filters: AnalyticsFilters) =>
    [...analyticsKeys.all, 'summary', mergeFiltersToQueryKey(filters)] as const,
  series: (filters: AnalyticsFilters) =>
    [...analyticsKeys.all, 'series', mergeFiltersToQueryKey(filters)] as const,
  topCategorias: (
    filters: AnalyticsFilters,
    limit: number,
    includeSparkline: boolean
  ) =>
    [
      ...analyticsKeys.all,
      'topCategorias',
      mergeFiltersToQueryKey(filters),
      limit,
      includeSparkline,
    ] as const,
  byGrupo: (filters: AnalyticsFilters) =>
    [...analyticsKeys.all, 'byGrupo', mergeFiltersToQueryKey(filters)] as const,
  byUnidade: (filters: AnalyticsFilters) =>
    [
      ...analyticsKeys.all,
      'byUnidade',
      mergeFiltersToQueryKey(filters),
    ] as const,
  drilldown: (dimension: string, filters: AnalyticsFilters) =>
    [
      ...analyticsKeys.all,
      'drilldown',
      dimension,
      mergeFiltersToQueryKey(filters),
    ] as const,
  anomalias: (filters: AnalyticsFilters) =>
    [
      ...analyticsKeys.all,
      'anomalias',
      mergeFiltersToQueryKey(filters),
    ] as const,
  groupBreakdown: (groupId: string, filters: AnalyticsFilters) =>
    [
      ...analyticsKeys.all,
      'group-breakdown',
      groupId,
      mergeFiltersToQueryKey(filters),
    ] as const,
};

// Hooks
export function useSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.summary(filters),
    queryFn: () => getSummary(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useSeries(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.series(filters),
    queryFn: () => getSeries(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useTopCategorias(
  filters: AnalyticsFilters,
  limit: number = 10,
  includeSparkline: boolean = false
) {
  return useQuery({
    queryKey: analyticsKeys.topCategorias(filters, limit, includeSparkline),
    queryFn: () => getTopCategorias(filters, limit, includeSparkline),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useByGrupo(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.byGrupo(filters),
    queryFn: () => getByGrupo(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useByUnidade(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.byUnidade(filters),
    queryFn: () => getByUnidade(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useDrilldown(
  dimension: 'grupo' | 'unidade' | 'categoria' | 'subcategoria' | 'centroCusto',
  filters: AnalyticsFilters
) {
  return useQuery({
    queryKey: analyticsKeys.drilldown(dimension, filters),
    queryFn: () => getDrilldown(dimension, filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAnomalias(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.anomalias(filters),
    queryFn: () => getAnomalias(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useGroupBreakdown(
  groupId: string | undefined,
  filters: AnalyticsFilters
) {
  return useQuery<GroupBreakdownResponse>({
    queryKey: analyticsKeys.groupBreakdown(groupId || 'none', filters),
    queryFn: () => {
      if (!groupId) throw new Error('groupId ausente');
      return getGroupBreakdown(groupId, filters);
    },
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
