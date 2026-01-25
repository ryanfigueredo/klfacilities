'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FortinetHelpPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Acesso Bloqueado pelo Firewall Fortinet
          </h1>
          <p className="text-muted-foreground">
            Se você está tendo problemas para acessar o sistema no WiFi da loja,
            siga estas instruções.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            O domínio klfacilities.com.br pode estar sendo bloqueado pelo
            firewall Fortinet do WiFi da loja. Entre em contato com o
            administrador de rede para liberar o acesso.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Soluções Temporárias</CardTitle>
            <CardDescription>
              Enquanto o acesso não é liberado no firewall, você pode tentar
              estas alternativas:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Usar Dados Móveis</h3>
              <p className="text-sm text-muted-foreground">
                Desative o WiFi e use os dados móveis do seu celular para
                acessar o sistema.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Usar Hotspot Pessoal</h3>
              <p className="text-sm text-muted-foreground">
                Crie um hotspot com seu celular e conecte seu dispositivo nele.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                3. Solicitar Liberação no Firewall
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Entre em contato com o administrador de rede e solicite a
                liberação dos seguintes domínios:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                <li>klfacilities.com.br</li>
                <li>*.klfacilities.com.br</li>
                <li>checklist.klfacilities.com.br</li>
                <li>ponto.klfacilities.com.br</li>
                <li>financeiro.klfacilities.com.br</li>
                <li>colaborador.klfacilities.com.br</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações para o Administrador de Rede</CardTitle>
            <CardDescription>
              Compartilhe estas informações com quem tem acesso ao FortiGate:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">
                Domínios que Precisam ser Permitidos:
              </h3>
              <div className="bg-muted p-4 rounded-md font-mono text-sm">
                <div>*.klfacilities.com.br</div>
                <div>klfacilities.com.br</div>
                <div>checklist.klfacilities.com.br</div>
                <div>ponto.klfacilities.com.br</div>
                <div>financeiro.klfacilities.com.br</div>
                <div>colaborador.klfacilities.com.br</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Portas Necessárias:</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                <li>HTTPS: 443 (obrigatório)</li>
                <li>HTTP: 80 (redirecionamento)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Como Configurar no FortiGate:
              </h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 ml-4">
                <li>
                  Acesse <strong>Security Profiles</strong> →{' '}
                  <strong>Web Filter</strong>
                </li>
                <li>
                  Crie ou edite o perfil de filtro web usado pelo WiFi das lojas
                </li>
                <li>
                  Em <strong>Allow List</strong>, adicione:{' '}
                  <code>*.klfacilities.com.br</code>
                </li>
                <li>Salve e aplique a configuração</li>
              </ol>
            </div>

            <div>
              <Button
                variant="outline"
                onClick={() => {
                  const text = `Domínios para Whitelist no Fortinet:
*.klfacilities.com.br
klfacilities.com.br
checklist.klfacilities.com.br
ponto.klfacilities.com.br
financeiro.klfacilities.com.br
colaborador.klfacilities.com.br

Portas: 443 (HTTPS), 80 (HTTP)

Configuração:
1. Security Profiles → Web Filter
2. Editar perfil do WiFi das lojas
3. Allow List → Adicionar *.klfacilities.com.br
4. Salvar e aplicar`;
                  navigator.clipboard.writeText(text);
                  alert('Informações copiadas para a área de transferência!');
                }}
              >
                Copiar Informações
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Se você é supervisor e precisa de acesso urgente, entre em
              contato:
            </p>
            <div className="space-y-2">
              <div>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:suporte@klfacilities.com.br"
                  className="text-primary hover:underline"
                >
                  suporte@klfacilities.com.br
                </a>
              </div>
              <div>
                <strong>Assunto:</strong> Liberação de acesso no WiFi da loja -
                Fortinet
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
