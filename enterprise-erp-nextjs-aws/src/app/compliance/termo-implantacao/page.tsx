import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Termo de Implantação do Sistema REP-P - KL Facilities',
  description:
    'Termo interno de implantação do sistema de ponto eletrônico REP-P da KL Facilities, conforme recomendação jurídica.',
};

export default function TermoImplantacaoPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl pt-24">
        <div className="prose prose-gray max-w-none">
          <div className="mb-8">
            <Link
              href="/compliance"
              className="text-[#009ee2] hover:text-[#006996] hover:underline text-sm"
            >
              ← Voltar para Compliance
            </Link>
          </div>

          <h1 className="text-3xl font-bold mb-8 text-[#1a1d5e]">
            Termo de Implantação do Sistema de Controle de Jornada
          </h1>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>Empresa:</strong> KL Facilities
              <br />
              <strong>CNPJ:</strong> 50.012.308/0001-25
              <br />
              <strong>Data de Implantação:</strong>{' '}
              {new Date().toLocaleDateString('pt-BR')}
              <br />
              <strong>Sistema:</strong> ERP KL - Módulo de Ponto Eletrônico
              (REP-P)
            </p>
          </div>

          {/* TERMO PRINCIPAL */}
          <section className="mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                TERMO DE IMPLANTAÇÃO DO SISTEMA DE CONTROLE DE JORNADA
              </h2>

              <div className="space-y-4 text-justify">
                <p>
                  A <strong>DMTN GESTAO</strong>, pessoa jurídica inscrita no
                  CNPJ sob o nº 50.012.308/0001-25, estabelecida na Rua Cambara,
                  60.710-410, Cambira, CE, vem por meio deste documento
                  formalizar a{' '}
                  <strong>
                    implantação do sistema próprio de controle de jornada de
                    trabalho
                  </strong>{' '}
                  mediante Registrador Eletrônico de Ponto via Programa (REP-P),
                  conforme disposto na Portaria MTE nº 671/2021.
                </p>

                <div className="bg-gray-50 p-4 rounded-lg my-6">
                  <h3 className="font-semibold mb-3 text-lg">1. OBJETIVO</h3>
                  <p className="mb-2">
                    O presente termo tem por objetivo documentar formalmente a
                    decisão da empresa de implantar sistema próprio de controle
                    de jornada de trabalho, desenvolvido internamente,
                    utilizando tecnologia de{' '}
                    <strong>
                      Registrador Eletrônico de Ponto via Programa (REP-P)
                    </strong>
                    , conforme previsto no Art. 75, inciso III da Portaria MTE
                    nº 671/2021.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg my-6">
                  <h3 className="font-semibold mb-3 text-lg">
                    2. ENQUADRAMENTO LEGAL
                  </h3>
                  <p className="mb-2">
                    O sistema está enquadrado como <strong>REP-P</strong>,
                    conforme Art. 75, inciso III da Portaria MTE nº 671/2021,
                    sendo composto por:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>
                      Registrador Eletrônico de Ponto via Programa (REP-P);
                    </li>
                    <li>
                      Coletores de marcações (dispositivos móveis com acesso
                      web);
                    </li>
                    <li>
                      Armazenamento de registro de ponto em banco de dados
                      seguro;
                    </li>
                    <li>
                      Programa de Tratamento de Registro de Ponto (EPE e AEJ).
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg my-6">
                  <h3 className="font-semibold mb-3 text-lg">
                    3. CARACTERÍSTICAS DO SISTEMA
                  </h3>
                  <p className="mb-2">
                    O sistema de ponto eletrônico implantado possui as seguintes
                    características:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>
                      <strong>Desenvolvimento Próprio:</strong> Software
                      desenvolvido internamente pela KL Facilities
                    </li>
                    <li>
                      <strong>Registro de Ponto:</strong> Realizado através de
                      dispositivos móveis (smartphones) com acesso web
                    </li>
                    <li>
                      <strong>Geolocalização:</strong> Captura obrigatória de
                      coordenadas GPS para validação de localização
                    </li>
                    <li>
                      <strong>Captura de Evidências:</strong> Selfie obrigatória
                      em cada batida de ponto
                    </li>
                    <li>
                      <strong>Integridade:</strong> Hash SHA-256 e protocolo
                      único para cada registro
                    </li>
                    <li>
                      <strong>Rastreabilidade:</strong> Log completo de todas as
                      operações com IP, User-Agent e Device ID
                    </li>
                    <li>
                      <strong>Geração de EPE:</strong> Espelho de Ponto
                      Eletrônico em formato PDF conforme padrão MTE
                    </li>
                    <li>
                      <strong>Export AEJ:</strong> Arquivo Eletrônico de Jornada
                      para apresentação à fiscalização
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg my-6">
                  <h3 className="font-semibold mb-3 text-lg">
                    4. CONFORMIDADE LEGAL
                  </h3>
                  <p className="mb-2">O sistema está em conformidade com:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Portaria MTE nº 671/2021 (REP-P)</li>
                    <li>
                      Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
                    </li>
                    <li>Consolidação das Leis do Trabalho (CLT)</li>
                    <li>Decreto nº 10.854/2021</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg my-6">
                  <h3 className="font-semibold mb-3 text-lg">
                    5. RESPONSABILIDADES DA EMPRESA
                  </h3>
                  <p className="mb-2">
                    A KL Facilities assume as seguintes responsabilidades:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>
                      Manter a integridade e veracidade dos registros de ponto
                    </li>
                    <li>
                      Garantir a segurança dos dados pessoais dos colaboradores
                      (conforme LGPD)
                    </li>
                    <li>
                      Manter os registros pelo prazo mínimo de 5 anos (conforme
                      CLT)
                    </li>
                    <li>
                      Fornecer acesso ao Espelho de Ponto Eletrônico (EPE) aos
                      colaboradores
                    </li>
                    <li>
                      Apresentar documentação técnica e AEJ à fiscalização
                      quando solicitado
                    </li>
                    <li>Capacitar os funcionários sobre o uso do sistema</li>
                    <li>Manter documentação técnica atualizada</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg my-6">
                  <h3 className="font-semibold mb-3 text-lg">
                    6. CERTIFICAÇÃO E DOCUMENTAÇÃO
                  </h3>
                  <p className="mb-2">A empresa compromete-se a:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>
                      Obter certificação do sistema no INPI (Registro de
                      Programa de Computador)
                    </li>
                    <li>Manter manual técnico e jurídico atualizado</li>
                    <li>
                      Documentar todas as atualizações e melhorias do sistema
                    </li>
                    <li>
                      Disponibilizar esta documentação para apresentação à
                      fiscalização
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg my-6">
                  <h3 className="font-semibold mb-3 text-lg text-yellow-800">
                    7. VIGÊNCIA
                  </h3>
                  <p className="text-yellow-800">
                    O presente termo entra em vigor a partir da data de
                    assinatura e permanece válido enquanto o sistema de ponto
                    eletrônico estiver em operação. Qualquer alteração
                    significativa no sistema deve ser documentada e este termo
                    deve ser atualizado.
                  </p>
                </div>
              </div>

              {/* NOTA SOBRE ASSINATURA DIGITAL */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> Este termo deve ser impresso, assinado
                  pelos representantes legais da empresa e mantido em arquivo
                  físico. Uma cópia digital deve ser mantida no sistema para
                  apresentação à fiscalização quando solicitado.
                </p>
              </div>
            </div>
          </section>

          {/* DOCUMENTOS RELACIONADOS */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Documentos Relacionados
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/compliance/manual-tecnico-juridico"
                className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 transition-colors"
              >
                <h3 className="font-semibold text-blue-800 mb-1">
                  Manual Técnico e Jurídico
                </h3>
                <p className="text-sm text-blue-700">
                  Documentação técnica completa do sistema
                </p>
              </Link>
              <Link
                href="/compliance/conformidade"
                className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 transition-colors"
              >
                <h3 className="font-semibold text-green-800 mb-1">
                  Relatório de Conformidade
                </h3>
                <p className="text-sm text-green-700">
                  Relatório técnico de conformidade LGPD e REP-P
                </p>
              </Link>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Última atualização:</strong>{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                  <br />
                  <strong>Versão:</strong> 1.0.0
                </p>
              </div>
              <div>
                <Link
                  href="/compliance"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ver Página de Compliance →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
