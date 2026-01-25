/**
 * Obtém a URL base da aplicação
 * Prioridade:
 * 1. NEXT_PUBLIC_APP_URL (se definido)
 * 2. NEXTAUTH_URL (se definido)
 * 3. URL padrão klfacilities.com.br
 * 
 * Para uso em Server Components e API Routes
 * Retorna sempre sem barra final para evitar duplicação ao concatenar
 */
export function getBaseUrl(): string {
  let baseUrl: string;
  
  // Em ambiente de servidor, usar variáveis de ambiente
  if (typeof window === 'undefined') {
    baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'https://klfacilities.com.br'
    );
  } else {
    // Em ambiente de cliente, usar window.location.origin
    baseUrl = window.location.origin;
  }
  
  // Remover barra final se existir para evitar duplicação ao concatenar
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Obtém a URL base da aplicação para uso em Client Components
 * Usa window.location.origin quando disponível, senão usa as variáveis de ambiente
 * Retorna sempre sem barra final para evitar duplicação ao concatenar
 */
export function getBaseUrlClient(): string {
  let baseUrl: string;
  
  if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  } else {
    baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'https://klfacilities.com.br'
    );
  }
  
  // Remover barra final se existir para evitar duplicação ao concatenar
  return baseUrl.replace(/\/+$/, '');
}

