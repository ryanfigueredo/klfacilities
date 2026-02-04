// Centralized RBAC policy: matrix and helpers (isomorphic: safe for client and server)

export type AppRole =
  | 'MASTER'
  | 'ADMIN'
  | 'RH'
  | 'SUPERVISOR'
  | 'JURIDICO'
  | 'OPERACIONAL'
  | 'LAVAGEM'
  | 'PLANEJAMENTO_ESTRATEGICO';

export type AppModule =
  | 'movimentos'
  | 'provisionamentos'
  | 'unidades'
  | 'grupos'
  | 'responsaveis'
  | 'categorias'
  | 'produtos'
  | 'carros'
  | 'logs'
  | 'usuarios'
  | 'relatorios'
  | 'incidentes'
  | 'checklists';

export type AppAction =
  | 'list'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'read';

// Normalize legacy/specific roles to generic ones
export function normalizeRole(role?: string | null): AppRole | undefined {
  if (!role) return undefined;
  return role as AppRole;
}

// Policy matrix: per role → per module → allowed actions
export const policyMatrix: Record<
  AppRole,
  Partial<Record<AppModule, AppAction[]>>
> = {
  // MASTER: acesso total a tudo
  MASTER: {
    movimentos: ['list', 'create', 'update', 'delete'],
    provisionamentos: ['list', 'create', 'update', 'delete'],
    unidades: ['list', 'create', 'update', 'delete'],
    grupos: ['list', 'create', 'update', 'delete'],
    responsaveis: ['list', 'create', 'update', 'delete'],
    categorias: ['list', 'create', 'update', 'delete'],
    produtos: ['list', 'create', 'update', 'delete'],
    carros: ['list', 'create', 'update', 'delete'],
    logs: ['list', 'export'],
    usuarios: ['list', 'create', 'update', 'delete'],
    relatorios: ['read'],
    incidentes: ['list', 'create', 'update', 'delete'],
    checklists: ['list', 'create', 'update', 'delete'],
  },
  ADMIN: {
    movimentos: ['list', 'create', 'update', 'delete'],
    provisionamentos: ['list', 'create', 'update', 'delete'],
    unidades: ['list', 'create', 'update', 'delete'],
    grupos: ['list', 'create', 'update', 'delete'],
    responsaveis: ['list', 'create', 'update', 'delete'],
    categorias: ['list', 'create', 'update', 'delete'],
    produtos: ['list', 'create', 'update', 'delete'],
    carros: ['list', 'create', 'update', 'delete'],
    logs: ['list', 'export'],
    usuarios: ['list', 'create', 'update', 'delete'],
    relatorios: ['read'],
    incidentes: ['list', 'create', 'update', 'delete'],
    checklists: ['list', 'create', 'update', 'delete'],
  },
  // RH: pode ver apenas unidades e grupos (read-only), não pode editar
  RH: {
    unidades: ['list'],
    grupos: ['list'],
    logs: ['list'],
    relatorios: ['read'],
    incidentes: ['list'],
    checklists: ['list'],
  },
  SUPERVISOR: {
    movimentos: ['list'],
    provisionamentos: ['list'],
    categorias: ['list'],
    produtos: ['list'],
    logs: ['list'],
    relatorios: ['read'],
    incidentes: ['list', 'create', 'update'],
    checklists: ['list', 'create', 'update'],
  },
  LAVAGEM: {
    movimentos: ['list'],
    provisionamentos: ['list'],
    unidades: ['list'],
    grupos: ['list'],
    categorias: ['list'],
    logs: ['list'],
    relatorios: ['read'],
    incidentes: ['list', 'create', 'update'],
    checklists: ['list', 'create', 'update'],
  },
  JURIDICO: {
    // Apenas acesso a processos jurídicos (não está no módulo, será verificado na rota)
    logs: ['list'],
  },
  // OPERACIONAL: vê tudo menos financeiro (movimentos, provisionamentos)
  OPERACIONAL: {
    unidades: ['list', 'create', 'update', 'delete'],
    grupos: ['list', 'create', 'update', 'delete'],
    responsaveis: ['list', 'create', 'update', 'delete'],
    categorias: ['list', 'create', 'update', 'delete'],
    carros: ['list', 'create', 'update', 'delete'],
    logs: ['list', 'export'],
    usuarios: ['list', 'create', 'update', 'delete'],
    relatorios: ['read'],
    incidentes: ['list', 'create', 'update', 'delete'],
    checklists: ['list', 'create', 'update', 'delete'],
  },
  // PLANEJAMENTO_ESTRATEGICO: acesso total exceto financeiro (movimentos, provisionamentos)
  PLANEJAMENTO_ESTRATEGICO: {
    unidades: ['list', 'create', 'update', 'delete'],
    grupos: ['list', 'create', 'update', 'delete'],
    responsaveis: ['list', 'create', 'update', 'delete'],
    categorias: ['list', 'create', 'update', 'delete'],
    carros: ['list', 'create', 'update', 'delete'],
    logs: ['list', 'export'],
    usuarios: ['list', 'create', 'update', 'delete'],
    relatorios: ['read'],
    incidentes: ['list', 'create', 'update', 'delete'],
    checklists: ['list', 'create', 'update', 'delete'],
  },
};

export function can(
  role: string | null | undefined,
  mod: AppModule,
  action: AppAction
): boolean {
  const r = normalizeRole(role);
  if (!r) return false;

  // MASTER sempre tem acesso a tudo
  if (r === 'MASTER') return true;

  // OPERACIONAL e PLANEJAMENTO_ESTRATEGICO não têm acesso a módulos financeiros
  if (
    (r === 'OPERACIONAL' || r === 'PLANEJAMENTO_ESTRATEGICO') &&
    (mod === 'movimentos' || mod === 'provisionamentos')
  ) {
    return false;
  }

  const allowed = policyMatrix[r]?.[mod] ?? [];
  return allowed.includes(action);
}

export function permissionsFor(role: string | null | undefined) {
  const r = normalizeRole(role);
  if (!r) return {} as Record<AppModule, AppAction[]>;
  const entries = Object.entries(policyMatrix[r] || {}) as Array<
    [AppModule, AppAction[]]
  >;
  return Object.fromEntries(entries) as Record<AppModule, AppAction[]>;
}

export function forbiddenPayload(module: AppModule, action: AppAction) {
  return { error: 'forbidden', module, action } as const;
}
