export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  href: string;
  label: string;
  roles: string[];
  children?: NavItem[];
}

export const appNavSections: NavSection[] = [
  {
    title: 'Financeiro',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        roles: ['MASTER', 'ADMIN'],
      },
      {
        href: '/movimentos',
        label: 'Movimentos',
        roles: ['MASTER', 'ADMIN'],
      },
      {
        href: 'https://docs.google.com/spreadsheets/d/1va8-Ah9g47DRiafTSxvFGL97WJ6dJ2imhc1UcNY3YIY/edit?gid=2040708529#gid=2040708529',
        label: 'Planilha de Movimentos',
        roles: ['MASTER', 'ADMIN'],
      },
      {
        href: '/provisionamento',
        label: 'Provisionamento',
        roles: ['MASTER', 'ADMIN'],
      },
      {
        href: '/rh/processos',
        label: 'Processos Jurídicos',
        roles: ['MASTER', 'ADMIN', 'RH', 'JURIDICO'],
      },
    ],
  },
  {
    title: 'Operacional',
    items: [
      {
        href: '/checklist-admin',
        label: 'Avaliações',
        roles: [
          'MASTER',
          'SUPERVISOR',
          'OPERACIONAL',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
      },
      {
        href: '/operacional/incidentes',
        label: 'Incidentes',
        roles: [
          'MASTER',
          'SUPERVISOR',
          'OPERACIONAL',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
        children: [
          {
            href: '/operacional/incidentes',
            label: 'Lista de Incidentes',
            roles: [
              'MASTER',
              'SUPERVISOR',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
          {
            href: '/operacional/incidentes/clientes-finais',
            label: 'Clientes Finais',
            roles: [
              'MASTER',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
          {
            href: '/operacional/incidentes/categorias',
            label: 'Categorias',
            roles: [
              'MASTER',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
        ],
      },
      {
        href: '/operacional/checklists',
        label: 'Checklists Operacionais',
        roles: [
          'MASTER',
          'OPERACIONAL',
          'SUPERVISOR',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
        children: [
          {
            href: '/operacional/checklists',
            label: 'Dashboard',
            roles: [
              'MASTER',
              'OPERACIONAL',
              'SUPERVISOR',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
          {
            href: '/operacional/checklists/respondidos',
            label: 'Respondidos',
            roles: [
              'MASTER',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
          {
            href: '/operacional/checklists/admin',
            label: 'Modelos de Checklist',
            roles: ['MASTER', 'OPERACIONAL'],
          },
        ],
      },
      {
        href: '/operacional/controle-gasolina',
        label: 'Controle de Gasolina',
        roles: [
          'MASTER',
          'SUPERVISOR',
          'OPERACIONAL',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
        children: [
          {
            href: '/operacional/controle-gasolina',
            label: 'Painel',
            roles: [
              'MASTER',
              'SUPERVISOR',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
          {
            href: '/operacional/controle-gasolina/rotas/nova',
            label: 'Registrar Rota',
            roles: [
              'MASTER',
              'SUPERVISOR',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
          {
            href: '/operacional/controle-gasolina/admin',
            label: 'Admin',
            roles: [
              'MASTER',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
        ],
      },
      {
        href: '/ponto/supervisor',
        label: 'Ponto Digital',
        roles: [
          'MASTER',
          'RH',
          'OPERACIONAL',
          'SUPERVISOR',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
        children: [
          {
            href: '/ponto/supervisor',
            label: 'Gerenciar Pontos',
            roles: ['MASTER', 'SUPERVISOR', 'OPERACIONAL', 'RH'],
          },
          {
            href: '/ponto/admin',
            label: 'Admin',
            roles: [
              'MASTER',
              'RH',
              'OPERACIONAL',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
          {
            href: '/ponto/admin/termos-ciencia',
            label: 'Termos de Ciência',
            roles: ['MASTER', 'JURIDICO', 'OPERACIONAL'],
          },
          {
            href: '/operacional/ponto/protocolo',
            label: 'Buscar Protocolo',
            roles: [
              'MASTER',
              'RH',
              'OPERACIONAL',
              'SUPERVISOR',
              'PLANEJAMENTO_ESTRATEGICO',
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'RH',
    items: [
      {
        href: '/rh/colaboradores',
        label: 'Colaboradores',
        roles: [
          'MASTER',
          'RH',
          'OPERACIONAL',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
      },
      {
        href: '/rh/crachas',
        label: 'Crachás',
        roles: ['MASTER', 'RH', 'PLANEJAMENTO_ESTRATEGICO'],
      },
      {
        href: '/rh/banco-talentos',
        label: 'Banco de Talentos',
        roles: [
          'MASTER',
          'RH',
          'OPERACIONAL',
          'SUPERVISOR',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
      },
      {
        href: '/rh/central-atendimento',
        label: 'Central de Atendimento',
        roles: [
          'MASTER',
          'RH',
          'OPERACIONAL',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
      },
    ],
  },
  {
    title: 'Administração',
    items: [
      {
        href: '/administracao/mensagens',
        label: 'Mensagens WhatsApp',
        roles: ['MASTER', 'OPERACIONAL', 'PLANEJAMENTO_ESTRATEGICO'],
      },
      {
        href: '/administracao/emails',
        label: 'Emails Enviados',
        roles: ['MASTER', 'OPERACIONAL', 'PLANEJAMENTO_ESTRATEGICO'],
      },
      {
        href: '/auditoria',
        label: 'Auditoria',
        roles: [
          'MASTER',
          'RH',
          'JURIDICO',
          'OPERACIONAL',
          'PLANEJAMENTO_ESTRATEGICO',
        ],
      },
      {
        href: '/config/solicitacoes',
        label: 'Solicitações',
        roles: ['MASTER', 'OPERACIONAL', 'PLANEJAMENTO_ESTRATEGICO'],
        children: [
          {
            href: '/config/solicitacoes/colaboradores',
            label: 'Exclusão de Colaboradores',
            roles: ['MASTER'],
          },
          {
            href: '/config/solicitacoes/curriculos',
            label: 'Descartes de Currículos',
            roles: ['MASTER'],
          },
        ],
      },
    ],
  },
  {
    title: 'Configurações',
    items: [
      {
        href: '/config/organograma',
        label: 'Organograma',
        roles: ['MASTER', 'OPERACIONAL'],
      },
      {
        href: '/config/grupos',
        label: 'Grupos',
        roles: ['MASTER', 'RH', 'OPERACIONAL', 'PLANEJAMENTO_ESTRATEGICO'],
      },
      {
        href: '/config/supervisores',
        label: 'Supervisores',
        roles: ['MASTER', 'OPERACIONAL', 'PLANEJAMENTO_ESTRATEGICO'],
      },
      {
        href: '/config/unidades',
        label: 'Unidades',
        roles: ['MASTER', 'RH', 'OPERACIONAL', 'PLANEJAMENTO_ESTRATEGICO'],
      },
      {
        href: '/config/usuarios',
        label: 'Usuários',
        roles: ['MASTER', 'PLANEJAMENTO_ESTRATEGICO'],
      },
      {
        href: '/config/branding',
        label: 'Branding',
        roles: ['MASTER', 'PLANEJAMENTO_ESTRATEGICO'],
      },
    ],
  },
];
