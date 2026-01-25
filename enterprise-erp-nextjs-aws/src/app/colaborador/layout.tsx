import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Central de Atendimento ao Funcionário - KL Facilities',
  description: 'Registre elogios, sugestões ou denúncias. Seu crachá também é sua voz.',
  keywords: ['colaborador', 'atendimento', 'funcionário', 'KL Facilities', 'manifestação', 'ouvidoria'],
  openGraph: {
    title: 'Central de Atendimento ao Funcionário - KL Facilities',
    description: 'Registre elogios, sugestões ou denúncias. Seu crachá também é sua voz.',
    url: 'https://colaborador.klfacilities.com.br',
    siteName: 'KL Facilities',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://colaborador.klfacilities.com.br',
  },
};

export default function ColaboradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

