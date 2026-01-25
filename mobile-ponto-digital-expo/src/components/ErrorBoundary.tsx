import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { saveErrorLog, getErrorLogs } from "../utils/errorLogger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showLogs: boolean;
  logs: any[];
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, showLogs: false, logs: [] };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Component stack:", errorInfo.componentStack);

    // Salvar log localmente para debug
    saveErrorLog(error, errorInfo);
  }

  async loadLogs() {
    const logs = await getErrorLogs();
    this.setState({ logs, showLogs: true });
  }

  render() {
    if (this.state.hasError) {
      if (this.state.showLogs) {
        return (
          <View style={styles.container}>
            <Text style={styles.title}>📋 Logs de Erro</Text>
            <ScrollView style={styles.logsContainer}>
              {this.state.logs.length === 0 ? (
                <Text style={styles.logText}>Nenhum log salvo</Text>
              ) : (
                this.state.logs.map((log, index) => (
                  <View key={index} style={styles.logItem}>
                    <Text style={styles.logTimestamp}>
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                    <Text style={styles.logError}>
                      {log.error.name}: {log.error.message}
                    </Text>
                    {log.error.stack && (
                      <Text style={styles.logStack}>{log.error.stack}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.button}
              onPress={() => this.setState({ showLogs: false })}
            >
              <Text style={styles.buttonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Ops! Algo deu errado</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Erro desconhecido"}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.loadLogs()}
          >
            <Text style={styles.buttonText}>Ver Logs Salvos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#009ee2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#666",
  },
  logsContainer: {
    maxHeight: 400,
    width: "100%",
    marginVertical: 20,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  logItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  logError: {
    fontSize: 14,
    color: "#f44336",
    fontWeight: "bold",
    marginBottom: 4,
  },
  logStack: {
    fontSize: 10,
    color: "#999",
    fontFamily: "monospace",
  },
  logText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    padding: 20,
  },
});
