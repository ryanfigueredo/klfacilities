'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface HeroProps {
  isLoggedIn: boolean;
}

export function Hero({ isLoggedIn }: HeroProps) {
  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const element = document.querySelector(targetId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };
  return (
    <div className="bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      {/* Background gradient decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#009ee2]/5 via-transparent to-[#006996]/5 pointer-events-none" />

      <div className="mx-auto max-w-6xl px-6 py-32 sm:py-40 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl">
          {/* Badge/Subtítulo Superior */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-[#0088c7]/10 border border-[#0088c7]/20">
              <span className="text-sm font-semibold text-[#0088c7] uppercase tracking-wide">
                KL Facilities
              </span>
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#1a1d5e] mb-6 leading-tight text-center">
            Soluções que mantêm{' '}
            <span className="bg-gradient-to-r from-[#009ee2] to-[#006996] bg-clip-text text-transparent">
              sua operação
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-700 mb-8 text-center">
            Líder em Limpeza, Facilities e Gestão Operacional
          </p>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 mb-12 max-w-2xl mx-auto text-center leading-relaxed">
            <strong>Terceirização inteligente</strong> que reduz custos
            operacionais em até 40%, libera seu time para focar no que realmente
            importa e garante qualidade de ponta. Atendemos grandes varejistas e
            empresas que exigem excelência.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-[#009ee2] to-[#006996] text-white hover:from-[#0088c7] hover:to-[#005a7a] rounded-lg px-8 py-6 text-base font-medium gap-2 shadow-lg shadow-[#009ee2]/20"
            >
              <a
                href="#contact"
                onClick={e => handleSmoothScroll(e, '#contact')}
                className="inline-flex items-center"
              >
                Entre em contato
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
