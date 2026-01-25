import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Links KL Facilities | Banco de Talentos, Site Comercial e Mais',
  description: 'Acesse todos os links da KL Facilities: Banco de Talentos, Site Comercial, Central de Atendimento, Instagram, LinkedIn e WhatsApp.',
  keywords: ['KL Facilities', 'links', 'banco de talentos', 'vagas', 'emprego', 'trabalhe conosco'],
  openGraph: {
    title: 'Links KL Facilities',
    description: 'Acesse todos os links da KL Facilities em um só lugar',
    url: 'https://www.klfacilities.com.br/links',
    siteName: 'KL Facilities',
    images: [
      {
        url: 'https://www.klfacilities.com.br/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'KL Facilities Links',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Links KL Facilities',
    description: 'Acesse todos os links da KL Facilities em um só lugar',
    images: ['https://www.klfacilities.com.br/twitter-image.jpg'],
  },
  alternates: {
    canonical: 'https://www.klfacilities.com.br/links',
  },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default function LinksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

