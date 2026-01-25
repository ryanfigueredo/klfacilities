'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Target,
  Eye,
  Heart,
  Shield,
  Users,
  Leaf,
  Scale,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

import { loadLeadsterScript } from '@/components/landing/LeadsterIntegration';

export default function CulturaPage() {
  // Carregar script do Leadster apenas em páginas públicas
  useEffect(() => {
    loadLeadsterScript();
  }, []);

  const handleLeadsterOpen = () => {
    // Função para abrir o formulário do Leadster
    if (typeof window !== 'undefined') {
      // Tentar diferentes métodos de abertura do Leadster
      if (
        (window as any).neurolead &&
        typeof (window as any).neurolead.open === 'function'
      ) {
        (window as any).neurolead.open();
      } else if ((window as any).neurolead) {
        // Outro método possível
        (window as any).neurolead.show();
      } else {
        // Fallback: redirecionar para home com hash
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
                Nossa Cultura e Valores
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Comprometidos em desenvolver soluções efetivas e sustentáveis em
                serviços de limpeza e terceirização, com presença em todo
                território nacional
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-blue-100">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">
                  Presente em todos os estados brasileiros
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Missão, Visão e Valores */}
        <div className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {/* Missão */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#006996]">Missão</h2>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Ser um time comprometido em desenvolver soluções efetivas e
                  sustentáveis em serviços de limpeza e terceirização, atuando
                  com qualidade, profissionalismo e cultura de dono, garantindo
                  eficiência operacional, valorização das pessoas e satisfação
                  dos clientes.
                </p>
              </div>

              {/* Visão */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-8 border border-cyan-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#006996]">Visão</h2>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Ser referência nacional em operações de facilities com alto
                  padrão de qualidade, inovação contínua e responsabilidade
                  socioambiental.
                </p>
              </div>

              {/* Valores */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#009ee2] rounded-xl flex items-center justify-center">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#006996]">Valores</h2>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-[#009ee2] font-bold">•</span>
                    <span>
                      <strong>Integridade</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#009ee2] font-bold">•</span>
                    <span>
                      <strong>Profissionalismo</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#009ee2] font-bold">•</span>
                    <span>
                      <strong>Relacionamento</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#009ee2] font-bold">•</span>
                    <span>
                      <strong>Comprometimento</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#009ee2] font-bold">•</span>
                    <span>
                      <strong>Excelência Pessoal</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#009ee2] font-bold">•</span>
                    <span>
                      <strong>Saúde</strong>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Código de Conduta e Ética */}
        <div className="py-24 sm:py-32 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-[#006996] sm:text-4xl mb-4">
                Código de Conduta e Ética
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Diretrizes que norteiam nosso comportamento e garantem um
                ambiente de trabalho respeitoso e profissional
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-[#009ee2]" />
                  <h3 className="text-xl font-semibold text-[#006996]">
                    Respeito Mútuo e Ambiente Profissional
                  </h3>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li>• Vestimenta adequada e profissional</li>
                  <li>• Higiene pessoal e coletiva</li>
                  <li>
                    • Sigilo sobre informações confidenciais da empresa e
                    clientes
                  </li>
                  <li>
                    • Tratamento respeitoso com todos os colegas e clientes
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-[#009ee2]" />
                  <h3 className="text-xl font-semibold text-[#006996]">
                    Comunicação e Processos
                  </h3>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li>
                    • Comunicação prévia à gestão antes de alterar solicitações
                  </li>
                  <li>• Regras claras para visitas e áreas de fumantes</li>
                  <li>• Gestão de conflitos de interesse</li>
                  <li>• Transparência em todas as comunicações</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="h-6 w-6 text-[#009ee2]" />
                  <h3 className="text-xl font-semibold text-[#006996]">
                    Relações Afetivas e Profissionalismo
                  </h3>
                </div>
                <p className="text-slate-700 mb-3">
                  Reconhecemos que relacionamentos pessoais podem existir no
                  ambiente de trabalho. Para manter a transparência e o ambiente
                  profissional:
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li>
                    • Informar ao RH sobre relacionamentos que possam gerar
                    conflito de interesses
                  </li>
                  <li>
                    • Manter postura profissional nas dependências da empresa
                  </li>
                  <li>
                    • Evitar favoritismo e garantir tratamento igualitário
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ESG - Ambiental, Social e Governança */}
        <div className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-[#006996] sm:text-4xl mb-4">
                ESG - Nossos Pilares e Compromissos
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Sustentabilidade, responsabilidade social e governança
                transparente são fundamentais em nossa operação
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Ambiental */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#006996]">
                    Ambiental
                  </h3>
                </div>
                <ul className="space-y-3 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Materiais sustentáveis:</strong> Uso de produtos
                      de limpeza ecológicos e biodegradáveis
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Redução de resíduos:</strong> Programas de
                      reciclagem e redução de desperdício
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Eficiência energética:</strong> Otimização de
                      processos para reduzir consumo
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Gestão de recursos:</strong> Uso consciente de
                      água e materiais
                    </span>
                  </li>
                </ul>
              </div>

              {/* Social */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#006996]">Social</h3>
                </div>
                <ul className="space-y-3 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Bem-estar do colaborador:</strong> Programas de
                      saúde, segurança e qualidade de vida
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Capacitação:</strong> Treinamentos contínuos e
                      desenvolvimento profissional
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Diversidade e inclusão:</strong> Ambiente
                      acolhedor e respeitoso para todos
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-1">•</span>
                    <span>
                      <strong>Valorização humana:</strong> Reconhecimento e
                      respeito às pessoas como nosso maior ativo
                    </span>
                  </li>
                </ul>
              </div>

              {/* Governança */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#006996] rounded-xl flex items-center justify-center">
                    <Scale className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#006996]">
                    Governança
                  </h3>
                </div>
                <ul className="space-y-3 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-[#006996] font-bold mt-1">•</span>
                    <span>
                      <strong>Transparência:</strong> Comunicação clara e
                      honesta com stakeholders
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#006996] font-bold mt-1">•</span>
                    <span>
                      <strong>Conformidade:</strong> Cumprimento rigoroso de
                      normas e regulamentações
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#006996] font-bold mt-1">•</span>
                    <span>
                      <strong>Ética corporativa:</strong> Código de conduta
                      aplicado em todos os níveis
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#006996] font-bold mt-1">•</span>
                    <span>
                      <strong>Auditoria e controle:</strong> Monitoramento
                      contínuo e melhorias constantes
                    </span>
                  </li>
                </ul>
              </div>
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
              Solicite uma proposta personalizada e descubra como podemos ajudar
              sua empresa
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
