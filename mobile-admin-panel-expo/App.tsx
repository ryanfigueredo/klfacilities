import React, { useState, useEffect, useRef } from "react";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { User } from "./src/services/api";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Importações diretas - mais confiável no React Native
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import PontosScreen from "./src/screens/PontosScreen";
import ChecklistsScreen from "./src/screens/ChecklistsScreen";
import NovoChecklistScreen from "./src/screens/NovoChecklistScreen";
import ResponderChecklistScreen from "./src/screens/ResponderChecklistScreen";
import WebViewScreen from "./src/screens/WebViewScreen";
import ProtocoloScreen from "./src/screens/ProtocoloScreen";
import ChecklistBanheirosScreen from "./src/screens/ChecklistBanheirosScreen";
import VisualizarChecklistRespondidoScreen from "./src/screens/VisualizarChecklistRespondidoScreen";

const Stack = createNativeStackNavigator();

// Screen options estático para garantir que props boolean sejam sempre boolean
// Isso previne o erro "java.lang.String cannot be cast to java.lang.Boolean"
const defaultScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: false,
  animation: 'default' as const,
} as const;

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  if (__DEV__) {
    console.log("🎬 AppContent renderizado - loading:", loading, "error:", initError);
  }

  useEffect(() => {
    let mounted = true;
    if (__DEV__) {
      console.log("📱 useEffect executado - iniciando verificação");
    }

    // Timeout de segurança para garantir que o loading termine
    const safetyTimeout = setTimeout(() => {
      if (__DEV__) {
        console.log("⚠️ Safety timeout: forçando fim do loading");
      }
      if (mounted) {
        setLoading(false);
      }
    }, 3000); // 3 segundos máximo

    // Verificar se há usuário salvo (opcional)
    checkStoredAuth()
      .catch((error) => {
        if (__DEV__) {
          console.error("❌ Erro na inicialização:", error);
        }
        if (mounted) {
          setInitError(error?.message || "Erro desconhecido na inicialização");
          setLoading(false);
        }
      })
      .finally(() => {
        clearTimeout(safetyTimeout);
      });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  const checkStoredAuth = async () => {
    try {
      if (__DEV__) {
        console.log("🚀 Iniciando verificação de autenticação...");
      }
      
      // Verificar se há token salvo e validar
      const { obterUsuarioAtual, initializeAuth } = await import("./src/services/api");
      
      // Inicializar token se existir (pode falhar silenciosamente no iOS)
      try {
        await initializeAuth();
      } catch (authInitError: any) {
        // No iOS, initializeAuth pode falhar se Keychain não estiver disponível
        // Não quebrar o app, apenas continuar sem token
        if (__DEV__) {
          console.warn("⚠️ Auth init falhou (pode ser normal no iOS):", authInitError);
        }
      }
      
      // Tentar obter usuário atual com o token
      // Se SecureStore falhar no iOS, obterUsuarioAtual retorna null silenciosamente
      const storedUser = await obterUsuarioAtual();
      
      if (storedUser) {
        if (__DEV__) {
          console.log("✅ Usuário encontrado, fazendo login automático");
        }
        setUser(storedUser);
      } else {
        if (__DEV__) {
          console.log("ℹ️ Nenhum usuário salvo, indo para tela de login");
        }
      }
      
      setLoading(false);
    } catch (error: any) {
      // Erro crítico - logar mas não quebrar o app completamente
      if (__DEV__) {
        console.error("❌ Erro ao verificar autenticação:", error);
        console.error("Error stack:", error?.stack);
      }
      // Não definir erro fatal - deixar usuário tentar fazer login
      setInitError(null); // Limpar erro para não bloquear o app
      setLoading(false);
      // Não fazer throw - deixar app continuar
    }
  };

  const handleLoginSuccess = (loggedUser: User) => {
    setUser(loggedUser);
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("lastEmail");
      await SecureStore.deleteItemAsync("authToken");
      const { setAuthToken } = await import("./src/services/api");
      setAuthToken(null);
    } catch (error) {
      if (__DEV__) {
        console.error("Erro ao limpar dados de autenticação:", error);
      }
    }
    setUser(null);
    if (navigationRef.current?.isReady()) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009ee2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (initError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Erro ao inicializar</Text>
          <Text style={styles.errorText}>{initError}</Text>
          <Text style={styles.errorHint}>
            Feche o app e abra novamente. Se o problema persistir, reinstale o
            aplicativo.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          if (__DEV__) {
            console.log("NavigationContainer ready");
          }
        }}
      >
        <Stack.Navigator
          screenOptions={defaultScreenOptions}
          initialRouteName="Login"
        >
          <Stack.Screen name="Login">
            {() => <LoginScreen onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
          <Stack.Screen name="Dashboard">
            {() => {
              if (!user) {
                return null;
              }
              return <DashboardScreen user={user} onLogout={handleLogout} />;
            }}
          </Stack.Screen>
          <Stack.Screen name="Pontos">{() => <PontosScreen />}</Stack.Screen>
          <Stack.Screen name="Checklists">
            {() => <ChecklistsScreen />}
          </Stack.Screen>
          <Stack.Screen name="NovoChecklist">
            {() => <NovoChecklistScreen />}
          </Stack.Screen>
          <Stack.Screen name="ResponderChecklist">
            {() => <ResponderChecklistScreen />}
          </Stack.Screen>
          <Stack.Screen name="VisualizarChecklistRespondido">
            {() => <VisualizarChecklistRespondidoScreen />}
          </Stack.Screen>
          <Stack.Screen name="WebView">
            {() => <WebViewScreen />}
          </Stack.Screen>
          <Stack.Screen name="Protocolo">
            {() => <ProtocoloScreen />}
          </Stack.Screen>
          <Stack.Screen name="ChecklistBanheiros">
            {() => <ChecklistBanheirosScreen />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f44336",
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  errorHint: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
});
