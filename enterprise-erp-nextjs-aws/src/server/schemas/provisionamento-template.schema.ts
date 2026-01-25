import { z } from 'zod';

export const provisionamentoTemplateCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().positive('Valor deve ser > 0'),
  tipo: z.enum(['RECEITA', 'DESPESA']).default('DESPESA'),
  periodicidade: z.enum(['MENSAL', 'QUINZENAL', 'SEMANAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']).default('MENSAL'),
  diaVencimento: z.number().int().min(1).max(31),
  ativo: z.boolean().default(true),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional().nullable(),
  grupoId: z.string().optional().nullable(),
  unidadeId: z.string().optional().nullable(),
  categoriaId: z.string().optional().nullable(),
  subcategoriaId: z.string().optional().nullable(),
  centroCustoId: z.string().optional().nullable(),
  contaId: z.string().optional().nullable(),
  formaPagamento: z.string().optional().nullable(),
  documento: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
});

export const provisionamentoTemplateUpdateSchema =
  provisionamentoTemplateCreateSchema.partial();

export const provisionamentoTemplateFilterSchema = z.object({
  ativo: z.coerce.boolean().optional(),
  tipo: z.enum(['RECEITA', 'DESPESA']).optional(),
  grupoId: z.string().optional(),
  unidadeId: z.string().optional(),
  q: z.string().optional(),
});

export type ProvisionamentoTemplateCreateInput = z.infer<
  typeof provisionamentoTemplateCreateSchema
>;
export type ProvisionamentoTemplateUpdateInput = z.infer<
  typeof provisionamentoTemplateUpdateSchema
>;
export type ProvisionamentoTemplateFilters = z.infer<
  typeof provisionamentoTemplateFilterSchema
>;

