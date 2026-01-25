'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

// Todos os clientes unificados
const allClients = [
  {
    name: 'andre-guimaraes',
    file: 'andreGuimaraes.png',
    displayName: 'André Guimarães',
  },
  { name: 'assai', file: 'assai.svg', displayName: 'Assaí Atacadista' },
  { name: 'atacadao', file: 'atacadao.png', displayName: 'Atacadão' },
  { name: 'comper', file: 'comper.png', displayName: 'Comper' },
  { name: 'estapar', file: 'estapar.png', displayName: 'Estapar' },
  {
    name: 'fort-atacadista',
    file: 'fortatacadista.jpg',
    displayName: 'Fort Atacadista',
  },
  {
    name: 'giga-atacado',
    file: 'gigaatacado.png',
    displayName: 'Giga Atacado',
  },
  {
    name: 'grupo-mateus',
    file: 'grupomateus.png',
    displayName: 'Grupo Mateus',
  },
  {
    name: 'grupo-pereira',
    file: 'grupopereira.jpg',
    displayName: 'Grupo Pereira',
  },
  {
    name: 'j-macedo',
    file: 'jmacedo.jpg',
    displayName: 'J. Macêdo',
  },
  { name: 'magalu', file: 'magalu.png', displayName: 'Magazine Luiza' },
  {
    name: 'mercantil-mundial',
    file: 'mundial.png',
    displayName: 'Mercantil Mundial',
  },
  { name: 'mix-mateus', file: 'mixmateus.png', displayName: 'Mix Mateus' },
  {
    name: 'profarma',
    file: 'logo-profarma-2048.png',
    displayName: 'Profarma',
  },
  { name: 'rofatto', file: 'rofatto.jpg', displayName: 'Rofatto' },
  { name: 'spani', file: 'spani.png', displayName: 'Spani' },
  {
    name: 'total-atacado',
    file: 'totalatacado.png',
    displayName: 'Total Atacado',
  },
  {
    name: 'vila-bene',
    file: 'vilabeneresidencial.jpg',
    displayName: 'Vila Bene Residencial',
  },
  { name: 'wika', file: 'wika.png', displayName: 'Wika' },
];

function PortfolioImage({
  client,
  index,
}: {
  client: (typeof allClients)[0];
  index: number;
}) {
  const useS3 = process.env.NEXT_PUBLIC_USE_S3_ASSETS === 'true';
  const usePublicBucket = process.env.NEXT_PUBLIC_S3_PUBLIC_BUCKET === 'true';

  // Se o bucket for público, gerar URL diretamente (sem fetch)
  const imageUrl =
    useS3 && usePublicBucket
      ? `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'kl-checklist'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com/assets/portfolio/${client.file}`
      : useS3
        ? undefined // Vai buscar via API
        : `/portfolio/${client.file}`;

  const [finalUrl, setFinalUrl] = useState<string>(imageUrl || '');

  useEffect(() => {
    // Se já temos URL direta, não precisa fazer fetch
    if (imageUrl) {
      setFinalUrl(imageUrl);
      return;
    }

    // Se S3 está ativo mas não é público, buscar via API
    if (useS3 && !usePublicBucket) {
      fetch(`/api/assets/portfolio/${client.file}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.text();
        })
        .then(url => {
          if (url && url.startsWith('http')) {
            setFinalUrl(url);
          } else {
            setFinalUrl(`/portfolio/${client.file}`);
          }
        })
        .catch(() => {
          setFinalUrl(`/portfolio/${client.file}`);
        });
    } else if (!useS3) {
      setFinalUrl(`/portfolio/${client.file}`);
    }
  }, [useS3, usePublicBucket, client.file, imageUrl]);

  if (!finalUrl) return null;

  return (
    <div className="group relative flex-shrink-0 w-32 h-32 md:w-36 md:h-36 flex items-center justify-center portfolio-logo-container">
      <div className="relative w-full h-full flex items-center justify-center portfolio-image-container">
        <Image
          src={finalUrl}
          alt={client.displayName || client.name}
          fill
          className="object-contain portfolio-image-unified transition-all duration-700 ease-out p-2 overflow-clip"
          unoptimized={useS3}
          loading={index < 8 ? 'eager' : 'lazy'} // Primeiras 8 imagens carregam rápido
          priority={index < 4} // Primeiras 4 com prioridade máxima
        />
      </div>
    </div>
  );
}

export function Portfolio() {
  // Duplicar logos várias vezes para scroll infinito suave
  const duplicatedClients = [
    ...allClients,
    ...allClients,
    ...allClients,
    ...allClients,
  ];

  return (
    <div
      id="parceiros"
      className="bg-slate-50 py-24 sm:py-32 scroll-mt-20 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-16">
        <div className="text-center">
          <p className="text-sm font-medium text-[#0088c7] mb-3 uppercase tracking-wide">
            Cases de Sucesso
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1a1d5e] mb-6 max-w-3xl mx-auto leading-tight">
            Parceiros que confiam na <br />
            <span className="bg-gradient-to-r from-[#009ee2] to-[#006996] bg-clip-text text-transparent">
              KL Facilities
            </span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Trabalhamos com empresas líderes em seus segmentos, oferecendo
            soluções de terceirização de limpeza e facilities de alta qualidade.
          </p>
        </div>
      </div>

      {/* Carrossel Horizontal - Scroll Infinito - Estendido até as bordas */}
      <div className="relative overflow-hidden w-full">
        {/* Gradient overlay nas bordas */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white via-white to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 md:gap-6 animate-scroll-slow">
          {duplicatedClients.map((client, index) => (
            <PortfolioImage
              key={`${client.name}-${index}`}
              client={client}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
