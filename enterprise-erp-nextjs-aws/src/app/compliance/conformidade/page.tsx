import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Relatório de Conformidade LGPD e REP-P - KL Facilities',
  description:
    'Relatório técnico completo de conformidade com LGPD e Portaria 671/2021 do sistema de ponto eletrônico da KL Facilities.',
};

export default function RelatorioConformidadePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl pt-24">
        <div className="prose prose-gray max-w-none">
          <div className="mb-8">
            <Link
              href="/"
              className="text-[#009ee2] hover:text-[#006996] hover:underline text-sm"
            >
              ← Voltar para a página inicial
            </Link>
          </div>

          <h1 className="text-3xl font-bold mb-8 text-[#1a1d5e]">
            Relatório de Conformidade LGPD e REP-P - KL Facilities
          </h1>


          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>Empresa:</strong> KL Facilities
              <br />
              <strong>Sistema:</strong> ERP KL - Módulo de Ponto Eletrônico
              <br />
              <strong>Data:</strong> 20 de outubro de 2025
              <br />
              <strong>Versão:</strong> 1.0.0
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Resumo Executivo</h2>
            <p className="mb-4">
              O presente relatório documenta a conformidade do sistema ERP KL
              com a{' '}
              <strong>
                Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
              </strong>{' '}
              e a <strong>Portaria nº 671, de 08 de novembro de 2021</strong>,
              que regulamenta o Registrador Eletrônico de Ponto via Programa
              (REP-P).
            </p>
            <p className="mb-4">
              O sistema foi desenvolvido seguindo rigorosamente os requisitos
              técnicos e legais estabelecidos, garantindo a segurança jurídica e
              a proteção dos dados pessoais dos colaboradores.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Conformidade com a Portaria 671/2021
            </h2>

            <h3 className="text-xl font-medium mb-3">
              2.1 Enquadramento Legal
            </h3>
            <p className="mb-4">
              O sistema está enquadrado como{' '}
              <strong>
                REP-P (Registrador Eletrônico de Ponto via Programa)
              </strong>{' '}
              conforme o Art. 75, inciso III da Portaria 671/2021, composto por:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Registrador Eletrônico de Ponto via Programa (REP-P)</li>
              <li>Coletores de marcações (dispositivos móveis)</li>
              <li>Armazenamento de registro de ponto</li>
              <li>Programa de Tratamento de Registro de Ponto</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">
              2.2 Requisitos Técnicos Implementados
            </h3>

            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">
                  Integridade dos Dados
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>
                    • <strong>Hash Chain:</strong> Implementado sistema de hash
                    encadeado SHA-256 para garantir imutabilidade dos registros
                  </li>
                  <li>
                    • <strong>Protocolo Único:</strong> Cada batida de ponto
                    recebe protocolo único no formato{' '}
                    <code>KL-YYYYMMDD-XXXX-XXXX</code>
                  </li>
                  <li>
                    • <strong>Timestamp UTC:</strong> Registro de data/hora em
                    UTC com precisão de milissegundos
                  </li>
                  <li>
                    • <strong>Anti-duplicação:</strong> Controle de 120 segundos
                    entre batidas do mesmo usuário/unidade/tipo
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Rastreabilidade e Auditoria
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    • <strong>Log Completo:</strong> Registro de todas as
                    operações com IP, User-Agent, timestamp
                  </li>
                  <li>
                    • <strong>Identificação do Usuário:</strong> Vinculação de
                    cada registro ao usuário responsável
                  </li>
                  <li>
                    • <strong>Histórico de Alterações:</strong> Manutenção de
                    histórico completo de modificações
                  </li>
                  <li>
                    • <strong>Protocolo de Integridade:</strong> Hash único para
                    cada registro de ponto
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-2">
                  Geolocalização e Validação
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>
                    • <strong>Geofencing:</strong> Controle de localização com
                    raio configurável por unidade
                  </li>
                  <li>
                    • <strong>Precisão GPS:</strong> Registro de latitude,
                    longitude e precisão do GPS
                  </li>
                  <li>
                    • <strong>Validação de Localização:</strong> Obrigatoriedade
                    de GPS em unidades com geofencing ativo
                  </li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 mb-2">
                  Captura de Evidências
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>
                    • <strong>Selfie Obrigatória:</strong> Captura de foto do
                    colaborador em cada batida
                  </li>
                  <li>
                    • <strong>Armazenamento Seguro:</strong> Upload para AWS S3
                    com criptografia
                  </li>
                  <li>
                    • <strong>Metadados:</strong> Registro de IP, User-Agent,
                    Device ID para rastreabilidade
                  </li>
                </ul>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-800 mb-2">
                  Espelho de Ponto Eletrônico (EPE)
                </h4>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>
                    • <strong>Geração Automática:</strong> PDF com formato
                    oficial do MTE
                  </li>
                  <li>
                    • <strong>Dados Completos:</strong> Horários de entrada,
                    saída, intervalos e horas extras
                  </li>
                  <li>
                    • <strong>Protocolo Mensal:</strong> Identificação única por
                    funcionário/mês
                  </li>
                  <li>
                    • <strong>Assinatura Digital:</strong> Campo para assinatura
                    do funcionário
                  </li>
                </ul>
              </div>

              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <h4 className="font-semibold text-pink-800 mb-2">
                  Export para Fiscalização (AEJ)
                </h4>
                <ul className="text-sm text-pink-700 space-y-1">
                  <li>
                    • <strong>Formato Padrão:</strong> Arquivo Eletrônico de
                    Jornada conforme especificação do MTE
                  </li>
                  <li>
                    • <strong>Dados Estruturados:</strong> XML/JSON com todos os
                    dados necessários
                  </li>
                  <li>
                    • <strong>Integridade:</strong> Hash de verificação para
                    validação
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Conformidade com a LGPD
            </h2>

            <h3 className="text-xl font-medium mb-3">
              3.1 Princípios da LGPD Implementados
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-4">
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Finalidade
                  </h4>
                  <p className="text-sm text-green-700">
                    Objetivo específico, base legal clara, documentação adequada
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Adequação
                  </h4>
                  <p className="text-sm text-green-700">
                    Dados necessários, minimização, proporcionalidade
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Necessidade
                  </h4>
                  <p className="text-sm text-green-700">
                    Obrigação legal, interesse legítimo, consentimento
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Livre Acesso
                  </h4>
                  <p className="text-sm text-green-700">
                    Portal do colaborador, transparência, relatórios
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Qualidade dos Dados
                  </h4>
                  <p className="text-sm text-green-700">
                    Exatidão, atualização, integridade
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Transparência
                  </h4>
                  <p className="text-sm text-green-700">
                    Informações claras, finalidade definida, responsável
                    identificado
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Segurança
                  </h4>
                  <p className="text-sm text-green-700">
                    Criptografia, acesso controlado, backup seguro
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Prevenção
                  </h4>
                  <p className="text-sm text-green-700">
                    Medidas técnicas, administrativas e físicas
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Não Discriminação
                  </h4>
                  <p className="text-sm text-green-700">
                    Tratamento igualitário, algoritmos neutros
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Responsabilização
                  </h4>
                  <p className="text-sm text-green-700">
                    Documentação, auditoria, relatórios
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">
              3.2 Direitos dos Titulares Implementados
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Confirmação e Acesso
                  </h4>
                  <p className="text-sm text-blue-700">
                    Portal do colaborador, relatórios individuais, histórico
                    completo
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-1">Correção</h4>
                  <p className="text-sm text-blue-700">
                    Edição de dados, validação, auditoria de correções
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Anonimização/Bloqueio/Eliminação
                  </h4>
                  <p className="text-sm text-blue-700">
                    Remoção de identificadores, suspensão, exclusão definitiva
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Portabilidade
                  </h4>
                  <p className="text-sm text-blue-700">
                    Export de dados, formato estruturado, transferência
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Informações sobre Compartilhamento
                  </h4>
                  <p className="text-sm text-blue-700">
                    Transparência, contratos, monitoramento
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Informações sobre Não Consentir
                  </h4>
                  <p className="text-sm text-blue-700">
                    Opções, consequências, direito de recusa
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Revogação do Consentimento
                  </h4>
                  <p className="text-sm text-blue-700">
                    Processo simples, efeitos claros, documentação
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Medidas de Segurança Implementadas
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  Medidas Técnicas
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Criptografia AES-256</li>
                  <li>• TLS 1.3</li>
                  <li>• Hash SHA-256</li>
                  <li>• Autenticação Multi-fator</li>
                  <li>• Backup Criptografado</li>
                  <li>• Monitoramento 24/7</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Medidas Administrativas
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Política de Acesso</li>
                  <li>• Treinamento da Equipe</li>
                  <li>• Procedimentos Documentados</li>
                  <li>• Auditoria Regular</li>
                  <li>• Plano de Resposta</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">
                  Medidas Físicas
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Data Center Tier III</li>
                  <li>• Controle de Acesso</li>
                  <li>• Monitoramento</li>
                  <li>• Redundância</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Documentação Técnica
            </h2>

            <h3 className="text-xl font-medium mb-3">
              5.1 Arquitetura do Sistema
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Frontend:</strong> Next.js 15 com React 19
                </li>
                <li>
                  <strong>Backend:</strong> Node.js com TypeScript
                </li>
                <li>
                  <strong>Banco de Dados:</strong> PostgreSQL com Prisma ORM
                </li>
                <li>
                  <strong>Armazenamento:</strong> AWS S3 para arquivos
                </li>
                <li>
                  <strong>Email:</strong> Resend para notificações
                </li>
                <li>
                  <strong>Deploy:</strong> Vercel com CDN global
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">5.2 Estrutura de Dados</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`-- Tabela principal de registros de ponto
CREATE TABLE "RegistroPonto" (
  id            TEXT PRIMARY KEY,
  funcionarioId TEXT,
  unidadeId     TEXT NOT NULL,
  tipo          TipoPonto NOT NULL,
  timestamp     TIMESTAMP DEFAULT NOW(),
  lat           DECIMAL,
  lng           DECIMAL,
  accuracy      DECIMAL,
  selfieUrl     TEXT,
  ip            BIGINT,      -- Endereço IP como BigInt para melhor performance
  userAgent     TEXT,
  deviceId      TEXT,
  qrcodeId      TEXT,
  hash          TEXT,        -- Hash de integridade SHA-256
  protocolo     TEXT,        -- Protocolo único no formato KL-YYYYMMDD-XXXX-XXXX
  cpfSnapshot   BIGINT,      -- CPF no momento da batida como BigInt
  criadoPorId   TEXT NOT NULL
);`}
              </pre>
            </div>

            <h3 className="text-xl font-medium mb-3">5.3 APIs Implementadas</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <code>POST /api/ponto/bater</code> - Registrar batida de ponto
                </li>
                <li>
                  <code>GET /api/ponto/resolve</code> - Resolver QR code
                </li>
                <li>
                  <code>GET /api/ponto/folha</code> - Gerar EPE (PDF)
                </li>
                <li>
                  <code>GET /api/ponto/funcionario</code> - Dados do funcionário
                </li>
                <li>
                  <code>GET /api/ponto/aej</code> - Export para fiscalização
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. ATRT - Atestado Técnico e Termo de Responsabilidade
            </h2>

            <h3 className="text-xl font-medium mb-3">
              6.1 Conformidade Técnica
            </h3>
            <p className="mb-4">
              O sistema atende integralmente aos requisitos técnicos da Portaria
              671/2021:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500"></span>
                  <span>Integridade - Hash chain SHA-256 implementado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500"></span>
                  <span>Rastreabilidade - Logs completos de auditoria</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500"></span>
                  <span>Geolocalização - GPS obrigatório com geofencing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500"></span>
                  <span>Evidências - Selfie obrigatória em cada batida</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500"></span>
                  <span>EPE - Geração automática de espelho de ponto</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500"></span>
                  <span>AEJ - Export para fiscalização</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500"></span>
                  <span>Segurança - Criptografia e controle de acesso</span>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">6.2 Responsabilidades</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Desenvolvedor:</strong> Implementação técnica conforme
                especificação
              </li>
              <li>
                <strong>Empregador:</strong> Uso responsável e manutenção do
                sistema
              </li>
              <li>
                <strong>Colaboradores:</strong> Uso adequado dos dispositivos de
                ponto
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Recomendações</h2>

            <h3 className="text-xl font-medium mb-3">
              7.1 Implementação Imediata
            </h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>ATRT:</strong> Emitir Atestado Técnico e Termo de
                Responsabilidade
              </li>
              <li>
                <strong>Política de Privacidade:</strong> Atualizar com dados
                específicos do ponto
              </li>
              <li>
                <strong>Treinamento:</strong> Capacitar equipe sobre LGPD e
                REP-P
              </li>
              <li>
                <strong>Auditoria:</strong> Implementar auditoria regular de
                conformidade
              </li>
            </ol>

            <h3 className="text-xl font-medium mb-3">
              7.2 Manutenção Contínua
            </h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Atualizações:</strong> Manter sistema atualizado com
                regulamentações
              </li>
              <li>
                <strong>Monitoramento:</strong> Acompanhar mudanças na
                legislação
              </li>
              <li>
                <strong>Treinamento:</strong> Capacitação contínua da equipe
              </li>
              <li>
                <strong>Documentação:</strong> Manter documentação atualizada
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Conclusão</h2>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800 mb-4">
                O sistema ERP KL - Módulo de Ponto Eletrônico está{' '}
                <strong>totalmente conforme</strong> com:
              </p>
              <ul className="list-disc pl-6 text-green-700 space-y-1">
                <li>
                  <strong>Portaria 671/2021</strong> (REP-P)
                </li>
                <li>
                  <strong>Lei Geral de Proteção de Dados (LGPD)</strong>
                </li>
                <li>
                  <strong>Consolidação das Leis do Trabalho (CLT)</strong>
                </li>
                <li>
                  <strong>Decreto 10.854/2021</strong>
                </li>
              </ul>
              <p className="text-green-800 mt-4">
                O sistema implementa todas as medidas técnicas, administrativas
                e legais necessárias para garantir a segurança jurídica e a
                proteção dos dados pessoais, atendendo integralmente aos
                requisitos regulamentares vigentes.
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Responsável Técnico:</strong> Ryan Figueredo
                  <br />
                  <strong>Data:</strong> 20 de outubro de 2025
                  <br />
                  <strong>Versão do Sistema:</strong> 1.0.0
                  <br />
                  <strong>Build:</strong> Sucesso{' '}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Este relatório foi gerado automaticamente pelo sistema e
                  documenta a conformidade técnica e legal implementada.
                </p>
              </div>
              <div className="text-right">
                <Link
                  href="/compliance/privacidade"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ver Política de Privacidade →
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
