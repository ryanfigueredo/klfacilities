import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import LoginScreen from "./src/screens/LoginScreen";
import PontoScreen from "./src/screens/PontoScreen";
import { Funcionario, authByCPF } from "./src/services/api";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { setupGlobalErrorHandler } from "./src/utils/errorLogger";
import { LocationProvider } from "./src/contexts/LocationContext";

// Configurar handler global de erros
setupGlobalErrorHandler();

const Stack = createNativeStackNavigator();

export default function App() {
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("App.tsx: Componente montado");

    // Usar setTimeout para garantir que o componente está totalmente montado
    const initTimer = setTimeout(() => {
      try {
        setMounted(true);
        // Verificar se há funcionário salvo (opcional)
        checkStoredAuth().catch((error) => {
          console.error("Erro na inicialização:", error);
          setInitError(error?.message || "Erro desconhecido na inicialização");
          setLoading(false);
        });
      } catch (error: any) {
        console.error("Erro crítico na inicialização:", error);
        setInitError(error?.message || "Erro crítico na inicialização");
        setLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);
      console.log("App.tsx: Componente desmontado");
    };
  }, []);

  const checkStoredAuth = async () => {
    try {
      console.log("App.tsx: Verificando autenticação...");
      // Por segurança, sempre pedir CPF novamente
      // Mas podemos melhorar isso no futuro com token JWT
      setLoading(false);
      console.log("App.tsx: Autenticação verificada");
    } catch (error: any) {
      console.error("Erro ao verificar autenticação:", error);
      setInitError(error?.message || "Erro ao inicializar");
      setLoading(false);
    }
  };

  const handleLoginSuccess = (func: Funcionario) => {
    setFuncionario(func);
  };

  const handleReloadFuncionario = async () => {
    if (!funcionario) return;
    try {
      const response = await authByCPF(funcionario.cpf);
      if (response.success && response.funcionario) {
        setFuncionario(response.funcionario);
      }
    } catch (error) {
      console.error("Erro ao recarregar dados do funcionário:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("lastCpf");
    } catch (error) {
      console.error("Erro ao deletar CPF do SecureStore:", error);
    }
    setFuncionario(null);
  };

  // Tela de loading inicial
  if (!mounted || loading) {
    console.log("App.tsx: Renderizando loading...");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009ee2" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Tela de erro
  if (initError) {
    console.log("App.tsx: Renderizando erro:", initError);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Erro ao inicializar</Text>
        <Text style={styles.errorText}>{initError}</Text>
        <Text style={styles.errorHint}>
          Feche o app e abra novamente. Se o problema persistir, reinstale o
          aplicativo.
        </Text>
      </View>
    );
  }

  console.log("App.tsx: Renderizando app principal...");

  // Renderizar app principal com try-catch extra
  try {
    return (
      <ErrorBoundary>
        <LocationProvider>
        <SafeAreaProvider>
          <NavigationContainer
            onReady={() => {
              console.log("NavigationContainer pronto");
            }}
            onStateChange={() => {
              // Não logar a cada mudança de estado para não poluir logs
            }}
            fallback={
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#009ee2" />
                <Text style={styles.loadingText}>Carregando navegação...</Text>
              </View>
            }
          >
            <StatusBar style="light" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            >
              {!funcionario ? (
                <Stack.Screen name="Login">
                  {(props) => {
                    try {
                      return (
                        <LoginScreen
                          {...props}
                          onLoginSuccess={handleLoginSuccess}
                        />
                      );
                    } catch (error: any) {
                      console.error("Erro ao renderizar LoginScreen:", error);
                      return (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorTitle}>
                            Erro ao carregar tela de login
                          </Text>
                          <Text style={styles.errorText}>
                            {error?.message || String(error)}
                          </Text>
                        </View>
                      );
                    }
                  }}
                </Stack.Screen>
              ) : (
                <Stack.Screen name="Ponto">
                  {(props) => {
                    try {
                      return (
                        <PontoScreen
                          {...props}
                          funcionario={funcionario}
                          onLogout={handleLogout}
                          onReloadFuncionario={handleReloadFuncionario}
                        />
                      );
                    } catch (error: any) {
                      console.error("Erro ao renderizar PontoScreen:", error);
                      return (
                        <View style={styles.errorContainer}>
                          <Text style={styles.errorTitle}>
                            Erro ao carregar tela de ponto
                          </Text>
                          <Text style={styles.errorText}>
                            {error?.message || String(error)}
                          </Text>
                        </View>
                      );
                    }
                  }}
                </Stack.Screen>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
        </LocationProvider>
      </ErrorBoundary>
    );
  } catch (error: any) {
    console.error("App.tsx: Erro ao renderizar:", error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Erro ao renderizar</Text>
        <Text style={styles.errorText}>{error?.message || String(error)}</Text>
        <Text style={styles.errorHint}>Feche o app e abra novamente.</Text>
      </View>
    );
  }
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
