import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { User, UserRole } from "../services/api";
import UpdateBanner from "../components/UpdateBanner";
import { useAppUpdate } from "../hooks/useAppUpdate";

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
}

const roleLabels: Record<UserRole, string> = {
  MASTER: "Master",
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  RH: "Recursos Humanos",
  OPERACIONAL: "Operacional",
  GESTOR: "Gestor",
  JURIDICO: "Jurídico",
  FINANCEIRO: "Financeiro",
  USER: "Usuário",
};

export default function DashboardScreen({
  user,
  onLogout,
}: DashboardScreenProps) {
  const navigation = useNavigation();
  const [menuDrawerVisible, setMenuDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Verificar atualizações do app
  const { hasUpdate } = useAppUpdate();

  useEffect(() => {
    if (menuDrawerVisible) {
      setDrawerMounted(true);
      Animated.parallel([
        Animated.spring(drawerAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerAnim, {
          toValue: -300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Remover do DOM apenas após a animação terminar
        setDrawerMounted(false);
      });
    }
  }, [menuDrawerVisible]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => setMenuDrawerVisible(true)}
            style={styles.menuButton}
          >
            <View style={styles.menuIcon}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/icon-512.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {roleLabels[user.role] || user.role}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Banner de atualização */}
      {hasUpdate && !updateBannerDismissed && (
        <UpdateBanner
          onDismiss={() => setUpdateBannerDismissed(true)}
          appName="KL Administração"
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Cards de Funcionalidades */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Funcionalidades</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione uma opção para gerenciar
            </Text>

            <View style={styles.cardsGrid}>
              {/* Card de Checklists */}
              {(user.role === "SUPERVISOR" ||
                user.role === "MASTER" ||
                user.role === "ADMIN" ||
                user.role === "OPERACIONAL") && (
                <TouchableOpacity
                  style={[styles.card, { marginBottom: 16 }]}
                  onPress={() => navigation.navigate("Checklists" as never)}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      name="checkmark-circle"
                      size={32}
                      color="#666"
                    />
                  </View>
                  <Text style={styles.cardTitle}>Checklists</Text>
                  <Text style={styles.cardSubtitle}>
                    Gerenciar checklists operacionais
                  </Text>
                </TouchableOpacity>
              )}

              {/* Card de Pontos */}
              {(user.role === "SUPERVISOR" ||
                user.role === "MASTER" ||
                user.role === "ADMIN" ||
                user.role === "RH") && (
                <TouchableOpacity
                  style={[styles.card, { marginBottom: 16 }]}
                  onPress={() => navigation.navigate("Pontos" as never)}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="time" size={32} color="#666" />
                  </View>
                  <Text style={styles.cardTitle}>Pontos</Text>
                  <Text style={styles.cardSubtitle}>
                    Visualizar e gerenciar registros de ponto
                  </Text>
                </TouchableOpacity>
              )}

              {/* Card de Funcionários */}
              {(user.role === "MASTER" ||
                user.role === "ADMIN" ||
                user.role === "RH") && (
                <TouchableOpacity style={[styles.card, { marginBottom: 16 }]}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="people" size={32} color="#666" />
                  </View>
                  <Text style={styles.cardTitle}>Funcionários</Text>
                  <Text style={styles.cardSubtitle}>
                    Gerenciar cadastro de funcionários
                  </Text>
                </TouchableOpacity>
              )}

              {/* Card de Incidentes */}
              {(user.role === "MASTER" ||
                user.role === "ADMIN" ||
                user.role === "SUPERVISOR") && (
                <TouchableOpacity
                  style={[styles.card, { marginBottom: 16 }]}
                  onPress={() => navigation.navigate("Incidentes" as never)}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="warning" size={32} color="#f44336" />
                  </View>
                  <Text style={styles.cardTitle}>Incidentes</Text>
                  <Text style={styles.cardSubtitle}>
                    Visualizar chamados e incidentes
                  </Text>
                </TouchableOpacity>
              )}

              {/* Card de Avaliações */}
              {(user.role === "MASTER" ||
                user.role === "ADMIN" ||
                user.role === "SUPERVISOR") && (
                <TouchableOpacity
                  style={[styles.card, { marginBottom: 16 }]}
                  onPress={() => navigation.navigate("Avaliacoes" as never)}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="star" size={32} color="#666" />
                  </View>
                  <Text style={styles.cardTitle}>Avaliações</Text>
                  <Text style={styles.cardSubtitle}>
                    Gerenciar avaliações e checklists
                  </Text>
                </TouchableOpacity>
              )}

              {/* Card de Banco de Talentos */}
              {(user.role === "MASTER" ||
                user.role === "ADMIN" ||
                user.role === "SUPERVISOR" ||
                user.role === "RH") && (
                <TouchableOpacity
                  style={[styles.card, { marginBottom: 16 }]}
                  onPress={() => navigation.navigate("BancoTalentos" as never)}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="briefcase" size={32} color="#666" />
                  </View>
                  <Text style={styles.cardTitle}>Banco de Talentos</Text>
                  <Text style={styles.cardSubtitle}>
                    Ver candidatos cadastrados
                  </Text>
                </TouchableOpacity>
              )}

              {/* Card de Checklist de Banheiros */}
              {(user.role === "MASTER" ||
                user.role === "ADMIN" ||
                user.role === "SUPERVISOR" ||
                user.role === "OPERACIONAL") && (
                <TouchableOpacity
                  style={[styles.card, { marginBottom: 16 }]}
                  onPress={() => navigation.navigate("ChecklistBanheiros" as never)}
                >
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="water" size={32} color="#009ee2" />
                  </View>
                  <Text style={styles.cardTitle}>Checklist de Banheiros</Text>
                  <Text style={styles.cardSubtitle}>
                    Serviços de limpeza, insumos e satisfação
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Informações do Usuário */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Informações da Conta</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Perfil:</Text>
              <Text style={styles.infoValue}>
                {roleLabels[user.role] || user.role}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Menu Drawer */}
      {drawerMounted && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setMenuDrawerVisible(false)}
            style={StyleSheet.absoluteFill}
          >
            <Animated.View
              style={[
                styles.drawerBackdrop,
                {
                  opacity: backdropAnim,
                },
              ]}
            />
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                transform: [{ translateX: drawerAnim }],
              },
            ]}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity
                onPress={() => setMenuDrawerVisible(false)}
                style={styles.drawerCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.drawerContent}>
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => setMenuDrawerVisible(false)}
              >
                <Ionicons name="home" size={20} color="#009ee2" />
                <Text style={[styles.drawerMenuText, { marginLeft: 12 }]}>Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuDrawerVisible(false);
                  navigation.navigate("WebView" as never, {
                    url: "https://www.klfacilities.com.br/compliance/privacidade",
                    title: "Política de Privacidade",
                  } as never);
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color="#009ee2" />
                <Text style={[styles.drawerMenuText, { marginLeft: 12 }]}>Política de Privacidade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuDrawerVisible(false);
                  navigation.navigate("WebView" as never, {
                    url: "https://www.klfacilities.com.br/compliance/manual-tecnico-juridico",
                    title: "Manual Técnico e Jurídico",
                  } as never);
                }}
              >
                <Ionicons name="document-text" size={20} color="#009ee2" />
                <Text style={[styles.drawerMenuText, { marginLeft: 12 }]}>Manual Técnico</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuDrawerVisible(false);
                  navigation.navigate("WebView" as never, {
                    url: "https://www.klfacilities.com.br/ajuda/fortinet",
                    title: "Ajuda - Firewall",
                  } as never);
                }}
              >
                <Ionicons name="help-circle" size={20} color="#009ee2" />
                <Text style={[styles.drawerMenuText, { marginLeft: 12 }]}>Ajuda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuDrawerVisible(false);
                  navigation.navigate("WebView" as never, {
                    url: "https://www.klfacilities.com.br/compliance/conformidade",
                    title: "Relatório de Conformidade",
                  } as never);
                }}
              >
                <Ionicons name="checkmark-done-circle" size={20} color="#009ee2" />
                <Text style={[styles.drawerMenuText, { marginLeft: 12 }]}>Conformidade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuDrawerVisible(false);
                  navigation.navigate("WebView" as never, {
                    url: "https://www.klfacilities.com.br/ajuda/guia-colaborador-ponto",
                    title: "Guia: App de Ponto",
                  } as never);
                }}
              >
                <Ionicons name="book-outline" size={20} color="#009ee2" />
                <Text style={[styles.drawerMenuText, { marginLeft: 12 }]}>Guia: App de Ponto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={onLogout}
              >
                <Ionicons name="log-out" size={20} color="#f44336" />
                <Text style={[styles.drawerMenuText, { color: "#f44336", marginLeft: 12 }]}>
                  Sair
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
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
    backgroundColor: "#009ee2",
    padding: 20,
    paddingTop: 80,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: {
    width: 24,
    height: 18,
    justifyContent: "space-between",
  },
  menuLine: {
    width: 24,
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  logoContainer: {
    width: 48,
    height: 48,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    fontWeight: "400",
  },
  cardsGrid: {
    // gap substituído por marginBottom nos cards
  },
  card: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconContainer: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  drawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: "row",
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "75%",
    maxWidth: 320,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 70,
    backgroundColor: "#009ee2",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  drawerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerContent: {
    padding: 16,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    marginBottom: 8,
  },
  drawerMenuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
