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
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { obterAvaliacoes, Avaliacao } from "../services/api";

const TIPO_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  LIMPEZA: { label: "Limpeza", color: "#2196F3", icon: "sparkles" },
  INSUMOS: { label: "Insumos", color: "#FF9800", icon: "cube" },
  SATISFACAO: { label: "Satisfação", color: "#4CAF50", icon: "star" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "#FF9800" },
  CONCLUIDO: { label: "Concluído", color: "#4CAF50" },
  CANCELADO: { label: "Cancelado", color: "#f44336" },
};

const AVALIACAO_LABELS: Record<string, string> = {
  MUITO_RUIM: "Muito Ruim",
  RUIM: "Ruim",
  REGULAR: "Regular",
  BOM: "Bom",
  MUITO_BOM: "Muito Bom",
};

export default function AvaliacoesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    carregarAvaliacoes();
  }, [selectedTipo, selectedStatus]);

  const carregarAvaliacoes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedTipo) {
        params.tipo = selectedTipo;
      }
      // Nota: A API não suporta filtro direto por status do ticket
      // Vamos filtrar no cliente

      const response = await obterAvaliacoes(params);
      if (response.data?.checklists) {
        let checklists = response.data.checklists;
        // Filtrar por status do ticket no cliente
        if (selectedStatus) {
          checklists = checklists.filter((avaliacao) => {
            if (!avaliacao.ticket) return selectedStatus === "";
            return avaliacao.ticket.status === selectedStatus;
          });
        }
        setAvaliacoes(checklists);
      }
    } catch (error: any) {
      console.error("Erro ao carregar avaliações:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível carregar as avaliações. Verifique sua conexão e tente novamente.";
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarAvaliacoes();
  };

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      const dia = String(data.getDate()).padStart(2, "0");
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const ano = data.getFullYear();
      const hora = String(data.getHours()).padStart(2, "0");
      const minuto = String(data.getMinutes()).padStart(2, "0");
      return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    } catch {
      return dataString;
    }
  };

  const avaliacoesFiltradas = avaliacoes.filter((avaliacao) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      avaliacao.unidade.nome.toLowerCase().includes(query) ||
      (avaliacao.comentarios &&
        avaliacao.comentarios.toLowerCase().includes(query))
    );
  });

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
          <Text style={styles.headerTitle}>Avaliações</Text>
          <Text style={styles.headerSubtitle}>
            {avaliacoes.length} avaliação{avaliacoes.length !== 1 ? "ões" : ""}
          </Text>
        </View>
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por unidade ou comentários..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              !selectedTipo ? styles.filterButtonActive : null,
            ]}
            onPress={() => setSelectedTipo("")}
          >
            <Text
              style={[
                styles.filterButtonText,
                !selectedTipo ? styles.filterButtonTextActive : null,
              ]}
            >
              Todos Tipos
            </Text>
          </TouchableOpacity>
          {Object.entries(TIPO_LABELS).map(([tipo, info]) => (
            <TouchableOpacity
              key={tipo}
              style={[
                styles.filterButton,
                selectedTipo === tipo ? styles.filterButtonActive : null,
              ]}
              onPress={() => setSelectedTipo(tipo)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedTipo === tipo
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

      {/* Filtro de Status */}
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
              Todos Status
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
          <Text style={styles.loadingText}>Carregando avaliações...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {avaliacoesFiltradas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {selectedTipo || selectedStatus || searchQuery
                  ? "Nenhuma avaliação encontrada"
                  : "Nenhuma avaliação encontrada"}
              </Text>
              <Text style={styles.emptyText}>
                {selectedTipo || selectedStatus || searchQuery
                  ? "Tente ajustar os filtros ou a busca."
                  : "Ainda não há avaliações cadastradas."}
              </Text>
            </View>
          ) : (
            avaliacoesFiltradas.map((avaliacao) => {
              const tipoInfo =
                TIPO_LABELS[avaliacao.tipo] || TIPO_LABELS.LIMPEZA;
              const statusInfo = avaliacao.ticket
                ? STATUS_LABELS[avaliacao.ticket.status] ||
                  STATUS_LABELS.PENDENTE
                : null;

              return (
                <View key={avaliacao.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons
                        name={tipoInfo.icon as any}
                        size={24}
                        color={tipoInfo.color}
                      />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>
                          {tipoInfo.label}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          {avaliacao.unidade.nome}
                        </Text>
                      </View>
                    </View>
                    {statusInfo && (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusInfo.color + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: statusInfo.color },
                          ]}
                        >
                          {statusInfo.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    {avaliacao.tipo === "LIMPEZA" &&
                      avaliacao.servicosLimpeza &&
                      avaliacao.servicosLimpeza.length > 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons name="list-outline" size={16} color="#666" />
                          <Text style={styles.infoText}>
                            Serviços: {avaliacao.servicosLimpeza.join(", ")}
                          </Text>
                        </View>
                      )}

                    {avaliacao.tipo === "INSUMOS" &&
                      avaliacao.insumosSolicitados &&
                      avaliacao.insumosSolicitados.length > 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons name="cube-outline" size={16} color="#666" />
                          <Text style={styles.infoText}>
                            Insumos: {avaliacao.insumosSolicitados.join(", ")}
                          </Text>
                        </View>
                      )}

                    {avaliacao.tipo === "SATISFACAO" && (
                      <>
                        {avaliacao.avaliacaoLimpeza && (
                          <View style={styles.avaliacaoContainer}>
                            <View
                              style={[
                                styles.avaliacaoBadge,
                                {
                                  backgroundColor:
                                    avaliacao.avaliacaoLimpeza === "MUITO_BOM"
                                      ? "#4CAF50"
                                      : avaliacao.avaliacaoLimpeza === "BOM"
                                      ? "#8BC34A"
                                      : avaliacao.avaliacaoLimpeza === "REGULAR"
                                      ? "#FFC107"
                                      : avaliacao.avaliacaoLimpeza === "RUIM"
                                      ? "#FF9800"
                                      : "#f44336",
                                },
                              ]}
                            >
                              <Text style={styles.avaliacaoText}>
                                {AVALIACAO_LABELS[avaliacao.avaliacaoLimpeza] ||
                                  avaliacao.avaliacaoLimpeza}
                              </Text>
                            </View>
                          </View>
                        )}

                        {avaliacao.fatoresInfluencia &&
                          avaliacao.fatoresInfluencia.length > 0 && (
                            <View style={styles.infoRow}>
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={16}
                                color="#666"
                              />
                              <Text style={styles.infoText}>
                                Fatores: {avaliacao.fatoresInfluencia.join(", ")}
                              </Text>
                            </View>
                          )}
                      </>
                    )}

                    {avaliacao.comentarios && (
                      <View style={styles.observacoesContainer}>
                        <Text style={styles.observacoesLabel}>Comentários:</Text>
                        <Text style={styles.observacoesText}>
                          {avaliacao.comentarios}
                        </Text>
                      </View>
                    )}

                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>
                        {formatarData(avaliacao.timestamp)}
                      </Text>
                    </View>

                    {avaliacao.ticket?.concluidoEm && (
                      <View style={styles.infoRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.infoText}>
                          Concluído em: {formatarData(avaliacao.ticket.concluidoEm)}
                        </Text>
                      </View>
                    )}

                    {avaliacao.ticket?.concluidoPor && (
                      <View style={styles.infoRow}>
                        <Ionicons name="person" size={16} color="#4CAF50" />
                        <Text style={styles.infoText}>
                          Por: {avaliacao.ticket.concluidoPor}
                        </Text>
                      </View>
                    )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    marginLeft: 8,
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
  avaliacaoContainer: {
    marginBottom: 12,
  },
  avaliacaoBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  avaliacaoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
