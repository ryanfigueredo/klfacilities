export type UrgenciaNivel = 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAIXA' | 'MUITO_BAIXA';

export interface UrgenciaConfig {
  prazoHoras: number;
  descricao: string;
  ordem: number;
  cor: string;
  label: string;
}

export const URGENCIA_CONFIG: Record<UrgenciaNivel, UrgenciaConfig> = {
  CRITICA: {
    prazoHoras: 2,
    descricao: 'Resolver em 2 horas',
    ordem: 1,
    cor: 'bg-red-500',
    label: 'Crítica',
  },
  ALTA: {
    prazoHoras: 12,
    descricao: 'Resolver em 12 horas',
    ordem: 2,
    cor: 'bg-orange-500',
    label: 'Alta',
  },
  NORMAL: {
    prazoHoras: 24,
    descricao: 'Resolver em 24 horas',
    ordem: 3,
    cor: 'bg-yellow-500',
    label: 'Normal',
  },
  BAIXA: {
    prazoHoras: 168,
    descricao: 'Resolver em 1 semana',
    ordem: 4,
    cor: 'bg-blue-500',
    label: 'Baixa',
  },
  MUITO_BAIXA: {
    prazoHoras: 360,
    descricao: 'Resolver em 15 dias +',
    ordem: 5,
    cor: 'bg-gray-500',
    label: 'Muito Baixa',
  },
};

export function getUrgenciaConfig(nivel: UrgenciaNivel): UrgenciaConfig {
  return URGENCIA_CONFIG[nivel];
}

export function getUrgenciaColor(nivel: UrgenciaNivel): string {
  return URGENCIA_CONFIG[nivel].cor;
}

export function getUrgenciaLabel(nivel: UrgenciaNivel): string {
  return URGENCIA_CONFIG[nivel].label;
}

