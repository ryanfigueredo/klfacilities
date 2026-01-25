import { getServerSession } from 'next-auth';
import type { Metadata } from 'next';

import { LandingPage } from '@/components/landing/LandingPage';
import { authOptions } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'KL Facilities',
  description: 'Líder em Limpeza, Facilities e Gestão Operacional. Soluções que mantêm sua operação funcionando com qualidade e excelência.',
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return <LandingPage isLoggedIn={!!session} />;
}
