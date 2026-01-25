import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';

import './globals.css';

import { Toaster } from '@/components/ui/sonner';
import { DynamicTitle } from '@/components/layout/DynamicTitle';

import { Providers } from './providers';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['600'],
});

// Função para obter URL de asset (S3 ou fallback para public)
function getAssetUrl(path: string): string {
  const useS3 = process.env.NEXT_PUBLIC_USE_S3_ASSETS === 'true';
  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
  
  if (useS3 && cloudfrontUrl) {
    return `${cloudfrontUrl}/assets/${path.replace(/^\//, '')}`;
  }
  // Fallback para public folder
  return path;
}

export const metadata: Metadata = {
  title: 'ERP KL',
  description: 'Sistema de gestão empresarial da KL Facilities',
  manifest: getAssetUrl('/manifest.webmanifest'),
  icons: [
    {
      rel: 'icon',
      url: getAssetUrl('/favicon-96x96.png'),
      sizes: '96x96',
      type: 'image/png',
    },
    { rel: 'apple-touch-icon', url: getAssetUrl('/apple-touch-icon.png') },
    { rel: 'icon', url: getAssetUrl('/icon-192.png'), sizes: '192x192', type: 'image/png' },
    { rel: 'icon', url: getAssetUrl('/icon-512.png'), sizes: '512x512', type: 'image/png' },
  ],
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${figtree.className} antialiased bg-background text-foreground`}
      >
        <Providers>
          <DynamicTitle />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
