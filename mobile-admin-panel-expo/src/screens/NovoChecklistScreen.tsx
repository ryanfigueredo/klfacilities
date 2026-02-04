import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  obterChecklistsOptions,
  obterChecklistsPendentes,
  api,
  initializeAuth,
} from "../services/api";
import { API_ENDPOINTS } from "../config/api";

interface GrupoOption {
  id: string;
  nome: string;
  ativo: boolean;
}

interface UnidadeOption {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  grupos: Array<{
    id: string | null;
    nome: string | null;
  }>;
}

interface TemplateOption {
  id: string;
  titulo: string;
  descricao: string | null;
  escopos: Array<{
    id: string;
    unidadeId: string;
    ativo: boolean;
  }>;
}

export default function NovoChecklistScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [selectedUnidade, setSelectedUnidade] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateSelecionado, setTemplateSelecionado] =
    useState<TemplateOption | null>(null);

  useEffect(() => {
    carregarOpcoes();
  }, []);

  const carregarOpcoes = async () => {
    try {
      setLoading(true);
      await initializeAuth();
      const data = await obterChecklistsOptions();
      setGrupos(data.grupos || []);
      const rawUnidades = data.unidades || [];
      const allowedIds = data.allowedUnidadeIds;
      const unidadesParaExibir =
        Array.isArray(allowedIds) && allowedIds.length > 0
          ? rawUnidades.filter((u: UnidadeOption) => allowedIds.includes(u.id))
          : rawUnidades;
      setUnidades(unidadesParaExibir);
      setTemplates(data.templates || []);
    } catch (error: any) {
      console.error("Erro ao carregar opções:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível carregar as opções. Verifique sua conexão e tente novamente.";
      Alert.alert("Erro", errorMessage);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Filtrar unidades baseado no grupo selecionado
  const unidadesFiltradas = useMemo(() => {
    if (!selectedGrupo) return [];
    return unidades.filter((unidade) =>
      unidade.grupos?.some((grupo) => grupo?.id === selectedGrupo)
    );
  }, [unidades, selectedGrupo]);

  // Filtrar templates baseado na unidade selecionada
  const templatesDaUnidade = useMemo(() => {
    if (!selectedUnidade) return [];
    return templates.filter((template) =>
      template.escopos.some(
        (escopo) => escopo.unidadeId === selectedUnidade && escopo.ativo
      )
    );
  }, [templates, selectedUnidade]);

  // Template selecionado (pode ser manual ou automático se houver apenas um)
  useEffect(() => {
    if (selectedTemplate) {
      const template = templatesDaUnidade.find(
        (t) => t.id === selectedTemplate
      );
      setTemplateSelecionado(template || null);
    } else if (templatesDaUnidade.length === 1) {
      // Se houver apenas um template, usar automaticamente
      setSelectedTemplate(templatesDaUnidade[0].id);
      setTemplateSelecionado(templatesDaUnidade[0]);
    } else {
      setTemplateSelecionado(null);
    }
  }, [templatesDaUnidade, selectedTemplate]);

  // Resetar seleções quando o grupo muda
  useEffect(() => {
    if (selectedGrupo) {
      const unidadeAtual = unidades.find((u) => u.id === selectedUnidade);
      if (unidadeAtual && !unidadesFiltradas.includes(unidadeAtual)) {
        setSelectedUnidade("");
        setSelectedTemplate("");
        setTemplateSelecionado(null);
      }
    } else {
      // Se grupo for desmarcado, limpar tudo
      setSelectedUnidade("");
      setSelectedTemplate("");
      setTemplateSelecionado(null);
    }
  }, [selectedGrupo, unidadesFiltradas, selectedUnidade, unidades]);

  // Resetar template quando a unidade muda
  useEffect(() => {
    if (selectedUnidade) {
      const templateAtual = templates.find((t) => t.id === selectedTemplate);
      if (templateAtual && !templatesDaUnidade.includes(templateAtual)) {
        setSelectedTemplate("");
        setTemplateSelecionado(null);
      }
    } else {
      setSelectedTemplate("");
      setTemplateSelecionado(null);
    }
  }, [selectedUnidade, templatesDaUnidade, templates, selectedTemplate]);

  const handleCriarChecklist = async () => {
    if (!selectedGrupo || !selectedUnidade || !templateSelecionado) {
      Alert.alert(
        "Campos obrigatórios",
        "Por favor, selecione o grupo, unidade e template."
      );
      return;
    }

    setCriando(true);
    try {
      // Buscar o escopo correspondente para esta unidade e template
      const escoposResponse = await obterChecklistsPendentes();
      const escopo = escoposResponse.escopos?.find(
        (e: any) =>
          e.unidade?.id === selectedUnidade &&
          e.template.id === templateSelecionado.id &&
          e.ativo
      );

      if (!escopo) {
        Alert.alert(
          "Erro",
          "Nenhum checklist disponível para esta unidade e template."
        );
        setCriando(false);
        return;
      }

      // Criar rascunho inicial
      const formData = new FormData();
      formData.append("escopoId", escopo.id);
      formData.append("isDraft", "true");
      formData.append("answers", JSON.stringify([])); // Array vazio para rascunho inicial

      const criarRascunhoResponse = await api.post(
        API_ENDPOINTS.CHECKLISTS_RESPONDER,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (criarRascunhoResponse.data?.resposta?.id) {
        // Navegar para a tela de responder checklist
        navigation.navigate(
          "ResponderChecklist" as never,
          {
            escopoId: escopo.id,
          } as never
        );
      } else {
        throw new Error("Resposta do servidor inválida");
      }
    } catch (error: any) {
      console.error("Erro ao criar checklist:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível criar o checklist. Tente novamente.";
      Alert.alert("Erro", errorMessage);
    } finally {
      setCriando(false);
    }
  };

  const podeCriar =
    selectedGrupo && selectedUnidade && templateSelecionado && !criando;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Novo Checklist</Text>
          <Text style={styles.headerSubtitle}>
            Selecione grupo, unidade e template
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009ee2" />
          <Text style={styles.loadingText}>Carregando opções...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Seleção de Grupo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grupo *</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione o grupo da unidade
            </Text>
            {grupos.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  Nenhum grupo disponível para você.
                </Text>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                {grupos.map((grupo) => (
                  <TouchableOpacity
                    key={grupo.id}
                    style={[
                      styles.optionCard,
                      selectedGrupo === grupo.id && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedGrupo(grupo.id)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedGrupo === grupo.id && styles.optionTextSelected,
                      ]}
                    >
                      {grupo.nome}
                    </Text>
                    {selectedGrupo === grupo.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#009ee2"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Seleção de Unidade */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unidade *</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione a unidade para o checklist
            </Text>
            {!selectedGrupo ? (
              <View style={styles.emptySection}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  Selecione um grupo primeiro.
                </Text>
              </View>
            ) : unidadesFiltradas.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  Nenhuma unidade disponível para o grupo selecionado.
                </Text>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                {unidadesFiltradas.map((unidade) => (
                  <TouchableOpacity
                    key={unidade.id}
                    style={[
                      styles.optionCard,
                      selectedUnidade === unidade.id &&
                        styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedUnidade(unidade.id)}
                  >
                    <View style={styles.optionCardContent}>
                      <Text
                        style={[
                          styles.optionText,
                          selectedUnidade === unidade.id &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {unidade.nome}
                      </Text>
                      {(unidade.cidade || unidade.estado) && (
                        <Text style={styles.optionSubtext}>
                          {unidade.cidade}
                          {unidade.cidade && unidade.estado && " - "}
                          {unidade.estado}
                        </Text>
                      )}
                    </View>
                    {selectedUnidade === unidade.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#009ee2"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Mostrar Template selecionado (ou seleção se houver múltiplos) */}
          {selectedUnidade && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Checklist *</Text>
              {templatesDaUnidade.length === 0 ? (
                <View style={styles.emptySection}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color="#f44336"
                  />
                  <Text style={[styles.emptyText, { color: "#f44336" }]}>
                    Nenhum checklist disponível
                  </Text>
                  <Text
                    style={[styles.emptyText, { color: "#666", marginTop: 8 }]}
                  >
                    Esta unidade não possui um modelo de checklist definido.
                    Entre em contato com o administrador.
                  </Text>
                </View>
              ) : templatesDaUnidade.length === 1 ? (
                <View style={styles.templateSelectedCard}>
                  <Text style={styles.templateSelectedTitle}>
                    {templatesDaUnidade[0].titulo}
                  </Text>
                  {templatesDaUnidade[0].descricao && (
                    <Text style={styles.templateSelectedDescription}>
                      {templatesDaUnidade[0].descricao}
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <Text style={styles.sectionSubtitle}>
                    Selecione o tipo de checklist
                  </Text>
                  <View style={styles.optionsContainer}>
                    {templatesDaUnidade.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.optionCard,
                          selectedTemplate === template.id &&
                            styles.optionCardSelected,
                        ]}
                        onPress={() => setSelectedTemplate(template.id)}
                      >
                        <View style={styles.optionCardContent}>
                          <Text
                            style={[
                              styles.optionText,
                              selectedTemplate === template.id &&
                                styles.optionTextSelected,
                            ]}
                          >
                            {template.titulo}
                          </Text>
                          {template.descricao && (
                            <Text
                              style={styles.optionSubtext}
                              numberOfLines={2}
                            >
                              {template.descricao}
                            </Text>
                          )}
                        </View>
                        {selectedTemplate === template.id && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#009ee2"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Botão de Criar */}
          <TouchableOpacity
            style={[
              styles.createButton,
              !podeCriar && styles.createButtonDisabled,
            ]}
            onPress={handleCriarChecklist}
            disabled={!podeCriar}
          >
            {criando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.createButtonText}>Criar Checklist</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#009ee2",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#f0f9ff",
  },
  optionCardContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  optionTextSelected: {
    color: "#009ee2",
    fontWeight: "600",
  },
  optionSubtext: {
    fontSize: 14,
    color: "#666",
  },
  emptySection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
  },
  templateSelectedCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#009ee2",
  },
  templateSelectedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  templateSelectedDescription: {
    fontSize: 14,
    color: "#666",
  },
  createButton: {
    backgroundColor: "#009ee2",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});
