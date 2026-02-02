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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as NetInfo from "@react-native-community/netinfo";
import {
  obterChecklistsRespondidos,
  obterChecklistsEmAberto,
  obterChecklistsPendentes,
} from "../services/api";
import { getLocalDraftEscopoIds, getEscopoCache } from "../services/offlineSync";

export default function ChecklistsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondidos, setRespondidos] = useState<any[]>([]);
  const [rascunhos, setRascunhos] = useState<any[]>([]);
  const [escopos, setEscopos] = useState<any[]>([]);
  const [localDrafts, setLocalDrafts] = useState<{ escopoId: string; titulo?: string; unidade?: string }[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    carregarChecklists();
  }, []);

  const carregarChecklists = async () => {
    try {
      setLoading(true);
      const netStatus = await NetInfo.fetch();
      const offline = !netStatus.isConnected;
      setIsOffline(offline);

      if (offline) {
        // Offline: carregar rascunhos locais
        const escopoIds = await getLocalDraftEscopoIds();
        const drafts: { escopoId: string; titulo?: string; unidade?: string }[] = [];
        for (const escopoId of escopoIds) {
          const cached = await getEscopoCache(escopoId);
          drafts.push({
            escopoId,
            titulo: cached?.escopo?.template?.titulo || "Rascunho",
            unidade: cached?.escopo?.unidade?.nome,
          });
        }
        setLocalDrafts(drafts);
        setRespondidos([]);
      } else {
        // Online: carregar escopos, rascunhos e respondidos
        setLocalDrafts([]);
        try {
          const [responsePendentes, responseRascunhos, responseRespondidos] = await Promise.all([
            obterChecklistsPendentes(),
            obterChecklistsEmAberto(),
            obterChecklistsRespondidos(),
          ]);
          if (responsePendentes.escopos) {
            setEscopos(responsePendentes.escopos);
          }
          if (responseRascunhos.respostas) {
            setRascunhos(responseRascunhos.respostas);
          }
          if (responseRespondidos.respostas) {
            setRespondidos(responseRespondidos.respostas);
          }
        } catch (error) {
          console.error("Erro ao carregar checklists:", error);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar checklists:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Não foi possível carregar os checklists. Verifique sua conexão e tente novamente.";
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarChecklists();
  };

  const formatarData = (dataString: string | null) => {
    if (!dataString) return "Nunca";
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
          <Text style={styles.headerTitle}>Checklists</Text>
          <Text style={styles.headerSubtitle}>
            {!isOffline && rascunhos.length > 0
              ? `${rascunhos.length} em andamento • ${respondidos.length} concluído${respondidos.length !== 1 ? "s" : ""}`
              : `${respondidos.length} concluído${respondidos.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("NovoChecklist" as never)}
          style={styles.newButton}
        >
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#009ee2" />
          <Text style={styles.loadingText}>Carregando checklists...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Botão Iniciar Checklist - online apenas */}
          <TouchableOpacity
            style={[styles.iniciarButton, isOffline && styles.iniciarButtonDisabled]}
            onPress={() => {
              if (isOffline) {
                Alert.alert("Offline", "Conecte-se à internet para iniciar um novo checklist.");
              } else {
                navigation.navigate("NovoChecklist" as never);
              }
            }}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.iniciarButtonText}>
              {isOffline ? "Iniciar Checklist (requer internet)" : "Iniciar Checklist"}
            </Text>
          </TouchableOpacity>

          {/* Rascunhos em andamento - quando online */}
          {!isOffline && rascunhos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Em andamento ({rascunhos.length})</Text>
              {rascunhos.map((rascunho) => {
                const escopoCorrespondente = escopos.find(
                  (e: any) =>
                    e.template?.id === rascunho.template?.id &&
                    e.unidade?.id === rascunho.unidade?.id
                );
                return (
                  <TouchableOpacity
                    key={rascunho.id}
                    style={styles.card}
                    onPress={() =>
                      escopoCorrespondente
                        ? navigation.navigate("ResponderChecklist" as never, {
                            escopoId: escopoCorrespondente.id,
                          } as never)
                        : Alert.alert("Erro", "Escopo não encontrado para este rascunho.")
                    }
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Ionicons name="document-text" size={24} color="#FF9800" />
                        <View style={styles.cardTitleContainer}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {rascunho.template?.titulo || "Rascunho"}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: "#FF980020" }]}>
                        <Text style={[styles.statusText, { color: "#FF9800" }]}>Rascunho</Text>
                      </View>
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{rascunho.unidade?.nome}</Text>
                      </View>
                      {rascunho.grupo && (
                        <View style={styles.infoRow}>
                          <Ionicons name="people-outline" size={16} color="#666" />
                          <Text style={styles.infoText}>{rascunho.grupo.nome}</Text>
                        </View>
                      )}
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                          Última atualização: {formatarData(rascunho.updatedAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardActionText}>Toque para continuar</Text>
                      <Ionicons name="chevron-forward" size={20} color="#009ee2" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Rascunhos locais - quando offline */}
          {isOffline && localDrafts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Rascunhos locais (offline)</Text>
              {localDrafts.map((draft) => (
                <TouchableOpacity
                  key={draft.escopoId}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate("ResponderChecklist" as never, { escopoId: draft.escopoId } as never)
                  }
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="document-text" size={24} color="#FF9800" />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {draft.titulo || "Rascunho"}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: "#FF980020" }]}>
                      <Text style={[styles.statusText, { color: "#FF9800" }]}>Offline</Text>
                    </View>
                  </View>
                  {draft.unidade && (
                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{draft.unidade}</Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardActionText}>Toque para continuar</Text>
                    <Ionicons name="chevron-forward" size={20} color="#009ee2" />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>
            {isOffline ? "Checklists Concluídos (carregar quando online)" : "Checklists Concluídos"}
          </Text>

          {respondidos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Nenhum checklist concluído</Text>
              <Text style={styles.emptyText}>
                Toque em "Iniciar Checklist" acima para começar. Você escolherá a loja, unidade e responderá pergunta por pergunta.
              </Text>
            </View>
          ) : (
            respondidos.map((respondido) => {
                const confirmacoesEnviadas = respondido.confirmacoes?.length || 0;
                const confirmacoesRecebidas = respondido.confirmacoes?.filter((c: any) => c.confirmado).length || 0;

                return (
                  <TouchableOpacity
                    key={respondido.id}
                    style={styles.card}
                    onPress={() => {
                      navigation.navigate("VisualizarChecklistRespondido" as never, {
                        respostaId: respondido.id,
                      } as never);
                    }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" />
                        <View style={styles.cardTitleContainer}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {respondido.template.titulo}
                          </Text>
                          {respondido.template.descricao && (
                            <Text style={styles.cardDescription} numberOfLines={1}>
                              {respondido.template.descricao}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: "#4CAF5020" }]}>
                        <Text style={[styles.statusText, { color: "#4CAF50" }]}>Concluído</Text>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{respondido.unidade.nome}</Text>
                      </View>
                      {respondido.grupo && (
                        <View style={styles.infoRow}>
                          <Ionicons name="people-outline" size={16} color="#666" />
                          <Text style={styles.infoText}>{respondido.grupo.nome}</Text>
                        </View>
                      )}
                      {respondido.protocolo && (
                        <View style={styles.infoRow}>
                          <Ionicons name="document-text-outline" size={16} color="#666" />
                          <Text style={styles.infoText}>Protocolo: {respondido.protocolo}</Text>
                        </View>
                      )}
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                          Enviado em: {formatarData(respondido.submittedAt)}
                        </Text>
                      </View>
                      {confirmacoesEnviadas > 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons name="mail-outline" size={16} color="#666" />
                          <Text style={styles.infoText}>
                            {confirmacoesRecebidas} de {confirmacoesEnviadas} confirmação{confirmacoesEnviadas !== 1 ? "ões" : ""} recebida{confirmacoesRecebidas !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.cardActionText}>Toque para visualizar</Text>
                      <Ionicons name="chevron-forward" size={20} color="#009ee2" />
                    </View>
                  </TouchableOpacity>
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
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
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
  iniciarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#009ee2",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iniciarButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  iniciarButtonDisabled: {
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 24,
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabAtiva: {
    borderBottomColor: "#009ee2",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  tabTextAtiva: {
    color: "#009ee2",
    fontWeight: "600",
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
  cardInativo: {
    opacity: 0.6,
    backgroundColor: "#f5f5f5",
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
  cardDescription: {
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
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  cardActionText: {
    fontSize: 14,
    color: "#009ee2",
    fontWeight: "600",
  },
});

