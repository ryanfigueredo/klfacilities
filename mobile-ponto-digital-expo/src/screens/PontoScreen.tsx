import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import {
  registrarPonto,
  Funcionario,
  obterPontosRegistradosHoje,
} from "../services/api";
import {
  adicionarPontoOffline,
  iniciarSincronizacaoAutomatica,
  obterQuantidadePendentes,
  temInternet,
} from "../services/offlineQueue";
import * as Device from "expo-device";
import {
  obterPontosHoje,
  jaRegistradoHoje,
  salvarPontoRegistrado,
} from "../utils/pontoHistory";
import { validarGeofence } from "../utils/geofence";
import HistoricoScreen from "./HistoricoScreen";
import ManifestacaoScreen from "./ManifestacaoScreen";
import ConfiguracoesScreen from "./ConfiguracoesScreen";
import { useLocation } from "../contexts/LocationContext";
import UpdateBanner from "../components/UpdateBanner";
import { useAppUpdate } from "../hooks/useAppUpdate";

interface PontoScreenProps {
  funcionario: Funcionario;
  onLogout: () => void;
  onReloadFuncionario?: () => Promise<void>;
}

const TIPOS_PONTO = [
  {
    value: "ENTRADA",
    label: "Entrada",
    icon: "arrow-forward" as const,
    color: "#4CAF50",
  },
  {
    value: "INTERVALO_INICIO",
    label: "Início Intervalo",
    icon: "pause-circle" as const,
    color: "#FF9800",
  },
  {
    value: "INTERVALO_FIM",
    label: "Fim Intervalo",
    icon: "play-circle" as const,
    color: "#2196F3",
  },
  {
    value: "SAIDA",
    label: "Saída",
    icon: "arrow-back" as const,
    color: "#f44336",
  },
  {
    value: "HORA_EXTRA_INICIO",
    label: "Hora Extra - Início",
    icon: "star" as const,
    color: "#9C27B0",
  },
  {
    value: "HORA_EXTRA_FIM",
    label: "Hora Extra - Saída",
    icon: "star-outline" as const,
    color: "#E91E63",
  },
];

