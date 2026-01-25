import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authByCPF, Funcionario } from "../services/api";
import { limparHistoricoLocal } from "../utils/pontoHistory";
import * as SecureStore from "expo-secure-store";
import LegalInfoScreen from "./LegalInfoScreen";

// Função para formatar CPF
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9)
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
    6,
    9
  )}-${numbers.slice(9, 11)}`;
};

interface LoginScreenProps {
  onLoginSuccess: (funcionario: Funcionario) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLegalInfo, setShowLegalInfo] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async () => {
    const cpfClean = cpf.replace(/\D/g, "");

    if (cpfClean.length !== 11) {
      Alert.alert("Erro", "CPF deve ter 11 dígitos");
      return;
    }

    setLoading(true);
    try {
      const response = await authByCPF(cpfClean);

      if (response.success && response.funcionario) {
        // Limpar histórico local ao trocar de CPF
        await limparHistoricoLocal();
        // Salvar CPF localmente (opcional, para facilitar próximo login)
        await SecureStore.setItemAsync("lastCpf", cpfClean);
        onLoginSuccess(response.funcionario);
      } else {
        Alert.alert("Erro", "CPF não encontrado no sistema");
      }
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      console.error("Erro detalhado:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      });

      let errorMessage = "Erro ao conectar com o servidor";

      if (
        error.message === "Network Error" ||
        error.code === "NETWORK_ERROR" ||
        error.code === "ERR_NETWORK"
      ) {
        errorMessage =
          "Não foi possível conectar ao servidor.\n\nPossíveis causas:\n• Verifique sua conexão com a internet\n• O servidor pode estar temporariamente indisponível\n• Verifique se está usando a URL correta da API";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status) {
        errorMessage = `Erro do servidor (${error.response.status}): ${
          error.response.statusText || "Erro desconhecido"
        }`;
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            {!logoError ? (
              <Image
                source={require("../../assets/icon-512.png")}
                style={styles.logo}
                resizeMode="contain"
                onError={(error: any) => {
                  console.error("Erro ao carregar logo:", error?.nativeEvent || error);
                  setLogoError(true);
                }}
                onLoad={() => {
                  console.log("Logo carregada com sucesso");
                }}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="business" size={80} color="#009ee2" />
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>Registro de Ponto</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Digite seu CPF</Text>
            <TextInput
              value={cpf}
              onChangeText={(text) => {
                const formatted = formatCPF(text);
                setCpf(formatted);
              }}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              style={styles.input}
              maxLength={14}
              returnKeyType="done"
              onSubmitEditing={() => {
                // Quando o usuário pressionar "Concluído" no teclado, tenta fazer login
                const cpfClean = cpf.replace(/\D/g, "");
                if (cpfClean.length === 11) {
                  handleLogin();
                }
              }}
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Se seu CPF não for encontrado, entre em contato com o RH
          </Text>

          <TouchableOpacity
            onPress={() => setShowLegalInfo(true)}
            style={styles.legalButton}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#009ee2"
            />
            <Text style={styles.legalButtonText}>Informações Legais</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showLegalInfo}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLegalInfo(false)}
      >
        <LegalInfoScreen onClose={() => setShowLegalInfo(false)} />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: "100%",
  },
  content: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logoContainer: {
    width: 200,
    height: 200,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    fontWeight: "500",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    width: "100%",
    height: 56,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: "#fff",
    color: "#333",
  },
  button: {
    width: "100%",
    height: 56,
    backgroundColor: "#009ee2",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#009ee2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  legalButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
  },
  legalButtonText: {
    fontSize: 14,
    color: "#009ee2",
    fontWeight: "500",
  },
});
