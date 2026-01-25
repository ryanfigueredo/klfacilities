import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL, API_ENDPOINTS } from "../config/api";
import { setAuthToken } from "../services/api";
import * as SecureStore from "expo-secure-store";

interface RegistroPonto {
  id: string;
  timestamp: string;
  tipo: string;
  selfieHttpUrl: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

interface ImageLoadState {
  [key: string]: boolean;
}

interface ProtocoloData {
  ok: boolean;
  data: Record<string, RegistroPonto[]>;
  funcionario: {
    id: string;
    nome: string;
    cpf: string | null;
    grupo: { id: string; nome: string } | null;
    unidade: { id: string; nome: string } | null;
  } | null;
  month: string;
}

const tipoLabels: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  INTERVALO_INICIO: "Intervalo - Início",
  INTERVALO_FIM: "Intervalo - Fim",
  HORA_EXTRA_INICIO: "Hora Extra - Início",
  HORA_EXTRA_FIM: "Hora Extra - Fim",
};

export default function ProtocoloScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [protocolo, setProtocolo] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProtocoloData | null>(null);
  const [imageLoadStates, setImageLoadStates] = useState<ImageLoadState>({});
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const buscarProtocolo = async (proto?: string) => {
    const protoToUse = proto || protocolo.trim().toUpperCase();
    
    // Validação mais flexível - aceita qualquer protocolo não vazio
    if (!protoToUse) {
      Alert.alert("Erro", "Por favor, digite um protocolo válido.");
      return;
    }

      setLoading(true);
      setData(null);
      setImageLoadStates({});
      setImageErrors(new Set());

    try {
      const token = await SecureStore.getItemAsync("authToken");
      if (token) {
        setAuthToken(token);
      }

      const response = await fetch(
        `${API_URL}${API_ENDPOINTS.PONTO_PROTOCOLO}?proto=${encodeURIComponent(protoToUse)}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      let json;
      try {
        json = await response.json();
      } catch (parseError) {
        // Se não conseguir fazer parse do JSON, tentar ler como texto
        const text = await response.text();
        console.error("Resposta não é JSON:", text);
        throw new Error("Resposta inválida do servidor. Tente novamente.");
      }

      if (!response.ok) {
        // Tratar diferentes tipos de erro do backend
        let errorMessage = "Erro ao buscar protocolo";
        
        // Verificar diferentes campos de erro possíveis
        const errorText = json.error || json.message || json.erro || "";
        
        // Normalizar mensagens de erro comuns
        if (errorText.toLowerCase().includes("proto invalido") || 
            errorText.toLowerCase().includes("protocolo inválido") ||
            errorText.toLowerCase().includes("protocolo invalido")) {
          errorMessage = "Protocolo inválido. Verifique se o protocolo está correto e tente novamente.";
        } else if (errorText.toLowerCase().includes("não encontrado") || 
                   errorText.toLowerCase().includes("nao encontrado") ||
                   errorText.toLowerCase().includes("not found")) {
          errorMessage = "Protocolo não encontrado. Verifique se o protocolo está correto.";
        } else if (errorText) {
          errorMessage = errorText;
        } else if (response.status === 404) {
          errorMessage = "Protocolo não encontrado. Verifique se o protocolo está correto.";
        } else if (response.status === 400) {
          errorMessage = "Protocolo inválido. Verifique o formato e tente novamente.";
        } else if (response.status === 401) {
          errorMessage = "Não autorizado. Faça login novamente.";
        } else if (response.status === 500) {
          errorMessage = "Erro no servidor. Tente novamente mais tarde.";
        }
        
        console.error("Erro ao buscar protocolo:", {
          status: response.status,
          statusText: response.statusText,
          error: json.error,
          message: json.message,
          erro: json.erro,
          json: json,
        });
        
        throw new Error(errorMessage);
      }

      // Verificar se a resposta tem dados válidos
      if (!json || (json.ok === false && !json.data)) {
        throw new Error("Protocolo não encontrado ou inválido.");
      }

      setData(json);
    } catch (err: any) {
      console.error("Erro ao buscar protocolo:", err);
      
      // Mensagem de erro mais amigável
      let errorMessage = "Erro ao buscar protocolo";
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.toString().includes("Network")) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (err.toString().includes("Failed to fetch")) {
        errorMessage = "Não foi possível conectar ao servidor. Verifique sua conexão.";
      }
      
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se há um protocolo inicial passado via route params
  useEffect(() => {
    const params = route.params as { protocoloInicial?: string } | undefined;
    if (params?.protocoloInicial) {
      setProtocolo(params.protocoloInicial);
      // Buscar automaticamente se o protocolo foi passado
      buscarProtocolo(params.protocoloInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params]);

  const abrirMapa = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url).catch((err) => {
      Alert.alert("Erro", "Não foi possível abrir o mapa");
    });
  };

  const formatarData = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const formatarDia = (dia: string) => {
    try {
      const date = new Date(dia);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dia;
    }
  };

  const diasOrdenados = useMemo(() => {
    if (!data?.data) return [];
    return Object.keys(data.data).sort();
  }, [data?.data]);

  const funcionarioCard = useMemo(() => {
    if (!data?.funcionario) return null;
    
    return (
      <View style={styles.funcionarioCard}>
        <Text style={styles.cardTitle}>Informações do Funcionário</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nome:</Text>
          <Text style={styles.infoValue}>{data.funcionario.nome}</Text>
        </View>
        {data.funcionario.cpf && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{data.funcionario.cpf}</Text>
          </View>
        )}
        {data.funcionario.grupo && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grupo:</Text>
            <Text style={styles.infoValue}>{data.funcionario.grupo.nome}</Text>
          </View>
        )}
        {data.funcionario.unidade && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unidade:</Text>
            <Text style={styles.infoValue}>
              {data.funcionario.unidade.nome}
            </Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mês:</Text>
          <Text style={styles.infoValue}>
            {new Date(`${data.month}-01`).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>
    );
  }, [data?.funcionario, data?.month]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar Protocolo</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <Text style={styles.label}>Digite o protocolo da folha de ponto</Text>
          <Text style={styles.hint}>
            Exemplo: KL-20260107-123456 ou o protocolo completo
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={protocolo}
              onChangeText={(text) => setProtocolo(text.toUpperCase())}
              placeholder="Digite o protocolo..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={buscarProtocolo}
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={buscarProtocolo}
              disabled={loading || !protocolo.trim()}
              style={[
                styles.searchButton,
                (loading || !protocolo.trim()) && styles.searchButtonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {data && (
          <View style={styles.resultsContainer}>
            {/* Informações do Funcionário */}
            {funcionarioCard}

            {/* Registros por Dia */}
            {diasOrdenados.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="information-circle-outline" size={48} color="#f59e0b" />
                <Text style={styles.emptyText}>
                  Nenhum registro encontrado para este protocolo.
                </Text>
              </View>
            ) : (
              diasOrdenados.map((dia) => {
                const registros = data.data[dia];

                return (
                  <View key={dia} style={styles.diaCard}>
                    <Text style={styles.diaTitle}>{formatarDia(dia)}</Text>
                    {registros.map((registro) => (
                      <View key={registro.id} style={styles.registroCard}>
                        <View style={styles.registroHeader}>
                          <Text style={styles.registroTipo}>
                            {tipoLabels[registro.tipo] || registro.tipo}
                          </Text>
                          <Text style={styles.registroHora}>
                            {formatarData(registro.timestamp)}
                          </Text>
                        </View>

                        <View style={styles.registroContent}>
                          {/* Selfie */}
                          {registro.selfieHttpUrl ? (() => {
                            const imageUrl = registro.selfieHttpUrl.startsWith('http') 
                              ? registro.selfieHttpUrl 
                              : `${API_URL}${registro.selfieHttpUrl}`;
                            const imageKey = registro.id;
                            const isLoading = !imageLoadStates[imageKey] && !imageErrors.has(imageKey);
                            const hasError = imageErrors.has(imageKey);
                            
                            return (
                              <View style={styles.selfieContainer}>
                                {isLoading && (
                                  <View style={styles.selfieLoading}>
                                    <ActivityIndicator size="small" color="#009ee2" />
                                    <Text style={styles.selfieLoadingText}>Carregando...</Text>
                                  </View>
                                )}
                                {hasError && (
                                  <View style={styles.selfiePlaceholder}>
                                    <Ionicons name="alert-circle-outline" size={32} color="#f59e0b" />
                                    <Text style={styles.selfiePlaceholderText}>
                                      Erro ao carregar foto
                                    </Text>
                                  </View>
                                )}
                                {!hasError && (
                                  <Image
                                    source={{ uri: imageUrl }}
                                    style={[
                                      styles.selfie,
                                      isLoading && styles.selfieHidden,
                                    ]}
                                    resizeMode="cover"
                                    onLoad={() => {
                                      setImageLoadStates(prev => ({ ...prev, [imageKey]: true }));
                                      setImageErrors(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(imageKey);
                                        return newSet;
                                      });
                                    }}
                                    onError={() => {
                                      setImageErrors(prev => new Set(prev).add(imageKey));
                                    }}
                                  />
                                )}
                              </View>
                            );
                          })() : (
                            <View style={styles.selfiePlaceholder}>
                              <Ionicons name="image-outline" size={32} color="#9ca3af" />
                              <Text style={styles.selfiePlaceholderText}>
                                Sem foto
                              </Text>
                            </View>
                          )}

                          {/* Localização */}
                          {registro.lat && registro.lng && (
                            <TouchableOpacity
                              onPress={() => abrirMapa(registro.lat!, registro.lng!)}
                              style={styles.locationButton}
                            >
                              <Ionicons name="location" size={20} color="#3b82f6" />
                              <Text style={styles.locationButtonText}>
                                Ver localização
                                {registro.accuracy && (
                                  <Text style={styles.accuracyText}>
                                    {" "}
                                    ({Math.round(registro.accuracy)}m)
                                  </Text>
                                )}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 12,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  resultsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  funcionarioCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
    flex: 1,
  },
  diaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  diaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  registroCard: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    marginTop: 12,
  },
  registroHeader: {
    marginBottom: 12,
  },
  registroTipo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  registroHora: {
    fontSize: 14,
    color: "#6b7280",
  },
  registroContent: {
    gap: 12,
  },
  selfieContainer: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    position: "relative",
    overflow: "hidden",
  },
  selfie: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  selfieHidden: {
    opacity: 0,
  },
  selfieLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    gap: 8,
  },
  selfieLoadingText: {
    fontSize: 12,
    color: "#6b7280",
  },
  selfiePlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  selfiePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  locationButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  accuracyText: {
    fontSize: 12,
    color: "#6b7280",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
