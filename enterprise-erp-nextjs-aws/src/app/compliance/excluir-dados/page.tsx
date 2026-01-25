import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Solicitação de Exclusão de Dados - KL Facilities',
  description:
    'Solicite a exclusão dos seus dados pessoais coletados pelo aplicativo KL Administração ou pelo sistema ERP KL.',
};

export default function ExcluirDadosPage() {
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
            Solicitação de Exclusão de Dados
          </h1>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>Última atualização:</strong> 29 de dezembro de 2025
              <br />
              <strong>Aplicativo:</strong> KL Administração
              <br />
              <strong>Desenvolvedor:</strong> KL Facilities
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Como Solicitar a Exclusão dos Seus Dados
            </h2>

            <p className="mb-4">
              Você tem o direito de solicitar a exclusão dos seus dados pessoais
              coletados pelo aplicativo <strong>KL Administração</strong> ou pelo
              sistema ERP KL, conforme garantido pela Lei Geral de Proteção de
              Dados (LGPD).
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                ⚠️ Importante - Limitações à Exclusão
              </h3>
              <p className="text-yellow-700 mb-3">
                A exclusão de dados pode estar sujeita a limitações legais e
                regulamentares:
              </p>
              <ul className="list-disc pl-6 text-yellow-700 space-y-1 text-sm">
                <li>
                  <strong>Dados Trabalhistas:</strong> Registros de ponto e
                  informações trabalhistas devem ser mantidos por período mínimo de
                  5 anos conforme exigência da CLT (Consolidação das Leis do
                  Trabalho).
                </li>
                <li>
                  <strong>Obrigações Fiscais:</strong> Alguns dados podem ser
                  necessários para cumprimento de obrigações fiscais e tributárias.
                </li>
                <li>
                  <strong>Processos Judiciais:</strong> Dados relacionados a
                  processos judiciais em andamento não podem ser excluídos.
                </li>
                <li>
                  <strong>Contratos Ativos:</strong> Dados necessários para
                  execução de contratos em vigor não podem ser excluídos até o
                  término do contrato.
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-medium mb-3">
              Passo a Passo para Solicitar Exclusão
            </h3>

            <ol className="list-decimal pl-6 mb-6 space-y-4">
              <li>
                <strong>Identifique os Dados que Deseja Excluir</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Revise a{' '}
                  <Link
                    href="/compliance/privacidade"
                    className="text-blue-600 hover:underline"
                  >
                    Política de Privacidade
                  </Link>{' '}
                  para entender quais dados são coletados e armazenados.
                </p>
              </li>

              <li>
                <strong>Entre em Contato Conosco</strong>
                <p className="text-sm text-gray-600 mt-1 mb-2">
                  Envie um email para o endereço abaixo com o assunto &quot;Solicitação
                  de Exclusão de Dados&quot;:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                  <p className="text-sm">
                    <strong>Email:</strong>{' '}
                    <a
                      href="mailto:juridico@klfacilities.com.br?subject=Solicitação de Exclusão de Dados"
                      className="text-blue-600 hover:underline"
                    >
                      juridico@klfacilities.com.br
                    </a>
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Telefone:</strong> +55 85 99661-4751
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Endereço:</strong> Rua Cambara, 60.710-410, Cambira, CE
                  </p>
                </div>
              </li>

              <li>
                <strong>Forneça as Informações Necessárias</strong>
                <p className="text-sm text-gray-600 mt-1 mb-2">
                  No seu email, inclua as seguintes informações:
                </p>
                <ul className="list-disc pl-6 text-sm text-gray-600 space-y-1">
                  <li>Nome completo</li>
                  <li>Email cadastrado no sistema</li>
                  <li>CPF (para identificação)</li>
                  <li>Descrição dos dados que deseja excluir</li>
                  <li>Motivo da solicitação (opcional, mas ajuda na análise)</li>
                  <li>
                    Confirmação de que você é o titular dos dados ou tem
                    autorização para representá-lo
                  </li>
                </ul>
              </li>

              <li>
                <strong>Confirmação de Identidade</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Para proteger seus dados, solicitaremos confirmação de
                  identidade antes de processar a exclusão. Isso pode incluir
                  verificação por email ou apresentação de documento de
                  identidade.
                </p>
              </li>

              <li>
                <strong>Análise e Processamento</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Analisaremos sua solicitação e verificaremos se há limitações
                  legais que impeçam a exclusão total ou parcial dos dados. Você
                  será informado sobre o resultado em até 15 dias úteis.
                </p>
              </li>

              <li>
                <strong>Confirmação de Exclusão</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Após processar a exclusão (ou aplicar limitações quando
                  necessário), você receberá um email de confirmação detalhando
                  quais dados foram excluídos e quais foram mantidos por
                  obrigação legal.
                </p>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Tipos de Dados que Podem Ser Excluídos
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">
                  ✅ Dados Excluíveis (Após Verificação)
                </h3>
                <ul className="text-sm text-green-700 space-y-1 list-disc pl-6">
                  <li>Dados de perfil de acesso (após término do vínculo)</li>
                  <li>Logs de acesso pessoais (após 3 anos)</li>
                  <li>Dados de dispositivo pessoal</li>
                  <li>Tokens de autenticação (removidos no logout)</li>
                  <li>Dados de rascunho locais do app</li>
                  <li>Preferências pessoais de interface</li>
                </ul>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">
                  ⚠️ Dados Sujeitos a Retenção Legal
                </h3>
                <ul className="text-sm text-red-700 space-y-1 list-disc pl-6">
                  <li>
                    <strong>Registros de ponto:</strong> Retidos por 5 anos (CLT)
                  </li>
                  <li>
                    <strong>Dados trabalhistas:</strong> Retidos por 5 anos (CLT)
                  </li>
                  <li>
                    <strong>Logs de auditoria:</strong> Retidos por 3 anos (LGPD)
                  </li>
                  <li>
                    <strong>Dados fiscais:</strong> Retidos conforme legislação
                    tributária
                  </li>
                  <li>
                    <strong>Dados contratuais:</strong> Retidos até término do
                    contrato + 5 anos
                  </li>
                  <li>
                    <strong>Dados processuais:</strong> Retidos durante
                    processamento judicial
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-sm text-blue-800">
                <strong>Nota Importante:</strong> Mesmo quando dados não podem ser
                completamente excluídos por obrigação legal, podemos anonimizar ou
                pseudonimizar dados não essenciais para reduzir a identificação
                pessoal, quando tecnicamente viável e permitido pela legislação.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Períodos de Retenção Adicional
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Tipo de Dados
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Período de Retenção Mínimo
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Base Legal
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Exclusão Após Período
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Registros de ponto
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">5 anos</td>
                    <td className="px-4 py-2 text-sm text-gray-900">CLT Art. 74</td>
                    <td className="px-4 py-2 text-sm text-green-600">
                      ✅ Sim, após 5 anos
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Dados trabalhistas
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">5 anos</td>
                    <td className="px-4 py-2 text-sm text-gray-900">CLT</td>
                    <td className="px-4 py-2 text-sm text-green-600">
                      ✅ Sim, após 5 anos
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Logs de auditoria
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">3 anos</td>
                    <td className="px-4 py-2 text-sm text-gray-900">LGPD</td>
                    <td className="px-4 py-2 text-sm text-green-600">
                      ✅ Sim, após 3 anos
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Dados fiscais
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">5 anos</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Legislação Tributária
                    </td>
                    <td className="px-4 py-2 text-sm text-green-600">
                      ✅ Sim, após 5 anos
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Dados contratuais
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Término do contrato + 5 anos
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">CLT</td>
                    <td className="px-4 py-2 text-sm text-green-600">
                      ✅ Sim, após término + 5 anos
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Dados de perfil do app
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Durante uso + 30 dias
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">LGPD</td>
                    <td className="px-4 py-2 text-sm text-green-600">
                      ✅ Sim, após término do vínculo
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Informações Adicionais
            </h2>

            <div className="bg-gray-50 p-6 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-3">
                Tempo de Resposta
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                Nos comprometemos a responder sua solicitação em até{' '}
                <strong>15 dias úteis</strong>, conforme estabelecido pela LGPD.
                Casos complexos podem levar até 30 dias, mas você será informado
                sobre a prorrogação.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-3">
                Direitos Adicionais
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                Além da exclusão, você também tem direito a:
              </p>
              <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
                <li>
                  <strong>Acesso:</strong> Saber quais dados temos sobre você
                </li>
                <li>
                  <strong>Correção:</strong> Corrigir dados incorretos ou
                  desatualizados
                </li>
                <li>
                  <strong>Portabilidade:</strong> Receber seus dados em formato
                  estruturado
                </li>
                <li>
                  <strong>Oposição:</strong> Opor-se ao tratamento em casos
                  específicos
                </li>
              </ul>
              <p className="text-sm text-gray-700 mt-2">
                Para exercer esses direitos, entre em contato através dos mesmos
                canais acima.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                Dúvidas ou Reclamações
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                Se você tiver dúvidas sobre o processo de exclusão ou não estiver
                satisfeito com nossa resposta, você pode:
              </p>
              <ul className="list-disc pl-6 text-sm text-blue-700 space-y-1">
                <li>
                  Entrar em contato com nosso Encarregado de Dados (DPO):{' '}
                  <strong>Ryan Figueredo</strong> -{' '}
                  <a
                    href="mailto:ryan@dmtn.com.br"
                    className="underline hover:text-blue-900"
                  >
                    ryan@dmtn.com.br
                  </a>
                </li>
                <li>
                  Apresentar reclamação à Autoridade Nacional de Proteção de Dados
                  (ANPD)
                </li>
                <li>
                  Consultar nossa{' '}
                  <Link
                    href="/compliance/privacidade"
                    className="underline hover:text-blue-900"
                  >
                    Política de Privacidade completa
                  </Link>{' '}
                  para mais informações
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                📧 Formulário de Contato
              </h3>
              <p className="text-sm text-green-700 mb-4">
                Para facilitar sua solicitação, envie um email diretamente para:
              </p>
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <p className="text-sm mb-2">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:juridico@klfacilities.com.br?subject=Solicitação de Exclusão de Dados - KL Administração&body=Olá,%0D%0A%0D%0AGostaria de solicitar a exclusão dos meus dados pessoais coletados pelo aplicativo KL Administração ou pelo sistema ERP KL.%0D%0A%0D%0ADados para identificação:%0D%0A- Nome completo:%0D%0A- Email cadastrado:%0D%0A- CPF:%0D%0A%0D%0ADados que desejo excluir:%0D%0A%0D%0AMotivo da solicitação (opcional):%0D%0A%0D%0AAtenciosamente,"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    juridico@klfacilities.com.br
                  </a>
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  (Clique no email para abrir seu cliente de email com um modelo
                  pré-preenchido)
                </p>
              </div>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Última atualização:</strong> 29 de dezembro de 2025
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Esta página foi elaborada em conformidade com a LGPD e as
                  diretrizes do Google Play Store.
                </p>
              </div>
              <div className="text-right space-x-4">
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
