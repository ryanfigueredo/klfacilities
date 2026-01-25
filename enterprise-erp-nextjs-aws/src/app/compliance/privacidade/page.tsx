import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Política de Privacidade - KL Facilities',
  description:
    'Política de privacidade da KL Facilities - Sistema de ponto eletrônico em conformidade com a LGPD e Portaria 671/2021.',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl pt-24">
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
            Política de Privacidade - KL Facilities
          </h1>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>Última atualização:</strong> 29 de dezembro de 2025
              <br />
              <strong>Versão:</strong> 1.1.0
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              1. Informações Gerais
            </h2>

            <h3 className="text-xl font-medium mb-3">
              1.1 Controlador de Dados
            </h3>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>Empresa:</strong> KL Facilities
              </li>
              <li>
                <strong>CNPJ:</strong> 50.012.308/0001-25
              </li>
              <li>
                <strong>Endereço:</strong> Rua Cambara, 60.710-410, Cambira, CE
              </li>
              <li>
                <strong>Email:</strong> contato@klfacilities.com.br
              </li>
              <li>
                <strong>Telefone:</strong> (21) 99762-4873
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-3">
              1.2 Encarregado de Dados (DPO)
            </h3>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>Nome:</strong> Ryan Figueredo
              </li>
              <li>
                <strong>Email:</strong> ryan@dmtn.com.br
              </li>
              <li>
                <strong>Telefone:</strong> (21) 99762-4873
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Finalidade do Tratamento de Dados
            </h2>

            <h3 className="text-xl font-medium mb-3">2.1 Objetivo Principal</h3>
            <p className="mb-4">
              O sistema de ponto eletrônico tem como finalidade principal o{' '}
              <strong>controle de jornada de trabalho</strong> dos
              colaboradores, conforme exigido pela Consolidação das Leis do
              Trabalho (CLT) e regulamentado pela Portaria nº 671/2021 do
              Ministério do Trabalho e Previdência.
            </p>

            <h3 className="text-xl font-medium mb-3">
              2.2 Finalidades Específicas
            </h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Registro de entrada e saída dos colaboradores</li>
              <li>Controle de intervalos de trabalho</li>
              <li>Cálculo de horas trabalhadas e extras</li>
              <li>Geração de relatórios de frequência</li>
              <li>Cumprimento de obrigações legais trabalhistas</li>
              <li>Gestão de recursos humanos</li>
              <li>Prevenção de fraudes em registros de ponto</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Base Legal para o Tratamento
            </h2>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  Obrigação Legal
                </h4>
                <p className="text-sm text-green-700">
                  Art. 7º, II da LGPD - Cumprimento de obrigação legal
                  estabelecida pela CLT
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Interesse Legítimo
                </h4>
                <p className="text-sm text-blue-700">
                  Art. 7º, IX da LGPD - Gestão eficiente de recursos humanos
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">
                  Consentimento
                </h4>
                <p className="text-sm text-purple-700">
                  Art. 7º, I da LGPD - Quando aplicável, obtido de forma clara
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Sistema de Ponto Eletrônico - Funcionamento Completo
            </h2>

            <h3 className="text-xl font-medium mb-3">
              4.1 Como Funciona o Sistema
            </h3>
            <p className="mb-4">
              O sistema de ponto eletrônico ERP KL utiliza tecnologia de
              Registrador Eletrônico de Ponto via Programa (REP-P), conforme
              Portaria 671/2021 do Ministério do Trabalho. O sistema permite o
              registro de ponto através de dispositivos móveis (smartphones) com
              geolocalização GPS e captura de fotografia (selfie) para garantir
              a integridade dos registros.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                Tipos de Registros de Ponto
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • <strong>ENTRADA:</strong> Registro do início da jornada de
                  trabalho
                </li>
                <li>
                  • <strong>INTERVALO_INICIO:</strong> Início do intervalo para
                  descanso ou refeição
                </li>
                <li>
                  • <strong>INTERVALO_FIM:</strong> Término do intervalo e
                  retorno ao trabalho
                </li>
                <li>
                  • <strong>SAIDA:</strong> Registro do término da jornada de
                  trabalho
                </li>
                <li>
                  • <strong>HORA_EXTRA_INICIO:</strong> Início de hora extra
                </li>
                <li>
                  • <strong>HORA_EXTRA_FIM:</strong> Término de hora extra
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.2 Processo de Registro de Ponto
            </h3>
            <ol className="list-decimal pl-6 mb-4 space-y-2">
              <li>
                <strong>Localização GPS:</strong> O sistema solicita permissão
                de localização e captura as coordenadas GPS (latitude e
                longitude) com precisão em metros
              </li>
              <li>
                <strong>Validação Geográfica:</strong> Verifica se o colaborador
                está dentro do raio permitido da unidade de trabalho
                (geofencing)
              </li>
              <li>
                <strong>Captura de Selfie:</strong> Tira uma fotografia do
                colaborador para comprovação de identidade e prevenção de
                fraudes
              </li>
              <li>
                <strong>Upload Seguro:</strong> A imagem é enviada criptografada
                para armazenamento seguro em nuvem (AWS S3)
              </li>
              <li>
                <strong>Geração de Hash:</strong> Cada registro recebe um hash
                SHA-256 único para garantir integridade e imutabilidade
              </li>
              <li>
                <strong>Protocolo Único:</strong> Cada batida recebe um
                protocolo no formato <code>KL-YYYYMMDD-XXXX-XXXX</code> para
                rastreabilidade
              </li>
              <li>
                <strong>Registro no Banco:</strong> Todos os dados são
                armazenados de forma criptografada em banco de dados PostgreSQL
              </li>
            </ol>

            <h3 className="text-xl font-medium mb-3">
              4.3 Tecnologias e Infraestrutura
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Frontend</h4>
                <ul className="text-sm space-y-1">
                  <li>• Next.js 15 com React 19</li>
                  <li>• TypeScript para type safety</li>
                  <li>• Progressive Web App (PWA)</li>
                  <li>• Geolocation API do navegador</li>
                  <li>• Camera API para captura de selfie</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Backend</h4>
                <ul className="text-sm space-y-1">
                  <li>• Node.js com TypeScript</li>
                  <li>• PostgreSQL com Prisma ORM</li>
                  <li>• AWS S3 para armazenamento de imagens</li>
                  <li>• Criptografia AES-256</li>
                  <li>• Hash SHA-256 para integridade</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.4 Dados Pessoais Coletados em Cada Batida
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Dados de Identificação</h4>
                <ul className="list-disc pl-6 mb-4 text-sm">
                  <li>Nome completo do colaborador</li>
                  <li>CPF (armazenado como BigInt para segurança)</li>
                  <li>Cargo/função</li>
                  <li>ID único do funcionário no sistema</li>
                  <li>Unidade de trabalho</li>
                  <li>Grupo organizacional</li>
                </ul>

                <h4 className="font-semibold mb-2">Dados de Localização</h4>
                <ul className="list-disc pl-6 mb-4 text-sm">
                  <li>Coordenadas GPS (latitude e longitude)</li>
                  <li>Precisão do GPS em metros</li>
                  <li>Endereço da unidade de trabalho</li>
                  <li>Raio de geofencing configurado</li>
                  <li>Validação de localização permitida</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Dados Biométricos</h4>
                <ul className="list-disc pl-6 mb-4 text-sm">
                  <li>Fotografia (selfie) do colaborador</li>
                  <li>Metadados EXIF da imagem</li>
                  <li>URL segura de armazenamento (S3)</li>
                  <li>Hash da imagem para verificação</li>
                  <li>Timestamp da captura</li>
                </ul>

                <h4 className="font-semibold mb-2">
                  Dados de Dispositivo e Rede
                </h4>
                <ul className="list-disc pl-6 mb-4 text-sm">
                  <li>Endereço IP (armazenado como BigInt)</li>
                  <li>User-Agent do navegador</li>
                  <li>Identificador único do dispositivo (Device ID)</li>
                  <li>Tipo de conexão (WiFi, 4G, 5G)</li>
                  <li>QR Code ID (se utilizado)</li>
                  <li>Hash de integridade do registro</li>
                  <li>Protocolo único de rastreamento</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.5 Medidas de Segurança e Integridade
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <ul className="text-sm text-green-700 space-y-2">
                <li>
                  • <strong>Hash Chain SHA-256:</strong> Cada registro possui
                  hash único calculado com dados anteriores, garantindo que
                  nenhum registro possa ser alterado sem invalidar toda a cadeia
                </li>
                <li>
                  • <strong>Protocolo Único:</strong> Identificador único por
                  batida no formato KL-YYYYMMDD-XXXX-XXXX para rastreabilidade
                  completa
                </li>
                <li>
                  • <strong>Timestamp UTC:</strong> Registro de data/hora em UTC
                  com precisão de milissegundos para evitar problemas de fuso
                  horário
                </li>
                <li>
                  • <strong>Anti-duplicação:</strong> Sistema bloqueia registros
                  duplicados dentro de 120 segundos do mesmo
                  usuário/unidade/tipo
                </li>
                <li>
                  • <strong>Geofencing Obrigatório:</strong> Validação de que o
                  colaborador está no local correto antes de permitir o registro
                </li>
                <li>
                  • <strong>Selfie Obrigatória:</strong> Cada batida requer
                  fotografia do colaborador para comprovação de identidade
                </li>
                <li>
                  • <strong>Criptografia End-to-End:</strong> Dados sensíveis
                  são criptografados durante transmissão e armazenamento
                </li>
                <li>
                  • <strong>Auditoria Completa:</strong> Todos os acessos e
                  modificações são registrados com IP, timestamp e usuário
                  responsável
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.6 Geração de Relatórios e Exportação
            </h3>
            <div className="space-y-3">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-semibold text-indigo-800 mb-2">
                  Espelho de Ponto Eletrônico (EPE)
                </h4>
                <p className="text-sm text-indigo-700 mb-2">
                  O sistema gera automaticamente o Espelho de Ponto Eletrônico
                  em formato PDF conforme padrão do Ministério do Trabalho,
                  contendo:
                </p>
                <ul className="text-sm text-indigo-700 space-y-1 list-disc pl-6">
                  <li>Dados cadastrais do colaborador</li>
                  <li>Horários de entrada, saída e intervalos</li>
                  <li>Cálculo de horas trabalhadas e extras</li>
                  <li>Protocolo único mensal</li>
                  <li>Assinatura digital do funcionário</li>
                  <li>QR Code para verificação de autenticidade</li>
                </ul>
              </div>

              <div className="bg-pink-50 p-4 rounded-lg">
                <h4 className="font-semibold text-pink-800 mb-2">
                  Arquivo Eletrônico de Jornada (AEJ)
                </h4>
                <p className="text-sm text-pink-700 mb-2">
                  Para fins de fiscalização, o sistema pode exportar dados no
                  formato AEJ conforme especificação do MTE, contendo:
                </p>
                <ul className="text-sm text-pink-700 space-y-1 list-disc pl-6">
                  <li>Todos os registros de ponto em formato estruturado</li>
                  <li>Hash de verificação para integridade</li>
                  <li>Metadados completos de cada registro</li>
                  <li>Protocolo de rastreabilidade</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.7 Armazenamento e Backup
            </h3>
            <p className="mb-4 text-sm">
              Todos os dados são armazenados em servidores seguros com:
            </p>
            <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
              <li>
                <strong>Banco de Dados PostgreSQL:</strong> Dados estruturados
                com backup automático diário
              </li>
              <li>
                <strong>AWS S3:</strong> Imagens de selfies armazenadas com
                criptografia server-side (SSE)
              </li>
              <li>
                <strong>Retenção:</strong> Dados mantidos pelo prazo legal
                mínimo de 5 anos conforme CLT
              </li>
              <li>
                <strong>Backup Incremental:</strong> Backups automáticos a cada
                6 horas com retenção de 30 dias
              </li>
              <li>
                <strong>Backup Completo:</strong> Backup semanal completo
                mantido por 5 anos
              </li>
              <li>
                <strong>Georedundância:</strong> Dados replicados em múltiplas
                zonas geográficas
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4.8 Aplicativo Mobile de Administração (KL Administração)
            </h2>

            <h3 className="text-xl font-medium mb-3">4.8.1 Descrição do App</h3>
            <p className="mb-4">
              O aplicativo mobile <strong>&quot;KL Administração&quot;</strong> é uma
              extensão do sistema ERP KL destinado a administradores, supervisores,
              gestores e outros profissionais autorizados para gestão de processos
              administrativos, checklists, pontos, incidentes e avaliações.
            </p>

            <h3 className="text-xl font-medium mb-3">
              4.8.2 Permissões e Funcionalidades do App
            </h3>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                Permissões Solicitadas
              </h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>
                  • <strong>Câmera:</strong> O app solicita permissão de acesso à
                  câmera para captura de fotos em checklists, registro de incidentes
                  e outras funcionalidades que requerem evidência fotográfica.
                </li>
                <li>
                  • <strong>Localização (GPS):</strong> O app solicita permissão de
                  localização para registrar a posição geográfica onde as atividades
                  foram realizadas (checklists, incidentes, etc.), garantindo
                  rastreabilidade e verificação de autenticidade.
                </li>
                <li>
                  • <strong>Armazenamento Seguro:</strong> O app utiliza armazenamento
                  seguro do dispositivo (SecureStore) para armazenar credenciais de
                  autenticação (tokens JWT) de forma criptografada.
                </li>
                <li>
                  • <strong>Rede/Internet:</strong> O app requer conexão à internet
                  para sincronizar dados com o servidor e realizar operações em
                  tempo real.
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.8.3 Dados Coletados pelo App Mobile
            </h3>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-semibold mb-2">Dados de Autenticação</h4>
                <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
                  <li>Email do usuário (administrador/supervisor)</li>
                  <li>Token de autenticação JWT (armazenado localmente)</li>
                  <li>Informações de perfil (role, nome, unidade, grupo)</li>
                  <li>Data e hora do último acesso</li>
                </ul>

                <h4 className="font-semibold mb-2">Dados de Localização</h4>
                <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
                  <li>Coordenadas GPS (latitude e longitude)</li>
                  <li>Precisão do GPS em metros</li>
                  <li>Timestamp da captura de localização</li>
                  <li>Endereço aproximado (geocodificação reversa)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Dados de Mídia (Fotos)</h4>
                <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
                  <li>Fotografias capturadas via câmera do dispositivo</li>
                  <li>Metadados EXIF das imagens (data, hora, localização se habilitada)</li>
                  <li>URL de armazenamento seguro (AWS S3)</li>
                  <li>Hash da imagem para verificação de integridade</li>
                </ul>

                <h4 className="font-semibold mb-2">Dados de Dispositivo</h4>
                <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
                  <li>Identificador único do dispositivo (Device ID)</li>
                  <li>Modelo do dispositivo</li>
                  <li>Sistema operacional e versão</li>
                  <li>Versão do aplicativo</li>
                  <li>Endereço IP (quando se conecta ao servidor)</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.8.4 Finalidade do Tratamento de Dados no App
            </h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <strong>Gestão de Checklists:</strong> Permitir que supervisores
                respondam checklists, anexem fotos e registrem localização para
                comprovação de execução de tarefas.
              </li>
              <li>
                <strong>Gestão de Pontos:</strong> Visualizar e gerenciar registros
                de ponto dos colaboradores, adicionar batidas manualmente quando
                necessário, e exportar folhas de ponto em PDF.
              </li>
              <li>
                <strong>Registro de Incidentes:</strong> Registrar incidentes com
                fotos, localização e descrição detalhada para rastreabilidade.
              </li>
              <li>
                <strong>Avaliações:</strong> Realizar avaliações de colaboradores ou
                processos com evidências fotográficas e geolocalização.
              </li>
              <li>
                <strong>Autenticação Segura:</strong> Garantir que apenas usuários
                autorizados tenham acesso às funcionalidades administrativas do
                sistema.
              </li>
              <li>
                <strong>Rastreabilidade:</strong> Registrar onde e quando as ações
                administrativas foram realizadas, garantindo auditoria completa.
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-3">
              4.8.5 Armazenamento e Transmissão de Dados
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <ul className="text-sm text-green-700 space-y-2">
                <li>
                  • <strong>Armazenamento Local:</strong> Tokens de autenticação são
                  armazenados localmente no dispositivo usando SecureStore (iOS
                  Keychain / Android Keystore), garantindo criptografia de nível
                  nativo do sistema operacional.
                </li>
                <li>
                  • <strong>Transmissão Segura:</strong> Todas as comunicações entre
                  o app e o servidor são realizadas via HTTPS (TLS 1.3), garantindo
                  criptografia em trânsito.
                </li>
                <li>
                  • <strong>Armazenamento em Nuvem:</strong> Fotos e dados coletados
                  são enviados para o servidor e armazenados de forma criptografada
                  no AWS S3, seguindo as mesmas práticas de segurança do sistema web.
                </li>
                <li>
                  • <strong>Dados Temporários:</strong> Dados de rascunho podem ser
                  armazenados temporariamente no dispositivo até serem enviados ao
                  servidor, após o que são removidos do dispositivo.
                </li>
                <li>
                  • <strong>Logout Automático:</strong> O app implementa logout
                  automático após período de inatividade ou quando o token expira,
                  removendo credenciais locais.
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.8.6 Base Legal para Tratamento
            </h3>
            <p className="mb-4">
              O tratamento de dados no app mobile segue as mesmas bases legais do
              sistema principal:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>
                <strong>Obrigação Legal (Art. 7º, II da LGPD):</strong> Cumprimento
                de obrigações trabalhistas e regulamentares.
              </li>
              <li>
                <strong>Interesse Legítimo (Art. 7º, IX da LGPD):</strong> Gestão
                eficiente de processos administrativos e operacionais.
              </li>
              <li>
                <strong>Exercício Regular de Direitos (Art. 7º, VI da LGPD):</strong>
                Exercício de direitos em contratos e processos administrativos.
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-3">
              4.8.7 Retenção de Dados do App
            </h3>
            <ul className="list-disc pl-6 mb-4 space-y-1 text-sm">
              <li>
                <strong>Tokens de Autenticação:</strong> Armazenados localmente até
                logout do usuário ou expiração do token (geralmente 30 dias).
              </li>
              <li>
                <strong>Dados Enviados ao Servidor:</strong> Seguem a mesma política
                de retenção do sistema principal (5 anos para dados trabalhistas,
                conforme CLT).
              </li>
              <li>
                <strong>Rascunhos Locais:</strong> Armazenados temporariamente no
                dispositivo e removidos após sincronização bem-sucedida ou após 30
                dias de inatividade.
              </li>
            </ul>

            <h3 className="text-xl font-medium mb-3">
              4.8.8 Segurança Específica do App Mobile
            </h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <ul className="text-sm text-purple-700 space-y-2">
                <li>
                  • <strong>SecureStore:</strong> Uso de armazenamento seguro
                  nativo do sistema operacional para credenciais, protegido por
                  biometria ou PIN do dispositivo quando disponível.
                </li>
                <li>
                  • <strong>Validação de Certificado SSL:</strong> O app valida
                  certificados SSL do servidor para prevenir ataques man-in-the-middle.
                </li>
                <li>
                  • <strong>Controle de Versão:</strong> O app pode exigir versão
                  mínima para garantir que atualizações de segurança sejam aplicadas.
                </li>
                <li>
                  • <strong>Blur de Tela em Background:</strong> O app pode
                  implementar proteção de tela quando em segundo plano para evitar
                  visualização de dados sensíveis.
                </li>
                <li>
                  • <strong>Logout Automático:</strong> Logout automático após
                  período de inatividade configurável para proteger contra acesso
                  não autorizado.
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              4.8.9 Revogação de Permissões
            </h3>
            <p className="mb-4">
              Você pode revogar as permissões do app a qualquer momento através das
              configurações do seu dispositivo:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1 text-sm">
              <li>
                <strong>iOS:</strong> Configurações → Privacidade → Câmera /
                Localização → KL Administração
              </li>
              <li>
                <strong>Android:</strong> Configurações → Apps → KL Administração →
                Permissões
              </li>
            </ul>
            <p className="mb-4 text-sm text-gray-600">
              <strong>Importante:</strong> A revogação de permissões pode limitar ou
              impedir o funcionamento de algumas funcionalidades do app. Por exemplo,
              sem permissão de câmera, não será possível anexar fotos aos checklists
              ou incidentes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Dados Pessoais Coletados
            </h2>

            <p className="mb-4">
              Além dos dados coletados em cada batida de ponto (detalhados na
              seção 4.4), o sistema também armazena informações cadastrais dos
              colaboradores e registros históricos para cumprimento legal e
              gestão de recursos humanos.
            </p>

            <h3 className="text-xl font-medium mb-3">
              5.1 Dados Cadastrais do Colaborador
            </h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Nome completo</li>
              <li>CPF (Cadastro de Pessoa Física) - armazenado como BigInt</li>
              <li>Cargo/função</li>
              <li>Matrícula ou código do colaborador</li>
              <li>Data de admissão</li>
              <li>Unidade de trabalho</li>
              <li>Grupo organizacional</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. Direitos dos Titulares
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                Como Exercer Seus Direitos
              </h3>
              <p className="text-yellow-700 mb-2">
                Para exercer seus direitos, entre em contato:
              </p>
              <ul className="list-disc pl-6 text-yellow-700 mb-4">
                <li>
                  <strong>Rodrigo Madeiro Advogados</strong>
                </li>
                <li>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:juridico@klfacilities.com.br">
                    juridico@klfacilities.com.br
                  </a>
                </li>
                <li>
                  <strong>Telefone:</strong> +55 85 99661-4751
                </li>
                <li>
                  <strong>Endereço:</strong> Rua Cambara, 60.710-410, Cambira,
                  CE
                </li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>📋 Solicitar Exclusão de Dados:</strong>
                </p>
                <p className="text-sm text-blue-700">
                  Para solicitar a exclusão dos seus dados pessoais coletados pelo
                  aplicativo <strong>KL Administração</strong> ou pelo sistema ERP KL,
                  visite nossa página dedicada:{' '}
                  <Link
                    href="/compliance/excluir-dados"
                    className="font-semibold underline hover:text-blue-900"
                  >
                    Solicitar Exclusão de Dados
                  </Link>
                  . Esta página contém instruções passo a passo, informações sobre
                  quais dados podem ser excluídos e períodos de retenção legal.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-medium mb-3">
                  Direitos Garantidos
                </h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Confirmação e Acesso</strong> - Saber se seus dados
                    estão sendo tratados
                  </li>
                  <li>
                    <strong>Correção</strong> - Corrigir dados incorretos ou
                    desatualizados
                  </li>
                  <li>
                    <strong>Anonimização</strong> - Anonimizar dados
                    desnecessários
                  </li>
                  <li>
                    <strong>Bloqueio</strong> - Suspender tratamento de dados
                  </li>
                  <li>
                    <strong>Eliminação</strong> - Excluir dados quando possível
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-3">Mais Direitos</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Portabilidade</strong> - Transferir dados para outro
                    sistema
                  </li>
                  <li>
                    <strong>Informações</strong> - Saber com quem os dados são
                    compartilhados
                  </li>
                  <li>
                    <strong>Revogação</strong> - Revogar consentimento a
                    qualquer momento
                  </li>
                  <li>
                    <strong>Oposição</strong> - Opor-se ao tratamento em casos
                    específicos
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              7. Segurança dos Dados
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
                  <li>• Autenticação multi-fator</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Medidas Administrativas
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Controle rigoroso de acesso</li>
                  <li>• Treinamento da equipe</li>
                  <li>• Auditoria regular</li>
                  <li>• Políticas de segurança</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">
                  Medidas Físicas
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Data centers certificados</li>
                  <li>• Controle de acesso físico</li>
                  <li>• Monitoramento 24/7</li>
                  <li>• Redundância e alta disponibilidade</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. Retenção de Dados
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Tipo de Dados
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Prazo de Retenção
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Base Legal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Dados de ponto
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">5 anos</td>
                    <td className="px-4 py-2 text-sm text-gray-900">CLT</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Logs de auditoria
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">3 anos</td>
                    <td className="px-4 py-2 text-sm text-gray-900">LGPD</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Dados de backup
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">5 anos</td>
                    <td className="px-4 py-2 text-sm text-gray-900">CLT</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Dados anonimizados
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Indefinidamente
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">LGPD</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              9. Contatos e Reclamações
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">
                  Dúvidas e Solicitações
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>Email:</strong> contato@klfacilities.com.br
                  </li>
                  <li>
                    <strong>Telefone:</strong> +55 41 98402-2907
                  </li>
                  <li>
                    <strong>Endereço:</strong> Rua Cambara, 60.710-410, Cambira,
                    CE
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-red-800">
                  Reclamações
                </h3>
                <p className="text-sm text-red-700 mb-2">
                  Para reclamações sobre tratamento de dados:
                </p>
                <ul className="space-y-1 text-sm text-red-700">
                  <li>
                    • <strong>ANPD:</strong> [link para portal da ANPD]
                  </li>
                  <li>
                    • <strong>Procon:</strong> [link para Procon local]
                  </li>
                  <li>
                    • <strong>Ministério Público:</strong> [link para MP local]
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              10. Legislação Aplicável
            </h2>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-blue-800 mb-2">
                Esta política está em conformidade com:
              </p>
              <ul className="list-disc pl-6 text-blue-700 space-y-1">
                <li>
                  <strong>Lei Geral de Proteção de Dados (LGPD)</strong> - Lei
                  nº 13.709/2018
                </li>
                <li>
                  <strong>Consolidação das Leis do Trabalho (CLT)</strong> -
                  Decreto-Lei nº 5.452/1943
                </li>
                <li>
                  <strong>Portaria nº 671/2021</strong> - Ministério do Trabalho
                  e Previdência
                </li>
                <li>
                  <strong>Decreto nº 10.854/2021</strong> - Controles de Jornada
                </li>
              </ul>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Última atualização:</strong> 29 de dezembro de 2025 |{' '}
                  <strong>Versão:</strong> 1.1.0
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Esta política de privacidade foi elaborada em conformidade com
                  a LGPD e as melhores práticas de proteção de dados pessoais.
                </p>
              </div>
              <div className="text-right">
                <Link
                  href="/compliance/conformidade"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ver Relatório Técnico Completo →
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
