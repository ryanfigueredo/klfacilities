'use client';

import React from 'react';
import { Users, Shield, Award, Zap, DollarSign } from 'lucide-react';

const benefits = [
  {
    title: 'Redução de Custos',
    description:
      'Até 40% de economia na gestão de facilities com nossa terceirização inteligente. Sem overhead de RH, sem custos de equipamentos, sem preocupações.',
    icon: DollarSign,
    stat: 'Até 40%',
    statLabel: 'de economia',
  },
  {
    title: 'Foco na Atividade Principal',
    description:
      'Libere seu time para o que realmente importa. Nós cuidamos da operação enquanto você cresce seu negócio.',
    icon: Zap,
    stat: '100%',
    statLabel: 'de foco',
  },
  {
    title: 'Gestão Especializada e Dedicada',
    description:
      'Supervisores dedicados por região e gerente exclusivo por loja. Sistema de avaliação contínua com feedback dos clientes finais. Gestão próxima, personalizada e resultados mensuráveis.',
    icon: Award,
    stat: '1:1',
    statLabel: 'gerente por loja',
  },
  {
    title: 'Conformidade Total',
    description:
      'Total conformidade legal. LGPD, CLT, segurança do trabalho. Tudo documentado e auditado. Você dorme tranquilo.',
    icon: Shield,
    stat: '100%',
    statLabel: 'conformidade',
  },
];

export function WhyTrust() {
  return (
    <div id="sobre" className="bg-white py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="text-sm font-medium text-[#0088c7] mb-3 uppercase tracking-wide">
            Por que Terceirizar com a KL
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1a1d5e] mb-6 max-w-4xl mx-auto leading-tight">
            Terceirização que{' '}
            <span className="bg-gradient-to-r from-[#009ee2] to-[#006996] bg-clip-text text-transparent">
              transforma sua operação
            </span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Não é apenas terceirização. É uma parceria estratégica que reduz
            custos, aumenta produtividade e entrega resultados mensuráveis.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 hover:border-[#009ee2]/30"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#009ee2] to-[#006996] rounded-xl flex items-center justify-center shadow-lg shadow-[#009ee2]/20">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#009ee2] mb-1">
                      {benefit.stat}
                    </div>
                    <div className="text-sm text-slate-500">
                      {benefit.statLabel}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1d5e] mb-3">
                  {benefit.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-16 border-t border-slate-200">
          <div className="text-center">
            <div className="text-5xl font-bold text-[#009ee2] mb-2">+50</div>
            <div className="text-slate-600 font-medium">Empresas Líderes</div>
            <div className="text-sm text-slate-500">que confiam na KL</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-[#009ee2] mb-2">+500</div>
            <div className="text-slate-600 font-medium">Colaboradores</div>
            <div className="text-sm text-slate-500">altamente qualificados</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-[#009ee2] mb-2">100%</div>
            <div className="text-slate-600 font-medium">Conformidade</div>
            <div className="text-sm text-slate-500">LGPD, CLT e segurança</div>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-[#009ee2] mb-2">4.8</div>
            <div className="text-slate-600 font-medium">
              Avaliação dos Clientes
            </div>
            <div className="text-sm text-slate-500">
              supervisores por região e gerente exclusivo por loja
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
