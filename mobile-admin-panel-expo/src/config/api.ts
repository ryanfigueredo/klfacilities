/**
 * Configuração da API - Integração com KL Facilities
 *
 * Este app está integrado com o KL Facilities (ERP) e usa o mesmo banco de dados.
 *
 * Variáveis de Ambiente:
 * - EXPO_PUBLIC_API_URL: URL base da API do KL Facilities
 *
 * Para desenvolvimento local, configure a variável de ambiente:
 * export EXPO_PUBLIC_API_URL=http://192.168.15.15:3000
 *
 * Para produção, a URL padrão já está configurada:
 * https://www.klfacilities.com.br
 *
 * Ou crie um arquivo .env na raiz do projeto:
 * EXPO_PUBLIC_API_URL=https://www.klfacilities.com.br
 */

// URL padrão para desenvolvimento local
// Para desenvolvimento, use o IP da sua máquina na mesma rede WiFi
// Para produção, use: https://www.klfacilities.com.br
const DEFAULT_API_URL = "https://www.klfacilities.com.br";

// URL da API - pode ser configurada via variável de ambiente
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL
).replace(/\/$/, "");

export const API_ENDPOINTS = {
  AUTH_ADMIN: "/api/mobile/auth-admin",
  ME: "/api/me", // Obter usuário atual com token
  // Endpoints de pontos (para administradores/supervisores)
  PONTOS_HISTORICO: "/api/mobile/admin/historico", // Histórico de pontos de funcionários
  PONTOS_FUNCIONARIOS: "/api/mobile/admin/funcionarios", // Lista de funcionários para visualizar pontos
  PONTOS_HOJE: "/api/mobile/admin/pontos-hoje", // Pontos registrados hoje
  PONTO_SUPERVISOR_FOLHAS: "/api/ponto/supervisor/folhas", // Folhas de ponto por supervisor
  PONTO_SUPERVISOR_EDITAR: "/api/ponto/supervisor/editar", // Editar ponto
  PONTO_SUPERVISOR_ADICIONAR: "/api/ponto/supervisor/adicionar", // Adicionar ponto
  PONTO_REGISTROS: "/api/ponto/registros", // Buscar registros detalhados com IDs
  // Endpoints de checklists
  CHECKLISTS_PENDENTES: "/api/checklists-operacionais/pendentes", // Checklists pendentes
  CHECKLISTS_EM_ABERTO: "/api/checklists-operacionais/em-aberto", // Checklists em aberto (rascunhos)
  CHECKLISTS_RESPONDIDOS: "/api/checklists-operacionais/respondidos", // Checklists respondidos (concluídos)
  CHECKLISTS_RESPOSTA_DETALHE: "/api/checklists-operacionais", // Detalhes de uma resposta (GET /:respostaId)
  CHECKLISTS_ESCOPO: "/api/checklists-operacionais/escopos", // Detalhes do escopo de checklist
  CHECKLISTS_RESPONDER: "/api/checklists-operacionais/respostas", // Responder checklist
  CHECKLISTS_OPTIONS: "/api/checklists-operacionais/options", // Opções para criar novo checklist (grupos, unidades, templates)
  // Endpoints de checklist digital (banheiros)
  CHECKLIST_DIGITAL_UNIDADES: "/api/checklist/unidades", // Listar unidades para checklist digital
  CHECKLIST_DIGITAL_UNIDADE: "/api/checklist/unidade", // Informações da unidade para checklist
  CHECKLIST_DIGITAL_SUBMIT: "/api/checklist/submit", // Enviar checklist digital
  // Endpoints de autenticação
  FORGOT_PASSWORD: "/api/auth/forgot-password", // Solicitar reset de senha
  // Endpoints de exportação de ponto
  PONTO_FOLHA: "/api/ponto/folha",
  PONTO_FOLHAS_GRUPO_PDF: "/api/ponto/folhas-grupo/pdf",
  // Endpoint de protocolo
  PONTO_PROTOCOLO: "/api/ponto/protocolo",
};

// Log da URL configurada (apenas em desenvolvimento)
if (__DEV__) {
  console.log("🔗 API URL configurada:", API_URL);
  console.log("🔐 Endpoint de autenticação admin:", API_ENDPOINTS.AUTH_ADMIN);
}
