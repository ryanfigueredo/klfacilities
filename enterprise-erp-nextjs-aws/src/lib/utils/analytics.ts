import { AnalyticsFilters } from '@/app/api/analytics/_schemas';

// Formatação de moeda para BRL
export const toBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Converte data para competência (primeiro dia do mês)
export const asCompetencia = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Cálculo percentual seguro
export const percent = (part: number, total: number): number => {
  if (total === 0) return 0;
  return (part / total) * 100;
};

// Merge filtros para query key estável
export const mergeFiltersToQueryKey = (filters: AnalyticsFilters): string => {
  return JSON.stringify(filters, Object.keys(filters).sort());
};

// Calcula período anterior com mesma duração
export const getPreviousPeriod = (start: Date, end: Date): { start: Date; end: Date } => {
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  
  return { start: previousStart, end: previousEnd };
};

// Calcula variação percentual
export const calculateVariation = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

// Formata variação para display
export const formatVariation = (variation: number): string => {
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(1)}%`;
};

// Gera cores para gráficos
export const generateColors = (count: number): string[] => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];
  
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};
