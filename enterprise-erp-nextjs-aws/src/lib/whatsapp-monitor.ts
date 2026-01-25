import nodemailer from 'nodemailer';

interface WhatsAppMonitorConfig {
  wahaUrl: string;
  wahaApiKey: string;
  sessionName: string;
  alertEmail: string;
  checkIntervalMinutes: number;
}

class WhatsAppMonitor {
  private config: WhatsAppMonitorConfig;
  private lastStatus: string = 'UNKNOWN';
  private alertSent: boolean = false;

  constructor() {
    this.config = {
      wahaUrl: process.env.EVOLUTION_API_URL || '',
      wahaApiKey: process.env.EVOLUTION_API_KEY || '',
      sessionName: process.env.EVOLUTION_INSTANCE_NAME || 'default',
      alertEmail: process.env.WHATSAPP_ALERT_EMAIL || '',
      checkIntervalMinutes: 5,
    };
  }

  async checkStatus(): Promise<{ status: string; healthy: boolean }> {
    try {
      const response = await fetch(
        `${this.config.wahaUrl}/api/sessions/${this.config.sessionName}`,
        {
          headers: {
            'X-Api-Key': this.config.wahaApiKey,
          },
        }
      );

      const data = await response.json();
      const status = data.status || 'UNKNOWN';

      return {
        status,
        healthy: status === 'WORKING',
      };
    } catch (error) {
      console.error('Erro ao verificar status WAHA:', error);
      return {
        status: 'ERROR',
        healthy: false,
      };
    }
  }

  async sendEmailAlert(status: string): Promise<void> {
    if (!this.config.alertEmail || this.alertSent) {
      return;
    }

    try {
      // Configurar transportador de email (usando serviço de email da aplicação)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: this.config.alertEmail,
        subject: '🚨 WhatsApp Desconectado - KL Facilities',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">🚨 WhatsApp Desconectado!</h2>
            
            <p>O WhatsApp Business da KL Facilities foi desconectado e precisa ser reconectado.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Status atual:</strong> ${status}<br>
              <strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}<br>
              <strong>Número:</strong> (21) 99762-4873
            </div>
            
            <h3>📱 Como Reconectar:</h3>
            <ol>
              <li>Acesse: <a href="${this.config.wahaUrl}/manager/${this.config.sessionName}">${this.config.wahaUrl}/manager/${this.config.sessionName}</a></li>
              <li>Login: <code>admin</code> / Senha no arquivo seguro</li>
              <li>Na tabela "Sessions", linha "${this.config.sessionName}"</li>
              <li>Clique no botão laranja <strong>SCAN_QR_CODE</strong></li>
              <li>Escaneie com o WhatsApp <strong>(21) 99762-4873</strong></li>
            </ol>
            
            <h3> Importante:</h3>
            <ul>
              <li>As notificações de checklist não estão sendo enviadas</li>
              <li>Reconecte o mais rápido possível</li>
              <li>Verifique se o celular está com internet e WhatsApp aberto</li>
            </ul>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 12px;">
              Este é um email automático do sistema de monitoramento WhatsApp.<br>
              Dashboard: <a href="${this.config.wahaUrl}/manager/${this.config.sessionName}">${this.config.wahaUrl}/manager/${this.config.sessionName}</a>
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      this.alertSent = true;
      console.log(` Email de alerta enviado para: ${this.config.alertEmail}`);
    } catch (error) {
      console.error('Erro ao enviar email de alerta:', error);
    }
  }

  async restartSession(): Promise<boolean> {
    try {
      console.log('🔄 Tentando reiniciar sessão WAHA...');

      // Parar sessão
      await fetch(
        `${this.config.wahaUrl}/api/sessions/${this.config.sessionName}/stop`,
        {
          method: 'POST',
          headers: {
            'X-Api-Key': this.config.wahaApiKey,
          },
        }
      );

      // Aguardar 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Iniciar sessão novamente
      const response = await fetch(
        `${this.config.wahaUrl}/api/sessions/${this.config.sessionName}/start`,
        {
          method: 'POST',
          headers: {
            'X-Api-Key': this.config.wahaApiKey,
          },
        }
      );

      if (response.ok) {
        console.log(' Sessão reiniciada com sucesso');
        return true;
      } else {
        console.log('Falha ao reiniciar sessão');
        return false;
      }
    } catch (error) {
      console.error('Erro ao reiniciar sessão:', error);
      return false;
    }
  }

  async monitor(): Promise<void> {
    const { status, healthy } = await this.checkStatus();

    console.log(`WhatsApp Status: ${status} ${healthy ? '' : '❌'}`);

    // Se mudou de WORKING para outro status, enviar alerta e tentar reconectar
    if (this.lastStatus === 'WORKING' && !healthy) {
      console.log('🚨 WhatsApp desconectou! Tentando auto-reconnect...');

      // Tentar reiniciar sessão automaticamente
      const restarted = await this.restartSession();

      if (!restarted) {
        // Se falhou, enviar email
        await this.sendEmailAlert(status);
      } else {
        console.log(' Auto-reconnect bem-sucedido! Aguardando QR Code scan...');
      }
    }

    // Se reconectou, resetar flag de alerta
    if (this.lastStatus !== 'WORKING' && healthy) {
      console.log(' WhatsApp reconectado!');
      this.alertSent = false;
    }

    this.lastStatus = status;
  }

  startMonitoring(): NodeJS.Timeout {
    // Verificar imediatamente
    this.monitor();

    // Depois verificar a cada X minutos
    const intervalMs = this.config.checkIntervalMinutes * 60 * 1000;
    return setInterval(() => {
      this.monitor();
    }, intervalMs);
  }
}

export const whatsappMonitor = new WhatsAppMonitor();
