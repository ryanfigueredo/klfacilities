'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { BrasilMap } from '@/components/landing/BrasilMap';
import { loadLeadsterScript } from '@/components/landing/LeadsterIntegration';

// Estados onde a KL Facilities atua
const estadosAtuacao = [
  'AM', // Amazonas
  'MT', // Mato Grosso
  'PR', // Paraná
  'SC', // Santa Catarina
  'SP', // São Paulo
  'RJ', // Rio de Janeiro
  'MG', // Minas Gerais
  'BA', // Bahia
  'PE', // Pernambuco
  'PB', // Paraíba
  'SE', // Sergipe
  'PI', // Piauí
  'MA', // Maranhão
  'DF', // Distrito Federal
];

export default function EstadosPage() {
  // Carregar script do Leadster apenas em páginas públicas
  useEffect(() => {
    loadLeadsterScript();
  }, []);

  const handleLeadsterOpen = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).neurolead && typeof (window as any).neurolead.open === 'function') {
        (window as any).neurolead.open();
      } else if ((window as any).neurolead) {
        (window as any).neurolead.show();
      } else {
        window.location.href = '/#contact';
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#009ee2] to-[#006996] text-white py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                Presença em Todo Território Nacional
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Nossos clientes têm a segurança de contar com uma empresa presente em múltiplos estados, 
                garantindo proximidade, qualidade e eficiência em cada localização.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-blue-100">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Atuamos em {estadosAtuacao.length} estados e no Distrito Federal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-[#006996] sm:text-4xl mb-4">
                Estados de Atuação
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Veja onde a KL Facilities está presente em todo o Brasil
              </p>
            </div>

            {/* Layout: Mapa à esquerda, Legendas à direita */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
              {/* Mapa do Brasil */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-lg mb-8 lg:mb-0">
                <BrasilMap estadosAtuacao={estadosAtuacao} />
              </div>

              {/* Lista de Estados - Legendas ao lado */}
              <div className="lg:sticky lg:top-24">
                <h3 className="text-xl font-bold text-[#006996] mb-4">
                  Estados onde Atuamos
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {estadosAtuacao.map((estado) => (
                    <div
                      key={estado}
                      className="flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#009ee2] flex-shrink-0" />
                      <span className="font-medium text-[#006996] text-sm">{getEstadoNome(estado)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Informação adicional */}
            <div className="bg-gradient-to-r from-[#009ee2]/10 via-[#006996]/10 to-[#009ee2]/10 rounded-2xl p-8 border border-[#009ee2]/20">
              <h3 className="text-2xl font-bold text-[#006996] mb-4 text-center">
                Expansão Contínua
              </h3>
              <p className="text-slate-700 text-center max-w-3xl mx-auto leading-relaxed">
                A KL Facilities está em constante expansão, levando soluções de limpeza e terceirização 
                para novos estados e regiões. Nossa presença nacional garante que possamos atender clientes 
                em qualquer parte do Brasil com a mesma qualidade e profissionalismo.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24 sm:py-32 bg-gradient-to-r from-[#009ee2] to-[#006996] text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Quer conhecer mais sobre nossos serviços?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Solicite uma proposta personalizada e descubra como podemos ajudar sua empresa
            </p>
            <Button
              onClick={handleLeadsterOpen}
              size="lg"
              className="bg-white text-[#009ee2] hover:bg-blue-50 rounded-lg px-8 py-6 text-base font-medium gap-2 shadow-lg"
            >
              Solicitar Proposta
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Leadster Integration Section */}
        <div id="contact" className="py-24 sm:py-32 bg-white scroll-mt-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {/* O widget do Leadster aparecerá automaticamente aqui */}
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}


// Função auxiliar para obter o nome completo do estado
function getEstadoNome(sigla: string): string {
  const estados: Record<string, string> = {
    AC: 'Acre',
    AL: 'Alagoas',
    AP: 'Amapá',
    AM: 'Amazonas',
    BA: 'Bahia',
    CE: 'Ceará',
    DF: 'Distrito Federal',
    ES: 'Espírito Santo',
    GO: 'Goiás',
    MA: 'Maranhão',
    MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais',
    PA: 'Pará',
    PB: 'Paraíba',
    PR: 'Paraná',
    PE: 'Pernambuco',
    PI: 'Piauí',
    RJ: 'Rio de Janeiro',
    RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul',
    RO: 'Rondônia',
    RR: 'Roraima',
    SC: 'Santa Catarina',
    SP: 'São Paulo',
    SE: 'Sergipe',
    TO: 'Tocantins',
  };
  return estados[sigla] || sigla;
}

