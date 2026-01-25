'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Target, Award, Shield } from 'lucide-react';

const values = [
  {
    name: 'Inovação',
    description:
      'Sempre à frente com as melhores tecnologias e práticas do mercado.',
    icon: Award,
  },
  {
    name: 'Confiabilidade',
    description:
      'Sistema robusto e seguro, desenvolvido com os mais altos padrões de qualidade.',
    icon: Shield,
  },
  {
    name: 'Eficiência',
    description:
      'Automatize processos e ganhe tempo para focar no que realmente importa.',
    icon: Target,
  },
];

export function About() {
  return (
    <div
      id="sobre"
      className="py-24 sm:py-32 bg-gradient-to-b from-slate-50 to-white scroll-mt-20"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Layout flex: texto à esquerda, valores à direita no desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">
          {/* Texto à esquerda */}
          <div className="lg:sticky lg:top-24">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Sobre a KL Facilities
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600 text-justify">
              Somos especialistas em soluções empresariais que transformam a forma
              como você gerencia seu negócio. Combinamos tecnologia de ponta com
              um entendimento profundo das necessidades do mercado brasileiro.
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-600 text-justify">
              Com presença em{' '}
              <strong className="text-[#006996]">
                todo o território nacional
              </strong>
              , atuamos em todos os estados brasileiros, desenvolvendo soluções
              efetivas e sustentáveis em serviços de limpeza e terceirização para
              grupos de facilities de grande porte.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600 text-justify">
              Nossa cultura organizacional é fundamentada em valores sólidos de
              integridade, profissionalismo e excelência. Conheça mais sobre nossa{' '}
              <Link
                href="/cultura"
                className="text-[#009ee2] hover:text-[#006996] underline font-medium"
              >
                cultura, missão, visão e valores
              </Link>
              .
            </p>
          </div>

          {/* Valores à direita - layout vertical no desktop */}
          <div className="mt-16 lg:mt-0">
            <dl className="space-y-12">
              {values.map(value => {
                const Icon = value.icon;
                return (
                  <div key={value.name} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <dt className="text-lg font-semibold leading-7 text-foreground mb-2">
                        {value.name}
                      </dt>
                      <dd className="text-base leading-6 text-slate-600">
                        {value.description}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
