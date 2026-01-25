export const CATEGORIAS = [
  'Frota',
  'Comercial',
  'Administrativo',
  'RH',
  'TI',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Operacional',
  'Infraestrutura',
  'Segurança',
  'Limpeza',
  'Manutenção',
  'Outros',
] as const;

export const SUBCATEGORIAS = {
  Frota: [
    'Combustível',
    'Pedágios',
    'Manutenção',
    'Seguros',
    'Licenciamento',
    'Multas',
    'Outros',
  ],
  Comercial: [
    'Atacado',
    'Varejo',
    'Comissões',
    'Promoções',
    'Marketing',
    'Outros',
  ],
  Administrativo: [
    'Aluguel',
    'Contabilidade',
    'Consultoria',
    'Documentação',
    'Outros',
  ],
  RH: ['Salários', 'Benefícios', 'Treinamentos', 'Recrutamento', 'Outros'],
  TI: [
    'Software',
    'Hardware',
    'Internet',
    'Suporte',
    'Desenvolvimento',
    'Outros',
  ],
  Marketing: ['Publicidade', 'Mídia', 'Eventos', 'Materiais', 'Outros'],
  Financeiro: [
    'Taxas Bancárias',
    'Juros',
    'Investimentos',
    'Seguros',
    'Outros',
  ],
  Jurídico: ['Advocacia', 'Processos', 'Consultoria', 'Outros'],
  Operacional: ['Equipamentos', 'Materiais', 'Serviços', 'Outros'],
  Infraestrutura: ['Energia', 'Água', 'Gás', 'Telefonia', 'Outros'],
  Segurança: ['Vigilância', 'Alarmes', 'Câmeras', 'Outros'],
  Limpeza: ['Produtos', 'Serviços', 'Equipamentos', 'Outros'],
  Manutenção: ['Preventiva', 'Corretiva', 'Equipamentos', 'Outros'],
  Outros: ['Diversos', 'Não Classificado'],
} as const;

export const CENTROS_CUSTO = [
  'Administração',
  'Compras',
  'Frota',
  'RH',
  'TI',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Operacional',
  'Infraestrutura',
  'Segurança',
  'Limpeza',
  'Manutenção',
  'Outros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];
export type Subcategoria = (typeof SUBCATEGORIAS)[Categoria][number];
export type CentroCusto = (typeof CENTROS_CUSTO)[number];

export const featureTicketLog = process.env.FEATURE_TICKET_LOG === 'true';
export const featureSemParar = process.env.FEATURE_SEM_PARAR === 'true';
export const featureGasolina = process.env.FEATURE_GASOLINA === 'true';
