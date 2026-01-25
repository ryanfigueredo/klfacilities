import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Funcionario, obterPontosRegistradosHoje } from "../services/api";
import { obterQuantidadePendentes } from "../services/offlineQueue";

interface ConfiguracoesScreenProps {
  funcionario: Funcionario;
  onClose: () => void;
  onReloadFuncionario?: () => Promise<void>;
}

export default function ConfiguracoesScreen({
  funcionario,
  onClose,
  onReloadFuncionario,
}: ConfiguracoesScreenProps) {
  const [pontosHoje, setPontosHoje] = useState<string[]>([]);
  const [pontosPendentes, setPontosPendentes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const pontos = await obterPontosRegistradosHoje(funcionario.cpf);
      setPontosHoje(pontos);
      
      const pendentes = await obterQuantidadePendentes();
      setPontosPendentes(pendentes);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      ENTRADA: "Entrada",
      INTERVALO_INICIO: "Início Intervalo",
      INTERVALO_FIM: "Fim Intervalo",
      SAIDA: "Saída",
      HORA_EXTRA_INICIO: "Hora Extra - Início",
      HORA_EXTRA_FIM: "Hora Extra - Saída",
    };
    return labels[tipo] || tipo;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#009ee2" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Dados do Funcionário */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={24} color="#009ee2" />
                <Text style={styles.sectionTitle}>Meus Dados</Text>
                {onReloadFuncionario && (
                  <TouchableOpacity
                    onPress={async () => {
                      setLoading(true);
                      try {
                        await onReloadFuncionario();
                        Alert.alert("Sucesso", "Dados atualizados! As coordenadas da unidade foram recarregadas.");
                      } catch (error) {
                        Alert.alert("Erro", "Não foi possível atualizar os dados. Faça logout e login novamente.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={styles.reloadButton}
                  >
                    <Ionicons name="refresh" size={20} color="#009ee2" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nome</Text>
                  <Text style={styles.infoValue}>{funcionario.nome}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>CPF</Text>
                  <Text style={styles.infoValue}>{funcionario.cpf}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Unidade</Text>
                  <Text style={styles.infoValue}>{funcionario.unidade.nome}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Grupo</Text>
                  <Text style={styles.infoValue}>{funcionario.grupo.nome}</Text>
                </View>
                {funcionario.unidade.cidade && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Cidade</Text>
                      <Text style={styles.infoValue}>
                        {funcionario.unidade.cidade}
                        {funcionario.unidade.estado && `, ${funcionario.unidade.estado}`}
                      </Text>
                    </View>
                  </>
                )}
                {funcionario.unidade.lat && funcionario.unidade.lng && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Coordenadas da Unidade</Text>
                      <View style={styles.coordinatesContainer}>
                        <Text style={styles.coordinatesText}>
                          {funcionario.unidade.lat.toFixed(6)}, {funcionario.unidade.lng.toFixed(6)}
                        </Text>
                        <Text style={styles.coordinatesLabel}>
                          Raio: {funcionario.unidade.radiusM || "N/A"}m
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Estatísticas de Pontos */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={24} color="#009ee2" />
                <Text style={styles.sectionTitle}>Pontos de Hoje</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                    <Text style={styles.statValue}>{pontosHoje.length}</Text>
                    <Text style={styles.statLabel}>Registrados</Text>
                  </View>
                  {pontosPendentes > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons name="cloud-upload-outline" size={32} color="#FF9800" />
                      <Text style={styles.statValue}>{pontosPendentes}</Text>
                      <Text style={styles.statLabel}>Pendentes</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Pontos Registrados Hoje */}
            {pontosHoje.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={24} color="#009ee2" />
                  <Text style={styles.sectionTitle}>Registros de Hoje</Text>
                </View>
                <View style={styles.card}>
                  {pontosHoje.map((tipo, index) => (
                    <View key={index}>
                      <View style={styles.pontoItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#4CAF50"
                        />
                        <Text style={styles.pontoText}>{getTipoLabel(tipo)}</Text>
                      </View>
                      {index < pontosHoje.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Informações Adicionais */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={24} color="#009ee2" />
                <Text style={styles.sectionTitle}>Informações</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.infoBox}>
                  <Ionicons name="wifi-outline" size={20} color="#666" />
                  <Text style={styles.infoBoxText}>
                    Você pode bater ponto mesmo sem internet. Os pontos serão
                    salvos localmente e sincronizados automaticamente quando a
                    conexão voltar.
                  </Text>
                </View>
                <View style={styles.infoBox}>
                  <Ionicons name="location-outline" size={20} color="#666" />
                  <Text style={styles.infoBoxText}>
                    É necessário estar dentro da área da unidade para registrar
                    o ponto. O GPS valida sua localização automaticamente.
                  </Text>
                </View>
                <View style={styles.infoBox}>
                  <Ionicons name="camera-outline" size={20} color="#666" />
                  <Text style={styles.infoBoxText}>
                    Uma selfie é obrigatória para cada registro de ponto, garantindo
                    a segurança e autenticidade do registro.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  pontoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  pontoText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  reloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
  },
  coordinatesContainer: {
    alignItems: "flex-end",
  },
  coordinatesText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  coordinatesLabel: {
    fontSize: 11,
    color: "#999",
  },
});
