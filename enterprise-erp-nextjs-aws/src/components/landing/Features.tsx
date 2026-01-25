'use client';

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Shield,
  Zap,
  FileText,
  DollarSign,
} from 'lucide-react';

const features = [
  {
    name: 'Gestão Financeira',
    description:
      'Controle completo de receitas, despesas e fluxo de caixa com relatórios detalhados e análises em tempo real.',
    icon: DollarSign,
    color: 'from-[#009ee2] to-[#006996]',
  },
  {
    name: 'Movimentos Operacionais',
    description:
      'Acompanhamento em tempo real de todas as operações da empresa com rastreabilidade total.',
    icon: TrendingUp,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Analytics e Relatórios',
    description:
      'Dashboards inteligentes com métricas em tempo real para tomada de decisão estratégica.',
    icon: BarChart3,
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Ponto Eletrônico',
    description:
      'Sistema REP-P certificado conforme Portaria 671/2021 com controle de jornada completo.',
    icon: Clock,
    color: 'from-orange-500 to-red-500',
  },
  {
    name: 'Gestão de Colaboradores',
    description:
      'Controle completo de colaboradores, unidades e responsáveis com hierarquia organizacional.',
    icon: Users,
    color: 'from-[#006996] to-[#2c2e85]',
  },
  {
    name: 'Segurança e Conformidade',
    description:
      'LGPD, REP-P e CLT. Auditoria completa com logs detalhados e rastreabilidade total.',
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Performance Otimizada',
    description:
      'Tecnologia de ponta com alta disponibilidade e resposta instantânea.',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    name: 'Provisionamento',
    description:
      'Planejamento e controle de provisionamentos com templates e gestão inteligente.',
    icon: FileText,
    color: 'from-slate-500 to-gray-500',
  },
];

export function Features() {
  return (
    <div id="features" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">
            Recursos Completos
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa em um só lugar
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Um sistema ERP completo com todas as funcionalidades necessárias
            para uma gestão empresarial eficiente e moderna.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <React.Fragment key={feature.name}>
                  <dt className="flex flex-col group hover:scale-105 transition-transform duration-300">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg shadow-${feature.color.split(' ')[1]}/20 group-hover:shadow-xl group-hover:shadow-${feature.color.split(' ')[1]}/30 transition-all duration-300 mb-6`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-lg font-semibold leading-7 text-foreground mb-3">
                      {feature.name}
                    </span>
                  </dt>
                  <dd className="text-sm leading-6 text-slate-600">
                    {feature.description}
                  </dd>
                </React.Fragment>
              );
            })}
          </dl>
        </div>
      </div>
    </div>
  );
}

