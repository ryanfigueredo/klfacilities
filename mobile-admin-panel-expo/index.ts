import { registerRootComponent } from "expo";
import { LogBox } from "react-native";

import App from "./App";

// Handler global para erros não capturados (ajuda em dispositivos como Xiaomi/Android 15)
const ErrorUtils = (global as any).ErrorUtils;
if (ErrorUtils?.setGlobalHandler) {
  const originalHandler =
    ErrorUtils.getGlobalHandler?.() ??
    ((err: Error) => {
      throw err;
    });
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    try {
      console.error(
        "[App] Erro não capturado:",
        error?.message ?? String(error)
      );
      if (error?.stack) console.error("[App] Stack:", error.stack);
      if (isFatal) console.error("[App] Erro fatal");
    } catch (_) {}
    try {
      if (typeof originalHandler === "function")
        originalHandler(error, isFatal);
    } catch (_) {}
  });
}

// Reduzir ruído no console em produção (opcional)
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
