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
import { obterIncidentes, Incidente } from "../services/api";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ABERTO: { label: "Aberto", color: "#f44336" },
  CONCLUIDO: { label: "Concluído", color: "#4CAF50" },
};

const URGENCIA_COLORS: Record<string, string> = {
  CRITICA: "#d32f2f",
  ALTA: "#f57c00",
  NORMAL: "#1976d2",
  BAIXA: "#388e3c",
  MUITO_BAIXA: "#7b1fa2",
};

export default function IncidentesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    carregarIncidentes();
  }, [selectedStatus]);

  const carregarIncidentes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }

      const response = await obterIncidentes(params);
      if (response.incidentes) {
        setIncidentes(response.incidentes);
      }
    } catch (error: any) {
      console.error("Erro ao carregar incidentes:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível carregar os incidentes. Verifique sua conexão e tente novamente.";
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarIncidentes();
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

  const handleSearch = () => {
    carregarIncidentes();
  };

  const incidentesFiltrados = incidentes;

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
          <Text style={styles.headerTitle}>Incidentes</Text>
          <Text style={styles.headerSubtitle}>
            {incidentes.length} incidente{incidentes.length !== 1 ? "s" : ""}
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
          placeholder="Buscar por título ou descrição..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              carregarIncidentes();
            }}
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
          <Text style={styles.loadingText}>Carregando incidentes...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {incidentesFiltrados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="warning-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {selectedStatus || searchQuery
                  ? "Nenhum incidente encontrado"
                  : "Nenhum incidente encontrado"}
              </Text>
              <Text style={styles.emptyText}>
                {selectedStatus || searchQuery
                  ? "Tente ajustar os filtros ou a busca."
                  : "Ainda não há incidentes cadastrados."}
              </Text>
            </View>
          ) : (
            incidentesFiltrados.map((incidente) => {
              const statusInfo =
                STATUS_LABELS[incidente.status] || STATUS_LABELS.ABERTO;
              const urgenciaColor =
                incidente.categoriaUrgencia?.urgenciaNivel
                  ? URGENCIA_COLORS[incidente.categoriaUrgencia.urgenciaNivel] ||
                    "#666"
                  : "#666";

              return (
                <View key={incidente.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="warning" size={24} color={urgenciaColor} />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {incidente.titulo}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          {incidente.unidade.nome}
                          {incidente.unidade.cidade &&
                            ` - ${incidente.unidade.cidade}`}
                          {incidente.unidade.estado &&
                            `/${incidente.unidade.estado}`}
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
                    <Text style={styles.descricaoText} numberOfLines={3}>
                      {incidente.descricao}
                    </Text>

                    {incidente.categoriaUrgencia && (
                      <View style={styles.urgenciaContainer}>
                        <View
                          style={[
                            styles.urgenciaBadge,
                            { backgroundColor: urgenciaColor + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.urgenciaText,
                              { color: urgenciaColor },
                            ]}
                          >
                            {incidente.categoriaUrgencia.nome}
                          </Text>
                        </View>
                        {incidente.categoriaUrgencia.prazoHoras && (
                          <Text style={styles.prazoText}>
                            Prazo: {incidente.categoriaUrgencia.prazoHoras}h
                          </Text>
                        )}
                      </View>
                    )}

                    {incidente.grupo && (
                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{incidente.grupo.nome}</Text>
                      </View>
                    )}

                    {incidente.criadoPor && (
                      <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                          Criado por: {incidente.criadoPor.name}
                        </Text>
                      </View>
                    )}

                    {incidente.concluidoPor && (
                      <View style={styles.infoRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                        <Text style={styles.infoText}>
                          Concluído por: {incidente.concluidoPor.name}
                        </Text>
                      </View>
                    )}

                    {incidente.conclusaoNotas && (
                      <View style={styles.observacoesContainer}>
                        <Text style={styles.observacoesLabel}>
                          Notas de Conclusão:
                        </Text>
                        <Text style={styles.observacoesText}>
                          {incidente.conclusaoNotas}
                        </Text>
                      </View>
                    )}

                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>
                        Criado em: {formatarData(incidente.createdAt)}
                      </Text>
                    </View>

                    {incidente.concluidoEm && (
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#4CAF50" />
                        <Text style={styles.infoText}>
                          Concluído em: {formatarData(incidente.concluidoEm)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {incidente.imagemUrl && (
                    <View style={styles.imageContainer}>
                      <Ionicons name="image-outline" size={20} color="#009ee2" />
                      <Text style={styles.imageText}>Imagem anexada</Text>
                    </View>
                  )}
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
  descricaoText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  urgenciaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  urgenciaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  urgenciaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  prazoText: {
    fontSize: 12,
    color: "#666",
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
  imageContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#e8f5ff",
    borderRadius: 8,
    marginTop: 8,
  },
  imageText: {
    fontSize: 14,
    color: "#009ee2",
    marginLeft: 8,
    fontWeight: "500",
  },
});
