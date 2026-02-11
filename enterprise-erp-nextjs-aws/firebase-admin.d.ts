// Declaração para o módulo firebase-admin (evita erro de tipo no build quando o pacote está instalado)
declare module 'firebase-admin' {
  const apps: unknown[];
  function initializeApp(options: unknown): unknown;
  const credential: { cert(cert: unknown): unknown };
  function messaging(): {
    sendEachForMulticast(message: unknown): Promise<{ successCount: number; failureCount: number; responses: { success: boolean }[] }>;
  };
}
