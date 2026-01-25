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
import { obterHistoricoMensal, Funcionario } from "../services/api";
import { format } from "date-fns";

interface HistoricoScreenProps {
  funcionario: Funcionario;
  onClose: () => void;
}

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

export default function HistoricoScreen({
  funcionario,
  onClose,
}: HistoricoScreenProps) {
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState<DiaRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [monthName, setMonthName] = useState("");

  useEffect(() => {
    loadHistorico();
  }, [selectedMonth]);

  const loadHistorico = async () => {
    setLoading(true);
    try {
      const response = await obterHistoricoMensal(
        funcionario.cpf,
        selectedMonth
      );
      setHistorico(response.table);

      // Formatar nome do mês (padrão: "Dezembro de 2025")
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
      Alert.alert(
        "Erro",
        "Não foi possível carregar o histórico de pontos. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Folha de Ponto</Text>
          <Text style={styles.headerSubtitle}>{funcionario.nome}</Text>
        </View>
      </View>

      {/* Month Selector */}
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.cellDia]}>Dia</Text>
            <Text style={[styles.headerCell, styles.cellSemana]}>Semana</Text>
            <Text style={[styles.headerCell, styles.cellHora]}>Entrada</Text>
            <Text style={[styles.headerCell, styles.cellHora]}>Saída</Text>
            <Text style={[styles.headerCell, styles.cellHora]}>
              Início Int.
            </Text>
            <Text style={[styles.headerCell, styles.cellHora]}>Fim Int.</Text>
            <Text style={[styles.headerCell, styles.cellTotal]}>Total</Text>
          </View>

          {/* Table Rows */}
          {historico.map((row, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
            >
              <Text style={[styles.cell, styles.cellDia]}>{row.dia}</Text>
              <Text style={[styles.cell, styles.cellSemana]}>{row.semana}</Text>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    width: "100%",
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
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
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
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
});
