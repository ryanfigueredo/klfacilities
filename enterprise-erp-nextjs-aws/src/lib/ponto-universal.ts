/**
 * Código especial para QR Code Universal
 * Quando o colaborador escanear este código, o sistema identifica
 * automaticamente a unidade do colaborador pelo CPF/reconhecimento facial
 */
export const QR_CODE_UNIVERSAL = 'PONTO-UNIVERSAL';

/**
 * Verifica se um código é o QR code universal
 */
export function isUniversalQRCode(code: string): boolean {
  return code === QR_CODE_UNIVERSAL;
}

