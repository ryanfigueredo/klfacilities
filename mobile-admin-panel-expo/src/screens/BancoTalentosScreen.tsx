import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";

interface Curriculo {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  arquivoUrl: string;
  observacoes: string | null;
  status: string;
  createdAt: string;
  unidade: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "#FF9800" },
  CONTATADO: { label: "Contatado", color: "#2196F3" },
  CONTRATADO: { label: "Contratado", color: "#4CAF50" },
  DESCARTADO: { label: "Descartado", color: "#f44336" },
};

export default function BancoTalentosScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [curriculos, setCurriculos] = useState<Curriculo[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  useEffect(() => {
    carregarCurriculos();
  }, [selectedStatus]);

  const carregarCurriculos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus) {
        params.append("status", selectedStatus);
      }

      const response = await api.get<{ curriculos: Curriculo[] }>(
        `/api/curriculos?${params.toString()}`
      );

      if (response.data.curriculos) {
        setCurriculos(response.data.curriculos);
      }
    } catch (error: any) {
      console.error("Erro ao carregar currículos:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível carregar os currículos. Verifique sua conexão e tente novamente.";
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarCurriculos();
  };

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      const dia = String(data.getDate()).padStart(2, "0");
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const ano = data.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch {
      return dataString;
    }
  };

  const handleLigar = (telefone: string) => {
    Linking.openURL(`tel:${telefone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleVerCurriculo = (arquivoUrl: string) => {
    if (arquivoUrl && !arquivoUrl.startsWith("manual://")) {
      Linking.openURL(arquivoUrl);
    } else {
      Alert.alert("Aviso", "Currículo não disponível para visualização.");
    }
  };

  const curriculosFiltrados = selectedStatus
    ? curriculos.filter((c) => c.status === selectedStatus)
    : curriculos;

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
          <Text style={styles.headerTitle}>Banco de Talentos</Text>
          <Text style={styles.headerSubtitle}>
            {curriculos.length} candidato{curriculos.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              !selectedStatus ? styles.filterButtonActive : null,
            ]}
            onPress={() => setSelectedStatus("")}
          >
            <Text
              style={[
                styles.filterButtonText,
                !selectedStatus ? styles.filterButtonTextActive : null,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          {Object.entries(STATUS_LABELS).map(([status, info]) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status ? styles.filterButtonActive : null,
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === status
                    ? styles.filterButtonTextActive
                    : null,
                ]}
              >
                {info.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009ee2" />
          <Text style={styles.loadingText}>Carregando candidatos...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {curriculosFiltrados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {selectedStatus
                  ? `Nenhum candidato com status "${STATUS_LABELS[selectedStatus]?.label || selectedStatus}"`
                  : "Nenhum candidato encontrado"}
              </Text>
              <Text style={styles.emptyText}>
                {selectedStatus
                  ? "Tente selecionar outro filtro."
                  : "Ainda não há candidatos cadastrados para suas unidades."}
              </Text>
            </View>
          ) : (
            curriculosFiltrados.map((curriculo) => {
              const statusInfo =
                STATUS_LABELS[curriculo.status] ||
                STATUS_LABELS.PENDENTE;
              const nomeCompleto = `${curriculo.nome} ${curriculo.sobrenome}`;

              return (
                <View key={curriculo.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="person" size={24} color="#009ee2" />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {nomeCompleto}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          {curriculo.unidade.cidade || curriculo.unidade.nome}
                          {curriculo.unidade.estado &&
                            ` - ${curriculo.unidade.estado}`}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusInfo.color + "20" },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusInfo.color }]}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>{curriculo.telefone}</Text>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleLigar(curriculo.telefone)}
                      >
                        <Ionicons name="call" size={18} color="#4CAF50" />
                      </TouchableOpacity>
                    </View>
                    {curriculo.email && (
                      <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={16} color="#666" />
                        <Text style={styles.infoText} numberOfLines={1}>
                          {curriculo.email}
                        </Text>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEmail(curriculo.email!)}
                        >
                          <Ionicons name="mail" size={18} color="#2196F3" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {curriculo.endereco && (
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.infoText} numberOfLines={2}>
                          {curriculo.endereco}
                        </Text>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>
                        Cadastrado em: {formatarData(curriculo.createdAt)}
                      </Text>
                    </View>
                    {curriculo.observacoes && (
                      <View style={styles.observacoesContainer}>
                        <Text style={styles.observacoesLabel}>Observações:</Text>
                        <Text style={styles.observacoesText}>
                          {curriculo.observacoes}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.curriculoButton}
                      onPress={() => handleVerCurriculo(curriculo.arquivoUrl)}
                      disabled={curriculo.arquivoUrl.startsWith("manual://")}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={
                          curriculo.arquivoUrl.startsWith("manual://")
                            ? "#999"
                            : "#009ee2"
                        }
                      />
                      <Text
                        style={[
                          styles.curriculoButtonText,
                          curriculo.arquivoUrl.startsWith("manual://") &&
                            styles.curriculoButtonTextDisabled,
                        ]}
                      >
                        Ver Currículo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
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
  filtersContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterButtonActive: {
    backgroundColor: "#009ee2",
    borderColor: "#009ee2",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    flex: 1,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  observacoesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  observacoesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  observacoesText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  curriculoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  curriculoButtonText: {
    fontSize: 14,
    color: "#009ee2",
    fontWeight: "600",
    marginLeft: 8,
  },
  curriculoButtonTextDisabled: {
    color: "#999",
  },
});
