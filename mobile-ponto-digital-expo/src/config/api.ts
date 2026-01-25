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
  AUTH: "/api/mobile/auth",
  PONTO: "/api/mobile/ponto",
  PONTOS_HOJE: "/api/mobile/pontos-hoje",
  HISTORICO: "/api/mobile/historico",
  MANIFESTACOES: "/api/manifestacoes",
};

// Log da URL configurada (apenas em desenvolvimento)
if (__DEV__) {
  console.log("🔗 API URL configurada:", API_URL);
  console.log("🔐 Endpoint de autenticação:", API_ENDPOINTS.AUTH);
  console.log("📍 Endpoint de ponto:", API_ENDPOINTS.PONTO);
  console.log("💬 Endpoint de manifestações:", API_ENDPOINTS.MANIFESTACOES);
}
