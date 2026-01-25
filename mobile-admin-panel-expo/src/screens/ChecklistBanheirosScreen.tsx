import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { API_URL, API_ENDPOINTS } from "../config/api";
import * as SecureStore from "expo-secure-store";

interface Unidade {
  id: string;
  nome: string;
  grupoNome: string;
}

type TipoChecklist = "LIMPEZA" | "INSUMOS" | "SATISFACAO";

export default function ChecklistBanheirosScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<TipoChecklist | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados do formulário
  const [servicosLimpeza, setServicosLimpeza] = useState<string[]>([]);
  const [insumosSolicitados, setInsumosSolicitados] = useState<string[]>([]);
  const [avaliacaoLimpeza, setAvaliacaoLimpeza] = useState<string | null>(null);
  const [fatoresInfluencia, setFatoresInfluencia] = useState<string[]>([]);
  const [comentarios, setComentarios] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    carregarUnidades();
    solicitarPermissoes();
  }, []);

  const solicitarPermissoes = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await Location.requestForegroundPermissionsAsync();
  };

  const carregarUnidades = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}${API_ENDPOINTS.CHECKLIST_DIGITAL_UNIDADES}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setUnidades(data.data);
      } else {
        throw new Error(data.error || "Erro ao carregar unidades");
      }
    } catch (error: any) {
      console.error("Erro ao carregar unidades:", error);
      Alert.alert("Erro", "Não foi possível carregar as unidades. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const selecionarFoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erro ao selecionar foto:", error);
      Alert.alert("Erro", "Não foi possível selecionar a foto.");
    }
  };

  const tirarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Necessária",
          "É necessário permitir acesso à câmera para tirar fotos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erro ao tirar foto:", error);
      Alert.alert("Erro", "Não foi possível tirar a foto.");
    }
  };

  const handleToggleServico = (servico: string) => {
    setServicosLimpeza((prev) =>
      prev.includes(servico)
        ? prev.filter((s) => s !== servico)
        : [...prev, servico]
    );
  };

  const handleToggleInsumo = (insumo: string) => {
    setInsumosSolicitados((prev) =>
      prev.includes(insumo)
        ? prev.filter((i) => i !== insumo)
        : [...prev, insumo]
    );
  };

  const handleToggleFator = (fator: string) => {
    setFatoresInfluencia((prev) =>
      prev.includes(fator)
        ? prev.filter((f) => f !== fator)
        : [...prev, fator]
    );
  };

  const handleSubmit = async () => {
    if (!selectedUnidade || !selectedTipo) {
      Alert.alert("Atenção", "Selecione uma unidade e um tipo de checklist.");
      return;
    }

    if (selectedTipo === "LIMPEZA" && servicosLimpeza.length === 0) {
      Alert.alert("Atenção", "Selecione pelo menos um serviço de limpeza.");
      return;
    }

    if (selectedTipo === "INSUMOS" && insumosSolicitados.length === 0) {
      Alert.alert("Atenção", "Selecione pelo menos um insumo.");
      return;
    }

    if (selectedTipo === "SATISFACAO" && !avaliacaoLimpeza) {
      Alert.alert("Atenção", "Selecione uma avaliação de limpeza.");
      return;
    }

    try {
      setSubmitting(true);

      // Obter localização
      let location: Location.LocationObject | null = null;
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch (error) {
        console.warn("Erro ao obter localização:", error);
      }

      // Preparar dados do formulário
      const data: any = {};

      if (selectedTipo === "LIMPEZA") {
        data.servicosLimpeza = servicosLimpeza;
      }

      if (selectedTipo === "INSUMOS") {
        data.insumosSolicitados = insumosSolicitados;
      }

      if (selectedTipo === "SATISFACAO") {
        data.avaliacaoLimpeza = avaliacaoLimpeza;
        data.fatoresInfluencia = fatoresInfluencia;
        if (comentarios.trim()) {
          data.comentarios = comentarios.trim();
        }
      }

      const formData = new FormData();
      formData.append("unidadeId", selectedUnidade.id);
      formData.append("tipo", selectedTipo);
      formData.append("data", JSON.stringify(data));

      if (foto) {
        const filename = foto.split("/").pop() || "foto.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("foto", {
          uri: foto,
          name: filename,
          type,
        } as any);
      }

      // Obter token de autenticação
      const token = await SecureStore.getItemAsync("authToken");

      const response = await fetch(`${API_URL}${API_ENDPOINTS.CHECKLIST_DIGITAL_SUBMIT}`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Sucesso", "Checklist enviado com sucesso!", [
          {
            text: "OK",
            onPress: () => {
              // Resetar formulário
              setSelectedUnidade(null);
              setSelectedTipo(null);
              setServicosLimpeza([]);
              setInsumosSolicitados([]);
              setAvaliacaoLimpeza(null);
              setFatoresInfluencia([]);
              setComentarios("");
              setFoto(null);
              navigation.goBack();
            },
          },
        ]);
      } else {
        throw new Error(result.error || "Erro ao enviar checklist");
      }
    } catch (error: any) {
      console.error("Erro ao enviar checklist:", error);
      Alert.alert("Erro", error.message || "Não foi possível enviar o checklist.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009ee2" />
        <Text style={styles.loadingText}>Carregando unidades...</Text>
      </View>
    );
  }

  // Tela de seleção de unidade e tipo
  if (!selectedUnidade || !selectedTipo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checklist de Banheiros</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Seleção de Unidade */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selecione a Unidade</Text>
            {unidades.map((unidade) => (
              <TouchableOpacity
                key={unidade.id}
                style={[
                  styles.unidadeCard,
                  selectedUnidade?.id === unidade.id && styles.unidadeCardSelected,
                ]}
                onPress={() => setSelectedUnidade(unidade)}
              >
                <Ionicons
                  name={selectedUnidade?.id === unidade.id ? "checkmark-circle" : "location"}
                  size={24}
                  color={selectedUnidade?.id === unidade.id ? "#4CAF50" : "#666"}
                />
                <View style={styles.unidadeInfo}>
                  <Text style={styles.unidadeNome}>{unidade.nome}</Text>
                  <Text style={styles.unidadeGrupo}>{unidade.grupoNome}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Seleção de Tipo */}
          {selectedUnidade && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selecione o Tipo de Checklist</Text>
              <TouchableOpacity
                style={[
                  styles.tipoCard,
                  selectedTipo === "LIMPEZA" && styles.tipoCardSelected,
                ]}
                onPress={() => setSelectedTipo("LIMPEZA")}
              >
                <Ionicons
                  name="sparkles"
                  size={32}
                  color={selectedTipo === "LIMPEZA" ? "#009ee2" : "#666"}
                />
                <Text style={styles.tipoTitle}>Serviços de Limpeza</Text>
                <Text style={styles.tipoSubtitle}>
                  Solicitar serviços de limpeza e retirada de lixo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tipoCard,
                  selectedTipo === "INSUMOS" && styles.tipoCardSelected,
                ]}
                onPress={() => setSelectedTipo("INSUMOS")}
              >
                <Ionicons
                  name="droplets"
                  size={32}
                  color={selectedTipo === "INSUMOS" ? "#009ee2" : "#666"}
                />
                <Text style={styles.tipoTitle}>Reposição de Insumos</Text>
                <Text style={styles.tipoSubtitle}>
                  Solicitar reposição de insumos do banheiro
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tipoCard,
                  selectedTipo === "SATISFACAO" && styles.tipoCardSelected,
                ]}
                onPress={() => setSelectedTipo("SATISFACAO")}
              >
                <Ionicons
                  name="star"
                  size={32}
                  color={selectedTipo === "SATISFACAO" ? "#009ee2" : "#666"}
                />
                <Text style={styles.tipoTitle}>Pesquisa de Satisfação</Text>
                <Text style={styles.tipoSubtitle}>
                  Avaliar a qualidade dos serviços de limpeza
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Tela do formulário
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedTipo) {
              setSelectedTipo(null);
            } else {
              setSelectedUnidade(null);
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {selectedTipo === "LIMPEZA" && "Serviços de Limpeza"}
            {selectedTipo === "INSUMOS" && "Reposição de Insumos"}
            {selectedTipo === "SATISFACAO" && "Pesquisa de Satisfação"}
          </Text>
          <Text style={styles.headerSubtitle}>{selectedUnidade.nome}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {selectedTipo === "LIMPEZA" && (
          <View style={styles.section}>
            <Text style={styles.label}>Quais serviços você precisa?</Text>
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                servicosLimpeza.includes("LIMPEZA") && styles.checkboxCardSelected,
              ]}
              onPress={() => handleToggleServico("LIMPEZA")}
            >
              <Ionicons
                name={servicosLimpeza.includes("LIMPEZA") ? "checkbox" : "square-outline"}
                size={24}
                color={servicosLimpeza.includes("LIMPEZA") ? "#009ee2" : "#666"}
              />
              <Text style={styles.checkboxLabel}>Limpeza geral</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                servicosLimpeza.includes("RETIRADA_LIXO") && styles.checkboxCardSelected,
              ]}
              onPress={() => handleToggleServico("RETIRADA_LIXO")}
            >
              <Ionicons
                name={servicosLimpeza.includes("RETIRADA_LIXO") ? "checkbox" : "square-outline"}
                size={24}
                color={servicosLimpeza.includes("RETIRADA_LIXO") ? "#009ee2" : "#666"}
              />
              <Text style={styles.checkboxLabel}>Retirada de lixo</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Foto (opcional)</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={tirarFoto}>
                <Ionicons name="camera" size={20} color="#009ee2" />
                <Text style={styles.photoButtonText}>Tirar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={selecionarFoto}>
                <Ionicons name="image" size={20} color="#009ee2" />
                <Text style={styles.photoButtonText}>Escolher da Galeria</Text>
              </TouchableOpacity>
            </View>
            {foto && (
              <View style={styles.photoPreview}>
                <Text style={styles.photoPreviewText}>Foto selecionada</Text>
                <TouchableOpacity onPress={() => setFoto(null)}>
                  <Ionicons name="close-circle" size={24} color="#f44336" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {selectedTipo === "INSUMOS" && (
          <View style={styles.section}>
            <Text style={styles.label}>Quais insumos você gostaria de solicitar?</Text>
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                insumosSolicitados.includes("ALCOOL_HIGIENIZACAO") &&
                  styles.checkboxCardSelected,
              ]}
              onPress={() => handleToggleInsumo("ALCOOL_HIGIENIZACAO")}
            >
              <Ionicons
                name={
                  insumosSolicitados.includes("ALCOOL_HIGIENIZACAO")
                    ? "checkbox"
                    : "square-outline"
                }
                size={24}
                color={
                  insumosSolicitados.includes("ALCOOL_HIGIENIZACAO") ? "#009ee2" : "#666"
                }
              />
              <Text style={styles.checkboxLabel}>Álcool higienização mãos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                insumosSolicitados.includes("PAPEL_HIGIENICO") && styles.checkboxCardSelected,
              ]}
              onPress={() => handleToggleInsumo("PAPEL_HIGIENICO")}
            >
              <Ionicons
                name={insumosSolicitados.includes("PAPEL_HIGIENICO") ? "checkbox" : "square-outline"}
                size={24}
                color={insumosSolicitados.includes("PAPEL_HIGIENICO") ? "#009ee2" : "#666"}
              />
              <Text style={styles.checkboxLabel}>Papel higiênico</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                insumosSolicitados.includes("PAPEL_TOALHA") && styles.checkboxCardSelected,
              ]}
              onPress={() => handleToggleInsumo("PAPEL_TOALHA")}
            >
              <Ionicons
                name={insumosSolicitados.includes("PAPEL_TOALHA") ? "checkbox" : "square-outline"}
                size={24}
                color={insumosSolicitados.includes("PAPEL_TOALHA") ? "#009ee2" : "#666"}
              />
              <Text style={styles.checkboxLabel}>Papel toalha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.checkboxCard,
                insumosSolicitados.includes("SABONETE") && styles.checkboxCardSelected,
              ]}
              onPress={() => handleToggleInsumo("SABONETE")}
            >
              <Ionicons
                name={insumosSolicitados.includes("SABONETE") ? "checkbox" : "square-outline"}
                size={24}
                color={insumosSolicitados.includes("SABONETE") ? "#009ee2" : "#666"}
              />
              <Text style={styles.checkboxLabel}>Sabonete</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedTipo === "SATISFACAO" && (
          <View style={styles.section}>
            <Text style={styles.label}>Como você avalia a limpeza?</Text>
            {(["MUITO_RUIM", "RUIM", "REGULAR", "BOM", "MUITO_BOM"] as const).map((avaliacao) => {
              const labels: Record<string, string> = {
                MUITO_RUIM: "Muito Ruim",
                RUIM: "Ruim",
                REGULAR: "Regular",
                BOM: "Bom",
                MUITO_BOM: "Muito Bom",
              };
              return (
                <TouchableOpacity
                  key={avaliacao}
                  style={[
                    styles.radioCard,
                    avaliacaoLimpeza === avaliacao && styles.radioCardSelected,
                  ]}
                  onPress={() => setAvaliacaoLimpeza(avaliacao)}
                >
                  <Ionicons
                    name={avaliacaoLimpeza === avaliacao ? "radio-button-on" : "radio-button-off"}
                    size={24}
                    color={avaliacaoLimpeza === avaliacao ? "#009ee2" : "#666"}
                  />
                  <Text style={styles.radioLabel}>{labels[avaliacao]}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.label}>O que influenciou sua avaliação? (opcional)</Text>
            {([
              "CHEIRO",
              "DISPONIBILIDADE_INSUMOS",
              "LIMPEZA_SUPERFICIES",
              "POSTURA_EQUIPE",
              "RECOLHIMENTO_LIXO",
            ] as const).map((fator) => {
              const labels: Record<string, string> = {
                CHEIRO: "Cheiro",
                DISPONIBILIDADE_INSUMOS: "Disponibilidade de insumos",
                LIMPEZA_SUPERFICIES: "Limpeza de superfícies",
                POSTURA_EQUIPE: "Postura da equipe",
                RECOLHIMENTO_LIXO: "Recolhimento de lixo",
              };
              return (
                <TouchableOpacity
                  key={fator}
                  style={[
                    styles.checkboxCard,
                    fatoresInfluencia.includes(fator) && styles.checkboxCardSelected,
                  ]}
                  onPress={() => handleToggleFator(fator)}
                >
                  <Ionicons
                    name={fatoresInfluencia.includes(fator) ? "checkbox" : "square-outline"}
                    size={24}
                    color={fatoresInfluencia.includes(fator) ? "#009ee2" : "#666"}
                  />
                  <Text style={styles.checkboxLabel}>{labels[fator]}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.label}>Comentários (opcional)</Text>
            <TextInput
              style={styles.textInput}
              value={comentarios}
              onChangeText={setComentarios}
              placeholder="Adicione seus comentários..."
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Enviar Checklist</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#009ee2",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
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
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  unidadeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
  },
  unidadeCardSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e8f5ff",
  },
  unidadeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  unidadeNome: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  unidadeGrupo: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  tipoCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  tipoCardSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e8f5ff",
  },
  tipoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 4,
  },
  tipoSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 8,
  },
  checkboxCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  checkboxCardSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e8f5ff",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  radioCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  radioCardSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e8f5ff",
  },
  radioLabel: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
    minHeight: 100,
    textAlignVertical: "top",
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#009ee2",
    backgroundColor: "#fff",
  },
  photoButtonText: {
    fontSize: 14,
    color: "#009ee2",
    fontWeight: "600",
    marginLeft: 8,
  },
  photoPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#e8f5ff",
    borderWidth: 1,
    borderColor: "#009ee2",
  },
  photoPreviewText: {
    fontSize: 14,
    color: "#009ee2",
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#009ee2",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});
