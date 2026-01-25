import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Camera, MapPin, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guia: Como Usar o App de Ponto - KL Facilities',
  description: 'Guia completo para supervisores ensinarem colaboradores a usar o aplicativo de ponto eletrônico',
};

export default function GuiaColaboradorPontoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Guia: Como Usar o App de Ponto
            </h1>
            <p className="text-gray-600">
              Guia completo para supervisores ensinarem colaboradores a registrar ponto no aplicativo móvel
            </p>
          </div>

          {/* Índice */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="font-semibold text-blue-900 mb-2">Índice do Guia</h2>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li><a href="#login" className="hover:underline">1. Como fazer login</a></li>
              <li><a href="#registrar" className="hover:underline">2. Como registrar ponto</a></li>
              <li><a href="#selfie" className="hover:underline">3. Por que preciso tirar selfie?</a></li>
              <li><a href="#localizacao" className="hover:underline">4. Por que preciso de localização?</a></li>
              <li><a href="#offline" className="hover:underline">5. Funcionamento offline</a></li>
              <li><a href="#dicas" className="hover:underline">6. Dicas importantes</a></li>
            </ul>
          </div>

          {/* Seção 1: Login */}
          <section id="login" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Como Fazer Login</h2>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Passo 1: Abra o aplicativo</p>
                  <p className="text-gray-700 text-sm">
                    O colaborador deve abrir o aplicativo &quot;KL Colaboradores&quot; no celular.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Passo 2: Digite o CPF</p>
                  <p className="text-gray-700 text-sm">
                    No campo de login, digite apenas os números do CPF (sem pontos ou traços). 
                    O aplicativo formata automaticamente.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Passo 3: Clique em &quot;Entrar&quot;</p>
                  <p className="text-gray-700 text-sm">
                    Após digitar o CPF completo (11 dígitos), clique no botão &quot;Entrar&quot;. 
                    Se o CPF estiver cadastrado no sistema, o colaborador será direcionado para a tela de ponto.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-900 mb-1">Importante</p>
                    <p className="text-yellow-800 text-sm">
                      Se o CPF não for encontrado, o colaborador deve entrar em contato com o RH 
                      para verificar o cadastro no sistema.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Seção 2: Registrar Ponto */}
          <section id="registrar" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Como Registrar Ponto</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Passo 1: Selecione o tipo de ponto</p>
                  <p className="text-gray-700 text-sm mb-2">
                    Na tela principal, o colaborador verá os seguintes tipos de marcação:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                    <li><strong>Entrada</strong> - Primeira marcação do dia</li>
                    <li><strong>Início Intervalo</strong> - Quando sair para almoço/intervalo</li>
                    <li><strong>Fim Intervalo</strong> - Quando retornar do almoço/intervalo</li>
                    <li><strong>Saída</strong> - Última marcação do dia</li>
                    <li><strong>Hora Extra - Início</strong> - Início de hora extra</li>
                    <li><strong>Hora Extra - Saída</strong> - Fim de hora extra</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Passo 2: Permissões necessárias</p>
                  <p className="text-gray-700 text-sm">
                    Ao selecionar um tipo de ponto, o aplicativo solicitará permissões para:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2 mt-1">
                    <li>Acessar a câmera (para tirar selfie)</li>
                    <li>Acessar a localização GPS</li>
                  </ul>
                  <p className="text-gray-700 text-sm mt-2">
                    <strong>É obrigatório permitir ambas as permissões</strong> para registrar o ponto.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Passo 3: Tire a selfie</p>
                  <p className="text-gray-700 text-sm">
                    O colaborador deve posicionar o rosto dentro do círculo na tela e tirar a foto. 
                    A selfie é obrigatória e serve para comprovar a identidade.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">Passo 4: Confirme o registro</p>
                  <p className="text-gray-700 text-sm">
                    Após tirar a selfie, o aplicativo captura automaticamente a localização GPS 
                    e registra o ponto. Uma mensagem de sucesso será exibida.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Dica</p>
                    <p className="text-blue-800 text-sm">
                      O aplicativo mostra quais tipos de ponto já foram registrados hoje. 
                      Não é possível registrar o mesmo tipo duas vezes no mesmo dia.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Seção 3: Selfie */}
          <section id="selfie" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Por que Preciso Tirar Selfie?</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                A selfie é uma medida de segurança obrigatória para garantir que o ponto está sendo 
                registrado pela pessoa correta. Isso atende aos requisitos legais da Portaria 671/2021 
                do Ministério do Trabalho.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Segurança e Conformidade</p>
                    <p className="text-gray-700 text-sm">
                      A foto comprova a identidade do colaborador no momento do registro, 
                      evitando fraudes e garantindo a autenticidade do ponto.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Requisito Legal</p>
                    <p className="text-gray-700 text-sm">
                      A Portaria 671/2021 exige identificação biométrica ou fotográfica 
                      para registro de ponto eletrônico.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Dica:</strong> Certifique-se de estar em um local com boa iluminação 
                  e posicione o rosto dentro do círculo indicado na tela para uma foto de qualidade.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 4: Localização */}
          <section id="localizacao" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Por que Preciso de Localização?</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                O aplicativo precisa acessar a localização GPS do celular para registrar onde 
                o ponto está sendo marcado. Isso também é um requisito de segurança.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Validação de Localização</p>
                    <p className="text-gray-700 text-sm">
                      O sistema valida se o colaborador está dentro da área permitida 
                      (geofence) da unidade de trabalho.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Prevenção de Fraudes</p>
                    <p className="text-gray-700 text-sm">
                      A localização garante que o ponto está sendo registrado no local correto, 
                      evitando marcações remotas indevidas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Importante:</strong> Se o colaborador estiver fora da área permitida, 
                  o sistema pode bloquear o registro. Nesse caso, entre em contato com o supervisor.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 5: Offline */}
          <section id="offline" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <WifiOff className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Funcionamento Offline</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                O aplicativo funciona mesmo sem internet! Os pontos registrados offline são 
                salvos localmente e sincronizados automaticamente quando a conexão for restabelecida.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Registro Offline</p>
                    <p className="text-gray-700 text-sm">
                      Se não houver internet no momento do registro, o ponto será salvo na fila 
                      local do celular. O aplicativo mostra quantos pontos estão pendentes de sincronização.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Wifi className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Sincronização Automática</p>
                    <p className="text-gray-700 text-sm">
                      Quando a internet voltar, o aplicativo sincroniza automaticamente todos os 
                      pontos pendentes. O colaborador verá um indicador de &quot;Sincronizando...&quot; 
                      no topo da tela.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Histórico Local</p>
                    <p className="text-gray-700 text-sm">
                      O colaborador pode verificar o histórico de pontos registrados no próprio aplicativo, 
                      mesmo sem internet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Dica:</strong> Mesmo offline, o colaborador pode registrar pontos normalmente. 
                  Não é necessário esperar ter internet para marcar o ponto.
                </p>
              </div>
            </div>
          </section>

          {/* Seção 6: Dicas */}
          <section id="dicas" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Dicas Importantes</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900 mb-2">✓ Permissões do Sistema</p>
                <p className="text-gray-700 text-sm">
                  Se o aplicativo solicitar permissões de câmera ou localização nas configurações 
                  do celular, o colaborador deve permitir. Sem essas permissões, não é possível 
                  registrar ponto.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900 mb-2">✓ Ordem dos Pontos</p>
                <p className="text-gray-700 text-sm">
                  A ordem correta é: Entrada → Início Intervalo → Fim Intervalo → Saída. 
                  Não é possível registrar intervalo após já ter registrado a saída.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900 mb-2">✓ Qualidade da Selfie</p>
                <p className="text-gray-700 text-sm">
                  Certifique-se de estar em local bem iluminado e posicione o rosto claramente 
                  dentro do círculo. Evite usar máscara ou óculos escuros que dificultem a identificação.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900 mb-2">✓ Problemas com Localização</p>
                <p className="text-gray-700 text-sm">
                  Se o GPS não estiver funcionando, verifique se o GPS do celular está ativado 
                  nas configurações. Em ambientes fechados, pode ser necessário sair para uma área 
                  mais aberta para capturar o sinal.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900 mb-2">✓ Suporte</p>
                <p className="text-gray-700 text-sm">
                  Em caso de dúvidas ou problemas, o colaborador deve entrar em contato com o 
                  supervisor ou com o RH da empresa.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/compliance/privacidade"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Política de Privacidade
                </Link>
                <Link
                  href="/ajuda/fortinet"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ajuda Técnica
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
