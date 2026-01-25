import { prisma } from '@/lib/prisma';

export { prisma };

export function getCompetencia(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function toNumberBR(v: string | number) {
  if (typeof v === 'number') return v;
  return Number(
    v.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.')
  );
}

export function norm(s?: string | null) {
  return (s ?? '')
    .trim()
    .replace(/\s{2,}/g, ' ')
    .toUpperCase();
}

export async function ensureCategorias() {
  // Padroniza nomes conforme seed existente
  await prisma.categoria.upsert({
    where: {
      nome_tipo: { nome: 'Frota > TicketLog Crédito', tipo: 'DESPESA' } as any,
    },
    update: {},
    create: { nome: 'Frota > TicketLog Crédito', tipo: 'DESPESA', ativo: true },
  } as any);

  await prisma.categoria.upsert({
    where: {
      nome_tipo: { nome: 'Frota > Combustível', tipo: 'DESPESA' } as any,
    },
    update: {},
    create: { nome: 'Frota > Combustível', tipo: 'DESPESA', ativo: true },
  } as any);
}
