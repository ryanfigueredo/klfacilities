import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { criarManifestacao, Funcionario } from "../services/api";

interface ManifestacaoScreenProps {
  funcionario: Funcionario;
  onClose: () => void;
}

const TIPOS_MANIFESTACAO = [
  {
    value: "ELOGIO" as const,
    label: "Elogio",
    icon: "heart" as const,
    color: "#4CAF50",
    description: "Reconhecer um bom trabalho ou ação positiva",
  },
  {
    value: "SUGESTAO" as const,
    label: "Sugestão",
    icon: "bulb" as const,
    color: "#FF9800",
    description: "Compartilhar uma ideia ou melhoria",
  },
  {
    value: "DENUNCIA" as const,
    label: "Denúncia / Relato",
    icon: "warning" as const,
    color: "#f44336",
    description: "Reportar um problema ou situação",
  },
];

export default function ManifestacaoScreen({
  funcionario,
  onClose,
}: ManifestacaoScreenProps) {
  const [tipo, setTipo] = useState<"ELOGIO" | "SUGESTAO" | "DENUNCIA">(
    "ELOGIO"
  );
  const [mensagem, setMensagem] = useState("");
  const [funcionarioNome, setFuncionarioNome] = useState(funcionario.nome || "");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!mensagem.trim()) {
      Alert.alert("Atenção", "Por favor, escreva sua manifestação.");
      return;
    }

    if (mensagem.trim().length < 10) {
      Alert.alert(
        "Atenção",
        "A mensagem deve ter pelo menos 10 caracteres."
      );
      return;
    }

    setLoading(true);

    try {
      await criarManifestacao({
        tipo,
        mensagem: mensagem.trim(),
        funcionarioNome: funcionarioNome.trim() || undefined,
        funcionarioCpf: funcionario.cpf,
        grupoId: funcionario.grupo.id,
        unidadeId: funcionario.unidade.id,
      });

      setSubmitted(true);
      Alert.alert(
        "Manifestação Enviada!",
        "Recebemos sua manifestação com sucesso. Nossa equipe analisará e entrará em contato se necessário.",
        [
          {
            text: "OK",
            onPress: () => {
              setSubmitted(false);
              setMensagem("");
              setFuncionarioNome(funcionario.nome || "");
              setTipo("ELOGIO");
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Erro ao enviar manifestação:", error);
      Alert.alert(
        "Erro",
        error.response?.data?.error ||
          "Erro ao enviar manifestação. Verifique sua conexão e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => {
                setSubmitted(false);
                setMensagem("");
                setFuncionarioNome(funcionario.nome || "");
                setTipo("ELOGIO");
                onClose();
              }}
              style={styles.backButton}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manifestação Enviada</Text>
          </View>
        </View>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.successTitle}>Manifestação Enviada!</Text>
          <Text style={styles.successText}>
            Recebemos sua manifestação com sucesso. Nossa equipe analisará e
            entrará em contato se necessário.
          </Text>
          <TouchableOpacity
            style={styles.backToFormButton}
            onPress={() => {
              setSubmitted(false);
              setMensagem("");
              setFuncionarioNome(funcionario.nome || "");
              setTipo("ELOGIO");
            }}
          >
            <Text style={styles.backToFormText}>Enviar Outra Manifestação</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Central de Atendimento</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Registre elogios, sugestões ou denúncias
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Informações do Funcionário */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Funcionário</Text>
            <Text style={styles.infoValue}>{funcionario.nome}</Text>
            <Text style={styles.infoLabel}>CPF</Text>
            <Text style={styles.infoValue}>{funcionario.cpf}</Text>
            <Text style={styles.infoLabel}>Unidade</Text>
            <Text style={styles.infoValue}>{funcionario.unidade.nome}</Text>
            <Text style={styles.infoLabel}>Grupo</Text>
            <Text style={styles.infoValue}>{funcionario.grupo.nome}</Text>
          </View>

          {/* Tipo de Manifestação */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Manifestação</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione o tipo de manifestação
            </Text>

            <View style={styles.tiposContainer}>
              {TIPOS_MANIFESTACAO.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.tipoButton,
                    tipo === item.value && [
                      styles.tipoButtonSelected,
                      { borderColor: item.color, backgroundColor: `${item.color}15` },
                    ],
                  ]}
                  onPress={() => setTipo(item.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={tipo === item.value ? item.color : "#666"}
                  />
                  <View style={styles.tipoButtonTextContainer}>
                    <Text
                      style={[
                        styles.tipoButtonLabel,
                        tipo === item.value && { color: item.color },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.tipoButtonDescription}>
                      {item.description}
                    </Text>
                  </View>
                  {tipo === item.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={item.color}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Nome (opcional) */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Seu Nome <Text style={styles.optional}>(opcional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={funcionarioNome}
              onChangeText={setFuncionarioNome}
              placeholder="Seu nome (opcional)"
              placeholderTextColor="#999"
            />
          </View>

          {/* Mensagem */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Sua Mensagem <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={mensagem}
              onChangeText={setMensagem}
              placeholder="Descreva sua manifestação aqui..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {mensagem.length} / mínimo 10 caracteres
            </Text>
          </View>

          {/* Botão Enviar */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || !mensagem.trim() || mensagem.trim().length < 10) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !mensagem.trim() || mensagem.trim().length < 10}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.buttonLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitButtonText}>Enviando...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Enviar Manifestação</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Suas manifestações são confidenciais e serão analisadas pela nossa
            equipe de RH.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#009ee2",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginLeft: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  tiposContainer: {
    gap: 12,
  },
  tipoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipoButtonSelected: {
    borderWidth: 2,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  tipoButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  tipoButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  tipoButtonDescription: {
    fontSize: 12,
    color: "#666",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#f44336",
  },
  optional: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minHeight: 150,
    maxHeight: 300,
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    textAlign: "right",
  },
  submitButton: {
    backgroundColor: "#009ee2",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  footerText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 24,
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  backToFormButton: {
    backgroundColor: "#009ee2",
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  backToFormText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
