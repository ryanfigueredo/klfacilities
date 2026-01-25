import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Manual Técnico e Jurídico - Sistema REP-P - KL Facilities',
  description:
    'Manual técnico e jurídico completo detalhando o funcionamento e as medidas de segurança do sistema de ponto eletrônico REP-P da KL Facilities.',
};

export default function ManualTecnicoJuridicoPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl pt-24">
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
            Manual Técnico e Jurídico - Sistema REP-P
          </h1>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>Empresa:</strong> KL Facilities
              <br />
              <strong>Sistema:</strong> ERP KL - Módulo de Ponto Eletrônico
              (REP-P)
              <br />
              <strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}
              <br />
              <strong>Versão:</strong> 1.0.0
              <br />
              <strong>Conformidade:</strong> Portaria MTE nº 671/2021
            </p>
          </div>

          {/* PARTE 1: ASPECTOS JURÍDICOS */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              1. Enquadramento Jurídico e Legal
            </h2>

            <h3 className="text-xl font-medium mb-3">
              1.1 Validade Jurídica do Sistema
            </h3>
            <p className="mb-4">
              O aplicativo de ponto eletrônico desenvolvido internamente pela{' '}
              <strong>KL Facilities</strong> é juridicamente válido, desde que
              enquadrado como <strong>REP-P</strong> (Registrador Eletrônico de
              Ponto via Programa), conforme a{' '}
              <strong>Portaria MTE nº 671/2021</strong>.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-green-800 mb-2">
                Requisitos Legais Atendidos:
              </h4>
              <ul className="text-sm text-green-700 space-y-1 list-disc pl-6">
                <li>
                  ✓{' '}
                  <strong>
                    Não há necessidade de certificação junto ao INMETRO
                  </strong>{' '}
                  para REP-P
                </li>
                <li>
                  ✓{' '}
                  <strong>
                    Não há necessidade de comunicação ou homologação prévia em
                    sindicato
                  </strong>
                </li>
                <li>
                  ✓ <strong>Certificação no INPI:</strong> O sistema será
                  devidamente certificado no INPI como software próprio (em
                  andamento)
                </li>
                <li>
                  ✓ <strong>Documentação técnica:</strong> Manutenção de
                  documentação técnica completa
                </li>
                <li>
                  ✓ <strong>Registros íntegros:</strong> Garantia de integridade
                  e imutabilidade
                </li>
                <li>
                  ✓ <strong>Conformidade LGPD:</strong> Tratamento de dados
                  pessoais conforme Lei Geral de Proteção de Dados
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              1.2 Responsabilidades Legais
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 mb-2">
                <strong> IMPORTANTE:</strong> A responsabilidade pelos dados e
                pela veracidade das marcações recai integralmente sobre o{' '}
                <strong>empregador (KL Facilities)</strong>.
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc pl-6">
                <li>A empresa é responsável pela integridade dos registros</li>
                <li>A empresa deve garantir a veracidade das marcações</li>
                <li>
                  A empresa deve manter os registros por no mínimo 5 anos (CLT)
                </li>
                <li>
                  A empresa deve estar preparada para apresentar documentação à
                  fiscalização quando solicitado
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3" id="inpi">
              1.3 Certificação no INPI
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                Certificado de Registro no INPI
              </h4>
              <p className="text-blue-700 mb-3 text-sm">
                A certificação no INPI (Instituto Nacional da Propriedade
                Industrial) é um requisito essencial para sistemas REP-P. O
                registro comprova que o{' '}
                <strong>sistema de ponto eletrônico</strong> é de propriedade da
                empresa e desenvolvido internamente, conforme exigido pela
                Portaria MTE nº 671/2021.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
                <p className="text-sm text-yellow-800">
                  <strong> IMPORTANTE:</strong> O registro no INPI está sendo
                  solicitado{' '}
                  <strong>
                    especificamente para o Sistema de Ponto Eletrônico (REP-P)
                  </strong>
                  , módulo do ERP KL desenvolvido internamente pela KL
                  Facilities para gestão de registro de ponto dos colaboradores.
                </p>
              </div>
              <div className="mt-4 p-4 bg-white border border-blue-200 rounded">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Certificado de Registro no INPI:</strong>
                </p>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    <strong>Número do Registro:</strong> BR 51 2025 0005557
                  </p>
                  <p>
                    <strong>Número do Processo:</strong> 870250100294
                  </p>
                  <p>
                    <strong>Tipo de Registro:</strong> Pedido de Registro de
                    Programa de Computador - RPC
                  </p>
                  <p>
                    <strong>GRU:</strong> 29409192347440550
                  </p>
                  <p>
                    <strong>Objeto do Registro:</strong> Sistema de Ponto
                    Eletrônico REP-P - Módulo do ERP KL
                  </p>
                  <p className="mt-3">
                    <strong>Titular:</strong> DMTN DIGITAL TECNOLOGIA E SOLUCOES
                    LTDA
                    <br />
                    <strong>CNPJ:</strong> 59.171.428/0001-40
                  </p>
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-800">
                      <strong>✓ Status:</strong> Registro Aprovado e Concedido
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-blue-600">
                    <a
                      href="/BR512025005557--9_870250100294.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-800"
                    >
                      📄 Visualizar Certificado Completo (PDF)
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* PARTE 2: ASPECTOS TÉCNICOS */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Funcionamento Técnico do Sistema
            </h2>

            <h3 className="text-xl font-medium mb-3">
              2.1 Arquitetura e Infraestrutura
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>
                  <strong>Frontend:</strong> Next.js 15 com React 19 (PWA)
                </li>
                <li>
                  <strong>Backend:</strong> Node.js com TypeScript
                </li>
                <li>
                  <strong>Banco de Dados:</strong> PostgreSQL com Prisma ORM
                </li>
                <li>
                  <strong>Armazenamento:</strong> AWS S3 para imagens (selfies)
                </li>
                <li>
                  <strong>Deploy:</strong> Vercel com CDN global
                </li>
                <li>
                  <strong>Segurança:</strong> Criptografia AES-256, TLS 1.3
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              2.2 Processo de Registro de Ponto
            </h3>
            <div className="space-y-3 mb-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Passo 1: Identificação</h4>
                <p className="text-sm text-gray-700">
                  O colaborador informa seu CPF através do aplicativo web. O
                  sistema valida o CPF e identifica o funcionário cadastrado.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Passo 2: Geolocalização</h4>
                <p className="text-sm text-gray-700">
                  O sistema solicita e captura coordenadas GPS (latitude,
                  longitude) e precisão do GPS em metros. Valida se está dentro
                  do raio permitido (geofencing) da unidade de trabalho.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">
                  Passo 3: Captura de Selfie
                </h4>
                <p className="text-sm text-gray-700">
                  Fotografia do colaborador é capturada através da câmera
                  frontal do dispositivo móvel. A imagem é armazenada de forma
                  criptografada no AWS S3.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">
                  Passo 4: Geração de Hash e Protocolo
                </h4>
                <p className="text-sm text-gray-700">
                  Cada registro recebe um hash SHA-256 único calculado a partir
                  de todos os dados da batida (timestamp, CPF, unidade, tipo,
                  IP, device ID). Um protocolo único no formato
                  KL-YYYYMMDD-XXXX-XXXX é gerado para rastreabilidade.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">
                  Passo 5: Armazenamento Seguro
                </h4>
                <p className="text-sm text-gray-700">
                  Todos os dados são armazenados de forma criptografada no banco
                  de dados PostgreSQL. Metadados adicionais (IP, User-Agent,
                  Device ID) são registrados para auditoria completa.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">
              2.3 Medidas de Segurança Implementadas
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  Integridade de Dados
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Hash SHA-256 para cada registro</li>
                  <li>• Protocolo único por batida</li>
                  <li>• Timestamp UTC com precisão de milissegundos</li>
                  <li>• Anti-duplicação (120 segundos)</li>
                  <li>• Banco de dados com constraints de integridade</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Criptografia
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• AES-256 para dados sensíveis</li>
                  <li>• TLS 1.3 para transmissão</li>
                  <li>• Server-side encryption no S3</li>
                  <li>• Dados sensíveis (CPF) armazenados como BigInt</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">
                  Rastreabilidade
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Log completo de todas as operações</li>
                  <li>• Registro de IP, User-Agent, Device ID</li>
                  <li>• Histórico de alterações</li>
                  <li>• Auditoria de acesso</li>
                </ul>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">
                  Validações
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Validação de CPF</li>
                  <li>• Geofencing obrigatório</li>
                  <li>• Selfie obrigatória</li>
                  <li>• Verificação de funcionário ativo</li>
                </ul>
              </div>
            </div>
          </section>

          {/* PARTE 3: CONFORMIDADE */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Conformidade com a Portaria 671/2021
            </h2>

            <h3 className="text-xl font-medium mb-3">
              3.1 Requisitos Técnicos Atendidos
            </h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">
                      Requisito
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border">
                      Implementação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 border">
                      Integridade dos Registros
                    </td>
                    <td className="px-4 py-2 text-sm text-green-700 border">
                      ✓ Implementado
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border">
                      Hash SHA-256, protocolo único
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 border">
                      Rastreabilidade
                    </td>
                    <td className="px-4 py-2 text-sm text-green-700 border">
                      ✓ Implementado
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border">
                      Logs completos, metadados, auditoria
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 border">
                      Geolocalização
                    </td>
                    <td className="px-4 py-2 text-sm text-green-700 border">
                      ✓ Implementado
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border">
                      GPS obrigatório, geofencing configurável
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 border">
                      Captura de Evidências
                    </td>
                    <td className="px-4 py-2 text-sm text-green-700 border">
                      ✓ Implementado
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border">
                      Selfie obrigatória em cada batida
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 border">
                      Geração de EPE
                    </td>
                    <td className="px-4 py-2 text-sm text-green-700 border">
                      ✓ Implementado
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border">
                      PDF automático conforme padrão MTE
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 border">
                      Export AEJ
                    </td>
                    <td className="px-4 py-2 text-sm text-green-700 border">
                      ✓ Implementado
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border">
                      Arquivo estruturado para fiscalização
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900 border">
                      Segurança de Dados
                    </td>
                    <td className="px-4 py-2 text-sm text-green-700 border">
                      ✓ Implementado
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 border">
                      Criptografia, controle de acesso, LGPD
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium mb-3">
              3.2 Documentos Disponíveis para Fiscalização
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 mb-2">
                A empresa está preparada para apresentar os seguintes documentos
                quando solicitado pela fiscalização:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc pl-6">
                <li>
                  <strong>AEJ (Arquivo Eletrônico de Jornada):</strong> Export
                  completo de registros em formato estruturado
                </li>
                <li>
                  <strong>Manual Técnico e Jurídico:</strong> Este documento,
                  detalhando funcionamento e medidas de segurança
                </li>
                <li>
                  <strong>Termo de Implantação:</strong> Documento interno
                  formalizando a implantação do sistema
                </li>
                <li>
                  <strong>Certificado INPI:</strong> Registro BR 51 2025 0005557
                  - Sistema de Ponto Eletrônico REP-P (Aprovado)
                </li>
                <li>
                  <strong>Relatório de Conformidade:</strong> Documentação
                  técnica completa
                </li>
                <li>
                  <strong>Política de Privacidade:</strong> Conformidade com
                  LGPD
                </li>
              </ul>
            </div>
          </section>

          {/* PARTE 4: MEDIDAS DE SEGURANÇA DETALHADAS */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Medidas de Segurança Detalhadas
            </h2>

            <h3 className="text-xl font-medium mb-3">
              4.1 Segurança de Dados Pessoais (LGPD)
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  Dados Coletados
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• CPF (criptografado)</li>
                  <li>• Geolocalização (GPS)</li>
                  <li>• Selfie (biometria facial)</li>
                  <li>• IP e Device ID</li>
                  <li>• Timestamp e protocolo</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Direitos dos Titulares
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Acesso aos dados</li>
                  <li>• Correção de informações</li>
                  <li>• Portabilidade</li>
                  <li>• Revogação de consentimento</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.2 Backup e Recuperação de Dados
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>
                  <strong>Backup Incremental:</strong> A cada 6 horas, mantido
                  por 30 dias
                </li>
                <li>
                  <strong>Backup Completo:</strong> Semanal, mantido por 5 anos
                  (conforme CLT)
                </li>
                <li>
                  <strong>Georedundância:</strong> Dados replicados em múltiplas
                  zonas
                </li>
                <li>
                  <strong>Testes de Restauração:</strong> Realizados mensalmente
                </li>
              </ul>
            </div>
          </section>

          {/* PARTE 5: PROCEDIMENTOS OPERACIONAIS */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Procedimentos Operacionais
            </h2>

            <h3 className="text-xl font-medium mb-3">
              5.1 Capacitação de Funcionários
            </h3>
            <p className="mb-4">
              Todos os funcionários devem ser capacitados sobre o uso do sistema
              de ponto eletrônico e devem fornecer ciência através de assinatura
              digital. A capacitação inclui:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Orientações sobre como bater ponto corretamente</li>
              <li>Importância da geolocalização e selfie</li>
              <li>Direitos e responsabilidades do funcionário</li>
              <li>Como acessar espelho de ponto eletrônico (EPE)</li>
              <li>Procedimentos em caso de problemas técnicos</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">
              5.2 Resposta a Incidentes
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-red-800 mb-2">
                Em caso de problemas técnicos:
              </h4>
              <ol className="text-sm text-red-700 space-y-1 list-decimal pl-6">
                <li>Registrar o problema através do sistema de suporte</li>
                <li>Documentar o incidente com screenshots se possível</li>
                <li>Informar imediatamente ao setor de RH</li>
                <li>Manter registro manual temporário se necessário</li>
                <li>Corrigir o registro no sistema após resolução</li>
              </ol>
            </div>
          </section>

          {/* CONCLUSÃO */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Conclusão</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800 mb-4">
                O sistema de ponto eletrônico da <strong>KL Facilities</strong>{' '}
                está completamente conforme com todos os requisitos legais e
                técnicos estabelecidos pela{' '}
                <strong>Portaria MTE nº 671/2021</strong> para sistemas REP-P.
              </p>
              <p className="text-green-800 mb-4">
                Todas as medidas de segurança, integridade e rastreabilidade
                foram implementadas e estão sendo monitoradas continuamente.
              </p>
              <p className="text-green-800">
                Este manual técnico e jurídico serve como documentação oficial
                do sistema e deve ser apresentado à fiscalização quando
                solicitado, juntamente com o AEJ e demais documentos de
                conformidade.
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Responsável Técnico:</strong> Ryan Figueredo
                  <br />
                  <strong>Data:</strong>{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                  <br />
                  <strong>Versão:</strong> 1.0.0
                </p>
              </div>
              <div className="flex gap-4">
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
