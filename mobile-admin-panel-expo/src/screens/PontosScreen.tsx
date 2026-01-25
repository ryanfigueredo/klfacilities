import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import {
  obterHistoricoMensal,
  obterFolhasPonto,
  HistoricoResponse,
  FolhaPontoFuncionario,
  adicionarPonto,
} from "../services/api";
import { API_URL } from "../config/api";

interface DiaRow {
  dia: number;
  semana: string;
  entrada?: string;
  saida?: string;
  intervaloInicio?: string;
  intervaloFim?: string;
  totalHoras?: string;
  totalMinutos: number;
}

type ViewMode = "grupos" | "lojas" | "funcionarios" | "historico";

interface GrupoData {
  id: string;
  nome: string;
  funcionarios: FolhaPontoFuncionario[];
}

interface LojaData {
  id: string;
  nome: string;
  funcionarios: FolhaPontoFuncionario[];
}

export default function PontosScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true);
  const [historico, setHistorico] = useState<DiaRow[]>([]);
  const [funcionarios, setFuncionarios] = useState<FolhaPontoFuncionario[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string }>>([]);
  const [unidades, setUnidades] = useState<Array<{ id: string; nome: string }>>([]);
  
  // Navegação hierárquica
  const [viewMode, setViewMode] = useState<ViewMode>("grupos");
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [lojaSelecionada, setLojaSelecionada] = useState<string | null>(null);
  const [funcionarioSelecionado, setFuncionarioSelecionado] =
    useState<FolhaPontoFuncionario | null>(null);
  
  // Modal de adicionar batida
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTipo, setAddTipo] = useState<"ENTRADA" | "SAIDA" | "INTERVALO_INICIO" | "INTERVALO_FIM">("ENTRADA");
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("");
  const [addObs, setAddObs] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  
  // Estados para os date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [monthName, setMonthName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    carregarDados();
  }, [selectedMonth]);

  useEffect(() => {
    if (funcionarioSelecionado) {
      loadHistorico();
    }
  }, [selectedMonth, funcionarioSelecionado]);

  const carregarDados = async () => {
    setLoadingFuncionarios(true);
    try {
      // A API já filtra automaticamente por supervisor quando o role é SUPERVISOR
      // Ela usa getSupervisorScope(me.id) para obter as unidades do supervisor
      // e retorna apenas os funcionários dessas unidades
      const response = await obterFolhasPonto(undefined, selectedMonth);
      if (response.funcionarios) {
        // Log para debug - verificar se os dados estão vindo corretamente
        console.log("📊 Funcionários recebidos:", response.funcionarios.length);
        console.log("🏪 Unidades recebidas da API:", response.unidades?.length || 0);
        if (response.funcionarios.length > 0) {
          const primeiro = response.funcionarios[0];
          console.log("📋 Primeiro funcionário:", {
            nome: primeiro.nome,
            grupoId: primeiro.grupoId,
            grupoNome: primeiro.grupoNome,
            unidadeId: primeiro.unidadeId,
            unidadeNome: primeiro.unidadeNome,
          });
        }
        // A API já filtra por supervisor, então os dados já vêm filtrados
        // Não precisamos fazer filtro adicional no frontend
        setFuncionarios(response.funcionarios);
      }
      if (response.grupos) {
        console.log("🏢 Grupos recebidos:", response.grupos.length, response.grupos);
        setGrupos(response.grupos);
      }
      if (response.unidades) {
        console.log("🏪 Unidades recebidas:", response.unidades.length);
        // A API já retorna apenas as unidades do supervisor quando o role é SUPERVISOR
        setUnidades(response.unidades);
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível carregar os dados. Verifique sua conexão e tente novamente.";
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoadingFuncionarios(false);
      setLoading(false);
    }
  };

  const loadHistorico = async () => {
    if (!funcionarioSelecionado) return;
    
    if (!funcionarioSelecionado.cpf) {
      Alert.alert("Erro", "Funcionário não possui CPF cadastrado.");
      return;
    }

    setLoading(true);
    try {
      const response = await obterHistoricoMensal(
        funcionarioSelecionado.cpf,
        selectedMonth
      );
      setHistorico(response.table);

      // Formatar nome do mês
      const [year, month] = selectedMonth.split("-").map(Number);
      const monthNames = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      setMonthName(`${monthNames[month - 1]} de ${year}`);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
      let errorMessage = "Não foi possível carregar o histórico de pontos.";

      if (error?.response?.status === 401) {
        errorMessage = "Não autorizado. Faça login novamente.";
      } else if (error?.response?.status === 404) {
        errorMessage =
          error?.response?.data?.error || "Funcionário não encontrado.";
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar funcionários por grupo
  const funcionariosPorGrupo = useMemo(() => {
    const gruposMap = new Map<string, GrupoData>();

    funcionarios.forEach((func) => {
      const grupoId = func.grupoId || "sem-grupo";
      const grupoNome = func.grupoNome || "Sem Grupo";

      if (!gruposMap.has(grupoId)) {
        gruposMap.set(grupoId, {
          id: grupoId,
          nome: grupoNome,
          funcionarios: [],
        });
      }

      gruposMap.get(grupoId)!.funcionarios.push(func);
    });

    return Array.from(gruposMap.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [funcionarios]);

  // Agrupar funcionários por loja (dentro do grupo selecionado)
  const funcionariosPorLoja = useMemo(() => {
    if (!grupoSelecionado) return [];

    const grupo = funcionariosPorGrupo.find((g) => g.id === grupoSelecionado);
    if (!grupo) return [];

    const lojasMap = new Map<string, LojaData>();

    grupo.funcionarios.forEach((func) => {
      const lojaId = func.unidadeId || "sem-loja";
      const lojaNome = func.unidadeNome || "Sem Loja";

      if (!lojasMap.has(lojaId)) {
        lojasMap.set(lojaId, {
          id: lojaId,
          nome: lojaNome,
          funcionarios: [],
        });
      }

      lojasMap.get(lojaId)!.funcionarios.push(func);
    });

    return Array.from(lojasMap.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
  }, [grupoSelecionado, funcionariosPorGrupo]);

  // Funcionários da loja selecionada
  const funcionariosDaLoja = useMemo(() => {
    if (!lojaSelecionada) return [];
    const loja = funcionariosPorLoja.find((l) => l.id === lojaSelecionada);
    return loja?.funcionarios || [];
  }, [lojaSelecionada, funcionariosPorLoja]);

  // Calcular pontos faltantes para um funcionário
  const calcularPontosFaltantes = (func: FolhaPontoFuncionario): string[] => {
    const faltantes: string[] = [];
    
    if (!func.batidas) {
      // Se não tem nenhuma batida, pode estar faltando tudo
      return ["Sem registros"];
    }

    // Verificar se tem entrada mas não tem saída (ou vice-versa)
    if (func.batidas.entrada > func.batidas.saida) {
      faltantes.push("Saída");
    }
    
    // Verificar intervalo incompleto
    if (func.batidas.intervaloInicio > func.batidas.intervaloFim) {
      faltantes.push("Fim Intervalo");
    }

    // Se tem intervalo início mas não tem entrada, pode ser problema
    if (func.batidas.intervaloInicio > 0 && func.batidas.entrada === 0) {
      faltantes.push("Entrada");
    }

    return faltantes;
  };

  const changeMonth = (direction: "prev" | "next") => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newMonth = month;
    let newYear = year;

    if (direction === "prev") {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const calcularTotalMes = () => {
    const totalMinutos = historico.reduce(
      (sum, row) => sum + row.totalMinutos,
      0
    );
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return { horas, minutos };
  };

  const total = calcularTotalMes();

  const handleGrupoPress = (grupoId: string) => {
    setGrupoSelecionado(grupoId);
    setLojaSelecionada(null);
    setFuncionarioSelecionado(null);
    setViewMode("lojas");
  };

  const handleLojaPress = (lojaId: string) => {
    setLojaSelecionada(lojaId);
    setFuncionarioSelecionado(null);
    setViewMode("funcionarios");
  };

  const handleFuncionarioPress = (func: FolhaPontoFuncionario) => {
    setFuncionarioSelecionado(func);
    setViewMode("historico");
  };

  const openPdfLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Erro ao abrir PDF:", error);
      Alert.alert("Erro", "Não foi possível abrir o PDF.");
    }
  };

  const handleExportFuncionario = () => {
    if (!funcionarioSelecionado?.id) {
      Alert.alert("Erro", "Selecione um funcionário.");
      return;
    }
    const url = `${API_URL}/api/ponto/folha?funcionarioId=${encodeURIComponent(
      funcionarioSelecionado.id
    )}&month=${encodeURIComponent(selectedMonth)}&formato=pdf`;
    openPdfLink(url);
  };

  const handleExportLoja = () => {
    if (!grupoSelecionado || !lojaSelecionada) {
      Alert.alert("Erro", "Selecione um grupo e uma loja.");
      return;
    }
    const url = `${API_URL}/api/ponto/folhas-grupo/pdf?grupoId=${encodeURIComponent(
      grupoSelecionado
    )}&unidadeId=${encodeURIComponent(
      lojaSelecionada
    )}&month=${encodeURIComponent(selectedMonth)}`;
    openPdfLink(url);
  };

  // Função para formatar data no formato AAAA-MM-DD
  const formatarDataParaInput = useCallback((date: Date): string => {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const dia = String(date.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }, []);

  // Função para formatar hora no formato HH:MM
  const formatarHoraParaInput = useCallback((date: Date): string => {
    const hora = String(date.getHours()).padStart(2, "0");
    const minuto = String(date.getMinutes()).padStart(2, "0");
    return `${hora}:${minuto}`;
  }, []);

  // Handler para quando a data é selecionada
  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setAddDate(formatarDataParaInput(date));
      if (Platform.OS === "ios") {
        // No iOS, o picker fica visível até fechar manualmente
      }
    }
  };

  // Handler para quando a hora é selecionada
  const onTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
      setAddTime(formatarHoraParaInput(date));
      if (Platform.OS === "ios") {
        // No iOS, o picker fica visível até fechar manualmente
      }
    }
  };

  const handleSalvarBatida = async () => {
    if (!funcionarioSelecionado?.id) {
      Alert.alert("Erro", "Selecione um funcionário.");
      return;
    }
    if (!addDate || !addTime) {
      Alert.alert("Erro", "Preencha data e hora.");
      return;
    }

    // Montar timestamp ISO com timezone do dispositivo
    // Evita 16h ser gravada como 13h (quando sem offset o servidor interpreta como UTC)
    const [y, mo, d] = addDate.split("-").map(Number);
    const [h, min] = addTime.split(":").map(Number);
    const localDate = new Date(y, mo - 1, d, h, min, 0);
    const offsetMin = -localDate.getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const oh = Math.floor(Math.abs(offsetMin) / 60);
    const om = Math.abs(offsetMin) % 60;
    const tz = `${sign}${String(oh).padStart(2, "0")}:${String(om).padStart(2, "0")}`;
    const isoTimestamp = `${addDate}T${addTime}:00${tz}`;

    // Garantir que a observação não esteja vazia (a API exige)
    const observacao = addObs.trim() || "Ajuste manual via aplicativo mobile";

    setAddLoading(true);
    try {
      await adicionarPonto(funcionarioSelecionado.id, addTipo, isoTimestamp, observacao);
      Alert.alert("Sucesso", "Batida adicionada com sucesso.");
      setAddModalVisible(false);
      setAddObs("");
      setAddDate("");
      setAddTime("");
      // Resetar para data/hora atual
      const agora = new Date();
      setSelectedDate(agora);
      setSelectedTime(agora);
      // Recarregar histórico para refletir a nova batida
      await loadHistorico();
    } catch (error: any) {
      console.error("Erro ao adicionar batida:", error);
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível adicionar a batida.";
      Alert.alert("Erro", message);
    } finally {
      setAddLoading(false);
    }
  };

  // Inicializar data e hora quando o modal abrir
  useEffect(() => {
    if (addModalVisible) {
      const agora = new Date();
      setSelectedDate(agora);
      setSelectedTime(agora);
      setAddDate(formatarDataParaInput(agora));
      setAddTime(formatarHoraParaInput(agora));
      // Resetar os pickers quando o modal abrir
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [addModalVisible, formatarDataParaInput, formatarHoraParaInput]);

  const handleBack = () => {
    if (viewMode === "historico") {
      setFuncionarioSelecionado(null);
      setViewMode("funcionarios");
    } else if (viewMode === "funcionarios") {
      setLojaSelecionada(null);
      setViewMode("lojas");
    } else if (viewMode === "lojas") {
      setGrupoSelecionado(null);
      setViewMode("grupos");
    }
  };

  const getBreadcrumb = () => {
    const parts = ["Pontos"];
    if (grupoSelecionado) {
      const grupo = funcionariosPorGrupo.find((g) => g.id === grupoSelecionado);
      if (grupo) parts.push(grupo.nome);
    }
    if (lojaSelecionada) {
      const loja = funcionariosPorLoja.find((l) => l.id === lojaSelecionada);
      if (loja) parts.push(loja.nome);
    }
    if (funcionarioSelecionado) {
      parts.push(funcionarioSelecionado.nome);
    }
    return parts.join(" > ");
  };

  // Gerar protocolo do funcionário para o mês atual
  const gerarProtocolo = useCallback(async (): Promise<string | null> => {
    if (!funcionarioSelecionado?.id) return null;
    
    const unidadeId = funcionarioSelecionado.unidadeId || "";
    const ymProtocolo = selectedMonth; // formato "YYYY-MM"
    const payloadProtocolo = `${funcionarioSelecionado.id}.${unidadeId}.${ymProtocolo}`;
    
    try {
      const hashProtocolo = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        payloadProtocolo
      );
      const shortHashProtocolo = hashProtocolo.substring(0, 12).toUpperCase();
      return `KL-${shortHashProtocolo}`;
    } catch (error) {
      console.error("Erro ao gerar protocolo:", error);
      return null;
    }
  }, [funcionarioSelecionado, selectedMonth]);

  const [protocolo, setProtocolo] = useState<string | null>(null);

  useEffect(() => {
    if (funcionarioSelecionado && viewMode === "historico") {
      gerarProtocolo().then(setProtocolo);
    } else {
      setProtocolo(null);
    }
  }, [funcionarioSelecionado, selectedMonth, viewMode, gerarProtocolo]);

  const copiarProtocolo = async () => {
    if (!protocolo) return;
    try {
      await Clipboard.setStringAsync(protocolo);
      Alert.alert("Sucesso", "Protocolo copiado para a área de transferência!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível copiar o protocolo.");
    }
  };

  const verBatidas = () => {
    if (!protocolo) return;
    // Navegar para a tela de protocolo com o protocolo já preenchido
    navigation.navigate("Protocolo" as never, { protocoloInicial: protocolo } as never);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (viewMode !== "grupos") {
              handleBack();
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {viewMode === "historico" ? "Histórico" : "Pontos"}
          </Text>
          {viewMode !== "grupos" && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {getBreadcrumb()}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Protocolo" as never)}
          style={styles.protocoloButton}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Seleção de Mês (apenas quando não está vendo histórico) */}
      {viewMode !== "historico" && (
        <View style={styles.monthSelector}>
          <TouchableOpacity
            onPress={() => changeMonth("prev")}
            style={styles.monthButton}
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {(() => {
              const [year, month] = selectedMonth.split("-").map(Number);
              const monthNames = [
                "Janeiro",
                "Fevereiro",
                "Março",
                "Abril",
                "Maio",
                "Junho",
                "Julho",
                "Agosto",
                "Setembro",
                "Outubro",
                "Novembro",
                "Dezembro",
              ];
              return `${monthNames[month - 1]} de ${year}`;
            })()}
          </Text>
          <TouchableOpacity
            onPress={() => changeMonth("next")}
            style={styles.monthButton}
          >
            <Text style={styles.monthButtonText}>›</Text>
          </TouchableOpacity>
          </View>
      )}

      {/* Conteúdo baseado na view */}
          {loadingFuncionarios ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#009ee2" />
          <Text style={styles.loadingText}>Carregando...</Text>
            </View>
      ) : viewMode === "grupos" ? (
        <ScrollView style={styles.scrollView}>
          <View style={styles.listContainer}>
            {funcionariosPorGrupo.map((grupo) => {
              const funcionariosComProblemas = grupo.funcionarios.filter(
                (f) => calcularPontosFaltantes(f).length > 0
              ).length;

              return (
                <TouchableOpacity
                  key={grupo.id}
                  style={styles.groupCard}
                  onPress={() => handleGrupoPress(grupo.id)}
                >
                  <View style={styles.groupCardContent}>
                    <View style={styles.groupCardLeft}>
                      <Ionicons
                        name="business"
                        size={32}
                        color="#666"
                        style={styles.groupIcon}
                      />
                      <View style={styles.groupInfo}>
                        <Text style={styles.groupName}>{grupo.nome}</Text>
                        <Text style={styles.groupSubtitle}>
                          {grupo.funcionarios.length} funcionário
                          {grupo.funcionarios.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.groupCardRight}>
                      {funcionariosComProblemas > 0 && (
                        <View style={styles.problemBadge}>
                          <Ionicons name="warning" size={16} color="#fff" />
                          <Text style={styles.problemBadgeText}>
                            {funcionariosComProblemas}
                          </Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : viewMode === "lojas" ? (
        <ScrollView style={styles.scrollView}>
          <View style={styles.listContainer}>
            {funcionariosPorLoja.map((loja) => {
              const funcionariosComProblemas = loja.funcionarios.filter(
                (f) => calcularPontosFaltantes(f).length > 0
              ).length;

              return (
                <TouchableOpacity
                  key={loja.id}
                  style={styles.lojaCard}
                  onPress={() => handleLojaPress(loja.id)}
                >
                  <View style={styles.lojaCardContent}>
                    <View style={styles.lojaCardLeft}>
                      <Ionicons
                        name="storefront"
                        size={28}
                        color="#666"
                        style={styles.lojaIcon}
                      />
                      <View style={styles.lojaInfo}>
                        <Text style={styles.lojaName}>{loja.nome}</Text>
                        <Text style={styles.lojaSubtitle}>
                          {loja.funcionarios.length} funcionário
                          {loja.funcionarios.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.lojaCardRight}>
                      {funcionariosComProblemas > 0 && (
                        <View style={styles.problemBadge}>
                          <Ionicons name="warning" size={16} color="#fff" />
                          <Text style={styles.problemBadgeText}>
                            {funcionariosComProblemas}
                          </Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : viewMode === "funcionarios" ? (
        <ScrollView style={styles.scrollView}>
          <View style={styles.listContainer}>
            <TouchableOpacity
              style={[styles.addPontoButton, { backgroundColor: "#4CAF50", marginBottom: 12 }]}
              onPress={handleExportLoja}
            >
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.addPontoText}>Exportar PDF da loja</Text>
            </TouchableOpacity>
            {funcionariosDaLoja.map((func) => {
              const pontosFaltantes = calcularPontosFaltantes(func);
              const temProblema = pontosFaltantes.length > 0;

              return (
                <TouchableOpacity
                  key={func.id}
                  style={[
                    styles.funcionarioCard,
                    temProblema && styles.funcionarioCardProblem,
                  ]}
                  onPress={() => handleFuncionarioPress(func)}
                >
                  <View style={styles.funcionarioCardContent}>
                    <View style={styles.funcionarioCardLeft}>
                      <View
                        style={[
                          styles.funcionarioAvatar,
                          temProblema && styles.funcionarioAvatarProblem,
                        ]}
                >
                        <Ionicons
                          name="person"
                          size={24}
                          color={temProblema ? "#fff" : "#666"}
                        />
                      </View>
                  <View style={styles.funcionarioInfo}>
                        <View style={styles.funcionarioNameRow}>
                    <Text style={styles.funcionarioNome}>{func.nome}</Text>
                          {temProblema && (
                            <View style={styles.warningIcon}>
                              <Ionicons name="alert-circle" size={18} color="#f44336" />
                            </View>
                          )}
                        </View>
                    {func.cpf && (
                      <Text style={styles.funcionarioCpf}>CPF: {func.cpf}</Text>
                    )}
                        {temProblema && (
                          <View style={styles.problemTags}>
                            {pontosFaltantes.map((ponto, idx) => (
                              <View key={idx} style={styles.problemTag}>
                                <Text style={styles.problemTagText}>
                                  Falta: {ponto}
                      </Text>
                              </View>
                            ))}
                          </View>
                    )}
                      </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                  </View>
                </TouchableOpacity>
              );
            })}
            {funcionariosDaLoja.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                  Nenhum funcionário encontrado nesta loja.
                  </Text>
                </View>
          )}
        </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Card do Protocolo */}
          {protocolo && (
            <View style={styles.protocoloCard}>
              <View style={styles.protocoloHeader}>
                <Ionicons name="document-text-outline" size={20} color="#009ee2" />
                <Text style={styles.protocoloLabel}>Protocolo do Mês</Text>
              </View>
              <TouchableOpacity
                style={styles.protocoloValueContainer}
                onPress={copiarProtocolo}
                activeOpacity={0.7}
              >
                <Text style={styles.protocoloValue} numberOfLines={1}>
                  {protocolo}
                </Text>
                <Ionicons name="copy-outline" size={18} color="#009ee2" />
              </TouchableOpacity>
              <Text style={styles.protocoloHint}>
                Toque para copiar o protocolo
              </Text>
            </View>
          )}

          {/* Botão Ver Batidas */}
          {protocolo && (
            <TouchableOpacity
              style={[styles.addPontoButton, { backgroundColor: "#6c5ce7", marginTop: 8 }]}
              onPress={verBatidas}
            >
              <Ionicons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.addPontoText}>Ver Batidas</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.addPontoButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addPontoText}>Adicionar batida</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addPontoButton, { backgroundColor: "#4CAF50", marginHorizontal: 16, marginTop: 8 }]}
            onPress={handleExportFuncionario}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.addPontoText}>Exportar PDF do funcionário</Text>
          </TouchableOpacity>

          {/* Botão para trocar funcionário */}
          <TouchableOpacity
            style={styles.changeFuncionarioButton}
            onPress={() => {
              setFuncionarioSelecionado(null);
              setViewMode("funcionarios");
            }}
          >
            <Ionicons name="swap-horizontal" size={18} color="#009ee2" />
            <Text style={styles.changeFuncionarioText}>Trocar Funcionário</Text>
          </TouchableOpacity>

          {/* Month Selector para histórico */}
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => changeMonth("prev")}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthName || selectedMonth}</Text>
            <TouchableOpacity
              onPress={() => changeMonth("next")}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Table */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#009ee2" />
              <Text style={styles.loadingText}>Carregando histórico...</Text>
            </View>
          ) : (
            <>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.cellDia]}>Dia</Text>
                <Text style={[styles.headerCell, styles.cellSemana]}>
                  Semana
                </Text>
                <Text style={[styles.headerCell, styles.cellHora]}>
                  Entrada
                </Text>
                <Text style={[styles.headerCell, styles.cellHora]}>Saída</Text>
                <Text style={[styles.headerCell, styles.cellHora]}>
                  Início Int.
                </Text>
                <Text style={[styles.headerCell, styles.cellHora]}>
                  Fim Int.
                </Text>
                <Text style={[styles.headerCell, styles.cellTotal]}>Total</Text>
              </View>

              {/* Table Rows */}
              {historico.map((row, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : null,
                  ]}
                >
                  <Text style={[styles.cell, styles.cellDia]}>{row.dia}</Text>
                  <Text style={[styles.cell, styles.cellSemana]}>
                    {row.semana}
                  </Text>
                  <Text style={[styles.cell, styles.cellHora]}>
                    {row.entrada || "—"}
                  </Text>
                  <Text style={[styles.cell, styles.cellHora]}>
                    {row.saida || "—"}
                  </Text>
                  <Text style={[styles.cell, styles.cellHora]}>
                    {row.intervaloInicio || "—"}
                  </Text>
                  <Text style={[styles.cell, styles.cellHora]}>
                    {row.intervaloFim || "—"}
                  </Text>
                  <Text style={[styles.cell, styles.cellTotal]}>
                    {row.totalHoras || "—"}
                  </Text>
                </View>
              ))}

              {/* Total Row */}
              {historico.length > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total do Mês:</Text>
                  <Text style={styles.totalValue}>
                    {total.horas}h {total.minutos}min
                  </Text>
                </View>
              )}

              {historico.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Nenhum registro de ponto encontrado para este mês.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
      {/* Modal Adicionar Batida */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            style={styles.modalKeyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Adicionar batida</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.tipoGrid}>
              {[
                { value: "ENTRADA", label: "Entrada" },
                { value: "SAIDA", label: "Saída" },
                { value: "INTERVALO_INICIO", label: "Início Intervalo" },
                { value: "INTERVALO_FIM", label: "Fim Intervalo" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.tipoOption,
                    addTipo === item.value && styles.tipoOptionSelected,
                  ]}
                  onPress={() =>
                    setAddTipo(
                      item.value as
                        | "ENTRADA"
                        | "SAIDA"
                        | "INTERVALO_INICIO"
                        | "INTERVALO_FIM"
                    )
                  }
                >
                  <Text
                    style={[
                      styles.tipoOptionText,
                      addTipo === item.value && styles.tipoOptionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Data</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#009ee2" />
              <Text style={[styles.datePickerText, !addDate && styles.datePickerPlaceholder]}>
                {addDate || "Selecione a data"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
                locale="pt-BR"
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Confirmar Data</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.modalLabel}>Hora</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#009ee2" />
              <Text style={[styles.datePickerText, !addTime && styles.datePickerPlaceholder]}>
                {addTime || "Selecione a hora"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange}
                is24Hour={true}
                locale="pt-BR"
              />
            )}
            {Platform.OS === "ios" && showTimePicker && (
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Confirmar Hora</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.modalLabel}>Observação (opcional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
              placeholder="Ex: ajuste manual solicitado pelo supervisor"
              value={addObs}
              onChangeText={setAddObs}
              multiline
            />

            <TouchableOpacity
              style={[
                styles.modalButton,
                addLoading && styles.modalButtonDisabled,
              ]}
              onPress={handleSalvarBatida}
              disabled={addLoading}
            >
              {addLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Salvar batida</Text>
              )}
            </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  protocoloButton: {
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
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#009ee2",
    justifyContent: "center",
    alignItems: "center",
  },
  monthButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  groupCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  groupIcon: {
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  groupSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  groupCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lojaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lojaCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  lojaCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  lojaIcon: {
    marginRight: 12,
  },
  lojaInfo: {
    flex: 1,
  },
  lojaName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  lojaSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  lojaCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  funcionarioCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  funcionarioCardProblem: {
    borderColor: "#f44336",
    borderWidth: 2,
    backgroundColor: "#fff5f5",
  },
  funcionarioCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  funcionarioCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  funcionarioAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  funcionarioAvatarProblem: {
    backgroundColor: "#f44336",
  },
  funcionarioInfo: {
    flex: 1,
  },
  funcionarioNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  funcionarioNome: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  warningIcon: {
    marginLeft: 4,
  },
  funcionarioCpf: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  problemTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  problemTag: {
    backgroundColor: "#f44336",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  problemTagText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  problemBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f44336",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  problemBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  addPontoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#009ee2",
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addPontoText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  changeFuncionarioButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    margin: 16,
    backgroundColor: "#e8f5ff",
    borderRadius: 10,
    gap: 8,
  },
  changeFuncionarioText: {
    color: "#009ee2",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 20,
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
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#009ee2",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tableRowEven: {
    backgroundColor: "#f9f9f9",
  },
  cell: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },
  cellDia: {
    flex: 0.8,
    fontWeight: "600",
  },
  cellSemana: {
    flex: 0.8,
  },
  cellHora: {
    flex: 1,
  },
  cellTotal: {
    flex: 1,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginTop: 16,
    backgroundColor: "#009ee2",
    marginHorizontal: 16,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalKeyboardAvoid: {
    width: "100%",
    maxWidth: 420,
  },
  modalScrollContent: {
    flexGrow: 0,
    padding: 0,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    marginBottom: 6,
  },
  modalInput: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fafafa",
    marginBottom: 8,
  },
  tipoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipoOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
  },
  tipoOptionSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e5f4ff",
  },
  tipoOptionText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },
  tipoOptionTextSelected: {
    color: "#009ee2",
  },
  modalButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#009ee2",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#009ee2",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalCancelButton: {
    width: "100%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
    marginBottom: 8,
    gap: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  datePickerPlaceholder: {
    color: "#999",
  },
  pickerCloseButton: {
    width: "100%",
    height: 44,
    backgroundColor: "#009ee2",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  pickerCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  protocoloCard: {
    backgroundColor: "#f8f9fa",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  protocoloHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  protocoloLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  protocoloValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#009ee2",
    marginBottom: 4,
    gap: 8,
  },
  protocoloValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#009ee2",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  protocoloHint: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
});
