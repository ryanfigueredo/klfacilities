/**
 * Evolution API WhatsApp Service
 * Integração com Evolution API (Open Source) para envio de mensagens WhatsApp
 *
 * Documentação: https://doc.evolution-api.com/
 */

interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'evolution-api';
}

class EvolutionAPIWhatsAppService {
  private config: EvolutionConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.EVOLUTION_API_URL || '',
      apiKey: process.env.EVOLUTION_API_KEY || '',
      instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'default',
    };

    if (!this.config.baseUrl || !this.config.apiKey) {
      console.warn('  Evolution API: Variáveis de ambiente não configuradas.');
      console.warn('   Configure: EVOLUTION_API_URL, EVOLUTION_API_KEY');
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.apiKey);
  }

  /**
   * Formata número de telefone para o padrão Evolution API
   * @param phone - Número de telefone (ex: 21997624873, 5521997624873, +5521997624873)
   * @returns Número formatado (ex: 5521997624873)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleanPhone = phone.replace(/\D/g, '');

    // Se não começar com 55 (Brasil), adiciona
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }

    // Evolution API usa apenas números: 5521997624873
    return cleanPhone;
  }

  /**
   * Envia mensagem de texto via Evolution API
   * @param to - Número de destino
   * @param message - Mensagem de texto
   * @param instanceName - Nome da instância (opcional, usa a padrão se não informado)
   */
  async sendMessage(
    to: string,
    message: string,
    instanceName?: string
  ): Promise<SendMessageResponse> {
    if (!this.isConfigured()) {
      console.error('Evolution API não configurada');
      return {
        success: false,
        error:
          'Evolution API não configurada. Verifique as variáveis de ambiente.',
        provider: 'evolution-api',
      };
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);
      const instance = instanceName || this.config.instanceName;
      const url = `${this.config.baseUrl}/message/sendText/${instance}`;

      console.log('📱 Evolution API: Enviando mensagem');
      console.log(`   Instância: ${instance}`);
      console.log(`   Para: ${to} → ${formattedNumber}`);
      console.log(`   URL: ${url}`);

      const payload = {
        number: formattedNumber,
        textMessage: {
          text: message,
        },
      };

      console.log('   Payload:', JSON.stringify(payload, null, 2));

      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.config.apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Verificar se a resposta é JSON válido
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('   Response não é JSON:', text);
          throw new Error(
            `Resposta inválida do servidor: ${text.substring(0, 100)}`
          );
        }

        const data = await response.json();

        console.log('   Response status:', response.status);
        console.log('   Response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        // Evolution API retorna estrutura com key.id
        const messageId = data.key?.id || data.messageId;

        // Registrar log de mensagem (não bloquear se falhar)
        try {
          const { logWhatsAppMessage } = await import('./message-logs');
          await logWhatsAppMessage({
            to: formattedNumber,
            message,
            messageId,
            provider: 'evolution-api',
            success: true,
          });
        } catch (logError) {
          console.error('Erro ao registrar log de mensagem:', logError);
        }

        return {
          success: true,
          messageId,
          provider: 'evolution-api',
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout ao enviar mensagem (30s)');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Evolution API Error:', error);

      // Registrar log de erro (não bloquear se falhar)
      try {
        const { logWhatsAppMessage } = await import('./message-logs');
        await logWhatsAppMessage({
          to: to,
          message,
          provider: 'evolution-api',
          success: false,
          error: error.message || 'Erro desconhecido ao enviar mensagem',
        });
      } catch (logError) {
        console.error('Erro ao registrar log de mensagem:', logError);
      }

      return {
        success: false,
        error: error.message || 'Erro desconhecido ao enviar mensagem',
        provider: 'evolution-api',
      };
    }
  }

  /**
   * Verifica status da instância
   */
  async getSessionStatus(): Promise<any> {
    if (!this.isConfigured()) {
      return { error: 'Evolution API não configurada' };
    }

    try {
      const url = `${this.config.baseUrl}/instance/connectionState/${this.config.instanceName}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: this.config.apiKey,
        },
      });

      return await response.json();
    } catch (error: any) {
      console.error('Erro ao verificar status da instância:', error);
      return { error: error.message };
    }
  }
}

export const evolutionAPIService = new EvolutionAPIWhatsAppService();
