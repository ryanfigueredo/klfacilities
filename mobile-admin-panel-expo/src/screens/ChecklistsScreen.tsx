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
import {
  obterChecklistsPendentes,
  obterChecklistsEmAberto,
  obterChecklistsRespondidos,
  ChecklistEscopo,
} from "../services/api";
import { normalizeBoolean } from "../utils/booleanUtils";

export default function ChecklistsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [escopos, setEscopos] = useState<ChecklistEscopo[]>([]);
  const [rascunhos, setRascunhos] = useState<any[]>([]);
  const [respondidos, setRespondidos] = useState<any[]>([]);
  const [tabAtiva, setTabAtiva] = useState<"pendentes" | "rascunhos" | "respondidos">("pendentes");

  useEffect(() => {
    carregarChecklists();
  }, []);

  // Recarregar quando a tab mudar
  useEffect(() => {
    if (tabAtiva === "respondidos" && respondidos.length === 0) {
      // Carregar respondidos quando a tab for ativada pela primeira vez
      const carregarRespondidos = async () => {
        try {
          const responseRespondidos = await obterChecklistsRespondidos();
          if (responseRespondidos.respostas) {
            setRespondidos(responseRespondidos.respostas);
          }
        } catch (error) {
          console.error("Erro ao carregar checklists respondidos:", error);
        }
      };
      carregarRespondidos();
    }
  }, [tabAtiva]);


  const carregarChecklists = async () => {
    try {
      setLoading(true);
      
      // Carregar checklists pendentes
      const responsePendentes = await obterChecklistsPendentes();
      if (responsePendentes.escopos) {
        // Normalizar valores boolean que podem vir como strings da API
        const escoposNormalizados = responsePendentes.escopos.map((escopo: any) => ({
          ...escopo,
          ativo: normalizeBoolean(escopo.ativo),
        }));
        setEscopos(escoposNormalizados);
      }

      // Carregar rascunhos em aberto
      try {
        const responseRascunhos = await obterChecklistsEmAberto();
        if (responseRascunhos.respostas) {
          setRascunhos(responseRascunhos.respostas);
        }
      } catch (error) {
        console.error("Erro ao carregar rascunhos:", error);
        // Não bloquear se falhar ao carregar rascunhos
      }

      // Carregar checklists respondidos se a tab estiver ativa
      if (tabAtiva === "respondidos") {
        try {
          const responseRespondidos = await obterChecklistsRespondidos();
          if (responseRespondidos.respostas) {
            setRespondidos(responseRespondidos.respostas);
          }
        } catch (error) {
          console.error("Erro ao carregar checklists respondidos:", error);
          // Não bloquear se falhar ao carregar respondidos
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

  const getStatusBadge = (escopo: ChecklistEscopo) => {
    if (escopo.ultimoEnvioEm) {
      const ultimoEnvio = new Date(escopo.ultimoEnvioEm);
      const agora = new Date();
      const diffMs = agora.getTime() - ultimoEnvio.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < 1) {
        return { text: "Enviado hoje", color: "#4CAF50" };
      } else if (diffDays < 7) {
        return { text: `Enviado há ${Math.floor(diffDays)} dias`, color: "#FF9800" };
      } else {
        return { text: `Enviado há ${Math.floor(diffDays)} dias`, color: "#f44336" };
      }
    }
    return { text: "Pendente", color: "#f44336" };
  };

  const handleEscopoPress = async (escopo: ChecklistEscopo) => {
    if (!normalizeBoolean(escopo.ativo)) {
      Alert.alert("Checklist Inativo", "Este checklist está inativo.");
      return;
    }

    try {
      // Navegar para a tela de responder checklist
      navigation.navigate("ResponderChecklist" as never, { escopoId: escopo.id } as never);
    } catch (error: any) {
      console.error("Erro ao abrir checklist:", error);
      Alert.alert("Erro", "Não foi possível abrir o checklist.");
    }
  };

  const escoposOrdenados = [...escopos].sort((a, b) => {
    // Prioridade: pendentes primeiro, depois por data de envio (mais antigos primeiro)
    if (!a.ultimoEnvioEm && b.ultimoEnvioEm) return -1;
    if (a.ultimoEnvioEm && !b.ultimoEnvioEm) return 1;
    if (!a.ultimoEnvioEm && !b.ultimoEnvioEm) return 0;
    
    const dataA = new Date(a.ultimoEnvioEm!).getTime();
    const dataB = new Date(b.ultimoEnvioEm!).getTime();
    return dataA - dataB;
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
          <Text style={styles.headerTitle}>Checklists</Text>
          <Text style={styles.headerSubtitle}>
            {tabAtiva === "pendentes"
              ? `${escopos.length} pendente${escopos.length !== 1 ? "s" : ""}`
              : tabAtiva === "rascunhos"
              ? `${rascunhos.length} rascunho${rascunhos.length !== 1 ? "s" : ""}`
              : `${respondidos.length} respondido${respondidos.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("NovoChecklist" as never)}
          style={styles.newButton}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tabAtiva === "pendentes" ? styles.tabAtiva : null]}
          onPress={() => setTabAtiva("pendentes")}
        >
          <Text
            style={[
              styles.tabText,
              tabAtiva === "pendentes" ? styles.tabTextAtiva : null,
            ]}
          >
            Pendentes ({escopos.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabAtiva === "rascunhos" ? styles.tabAtiva : null]}
          onPress={() => setTabAtiva("rascunhos")}
        >
          <Text
            style={[
              styles.tabText,
              tabAtiva === "rascunhos" ? styles.tabTextAtiva : null,
            ]}
          >
            Rascunhos ({rascunhos.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabAtiva === "respondidos" ? styles.tabAtiva : null]}
          onPress={() => setTabAtiva("respondidos")}
        >
          <Text
            style={[
              styles.tabText,
              tabAtiva === "respondidos" ? styles.tabTextAtiva : null,
            ]}
          >
            Respondidos ({respondidos.length})
          </Text>
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
          {tabAtiva === "pendentes" ? (
            escoposOrdenados.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Nenhum checklist pendente</Text>
                <Text style={styles.emptyText}>
                  Todos os checklists foram enviados ou não há checklists disponíveis.
                </Text>
              </View>
            ) : (
              escoposOrdenados.map((escopo) => {
              const status = getStatusBadge(escopo);
              return (
                <TouchableOpacity
                  key={escopo.id}
                  style={[
                    styles.card,
                    !normalizeBoolean(escopo.ativo) ? styles.cardInativo : null,
                  ]}
                  onPress={() => handleEscopoPress(escopo)}
                  disabled={!normalizeBoolean(escopo.ativo)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons
                        name={
                          normalizeBoolean(escopo.ativo)
                            ? "checkmark-circle"
                            : "close-circle-outline"
                        }
                        size={24}
                        color={normalizeBoolean(escopo.ativo) ? "#009ee2" : "#999"}
                      />
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {escopo.template.titulo}
                        </Text>
                        {escopo.template.descricao && (
                          <Text style={styles.cardDescription} numberOfLines={1}>
                            {escopo.template.descricao}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View
                      style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}
                    >
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.text}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                      <Ionicons name="business-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>
                        {escopo.unidade?.nome || "Sem unidade"}
                      </Text>
                    </View>
                    {escopo.grupo && (
                      <View style={styles.infoRow}>
                        <Ionicons name="people-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{escopo.grupo.nome}</Text>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.infoText}>
                        Último envio: {formatarData(escopo.ultimoEnvioEm)}
                      </Text>
                    </View>
                    {escopo.respostasRecentes && escopo.respostasRecentes.length > 0 && (
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                          {escopo.respostasRecentes.length} resposta{escopo.respostasRecentes.length !== 1 ? "s" : ""} recente{escopo.respostasRecentes.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardActionText}>
                      {normalizeBoolean(escopo.ativo) ? "Toque para responder" : "Checklist inativo"}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={normalizeBoolean(escopo.ativo) ? "#009ee2" : "#999"}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
            )
          ) : tabAtiva === "rascunhos" ? (
            // Tab de Rascunhos
            rascunhos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Nenhum rascunho</Text>
                <Text style={styles.emptyText}>
                  Você não tem checklists em rascunho. Inicie um checklist para criar um rascunho.
                </Text>
              </View>
            ) : (
              rascunhos.map((rascunho) => {
                const escopoCorrespondente = escopos.find(
                  (e) => e.template.id === rascunho.template.id && e.unidade?.id === rascunho.unidade.id
                );

                return (
                  <TouchableOpacity
                    key={rascunho.id}
                    style={styles.card}
                    onPress={() =>
                      escopoCorrespondente
                        ? navigation.navigate("ResponderChecklist" as never, { escopoId: escopoCorrespondente.id } as never)
                        : Alert.alert("Erro", "Escopo não encontrado para este rascunho.")
                    }
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Ionicons name="document-text" size={24} color="#FF9800" />
                        <View style={styles.cardTitleContainer}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {rascunho.template.titulo}
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
                        <Text style={styles.infoText}>{rascunho.unidade.nome}</Text>
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
              })
            )
          ) : (
            // Tab de Respondidos
            respondidos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Nenhum checklist respondido</Text>
                <Text style={styles.emptyText}>
                  Você ainda não tem checklists concluídos.
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
            )
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

