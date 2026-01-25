import { z } from 'zod';

export const AnalyticsFiltersSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  grupoId: z.array(z.string()).optional(),
  unidadeId: z.array(z.string()).optional(),
  categoria: z.array(z.string()).optional(),
  tipo: z.array(z.enum(['RECEITA', 'DESPESA'])).optional(),
  search: z.string().optional(),
});

export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>;

export const DrilldownSchema = z.object({
  dimension: z.enum([
    'grupo',
    'unidade',
    'categoria',
    'subcategoria',
    'centroCusto',
  ]),
  filters: AnalyticsFiltersSchema,
});

export const TopCategoriasSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  includeSparkline: z.boolean().default(false),
  filters: AnalyticsFiltersSchema,
});
