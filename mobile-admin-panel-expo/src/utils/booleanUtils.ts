/**
 * Função utilitária para normalizar valores boolean que podem vir como strings da API
 * Garante compatibilidade iOS/Android e trata todos os casos possíveis
 */
export const normalizeBoolean = (value: any): boolean => {
  // Tratar null/undefined
  if (value === null || value === undefined) return false;
  
  // Se já é boolean, retornar direto
  if (typeof value === "boolean") return value;
  
  // Se é string, verificar valores comuns
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "true" || lower === "1" || lower === "yes" || lower === "on" || lower === "y";
  }
  
  // Se é número, 0 é false, qualquer outro é true
  if (typeof value === "number") {
    return value !== 0 && !isNaN(value);
  }
  
  // Para outros tipos, usar conversão padrão
  return Boolean(value);
};

/**
 * Garante que um valor seja sempre boolean (nunca string)
 * Útil para props de componentes React Native que são estritas com tipos
 */
export const ensureBoolean = (value: any): boolean => {
  return normalizeBoolean(value);
};

