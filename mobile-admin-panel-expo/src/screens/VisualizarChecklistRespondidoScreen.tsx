import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  obterChecklistRespondidoDetalhes,
  ChecklistRespondidoDetalhes,
  ChecklistRespostaItem,
} from "../services/api";

const NOTA_LABELS: Record<number, string> = {
  1: "Péssimo",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Ótimo",
};

const NOTA_COLORS: Record<number, string> = {
  1: "#f44336",
  2: "#FF9800",
  3: "#FFC107",
  4: "#4CAF50",
  5: "#8BC34A",
};

export default function VisualizarChecklistRespondidoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { respostaId } = (route.params as { respostaId: string }) || {};

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<ChecklistRespondidoDetalhes | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!respostaId) {
      setErro("ID do checklist não informado.");
      setLoading(false);
      return;
    }
    carregar();
  }, [respostaId]);

  const carregar = async () => {
    if (!respostaId) return;
    try {
      setLoading(true);
      setErro(null);
      const response = await obterChecklistRespondidoDetalhes(respostaId);
      setDados(response);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Não foi possível carregar o checklist.";
      setErro(msg);
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataString: string | null) => {
    if (!dataString) return "—";
    try {
      const d = new Date(dataString);
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${dia}/${mes}/${ano} ${h}:${min}`;
    } catch {
      return dataString;
    }
  };

  const mapRespostasByPergunta = (): Map<string, ChecklistRespostaItem> => {
    const m = new Map<string, ChecklistRespostaItem>();
    if (!dados?.respostas) return m;
    dados.respostas.forEach((r) => m.set(r.perguntaId, r));
    return m;
  };

  const renderValor = (
    tipo: string,
    r: ChecklistRespostaItem | undefined
  ) => {
    const parts: React.ReactNode[] = [];
    if (!r) {
      return <Text style={styles.valorVazio}>—</Text>;
    }

    if (tipo === "TEXTO" && r.valorTexto) {
      parts.push(<Text key="txt" style={styles.valorTexto}>{r.valorTexto}</Text>);
    } else if (tipo === "NUMERICO" && r.valorNumero != null) {
      parts.push(<Text key="num" style={styles.valorTexto}>{String(r.valorNumero)}</Text>);
    } else if (tipo === "SELECAO" && r.valorOpcao) {
      parts.push(<Text key="sel" style={styles.valorTexto}>{r.valorOpcao}</Text>);
    } else if (tipo === "BOOLEANO") {
      const v = r.valorOpcao || (r.valorBoolean === true ? "CONFORME" : r.valorBoolean === false ? "NAO_CONFORME" : "NAO_APLICA");
      const label = v === "CONFORME" ? "Conforme" : v === "NAO_CONFORME" ? "Não Conforme" : "Não Aplica";
      const cor = v === "CONFORME" ? "#4CAF50" : v === "NAO_CONFORME" ? "#f44336" : "#9e9e9e";
      parts.push(
        <View key="bool" style={[styles.badgeBoolean, { backgroundColor: `${cor}20` }]}>
          <Text style={[styles.badgeBooleanText, { color: cor }]}>{label}</Text>
        </View>
      );
    } else if (r.valorTexto) {
      parts.push(<Text key="txt2" style={styles.valorTexto}>{r.valorTexto}</Text>);
    }

    if (r.nota != null) {
      const label = NOTA_LABELS[r.nota] ?? `Nota ${r.nota}`;
      const cor = NOTA_COLORS[r.nota] ?? "#666";
      parts.push(
        <View key="nota" style={[styles.badgeNota, { backgroundColor: `${cor}20`, marginTop: parts.length ? 8 : 0 }]}>
          <Text style={[styles.badgeNotaText, { color: cor }]}>Avaliação: {label}</Text>
        </View>
      );
    }
    if (r.fotoUrl) {
      parts.push(
        <Image
          key="foto"
          source={{ uri: r.fotoUrl }}
          style={[styles.fotoThumb, { marginTop: parts.length ? 8 : 0 }]}
          resizeMode="cover"
        />
      );
    }
    if (parts.length === 0) return <Text style={styles.valorVazio}>—</Text>;
    return <View style={styles.valorWrapper}>{parts}</View>;
  };

  if (loading) {
    return (
      <View style={[styles.center, styles.container]}>
        <ActivityIndicator size="large" color="#009ee2" />
        <Text style={styles.loadingText}>Carregando checklist...</Text>
      </View>
    );
  }

  if (erro || !dados) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visualizar checklist</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            {erro || "Checklist não encontrado."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={carregar}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { resposta, template, respostas } = dados;
  const respostasMap = mapRespostasByPergunta();
  const gruposOrdenados = [...(template.grupos || [])].sort(
    (a, b) => a.ordem - b.ordem
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {template.titulo}
          </Text>
          <Text style={styles.headerSubtitle}>Checklist respondido</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{resposta.unidade.nome}</Text>
          </View>
          {resposta.grupo && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={18} color="#666" />
              <Text style={styles.infoText}>{resposta.grupo.nome}</Text>
            </View>
          )}
          {resposta.protocolo && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color="#666" />
              <Text style={styles.infoText}>Protocolo: {resposta.protocolo}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.infoText}>
              Enviado em: {formatarData(resposta.submittedAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#666" />
            <Text style={styles.infoText}>
              Por: {resposta.supervisor.name}
            </Text>
          </View>
        </View>

        {gruposOrdenados.map((grupo) => (
          <View key={grupo.id} style={styles.grupo}>
            <Text style={styles.grupoTitulo}>{grupo.titulo}</Text>
            {grupo.descricao ? (
              <Text style={styles.grupoDescricao}>{grupo.descricao}</Text>
            ) : null}
            {grupo.perguntas
              .sort((a, b) => a.ordem - b.ordem)
              .map((pergunta) => {
                const r = respostasMap.get(pergunta.id);
                return (
                  <View key={pergunta.id} style={styles.pergunta}>
                    <Text style={styles.perguntaTitulo}>{pergunta.titulo}</Text>
                    {pergunta.descricao ? (
                      <Text style={styles.perguntaDescricao}>
                        {pergunta.descricao}
                      </Text>
                    ) : null}
                    <View style={styles.valorContainer}>
                      {renderValor(pergunta.tipo, r)}
                    </View>
                    {r?.observacao ? (
                      <Text style={styles.observacaoResposta}>
                        Obs.: {r.observacao}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
          </View>
        ))}

        {resposta.observacoes ? (
          <View style={styles.observacoesCard}>
            <Text style={styles.observacoesTitulo}>Observações gerais</Text>
            <Text style={styles.observacoesTexto}>{resposta.observacoes}</Text>
          </View>
        ) : null}

        {resposta.assinaturaFotoUrl ? (
          <View style={styles.assinaturaCard}>
            <Text style={styles.assinaturaTitulo}>Assinatura</Text>
            <Image
              source={{ uri: resposta.assinaturaFotoUrl }}
              style={styles.assinaturaImg}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#009ee2",
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: { fontSize: 14, color: "#333", marginLeft: 8, flex: 1 },
  grupo: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  grupoTitulo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1d5e",
    marginBottom: 4,
  },
  grupoDescricao: { fontSize: 13, color: "#666", marginBottom: 12 },
  pergunta: { marginBottom: 16 },
  perguntaTitulo: { fontSize: 14, fontWeight: "500", color: "#333" },
  perguntaDescricao: { fontSize: 12, color: "#666", marginTop: 2, marginBottom: 6 },
  valorContainer: { marginTop: 6 },
  valorWrapper: {},
  valorTexto: { fontSize: 14, color: "#111" },
  valorVazio: { fontSize: 14, color: "#999", fontStyle: "italic" },
  badgeBoolean: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeBooleanText: { fontSize: 13, fontWeight: "500" },
  badgeNota: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeNotaText: { fontSize: 13, fontWeight: "500" },
  fotoThumb: { width: 120, height: 120, borderRadius: 8 },
  observacaoResposta: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },
  observacoesCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  observacoesTitulo: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  observacoesTexto: { fontSize: 14, color: "#555", lineHeight: 22 },
  assinaturaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  assinaturaTitulo: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  assinaturaImg: { width: "100%", height: 120, borderRadius: 8 },
  emptyTitle: { fontSize: 16, color: "#666", textAlign: "center", marginTop: 12 },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#009ee2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
