import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Banco de Talentos - KL Facilities | Trabalhe Conosco',
  description: 'Cadastre seu currículo no banco de talentos da KL Facilities e faça parte de uma equipe comprometida com excelência em serviços de limpeza e terceirização. Oportunidades em todo o Brasil.',
  keywords: ['trabalhe conosco', 'vagas', 'emprego', 'carreira', 'curriculo', 'KL Facilities', 'facilities', 'limpeza', 'terceirização'],
  openGraph: {
    title: 'Banco de Talentos - KL Facilities | Trabalhe Conosco',
    description: 'Cadastre seu currículo e faça parte da nossa equipe! Oportunidades em serviços de limpeza e terceirização em todo o Brasil. Venha fazer parte do time KL Facilities.',
    type: 'website',
    url: 'https://www.klfacilities.com.br/banco-talentos',
    siteName: 'KL Facilities',
    locale: 'pt_BR',
    images: [
      {
        url: 'https://www.klfacilities.com.br/logo-kl-light.png',
        width: 1200,
        height: 630,
        alt: 'KL Facilities - Banco de Talentos - Trabalhe Conosco',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Banco de Talentos - KL Facilities | Trabalhe Conosco',
    description: 'Cadastre seu currículo e faça parte da nossa equipe! Oportunidades em todo o Brasil.',
    images: ['https://www.klfacilities.com.br/logo-kl-light.png'],
  },
  alternates: {
    canonical: 'https://www.klfacilities.com.br/banco-talentos',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BancoTalentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

