import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Compliance e Conformidade Legal - KL Facilities',
  description:
    'Central de compliance do sistema de ponto eletrônico REP-P da KL Facilities. Acesse todos os documentos legais, técnicos e de conformidade.',
};

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="mb-8">
          <Link
            href="/"
            className="text-[#009ee2] hover:text-[#006996] hover:underline text-sm"
          >
            ← Voltar para a página inicial
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-4 text-[#1a1d5e]">
          Compliance e Conformidade Legal
        </h1>
        <p className="text-gray-600 mb-8">
          Documentação completa sobre a conformidade legal e técnica do sistema
          de ponto eletrônico REP-P
        </p>

        {/* DESTAQUE PRINCIPAL */}
        <div className="bg-gradient-to-r from-[#009ee2]/10 to-[#006996]/10 border-l-4 border-[#009ee2] p-6 mb-8 rounded-lg shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#1a1d5e] mb-3">
                Sistema Conforme Portaria MTE nº 671/2021 (REP-P)
              </h2>
              <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                O sistema de ponto eletrônico da <strong>KL Facilities</strong>{' '}
                está totalmente conforme com todos os requisitos legais
                estabelecidos pela Portaria MTE nº 671/2021 para Registradores
                Eletrônicos de Ponto via Programa (REP-P).
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center w-16 h-16 bg-[#009ee2]/20 rounded-full flex-shrink-0">
              <svg
                className="w-8 h-8 text-[#009ee2]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* DOCUMENTOS ESSENCIAIS */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-[#009ee2] rounded-full"></div>
            <h2 className="text-2xl font-semibold">
              Documentos Essenciais para Fiscalização
            </h2>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-yellow-800">
              <strong> Importante:</strong> A empresa deve estar preparada para
              apresentar os seguintes documentos quando solicitado pela
              fiscalização:
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/compliance/manual-tecnico-juridico"
              className="bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Manual Técnico e Jurídico
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Documentação técnica e jurídica completa detalhando o
                    funcionamento do sistema, medidas de segurança e
                    conformidade legal. Inclui informações sobre certificação
                    INPI.
                  </p>
                  <span className="text-blue-600 text-sm font-medium">
                    Ver manual completo →
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/compliance/termo-implantacao"
              className="bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-400 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="bg-green-100 rounded-full p-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Termo de Implantação
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Termo interno formalizando a implantação do sistema de
                    controle de jornada por meio do aplicativo próprio (REP-P).
                    Documento obrigatório para apresentação à fiscalização.
                  </p>
                  <span className="text-green-600 text-sm font-medium">
                    Ver termo completo →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* DOCUMENTOS DE CONFORMIDADE */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-purple-500 rounded-full"></div>
            <h2 className="text-2xl font-semibold">
              Documentos de Conformidade
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/compliance/conformidade"
              className="bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-400 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 rounded-full p-3">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Relatório de Conformidade
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Relatório técnico completo de conformidade com LGPD e
                    Portaria 671/2021. Documenta todos os requisitos técnicos
                    implementados.
                  </p>
                  <span className="text-purple-600 text-sm font-medium">
                    Ver relatório →
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/compliance/privacidade"
              className="bg-white hover:bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 rounded-lg p-6 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 rounded-full p-3">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Política de Privacidade
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Política de privacidade completa em conformidade com a LGPD.
                    Detalha como os dados são coletados, tratados e protegidos.
                  </p>
                  <span className="text-indigo-600 text-sm font-medium">
                    Ver política →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* CERTIFICAÇÃO INPI */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-indigo-500 rounded-full"></div>
            <h2 className="text-2xl font-semibold">Certificação e Registro</h2>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-3 text-lg">
              Certificação no INPI
            </h3>
            <p className="text-blue-700 mb-4 text-sm">
              O sistema está <strong>certificado no INPI</strong> como software
              próprio desenvolvido internamente, conforme exigido para REP-P.
              Esta certificação comprova a propriedade e desenvolvimento interno
              do software.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-green-800 mb-2 text-sm">
                ✓ Status: Certificado Concedido
              </h4>
              <p className="text-sm text-green-700 mb-2">
                <strong>Número do Registro:</strong> BR 51 2025 0005557
              </p>
              <p className="text-sm text-green-700 mb-3">
                <strong>Processo:</strong> 870250100294
              </p>
              <p className="text-sm text-gray-700">
                Para informações completas sobre o certificado, consulte a seção
                específica no{' '}
                <Link
                  href="/compliance/manual-tecnico-juridico#inpi"
                  className="text-blue-600 underline font-medium"
                >
                  Manual Técnico e Jurídico
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Link
                href="/certificado_5120250055571762959618915.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-[#009ee2] text-white text-sm font-medium hover:bg-[#007bb5] transition-colors duration-200 shadow-sm"
              >
                Baixar certificado INPI (PDF)
              </Link>
              <p className="text-xs text-blue-700 sm:self-center">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </section>

        {/* REQUISITOS LEGAIS ATENDIDOS */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-green-500 rounded-full"></div>
            <h2 className="text-2xl font-semibold">
              Requisitos Legais Atendidos
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                ✓ Portaria MTE 671/2021
              </h3>
              <p className="text-sm text-green-700">
                Sistema enquadrado como REP-P com todos os requisitos técnicos
                implementados.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✓ LGPD</h3>
              <p className="text-sm text-green-700">
                Conformidade total com a Lei Geral de Proteção de Dados (Lei
                13.709/2018).
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✓ CLT</h3>
              <p className="text-sm text-green-700">
                Atende todas as exigências da Consolidação das Leis do Trabalho.
              </p>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> Não há necessidade de certificação
              junto ao INMETRO nem de comunicação ou homologação prévia em
              sindicato para sistemas REP-P. A responsabilidade pelos dados e
              pela veracidade das marcações recai integralmente sobre o
              empregador (KL Facilities).
            </p>
          </div>
        </section>

        {/* RECOMENDAÇÕES */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
            <h2 className="text-2xl font-semibold">
              Recomendações Implementadas
            </h2>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-gray-700 mb-4 text-sm">
              Conforme parecer jurídico, as seguintes recomendações foram
              implementadas:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <strong className="text-gray-900">
                    Termo interno de implantação:
                  </strong>
                  <span className="text-gray-700 text-sm ml-2">
                    Documento formal indicando que o controle de jornada será
                    realizado por meio do aplicativo próprio (REP-P)
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <strong className="text-gray-900">
                    Manual técnico e jurídico:
                  </strong>
                  <span className="text-gray-700 text-sm ml-2">
                    Documentação detalhando funcionamento e medidas de segurança
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <strong className="text-gray-900">
                    Capacitação de funcionários:
                  </strong>
                  <span className="text-gray-700 text-sm ml-2">
                    Sistema para colher assinatura de ciência dos empregados
                    sobre o uso do sistema.{' '}
                    <a
                      href="/ponto/termo-ciencia"
                      target="_blank"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Ver sistema de assinatura →
                    </a>
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <div>
                  <strong className="text-gray-900">
                    Preparação para fiscalização:
                  </strong>
                  <span className="text-gray-700 text-sm ml-2">
                    Empresa preparada para apresentar AEJ e manual técnico
                    quando solicitado
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* CONTATO */}
        <section className="mb-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Dúvidas ou Solicitações
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Email:</strong> contato@klfacilities.com.br
                </p>
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Telefone:</strong> (21) 99762-4873
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Encarregado de Dados (DPO):</strong> Ryan Figueredo
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Email DPO:</strong> ryan@dmtn.com.br
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER COM LINKS ÚTEIS */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Links Rápidos
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/compliance/manual-tecnico-juridico"
                    className="text-blue-600 hover:underline"
                  >
                    → Manual Técnico e Jurídico
                  </Link>
                </li>
                <li>
                  <Link
                    href="/compliance/termo-implantacao"
                    className="text-blue-600 hover:underline"
                  >
                    → Termo de Implantação
                  </Link>
                </li>
                <li>
                  <Link
                    href="/compliance/conformidade"
                    className="text-blue-600 hover:underline"
                  >
                    → Relatório de Conformidade
                  </Link>
                </li>
                <li>
                  <Link
                    href="/compliance/privacidade"
                    className="text-blue-600 hover:underline"
                  >
                    → Política de Privacidade
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Informações do Sistema
              </h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>
                  <strong>Versão:</strong> 1.0.0
                </li>
                <li>
                  <strong>Última atualização:</strong>{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                </li>
                <li>
                  <strong>Conformidade:</strong> Portaria MTE 671/2021 (REP-P)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
