import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  authByEmailPassword,
  User,
  setAuthToken,
  forgotPassword,
} from "../services/api";
import * as SecureStore from "expo-secure-store";

const SAVED_EMAIL_KEY = "lastEmail";
const SAVED_PASSWORD_KEY = "savedPassword";
const REMEMBER_PASSWORD_KEY = "rememberPassword";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showXiaomiHelp, setShowXiaomiHelp] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Carregar email, senha e preferência "salvar senha" do cache
    const loadSavedCredentials = async () => {
      try {
        const [savedEmail, savedPassword, rememberPref] = await Promise.all([
          SecureStore.getItemAsync(SAVED_EMAIL_KEY),
          SecureStore.getItemAsync(SAVED_PASSWORD_KEY),
          SecureStore.getItemAsync(REMEMBER_PASSWORD_KEY),
        ]);
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword && rememberPref === "true") {
          setPassword(savedPassword);
          setRememberPassword(true);
        } else {
          setRememberPassword(rememberPref !== "false");
        }
      } catch (error) {
        console.error("Erro ao carregar credenciais salvas:", error);
      }
    };
    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Erro", "Email é obrigatório");
      return;
    }

    if (!password) {
      Alert.alert("Erro", "Senha é obrigatória");
      return;
    }

    setLoading(true);
    try {
      const response = await authByEmailPassword(email.trim(), password);

      if (response.success && response.user && response.token) {
        // Salvar email e token localmente
        await SecureStore.setItemAsync(SAVED_EMAIL_KEY, email.trim());
        await SecureStore.setItemAsync("authToken", response.token);

        // Salvar senha no cache se "Salvar senha" estiver marcado
        if (rememberPassword) {
          await SecureStore.setItemAsync(SAVED_PASSWORD_KEY, password);
          await SecureStore.setItemAsync(REMEMBER_PASSWORD_KEY, "true");
        } else {
          await SecureStore.deleteItemAsync(SAVED_PASSWORD_KEY);
          await SecureStore.setItemAsync(REMEMBER_PASSWORD_KEY, "false");
        }

        // Configurar token no axios para as próximas requisições
        setAuthToken(response.token);

        onLoginSuccess(response.user);
        // Navegar para Dashboard após login bem-sucedido
        navigation.navigate("Dashboard" as never);
      } else {
        Alert.alert("Erro", "Email ou senha incorretos");
      }
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);

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

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert("Erro", "Digite seu email");
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await forgotPassword(forgotPasswordEmail.trim());
      Alert.alert(
        "Email Enviado",
        "Se o email estiver cadastrado, você receberá um link para redefinir sua senha.",
        [
          {
            text: "OK",
            onPress: () => {
              setShowForgotPassword(false);
              setForgotPasswordEmail("");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Erro ao solicitar reset de senha:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Erro ao solicitar reset de senha. Tente novamente.";
      Alert.alert("Erro", errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/icon-512.png")}
                style={styles.logo}
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="KL Facilities Logo"
              />
            </View>
            <Text style={styles.subtitle}>Acesso Administrativo</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#999"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#999"
                  style={styles.inputIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Digite sua senha"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.rememberContainer}
                  onPress={async () => {
                    const newVal = !rememberPassword;
                    setRememberPassword(newVal);
                    // Persistir preferência e limpar senha salva se desmarcar
                    try {
                      await SecureStore.setItemAsync(
                        REMEMBER_PASSWORD_KEY,
                        newVal ? "true" : "false"
                      );
                      if (!newVal)
                        await SecureStore.deleteItemAsync(SAVED_PASSWORD_KEY);
                    } catch (e) {
                      console.error("Erro ao salvar preferência:", e);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberPassword && styles.checkboxChecked,
                    ]}
                  >
                    {rememberPassword && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Salvar senha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowForgotPassword(true)}
                  style={styles.forgotPasswordButton}
                >
                  <Text style={styles.forgotPasswordText}>Esqueci senha</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading ? styles.buttonDisabled : null]}
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
              Acesso restrito a administradores e supervisores
            </Text>

            <TouchableOpacity
              onPress={() => setShowXiaomiHelp(true)}
              style={styles.xiaomiHelpLink}
            >
              <Text style={styles.xiaomiHelpLinkText}>
                App fechando sozinho? (Xiaomi/Redmi)
              </Text>
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.developerContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.developerText}>
                Desenvolvido por DMTN Sistemas
              </Text>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Ajuda Xiaomi */}
      <Modal
        visible={showXiaomiHelp}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowXiaomiHelp(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                App fechando sozinho? (Xiaomi/Redmi)
              </Text>
              <TouchableOpacity
                onPress={() => setShowXiaomiHelp(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Em celulares Xiaomi, Redmi ou HyperOS, o sistema pode fechar o app
              para economizar bateria. Faça o seguinte:
            </Text>
            <Text style={styles.xiaomiSteps}>
              1. Abra Configurações do celular{"\n"}
              2. Apps → KL Administração{"\n"}
              3. Bateria → escolha "Sem restrição"{"\n"}
              4. Ative "Iniciar automaticamente" (se existir)
            </Text>
            <Text style={styles.xiaomiSteps}>
              Isso evita que o app seja fechado em segundo plano.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowXiaomiHelp(false)}
            >
              <Text style={styles.buttonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Esqueci Senha */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Esqueci minha senha</Text>
              <TouchableOpacity
                onPress={() => setShowForgotPassword(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Digite seu email para receber um link de redefinição de senha
            </Text>

            <View style={styles.modalInputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#999"
                style={styles.modalInputIcon}
              />
              <TextInput
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.modalInput}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modalButton,
                forgotPasswordLoading && styles.modalButtonDisabled,
              ]}
              onPress={handleForgotPassword}
              disabled={forgotPasswordLoading}
            >
              {forgotPasswordLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>
                  Enviar Link de Redefinição
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowForgotPassword(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 56,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#fff",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 4,
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
  xiaomiHelpLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  xiaomiHelpLinkText: {
    fontSize: 12,
    color: "#009ee2",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  xiaomiSteps: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
    marginBottom: 12,
  },
  rememberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#009ee2",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#009ee2",
  },
  rememberText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  developerContainer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    width: "100%",
  },
  developerText: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  forgotPasswordButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#009ee2",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 56,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  modalInputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  modalButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#009ee2",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#009ee2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalCancelButton: {
    width: "100%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});
