import AsyncStorage from "@react-native-async-storage/async-storage";

interface ErrorLog {
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  componentStack?: string;
  context?: any;
}

const MAX_LOGS = 20;
const LOG_KEY = "@app_error_logs";

export async function saveErrorLog(
  error: Error,
  errorInfo?: { componentStack?: string },
  context?: any
): Promise<void> {
  try {
    const existingLogs = await AsyncStorage.getItem(LOG_KEY);
    const logs: ErrorLog[] = existingLogs ? JSON.parse(existingLogs) : [];

    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo?.componentStack,
      context,
    };

    logs.push(errorLog);

    // Manter apenas os últimos logs
    const recentLogs = logs.slice(-MAX_LOGS);
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(recentLogs));

    console.log("💾 Erro salvo localmente");
    console.log(
      "📱 Para ver os logs, use a opção no menu ou acesse AsyncStorage"
    );
  } catch (e) {
    console.error("Erro ao salvar log:", e);
  }
}

export async function getErrorLogs(): Promise<ErrorLog[]> {
  try {
    const logs = await AsyncStorage.getItem(LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    console.error("Erro ao ler logs:", e);
    return [];
  }
}

export async function clearErrorLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch (e) {
    console.error("Erro ao limpar logs:", e);
  }
}

// Global error handler para capturar erros não tratados
export function setupGlobalErrorHandler() {
  try {
    // @ts-ignore - ErrorUtils pode não estar disponível em todos os contextos
    const ErrorUtils = require("react-native").ErrorUtils;
    if (!ErrorUtils) return;

    const originalHandler = ErrorUtils.getGlobalHandler?.();

    if (ErrorUtils.setGlobalHandler) {
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error("🔥 Global Error Handler:", error);
        console.error("Fatal:", isFatal);

        // Salvar log localmente
        saveErrorLog(error);

        // Ainda chama o handler original se existir
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  } catch (e) {
    // Se ErrorUtils não estiver disponível, ignora silenciosamente
    console.log("ErrorUtils não disponível neste contexto");
  }
}
