'use client';

import React, { useState } from 'react';
import { ChevronDown, Building2, Users, Briefcase, Shield } from 'lucide-react';

const services = [
  {
    title: 'Terceirização de Limpeza Industrial e Comercial',
    description:
      'Solução completa de terceirização de limpeza para indústrias, varejo e escritórios. Equipe especializada, equipamentos de última geração e protocolos rigorosos de qualidade. Redução de custos operacionais de até 40% enquanto você mantém padrões de excelência.',
    icon: Building2,
  },
  {
    title: 'Terceirização de Facilities e Gestão Operacional',
    description:
      'Terceirização completa de serviços de facilities: portaria, recepção, jardins, manutenção e muito mais. Gestão operacional inteligente que libera seu time para focar na sua atividade principal. Processos otimizados e resultados mensuráveis.',
    icon: Users,
  },
  {
    title: 'Terceirização Personalizada para Grandes Varejistas',
    description:
      'Especialistas em terceirização para grandes redes varejistas. Atendemos as principais empresas do setor com soluções customizadas, escaláveis e eficientes. Sua operação em múltiplas unidades, gerenciada de forma unificada e profissional.',
    icon: Briefcase,
  },
  {
    title: 'Conformidade Total e Gestão de Riscos',
    description:
      'Terceirização com 100% de conformidade legal. LGPD, CLT, segurança do trabalho, auditorias regulares e documentação completa. Você terceiriza sem preocupações. Gestão de riscos integrada para proteger seu negócio.',
    icon: Shield,
  },
];

export function Services() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div id="solucoes" className="bg-white py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-sm font-medium text-[#0088c7] mb-3 uppercase tracking-wide">
            Serviços
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1a1d5e] mb-6 max-w-3xl leading-tight">
            Tudo que você precisa para transformar suas operações empresariais
          </h2>
        </div>

        <div className="space-y-0">
          {services.map((service, index) => {
            const Icon = service.icon;
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className="border-t border-slate-200 first:border-t-0"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full py-8 flex items-center justify-between text-left hover:bg-white/50 transition-colors group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#009ee2] to-[#006996] rounded-lg">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1a1d5e]">
                      {service.title}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-96 pb-8' : 'max-h-0'
                  }`}
                >
                  <div className="pl-16 pr-12">
                    <p className="text-slate-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

