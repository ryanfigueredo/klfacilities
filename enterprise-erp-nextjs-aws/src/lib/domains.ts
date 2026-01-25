// Configuração dos domínios e suas respectivas seções
export const DOMAIN_CONFIG = {
  'checklist.klfacilities.com.br': {
    name: 'Checklist',
    defaultPath: '/checklist-admin',
    color: 'green',
    description: 'Gestão de checklists e conformidade'
  },
  'ponto.klfacilities.com.br': {
    name: 'Ponto Eletrônico', 
    defaultPath: '/ponto/supervisor',
    color: 'blue',
    description: 'Controle de ponto e folha de pagamento'
  },
  'financeiro.klfacilities.com.br': {
    name: 'Financeiro',
    defaultPath: '/dashboard',
    color: 'purple', 
    description: 'Controle financeiro e movimentações'
  },
  'colaborador.klfacilities.com.br': {
    name: 'Central de Atendimento',
    defaultPath: '/colaborador',
    color: 'indigo',
    description: 'Central de Atendimento ao Funcionário'
  }
} as const;

export type DomainKey = keyof typeof DOMAIN_CONFIG;
export type AppSection = typeof DOMAIN_CONFIG[DomainKey]['name'];

export function getDomainConfig(hostname: string) {
  return DOMAIN_CONFIG[hostname as DomainKey] || null;
}

export function getCurrentDomain(): DomainKey | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  return hostname in DOMAIN_CONFIG ? hostname as DomainKey : null;
}