export default function PontoScreen({
  funcionario,
  onLogout,
  onReloadFuncionario,
}: PontoScreenProps) {
  // Usar localização do contexto (já obtida quando o app abriu)
  const { location, locationPermission: contextLocationPermission, refreshLocation } = useLocation();
  
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [locationPermission, setLocationPermission] = useState(contextLocationPermission);
  const [isOnline, setIsOnline] = useState(true);
  const [pontosPendentes, setPontosPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [pontosRegistradosHoje, setPontosRegistradosHoje] = useState<string[]>(
    []
  );
  const [validandoLocalizacao, setValidandoLocalizacao] = useState(false);
  const [menuDrawerVisible, setMenuDrawerVisible] = useState(false);
  const [historicoVisible, setHistoricoVisible] = useState(false);
  const [manifestacaoVisible, setManifestacaoVisible] = useState(false);
  const [configuracoesVisible, setConfiguracoesVisible] = useState(false);
  const [geofenceValidation, setGeofenceValidation] = useState<{
    valido: boolean;
    distancia?: number;
    mensagem?: string;
  } | null>(null);
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);

  // Verificar atualizações do app
  const { hasUpdate } = useAppUpdate();

  // Atualizar locationPermission quando o contexto mudar
  useEffect(() => {
    setLocationPermission(contextLocationPermission);
  }, [contextLocationPermission]);

  useEffect(() => {
    // Usar setTimeout para garantir que o componente está totalmente montado
    // Isso evita crashes em dispositivos físicos
    const initTimer = setTimeout(async () => {
      try {
        // Solicitar apenas permissão de câmera (localização já foi solicitada no contexto)
        await requestCameraPermission();
        
        // Se já temos localização do contexto, atualizar geofence imediatamente
        if (location) {
          atualizarValidacaoGeofence(location);
        }
        
        verificarConexao();
        atualizarPontosPendentes();
        // Carregar pontos registrados ao montar componente e quando CPF mudar
        carregarPontosRegistradosServidor();

        // Iniciar sincronização automática
        const stopSync = iniciarSincronizacaoAutomatica((resultado) => {
          if (resultado.sincronizados > 0) {
            setSincronizando(true);
            setTimeout(() => {
              setSincronizando(false);
              atualizarPontosPendentes();
              carregarPontosRegistradosServidor();
            }, 1000);
          }
        });

        // Verificar conexão periodicamente
        const intervalo = setInterval(() => {
          verificarConexao();
          atualizarPontosPendentes();
        }, 3000);

        return () => {
          stopSync();
          clearInterval(intervalo);
        };
      } catch (error) {
        console.error("Erro ao inicializar PontoScreen:", error);
        // Não crashar o app, apenas logar o erro
      }
    }, 200);

    return () => {
      clearTimeout(initTimer);
    };
  }, [funcionario.cpf, funcionario.unidade.lat, funcionario.unidade.lng, funcionario.unidade.radiusM]); // Recarregar quando o CPF ou coordenadas mudarem

  // Função para atualizar validação de geofence
  const atualizarValidacaoGeofence = (loc?: Location.LocationObject) => {
    const localizacaoAtual = loc || location;
    if (!localizacaoAtual) return;

    if (
      funcionario?.unidade?.lat &&
      funcionario?.unidade?.lng &&
      funcionario?.unidade?.radiusM
    ) {
      const validacao = validarGeofence(
        { lat: localizacaoAtual.coords.latitude, lng: localizacaoAtual.coords.longitude },
        funcionario.unidade
      );
      setGeofenceValidation(validacao);
      console.log("Validação geofence atualizada:", {
        minhaLocalizacao: {
          lat: localizacaoAtual.coords.latitude,
          lng: localizacaoAtual.coords.longitude,
        },
        unidade: {
          lat: funcionario.unidade.lat,
          lng: funcionario.unidade.lng,
          radiusM: funcionario.unidade.radiusM,
        },
        distancia: validacao.distancia,
        valido: validacao.valido,
        precisao: localizacaoAtual.coords.accuracy,
      });
    } else {
      setGeofenceValidation(null);
    }
  };

  // Recalcular geofence quando funcionário ou localização mudarem
  useEffect(() => {
    if (location) {
      atualizarValidacaoGeofence();
    }
  }, [funcionario.unidade.lat, funcionario.unidade.lng, funcionario.unidade.radiusM, location]);

  // Buscar pontos registrados do SERVIDOR (por CPF)
  const carregarPontosRegistradosServidor = async () => {
    try {
      const tipos = await obterPontosRegistradosHoje(funcionario.cpf);
      setPontosRegistradosHoje(tipos);
      console.log("Pontos registrados hoje (servidor):", tipos);
    } catch (error) {
      console.error("Erro ao buscar pontos do servidor:", error);
      // Em caso de erro, não bloqueia o uso
      setPontosRegistradosHoje([]);
    }
  };

  // Função antiga mantida apenas para compatibilidade offline (não usar mais)
  const carregarPontosRegistrados = async () => {
    // Esta função não é mais usada, mas mantida para não quebrar código
    await carregarPontosRegistradosServidor();
  };

  const verificarConexao = async () => {
    const online = await temInternet();
    setIsOnline(online);
  };

  const atualizarPontosPendentes = async () => {
    const quantidade = await obterQuantidadePendentes();
    setPontosPendentes(quantidade);
  };

  const requestCameraPermission = async () => {
    try {
      // Solicitar apenas permissão de câmera (localização já foi solicitada no contexto)
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      setCameraPermission(cameraStatus === "granted");
    } catch (error) {
      console.error("Erro ao solicitar permissão de câmera:", error);
      // Não crashar o app se houver erro nas permissões
    }
  };

  // Função para atualizar localização manualmente (usando o contexto)
  const getLocation = async () => {
    try {
      // Usar refreshLocation do contexto para atualizar localização
      await refreshLocation();

      // A localização será atualizada automaticamente pelo contexto
      // e o useEffect abaixo vai atualizar o geofence
    } catch (error: any) {
      console.error("Erro ao atualizar localização:", error);

      if (error.message?.includes("permission")) {
        Alert.alert(
          "Permissão Necessária",
          "É necessário permitir acesso à localização. Vá em Configurações > KL Colaboradores > Localização e permita o acesso.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Erro",
          "Não foi possível obter sua localização. Verifique se o GPS está ativado."
        );
      }
    }
  };

  const takeSelfie = async (): Promise<string | null> => {
    // Verificar se está no simulador
    const isSimulator = !Device.isDevice;

    if (isSimulator) {
      // Para teste no simulador, usar uma imagem placeholder
      return "https://via.placeholder.com/400x400/009ee2/ffffff?text=Selfie+Placeholder";
    }

    if (!cameraPermission) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Necessária",
          "É necessário permitir acesso à câmera para registrar o ponto. Vá em Configurações > KL Colaboradores > Câmera e permita o acesso."
        );
        return null;
      }
      setCameraPermission(true);
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front, // Abrir câmera frontal por padrão
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error: any) {
      console.error("Erro ao tirar selfie:", error);

      if (
        error.message?.includes("simulator") ||
        error.message?.includes("Camera not available")
      ) {
        Alert.alert(
          "Câmera Indisponível",
          "A câmera não está disponível no simulador. Use um dispositivo físico para testar esta funcionalidade."
        );
      } else {
        Alert.alert(
          "Erro",
          "Não foi possível tirar a selfie. Verifique se a câmera está funcionando."
        );
      }
      return null;
    }
  };

  // Validar localização antes de permitir registro
  const validarLocalizacaoAntesRegistro = async (): Promise<boolean> => {
    if (!location) {
      Alert.alert(
        "Erro",
        "Não foi possível obter sua localização. Aguarde um momento e tente novamente."
      );
      await getLocation();
      return false;
    }

    // Se não tem coordenadas da unidade configuradas, permite (validação só no backend)
    if (
      !funcionario.unidade.lat ||
      !funcionario.unidade.lng ||
      !funcionario.unidade.radiusM
    ) {
      console.log(
        "Unidade sem geofence configurado, validando apenas no servidor"
      );
      return true;
    }

    // Validar geofence com margem de tolerância (funciona igual online e offline)
    const validacao = validarGeofence(
      { lat: location.coords.latitude, lng: location.coords.longitude },
      funcionario.unidade
    );

    console.log("Validação geofence:", {
      minhaLocalizacao: {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      },
      unidade: {
        lat: funcionario.unidade.lat,
        lng: funcionario.unidade.lng,
        radiusM: funcionario.unidade.radiusM,
      },
      distancia: validacao.distancia,
      valido: validacao.valido,
    });

    if (!validacao.valido) {
      const distanciaKm = validacao.distancia
        ? (validacao.distancia / 1000).toFixed(1)
          : "N/A";
      const distanciaTexto =
        validacao.distancia && validacao.distancia > 1000
          ? `${distanciaKm} km`
          : `${validacao.distancia}m`;

      // Em modo de desenvolvimento, mostrar alerta mas permitir continuar
      if (__DEV__) {
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            "Localização Inválida (Modo Desenvolvimento)",
            `Você está a ${distanciaTexto} da unidade "${funcionario.unidade.nome}".\n\n` +
              `É necessário estar dentro do raio de ${funcionario.unidade.radiusM}m para registrar o ponto.\n\n` +
              `Sua localização: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}\n` +
              `Unidade: ${funcionario.unidade.lat}, ${funcionario.unidade.lng}\n\n` +
              `⚠️ MODO DESENVOLVIMENTO: Você pode continuar mesmo assim para teste?`,
            [
              {
                text: "Cancelar",
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: "Continuar (Teste)",
                onPress: () => resolve(true),
                style: "destructive",
              },
            ]
          );
        });
      } else {
      Alert.alert(
        "Localização Inválida",
          `Você está a ${distanciaTexto} da unidade "${funcionario.unidade.nome}".\n\n` +
          `É necessário estar dentro do raio de ${funcionario.unidade.radiusM}m para registrar o ponto.\n\n` +
          `Verifique se você está na unidade correta ou aguarde alguns segundos para o GPS estabilizar.`,
        [{ text: "OK" }]
      );
      return false;
      }
    }

    return true;
  };

  // Função principal: ao clicar no botão, tira foto e registra automaticamente
  const handleTipoPontoClick = async (tipo: string) => {
    // Verificar se já foi registrado hoje (usar estado do servidor)
    const jaRegistrado = pontosRegistradosHoje.includes(tipo);
    if (jaRegistrado) {
      Alert.alert(
        "Ponto já registrado",
        `Você já registrou ${TIPOS_PONTO.find(
          (t) => t.value === tipo
        )?.label.toLowerCase()} hoje.`
      );
      return;
    }

    // Verificar se intervalo está bloqueado
    const bateuEntradaESaida =
      pontosRegistradosHoje.includes("ENTRADA") &&
      pontosRegistradosHoje.includes("SAIDA");
    const bateuSaida = pontosRegistradosHoje.includes("SAIDA");

    if (
      (tipo === "INTERVALO_INICIO" || tipo === "INTERVALO_FIM") &&
      (bateuEntradaESaida || bateuSaida)
    ) {
      if (bateuEntradaESaida) {
        Alert.alert(
          "Intervalo bloqueado",
          "Você já registrou Entrada e Saída. Não é mais possível registrar intervalo após a saída."
        );
      } else {
        Alert.alert(
          "Intervalo bloqueado",
          "Você já registrou a Saída. Não é mais possível registrar intervalo."
        );
      }
      return;
    }

    // Validar localização primeiro
    const localizacaoValida = await validarLocalizacaoAntesRegistro();
    if (!localizacaoValida) {
      return;
    }

    setTipoSelecionado(tipo);
    setLoading(true);

    try {
      // Tirar foto automaticamente
      const fotoUri = await takeSelfie();

      if (!fotoUri) {
        setLoading(false);
        setTipoSelecionado(null);
        return;
      }

      setSelfieUri(fotoUri);

      // Registrar ponto automaticamente
      await registrarPontoCompleto(tipo, fotoUri);
    } catch (error: any) {
      console.error("Erro no fluxo de registro:", error);
      Alert.alert("Erro", "Erro ao processar o registro. Tente novamente.");
      setTipoSelecionado(null);
      setSelfieUri(null);
    } finally {
      setLoading(false);
    }
  };

  // Registrar ponto (com foto já tirada)
  const registrarPontoCompleto = async (tipo: string, fotoUri: string) => {
    if (!location) {
      Alert.alert("Erro", "Não foi possível obter sua localização");
      return;
    }

    try {
      const deviceId = Device.modelName || Device.osName || "unknown";
      const online = await temInternet();

      if (online) {
        // Tentar enviar diretamente
        try {
          const response = await registrarPonto(
            funcionario.cpf,
            tipo,
            location.coords.latitude,
            location.coords.longitude,
            location.coords.accuracy || null,
            fotoUri,
            deviceId
          );

          // Atualizar estado local IMEDIATAMENTE (antes de buscar do servidor)
          setPontosRegistradosHoje((prev) => {
            if (!prev.includes(tipo)) {
              return [...prev, tipo];
            }
            return prev;
          });

          // Atualizar lista de pontos registrados do servidor (para garantir sincronização)
          await carregarPontosRegistradosServidor();

          Alert.alert("Sucesso", "Ponto registrado com sucesso!", [
            {
              text: "OK",
              onPress: () => {
                setTipoSelecionado(null);
                setSelfieUri(null);
              },
            },
          ]);
        } catch (error: any) {
          // Verificar se é erro de geofence
          if (
            error.response?.data?.error?.includes("localização") ||
            error.response?.data?.error?.includes("geofence") ||
            error.response?.data?.error?.includes("fora")
          ) {
            Alert.alert(
              "Localização Inválida",
              error.response.data.error ||
                "Você precisa estar dentro da área da unidade para registrar o ponto."
            );
            setTipoSelecionado(null);
            setSelfieUri(null);
            return;
          }

          // Se falhar, salvar offline
          console.warn("Falha ao enviar online, salvando offline:", error);
          await adicionarPontoOffline(
            funcionario.cpf,
            tipo,
            location.coords.latitude,
            location.coords.longitude,
            location.coords.accuracy || null,
            fotoUri,
            deviceId
          );

          // Atualizar estado local IMEDIATAMENTE
          setPontosRegistradosHoje((prev) => {
            if (!prev.includes(tipo)) {
              return [...prev, tipo];
            }
            return prev;
          });

          // Atualizar lista (quando voltar online vai sincronizar)
          await carregarPontosRegistradosServidor();

        Alert.alert(
          "Ponto salvo offline",
          "Seu ponto foi salvo localmente no celular e será sincronizado automaticamente quando a internet voltar.\n\nO ponto será validado pelo servidor durante a sincronização.",
          [
            {
              text: "OK",
              onPress: () => {
                setTipoSelecionado(null);
                setSelfieUri(null);
                atualizarPontosPendentes();
              },
            },
          ]
        );
        }
      } else {
        // Sem internet - salvar offline
        await adicionarPontoOffline(
          funcionario.cpf,
          tipo,
          location.coords.latitude,
          location.coords.longitude,
          location.coords.accuracy || null,
          fotoUri,
          deviceId
        );

        // Atualizar estado local IMEDIATAMENTE
        setPontosRegistradosHoje((prev) => {
          if (!prev.includes(tipo)) {
            return [...prev, tipo];
          }
          return prev;
        });

        // Atualizar lista (quando voltar online vai sincronizar)
        await carregarPontosRegistradosServidor();

        Alert.alert(
          "Ponto salvo offline",
          "Seu ponto foi salvo localmente no celular e será sincronizado automaticamente quando a internet voltar.\n\nO ponto será validado pelo servidor durante a sincronização.",
          [
            {
              text: "OK",
              onPress: () => {
                setTipoSelecionado(null);
                setSelfieUri(null);
                atualizarPontosPendentes();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Erro ao registrar ponto:", error);

      // Verificar se é erro de geofence do servidor
      if (
        error.response?.data?.error?.includes("localização") ||
        error.response?.data?.error?.includes("geofence")
      ) {
        Alert.alert(
          "Localização Inválida",
          error.response.data.error ||
            "Você precisa estar dentro da área da unidade para registrar o ponto."
        );
      } else {
        Alert.alert(
          "Erro",
          error.message || "Erro ao registrar ponto. Tente novamente."
        );
      }

      setTipoSelecionado(null);
      setSelfieUri(null);
    }
  };

  const handleRegistrarPonto = async () => {
    if (!tipoSelecionado) {
      Alert.alert("Atenção", "Selecione o tipo de ponto");
      return;
    }

    if (!selfieUri) {
      Alert.alert("Atenção", "É necessário tirar uma selfie");
      return;
    }

    await registrarPontoCompleto(tipoSelecionado, selfieUri);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Menu Hambúrguer */}
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

          <View style={styles.headerInfo}>
            <Text style={styles.welcome}>Ponto Eletrônico KL</Text>
            <Text style={styles.userName}>{funcionario.nome}</Text>
            <Text style={styles.userUnit}>{funcionario.unidade.nome}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        {/* Indicador de conexão e pontos pendentes */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            {isOnline ? (
              <View style={styles.statusContainer}>
                <View style={styles.statusDotOnline} />
                <Text style={styles.statusText}>Online</Text>
              </View>
            ) : (
              <View style={styles.statusContainer}>
                <View style={styles.statusDotOffline} />
                <Text style={styles.statusText}>Offline</Text>
              </View>
            )}
          </View>
          {pontosPendentes > 0 && (
            <View style={styles.statusItem}>
              <View style={styles.statusContainer}>
                {sincronizando ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.statusText}>Sincronizando...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.statusText}>
                      {pontosPendentes} pendente{pontosPendentes > 1 ? "s" : ""}{" "}
                      na fila
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Banner de atualização */}
      {hasUpdate && !updateBannerDismissed && (
        <UpdateBanner
          onDismiss={() => setUpdateBannerDismissed(true)}
          appName="KL Colaboradores"
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* CPF - Card Simplificado */}
          <View style={styles.cpfCard}>
            <Text style={styles.cpfLabel}>CPF</Text>
            <Text style={styles.cpfValue}>{funcionario.cpf}</Text>
          </View>

          {/* Status de Localização (apenas indicador visual, sem coordenadas) */}
          {geofenceValidation && (
            <View
              style={[
                styles.geofenceStatusCard,
                geofenceValidation.valido
                  ? styles.geofenceStatusValid
                  : styles.geofenceStatusInvalid,
              ]}
            >
              <Ionicons
                name={
                  geofenceValidation.valido
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={24}
                color={geofenceValidation.valido ? "#4CAF50" : "#f44336"}
              />
              <View style={styles.geofenceStatusText}>
                <Text
                  style={[
                    styles.geofenceStatusTitle,
                    geofenceValidation.valido
                      ? styles.geofenceStatusTitleValid
                      : styles.geofenceStatusTitleInvalid,
                  ]}
                >
                  {geofenceValidation.valido
                    ? "Localização Válida"
                    : "Localização Inválida"}
                </Text>
                {geofenceValidation.distancia && !geofenceValidation.valido && (
                  <Text style={styles.geofenceStatusDistance}>
                    {geofenceValidation.distancia > 1000
                      ? `${(geofenceValidation.distancia / 1000).toFixed(1)} km da unidade`
                      : `${geofenceValidation.distancia}m da unidade`}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Tipo de Marcação - Redesign Moderno */}
          <View style={styles.pontoSection}>
            <Text style={styles.sectionTitle}>Registrar Ponto</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione o tipo de marcação
            </Text>

            <View style={styles.tiposGrid}>
              {TIPOS_PONTO.map((tipo) => {
                const jaRegistrado = pontosRegistradosHoje.includes(tipo.value);
                const estaCarregando =
                  loading && tipoSelecionado === tipo.value;
                const isPrimary =
                  tipo.value === "ENTRADA" || tipo.value === "SAIDA";

                // Lógica: Se bateu ENTRADA e SAIDA, não pode mais bater intervalo
                const bateuEntradaESaida =
                  pontosRegistradosHoje.includes("ENTRADA") &&
                  pontosRegistradosHoje.includes("SAIDA");

                // Lógica: Se bateu SAIDA, não pode mais bater intervalo
                const bateuSaida = pontosRegistradosHoje.includes("SAIDA");

                // Desabilitar intervalo se bateu ENTRADA+SAIDA ou só SAIDA
                const intervaloBloqueado =
                  (tipo.value === "INTERVALO_INICIO" ||
                    tipo.value === "INTERVALO_FIM") &&
                  (bateuEntradaESaida || bateuSaida);

                const isDisabled =
                  jaRegistrado || loading || intervaloBloqueado;

                return (
                  <TouchableOpacity
                    key={tipo.value}
                    style={[
                      styles.tipoButtonNew,
                      isPrimary && [
                        styles.tipoButtonPrimary,
                        {
                          backgroundColor: tipo.color,
                          borderColor: tipo.color,
                        },
                      ],
                      tipoSelecionado === tipo.value &&
                        styles.tipoButtonSelected,
                      isDisabled && styles.tipoButtonDisabled,
                    ]}
                    onPress={() =>
                      !isDisabled && handleTipoPontoClick(tipo.value)
                    }
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    {estaCarregando ? (
                      <View style={styles.buttonContentSpaceBetween}>
                        <ActivityIndicator
                          color={isPrimary ? "#fff" : "#009ee2"}
                          size="small"
                        />
                        <Text
                          style={[
                            styles.tipoTextNew,
                            isPrimary && styles.tipoTextPrimary,
                          ]}
                        >
                          Processando...
                        </Text>
                      </View>
                    ) : jaRegistrado ? (
                      <View style={styles.registeredWrapper}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#4CAF50"
                        />
                        <Text style={styles.registeredText}>
                          {tipo.label} - Registrado hoje
                        </Text>
                      </View>
                    ) : intervaloBloqueado ? (
                      <View style={styles.buttonContentSpaceBetween}>
                        <Ionicons name={tipo.icon} size={28} color="#999" />
                        <View style={styles.buttonTextContainer}>
                          <Text style={[styles.tipoTextNew, { color: "#999" }]}>
                            {tipo.label}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.buttonContentSpaceBetween}>
                        <Ionicons
                          name={tipo.icon}
                          size={28}
                          color={isPrimary ? "#fff" : tipo.color}
                        />
                        <Text
                          style={[
                            styles.tipoTextNew,
                            isPrimary && styles.tipoTextPrimary,
                          ]}
                        >
                          {tipo.label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selfie capturada - indicador simples sem preview da foto */}
          {selfieUri &&
            tipoSelecionado &&
            !pontosRegistradosHoje.includes(tipoSelecionado) && (
              <View style={styles.selfieIndicator}>
                <View style={styles.selfieIndicatorContent}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.selfieIndicatorText}>
                    Selfie capturada com sucesso
                  </Text>
                </View>
                <View style={styles.selfieActions}>
                  <TouchableOpacity
                    onPress={async () => {
                      const novaFoto = await takeSelfie();
                      if (novaFoto) {
                        setSelfieUri(novaFoto);
                      }
                    }}
                    style={styles.retakeButtonSmall}
                  >
                    <Ionicons name="camera" size={18} color="#009ee2" />
                    <Text style={styles.retakeButtonTextSmall}>Tirar Novamente</Text>
                  </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.registrarButton,
                    loading && styles.registrarButtonDisabled,
                  ]}
                  onPress={handleRegistrarPonto}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={styles.buttonLoading}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.registrarButtonText}>
                        Processando...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.registrarButtonText}>
                      ✓ Confirmar Ponto
                    </Text>
                  )}
                </TouchableOpacity>
                </View>
              </View>
            )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#009ee2" />
              <Text style={styles.loadingText}>Processando...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Menu Drawer (abre da esquerda) */}
      {menuDrawerVisible && (
        <View style={styles.drawerOverlay}>
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setMenuDrawerVisible(false)}
          />
          <View style={styles.drawerContainer}>
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
                onPress={() => {
                  setMenuDrawerVisible(false);
                  setConfiguracoesVisible(true);
                }}
              >
                <Ionicons name="settings-outline" size={24} color="#009ee2" />
                <View style={styles.drawerMenuItemTextContainer}>
                  <Text style={styles.drawerMenuText}>Configurações</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuDrawerVisible(false);
                  setHistoricoVisible(true);
                }}
              >
                <Ionicons name="time-outline" size={24} color="#009ee2" />
                <View style={styles.drawerMenuItemTextContainer}>
                  <Text style={styles.drawerMenuText}>Pontos Batidos</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuDrawerVisible(false);
                  setManifestacaoVisible(true);
                }}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#009ee2" />
                <View style={styles.drawerMenuItemTextContainer}>
                  <Text style={styles.drawerMenuText}>Manifestação</Text>
                  <Text style={styles.drawerMenuSubtext}>
                    Elogio, Sugestão ou Denúncia
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de Histórico (tela cheia) */}
      <Modal
        visible={historicoVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <HistoricoScreen
          funcionario={funcionario}
          onClose={() => setHistoricoVisible(false)}
        />
      </Modal>

      {/* Modal de Manifestação (tela cheia) */}
      <Modal
        visible={manifestacaoVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ManifestacaoScreen
          funcionario={funcionario}
          onClose={() => setManifestacaoVisible(false)}
        />
      </Modal>

      {/* Modal de Configurações (tela cheia) */}
      <Modal
        visible={configuracoesVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ConfiguracoesScreen
          funcionario={funcionario}
          onClose={() => setConfiguracoesVisible(false)}
          onReloadFuncionario={onReloadFuncionario}
        />
      </Modal>
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
    paddingTop: 70,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
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
  headerInfo: {
    flex: 1,
    marginLeft: 4,
  },
  welcome: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  userUnit: {
    fontSize: 13,
    color: "#e8f5ff",
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 12,
    color: "#e8f5ff",
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: "#fff",
    fontSize: 14,
  },
  statusBar: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDotOnline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  statusDotOffline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f44336",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
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
  cpfCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cpfLabel: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  cpfValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  funcionarioCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  funcionarioHeader: {
    marginBottom: 12,
  },
  funcionarioTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  funcionarioInfo: {
    marginBottom: 0,
  },
  funcionarioInfoCompact: {
    marginBottom: 0,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  funcionarioLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  funcionarioLabelCompact: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  funcionarioValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  funcionarioValueCompact: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#1976D2",
    lineHeight: 18,
  },
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  geofenceStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 12,
  },
  geofenceStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  geofenceStatusValid: {
    backgroundColor: "#E8F5E9",
  },
  geofenceStatusInvalid: {
    backgroundColor: "#FFEBEE",
  },
  geofenceStatusText: {
    flex: 1,
  },
  geofenceStatusTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  geofenceStatusTitleValid: {
    color: "#4CAF50",
  },
  geofenceStatusTitleInvalid: {
    color: "#f44336",
  },
  geofenceStatusDistance: {
    fontSize: 12,
    color: "#666",
  },
  devWarning: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    gap: 8,
  },
  devWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#E65100",
  },
  locationHeader: {
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  locationInfo: {
    marginTop: 4,
  },
  locationLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  locationValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  locationStatus: {
    alignItems: "flex-end",
  },
  locationStatusText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  locationStatusValid: {
    color: "#4CAF50",
  },
  locationStatusInvalid: {
    color: "#f44336",
  },
  locationDistance: {
    fontSize: 12,
    color: "#666",
  },
  locationLoading: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 12,
  },
  refreshLocationButton: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    alignItems: "center",
  },
  refreshLocationText: {
    fontSize: 13,
    color: "#009ee2",
    fontWeight: "500",
  },
  pontoSection: {
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
  tiposGrid: {
    gap: 12,
  },
  tipoButtonNew: {
    width: "100%",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#f8f9fa",
    borderWidth: 2.5,
    borderColor: "#e9ecef",
    minHeight: 76,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipoButtonPrimary: {
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.01 }],
  },
  tipoButtonSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e8f5ff",
    borderWidth: 3,
    transform: [{ scale: 1.02 }],
  },
  tipoButtonDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
    opacity: 0.5,
    paddingVertical: 18,
    minHeight: 60,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  buttonContentSpaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    gap: 16,
  },
  buttonTextContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  tipoIcon: {
    fontSize: 28,
  },
  tipoTextNew: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "left",
  },
  tipoTextPrimary: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  loadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  registeredWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    width: "100%",
    paddingHorizontal: 4,
  },
  registeredText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  blockedLabel: {
    fontSize: 11,
    color: "#f44336",
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  selfieButton: {
    width: "100%",
    minHeight: 200,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  selfieButtonText: {
    fontSize: 18,
    color: "#009ee2",
    fontWeight: "600",
    marginBottom: 8,
  },
  selfieHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  selfieIndicator: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selfieIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  selfieIndicatorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    flex: 1,
  },
  selfieActions: {
    gap: 12,
  },
  retakeButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 8,
  },
  retakeButtonTextSmall: {
    color: "#009ee2",
    fontSize: 14,
    fontWeight: "600",
  },
  registrarButton: {
    width: "100%",
    height: 60,
    backgroundColor: "#4CAF50",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registrarButtonDisabled: {
    opacity: 0.6,
    backgroundColor: "#9e9e9e",
  },
  buttonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  registrarButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
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
    flex: 1,
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
  drawerCloseText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
    gap: 12,
  },
  drawerMenuItemTextContainer: {
    flex: 1,
  },
  drawerMenuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  drawerMenuSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});
