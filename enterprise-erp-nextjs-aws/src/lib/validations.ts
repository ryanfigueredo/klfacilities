import { z } from 'zod';

// Define lightweight enum literals to keep this file safe for client components
const TipoMovValues = ['RECEITA', 'DESPESA'] as const;
const StatusPropostaValues = [
  'PENDENTE',
  'APROVADA',
  'RECUSADA',
  'AJUSTES',
] as const;
const StatusProvisaoValues = ['PENDENTE', 'EFETIVADO', 'CANCELADO'] as const;

export const statusChangeSchema = z.object({
  status: z.enum(StatusPropostaValues),
  observacao: z.string().optional(),
});

export const movimentosSchema = z.object({
  tipo: z.enum(TipoMovValues),
  data: z
    .string()
    .min(1, 'Data é obrigatória')
    .refine(data => {
      const date = new Date(data);
      return !isNaN(date.getTime());
    }, 'Data inválida'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().min(0, 'Valor deve ser maior ou igual a zero'),
  unidadeId: z.string().optional(),
  grupoId: z.string().optional(),
  responsavelId: z.string().optional(),
  formaPagamento: z.string().optional(),
  categoriaId: z.string().optional(),
  nomeCategoria: z.string().optional(),
});

export const provisaoSchema = z.object({
  tipo: z.enum(TipoMovValues),
  dataPrevista: z
    .string()
    .min(1, 'Data prevista é obrigatória')
    .refine(d => !isNaN(new Date(d).getTime()), 'Data prevista inválida'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().min(0, 'Valor deve ser maior ou igual a zero'),
  unidadeId: z.string().optional(),
  grupoId: z.string().optional(),
  status: z.enum(StatusProvisaoValues).optional(),
});

export type StatusChangeData = z.infer<typeof statusChangeSchema>;
export type ProvisaoData = z.infer<typeof provisaoSchema>;
