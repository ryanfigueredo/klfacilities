/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aumentar limite de body size para permitir upload de múltiplas fotos em checklists
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Limite de 10MB para permitir múltiplas fotos
    },
  },
  images: {
    // Permitir imagens do S3 (presigned URLs podem vir de qualquer domínio)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.*.amazonaws.com',
      },
    ],
    // Não desabilitar otimização globalmente - será feito por componente
    unoptimized: false,
    // Configurações para melhor performance
    formats: ['image/avif', 'image/webp'],
    // Desabilitar loader personalizado - usar o padrão do Next.js
    loader: 'default',
    // Configuração para evitar erro 400 quando arquivo não existe localmente
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'colaborador.klfacilities.com.br',
          },
        ],
        destination: '/colaborador',
        permanent: true,
      },
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'financeiro.klfacilities.com.br',
          },
        ],
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'ponto.klfacilities.com.br',
          },
        ],
        destination: '/ponto/admin',
        permanent: true,
      },
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'checklist.klfacilities.com.br',
          },
        ],
        destination: '/checklist-admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
