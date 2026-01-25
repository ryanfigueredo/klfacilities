import { AnalyticsFilters } from '@/app/api/analytics/_schemas';

// Tipos de resposta das APIs
export interface SummaryData {
  receitas: number;
  despesas: number;
  resultado: number;
  qtdMovimentos: number;
  ticketMedioDespesa: number;
  variacoes: {
    receitas: number;
    despesas: number;
    resultado: number;
    qtdMovimentos: number;
  };
}

export interface SeriesData {
  competencia: string;
  receitas: number;
  despesas: number;
  resultado: number;
}

export interface TopCategoriaData {
  categoria: string;
  total: number;
  count: number;
  sparkline?: number[];
}

export interface GrupoData {
  id?: string;
  grupo: string;
  total: number;
  percentual: number;
  count: number;
  children: {
    unidade: string;
    total: number;
    percentual: number;
    count: number;
  }[];
}

export interface ByGrupoData {
  grupos: GrupoData[];
  totalGeral: number;
}

export interface UnidadeData {
  unidade: string;
  total: number;
  percentual: number;
  count: number;
  children: {
    categoria: string;
    total: number;
    percentual: number;
    count: number;
  }[];
}

export interface ByUnidadeData {
  unidades: UnidadeData[];
  totalGeral: number;
}

export interface DrilldownData {
  dimension: string;
  total: number;
  count: number;
  recent: {
    id: string;
    descricao: string;
    dataLanc: Date;
    valor: number;
    valorAssinado: number;
    tipo: string;
    grupo?: string;
    unidade?: string;
    categoria?: string;
  }[];
}

export type GroupBreakdownResponse = {
  meta: {
    groupId: string;
    groupName: string;
    total: number;
    currency: 'BRL';
    appliedFilters: Record<string, any>;
  };
  pie: Array<{
    categoriaId: string | null;
    categoria: string;
    total: number;
    pct: number;
  }>;
  table: Array<{
    categoriaId: string | null;
    categoria: string;
    unidadeId: string | null;
    unidade: string;
    grupoId: string;
    grupo: string;
    total: number;
    pct: number;
  }>;
};

export interface AnomaliasData {
  duplicidades: {
    id: string;
    descricao: string;
    dataLanc: Date;
    valor: number;
    grupoId?: string;
    categoria?: string;
    count: number;
  }[];
  semCategoria: {
    id: string;
    descricao: string;
    dataLanc: Date;
    valor: number;
    grupo?: string;
    unidade?: string;
  }[];
  outliers: {
    id: string;
    descricao: string;
    dataLanc: Date;
    valor: number;
    categoria?: string;
    grupoId?: string;
    zScore: number;
  }[];
}

// Função helper para construir query params
const buildQueryParams = (filters: AnalyticsFilters): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.start) params.append('start', filters.start);
  if (filters.end) params.append('end', filters.end);
  if (filters.grupoId?.length)
    filters.grupoId.forEach(id => params.append('grupoId', id));
  if (filters.unidadeId?.length)
    filters.unidadeId.forEach(id => params.append('unidadeId', id));
  if (filters.categoria?.length)
    filters.categoria.forEach(cat => params.append('categoria', cat));
  if (filters.tipo?.length) filters.tipo.forEach(t => params.append('tipo', t));
  if (filters.search) params.append('search', filters.search);

  return params;
};

// Fetchers
export const getSummary = async (
  filters: AnalyticsFilters
): Promise<SummaryData> => {
  const params = buildQueryParams(filters);
  const response = await fetch(`/api/analytics/summary?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar resumo');
  return response.json();
};

export const getSeries = async (
  filters: AnalyticsFilters
): Promise<SeriesData[]> => {
  const params = buildQueryParams(filters);
  const response = await fetch(`/api/analytics/series?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar série temporal');
  return response.json();
};

export const getTopCategorias = async (
  filters: AnalyticsFilters,
  limit: number = 10,
  includeSparkline: boolean = false
): Promise<TopCategoriaData[]> => {
  const params = buildQueryParams(filters);
  params.append('limit', limit.toString());
  params.append('includeSparkline', includeSparkline.toString());

  const response = await fetch(`/api/analytics/top-categorias?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar top categorias');
  return response.json();
};

export const getByGrupo = async (
  filters: AnalyticsFilters
): Promise<ByGrupoData> => {
  const params = buildQueryParams(filters);
  const response = await fetch(`/api/analytics/by-grupo?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar dados por grupo');
  return response.json();
};

export const getByUnidade = async (
  filters: AnalyticsFilters
): Promise<ByUnidadeData> => {
  const params = buildQueryParams(filters);
  const response = await fetch(`/api/analytics/by-unidade?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar dados por unidade');
  return response.json();
};

export const getDrilldown = async (
  dimension: 'grupo' | 'unidade' | 'categoria' | 'subcategoria' | 'centroCusto',
  filters: AnalyticsFilters
): Promise<{ dimension: string; data: DrilldownData[] }> => {
  const params = buildQueryParams(filters);
  params.append('dimension', dimension);

  const response = await fetch(`/api/analytics/drilldown?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar drilldown');
  return response.json();
};

export const getAnomalias = async (
  filters: AnalyticsFilters
): Promise<AnomaliasData> => {
  const params = buildQueryParams(filters);
  const response = await fetch(`/api/analytics/anomalias?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar anomalias');
  return response.json();
};

export const getGroupBreakdown = async (
  groupId: string,
  filters: AnalyticsFilters
): Promise<GroupBreakdownResponse> => {
  const params = buildQueryParams(filters);
  params.append('groupId', groupId);
  const response = await fetch(`/api/analytics/group-breakdown?${params}`);
  if (!response.ok) throw new Error('Falha ao buscar drilldown do grupo');
  return response.json();
};
