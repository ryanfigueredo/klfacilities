'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BancoTalentos() {
  return (
    <div className="bg-slate-50 py-16 sm:py-20 pb-12 sm:pb-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium text-[#0088c7] mb-3 uppercase tracking-wide">
            Oportunidades
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1a1d5e] mb-6 max-w-3xl leading-tight">
            Faça parte do nosso time e cresça com a empresa de facilities que
            mais cresce no Brasil
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl">
            Estamos sempre em busca de talentos para fazer parte da nossa
            equipe. Cadastre seu currículo e venha crescer conosco!
          </p>
          <Button
            asChild
            className="bg-gradient-to-r from-[#009ee2] to-[#006996] text-white hover:from-[#0088c7] hover:to-[#005a7a] rounded-lg px-8 py-6 text-base font-medium gap-2 shadow-lg shadow-[#009ee2]/20"
          >
            <Link href="/banco-talentos">
              Cadastrar Currículo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
