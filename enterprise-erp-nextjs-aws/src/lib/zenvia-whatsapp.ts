// Exemplo de implementação com Zenvia WhatsApp API
// Mais simples e estável que a API Meta direta

interface ZenviaConfig {
  apiKey: string;
  baseUrl: string;
}

interface ZenviaMessage {
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

export class ZenviaWhatsAppService {
  private config: ZenviaConfig;

  constructor(config: ZenviaConfig) {
    this.config = config;
  }

  async sendMessage(message: ZenviaMessage) {
    try {
      console.log('Zenvia WhatsApp: Enviando mensagem para:', message.to);
      
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Zenvia WhatsApp: Mensagem enviada com sucesso:', data);
        return {
          success: true,
          messageId: data.id,
        };
      } else {
        console.error('Zenvia WhatsApp Error:', data);
        return {
          success: false,
          error: data.message || 'Unknown error occurred',
        };
      }
    } catch (error) {
      console.error('Zenvia WhatsApp: Erro na requisição:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Exemplo de envio de mensagem de texto simples
  async sendTextMessage(to: string, text: string) {
    return this.sendMessage({
      to,
      type: 'text',
      text: {
        body: text,
      },
    });
  }

  // Exemplo de envio de template (para mensagens estruturadas)
  async sendTemplateMessage(to: string, templateName: string, parameters: string[]) {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'pt_BR',
        },
        components: [
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param,
            })),
          },
        ],
      },
    });
  }
}

// Configuração de exemplo
export const zenviaConfig: ZenviaConfig = {
  apiKey: process.env.ZENVIA_WHATSAPP_API_KEY || '',
  baseUrl: 'https://api.zenvia.com/v2/channels/whatsapp',
};

// Instância global do serviço
export const zenviaWhatsApp = new ZenviaWhatsAppService(zenviaConfig);
