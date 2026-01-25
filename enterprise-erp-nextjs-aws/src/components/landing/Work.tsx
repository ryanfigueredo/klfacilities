'use client';

import React from 'react';
import { ArrowRight, Building2, Users, Briefcase, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const projects = [
  {
    title: 'Limpeza Industrial',
    description: 'Serviços especializados de limpeza para indústrias com padrões de qualidade exigidos',
    icon: Building2,
    color: 'bg-slate-100',
  },
  {
    title: 'Limpeza Comercial',
    description: 'Serviços de limpeza e conservação para estabelecimentos comerciais e escritórios',
    icon: Users,
    color: 'bg-slate-100',
  },
  {
    title: 'Portaria e Recepção',
    description: 'Serviços de portaria, recepção e atendimento ao cliente com profissionais qualificados',
    icon: Briefcase,
    color: 'bg-slate-100',
  },
  {
    title: 'Jardins e Áreas Externas',
    description: 'Manutenção de jardins, paisagismo e limpeza de áreas externas',
    icon: Zap,
    color: 'bg-slate-100',
  },
  {
    title: 'Suprimentos e Insumos',
    description: 'Gestão completa de suprimentos e insumos para limpeza e manutenção',
    icon: Shield,
    color: 'bg-slate-100',
  },
  {
    title: 'Consultoria em Facilities',
    description: 'Consultoria especializada para otimização de processos e redução de custos',
    icon: Users,
    color: 'bg-slate-100',
  },
];

export function Work() {
  return (
    <div id="servicos" className="bg-slate-50 py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16">
          <p className="text-sm font-medium text-[#0088c7] mb-3 uppercase tracking-wide">
            Nossos Serviços
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1a1d5e] mb-6 max-w-3xl leading-tight">
            Veja como transformamos ideias em realidade. Conheça nossas{' '}
            <span className="bg-gradient-to-r from-[#009ee2] to-[#006996] bg-clip-text text-transparent">soluções de terceirização</span> que fazem a diferença.
          </h2>
          <Button
            asChild
            variant="outline"
            className="bg-white border-2 border-slate-200 text-[#1a1d5e] hover:bg-slate-50 hover:border-[#1a1d5e] rounded-lg px-6 py-3 font-medium gap-2"
          >
            <a href="#servicos">
              Nossos Serviços
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => {
            const Icon = project.icon;
            return (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-lg p-8 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="bg-gradient-to-br from-[#009ee2] to-[#006996] w-12 h-12 rounded-lg flex items-center justify-center mb-6 shadow-lg shadow-[#009ee2]/20">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#1a1d5e] mb-3">
                  {project.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {project.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

