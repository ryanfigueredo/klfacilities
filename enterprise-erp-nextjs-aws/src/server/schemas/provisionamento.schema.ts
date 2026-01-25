import { z } from 'zod';

export const provisionamentoCreateSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().positive('Valor deve ser > 0'),
  dataVenc: z.coerce.date(),
  competencia: z.coerce.date().optional().nullable(), // Competência contábil (quando incorre)
  tipo: z.enum(['RECEITA', 'DESPESA']).default('DESPESA'),
  documento: z.string().optional().nullable(),
  formaPagamento: z.string().optional().nullable(),
  grupoId: z.string().optional().nullable(),
  unidadeId: z.string().optional().nullable(),
  categoriaId: z.string().optional().nullable(),
  subcategoriaId: z.string().optional().nullable(),
  centroCustoId: z.string().optional().nullable(),
  contaId: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(), // ID do template se gerado automaticamente
});

export const provisionamentoUpdateSchema =
  provisionamentoCreateSchema.partial();

export const provisionamentoFilterSchema = z.object({
  status: z.enum(['PENDENTE', 'EFETIVADO', 'CANCELADO']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  grupoId: z.string().optional(),
  unidadeId: z.string().optional(),
  categoriaId: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const marcarPagoSchema = z.object({
  dataPgto: z.coerce.date().optional(),
  contaId: z.string().optional().nullable(),
  formaPagamento: z.string().optional().nullable(),
});

export type ProvisionamentoCreateInput = z.infer<
  typeof provisionamentoCreateSchema
>;
export type ProvisionamentoUpdateInput = z.infer<
  typeof provisionamentoUpdateSchema
>;
export type ProvisionamentoFilters = z.infer<
  typeof provisionamentoFilterSchema
>;
export type MarcarPagoInput = z.infer<typeof marcarPagoSchema>;
