import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  Image,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Device from "expo-device";
import SignatureCanvas from "react-native-signature-canvas";
import {
  obterChecklistEscopo,
  ChecklistEscopoDetalhes,
  api,
} from "../services/api";
import { API_URL, API_ENDPOINTS } from "../config/api";
import { normalizeBoolean } from "../utils/booleanUtils";
import {
  compressImageForUpload,
  compressDataUrlToDataUrl,
} from "../utils/compressImage";
import {
  copyPhotoToPermanentStorage,
  photoUriExists,
} from "../utils/draftPhotos";
import * as NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import {
  saveDraftLocally,
  getLocalDraft,
  getLocalDraftsForEscopo,
  saveEscopoCache,
  getEscopoCache,
  syncAllPendingDrafts,
  getSyncStatus,
  setupAutoSync,
  SyncStatus,
} from "../services/offlineSync";

type PerguntaTipo = "TEXTO" | "FOTO" | "BOOLEANO" | "NUMERICO" | "SELECAO";

interface Pergunta {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: PerguntaTipo;
  obrigatoria: boolean;
  ordem: number;
  opcoes: string[];
  peso?: number | null;
  permiteMultiplasFotos?: boolean;
  permiteAnexarFoto?: boolean;
}

interface Grupo {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  perguntas: Pergunta[];
}

interface Resposta {
  perguntaId: string;
  tipo: PerguntaTipo;
  valorTexto?: string;
  valorBoolean?: boolean;
  valorNumero?: number;
  valorOpcao?: string;
  nota?: number;
  fotoUrl?: string;
}

export default function ResponderChecklistScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { escopoId } = route.params as { escopoId: string };
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [escopo, setEscopo] = useState<ChecklistEscopoDetalhes | null>(null);
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Estados das respostas
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [booleanAnswers, setBooleanAnswers] = useState<
    Record<string, "CONFORME" | "NAO_CONFORME" | "NAO_APLICA" | null>
  >({});
  const [naoConformeDetails, setNaoConformeDetails] = useState<
    Record<string, { motivo: string; resolucao: string }>
  >({});
  const [numericAnswers, setNumericAnswers] = useState<Record<string, string>>(
    {}
  );
  const [selectAnswers, setSelectAnswers] = useState<Record<string, string>>(
    {}
  );
  const [photoAnswers, setPhotoAnswers] = useState<Record<string, string[]>>(
    {}
  );
  const [notaAnswers, setNotaAnswers] = useState<Record<string, number | null>>(
    {}
  );
  const [observacoes, setObservacoes] = useState("");
  const [localizacao, setLocalizacao] =
    useState<Location.LocationObject | null>(null);

  // Estados para assinaturas
  const [showAssinaturaModal, setShowAssinaturaModal] = useState(false);
  const [assinaturaStep, setAssinaturaStep] = useState<
    "gerente" | "supervisor"
  >("gerente");
  const [assinaturaGerenteDataUrl, setAssinaturaGerenteDataUrl] = useState<
    string | null
  >(null);
  const [selfieSupervisorUri, setSelfieSupervisorUri] = useState<string | null>(
    null
  );
  const signatureRef = useRef<any>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    pendingSyncs: 0,
    isSyncing: false,
  });

  // Fluxo pergunta por pergunta (melhor performance no Android)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const solicitarPermissoes = useCallback(async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await Location.requestForegroundPermissionsAsync();
  }, []);

  const criarRascunhoInicial = useCallback(async (escopoIdParam: string) => {
    try {
      const formData = new FormData();
      formData.append("escopoId", escopoIdParam);
      formData.append("isDraft", "true");
      formData.append("answers", JSON.stringify([]));

      const response = await api.post(
        API_ENDPOINTS.CHECKLISTS_RESPONDER,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.resposta?.id) {
        setRascunhoId(response.data.resposta.id);
      } else {
        console.warn("Rascunho criado mas sem ID na resposta:", response.data);
      }
    } catch (error: any) {
      console.error("Erro ao criar rascunho inicial:", {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
      });
    }
  }, []);

  const carregarRascunho = useCallback(
    async (escopoIdParam: string, escopoData?: ChecklistEscopoDetalhes) => {
      try {
        // Obter token de autenticação
        const token = await SecureStore.getItemAsync("authToken");
        const headers: Record<string, string> = {
          Accept: "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${API_URL}${API_ENDPOINTS.CHECKLISTS_RESPONDER}?escopoId=${escopoIdParam}`,
          {
            method: "GET",
            headers,
          }
        );

        if (!response.ok) {
          console.error("❌ Erro ao buscar rascunho:", {
            status: response.status,
            statusText: response.statusText,
            escopoId: escopoIdParam,
          });
          if (response.status === 401) {
            console.error("❌ Token inválido ou expirado ao buscar rascunho!");
          }
        }

        const data = await response.json();

        if (data.rascunho) {
          const r = data.rascunho;
          setRascunhoId(r.id);

          if (r.observacoes) {
            setObservacoes(r.observacoes);
          }

          // Usar o escopo passado como parâmetro ou o estado atual
          const escopoParaBuscar = escopoData || escopo;

          if (!escopoParaBuscar) {
            console.warn(
              "Escopo não disponível ao carregar rascunho, tentando novamente após carregar escopo"
            );
            return;
          }

          // Carregar respostas
          r.respostas?.forEach((resposta: any) => {
            // Coletar todas as perguntas de todos os grupos
            const todasPerguntas: any[] = [];
            if (
              escopoParaBuscar?.escopo?.template?.grupos &&
              Array.isArray(escopoParaBuscar.escopo.template.grupos)
            ) {
              escopoParaBuscar.escopo.template.grupos.forEach((g: any) => {
                if (g.perguntas && Array.isArray(g.perguntas)) {
                  todasPerguntas.push(...g.perguntas);
                }
              });
            }
            const pergunta = todasPerguntas.find(
              (p) => p.id === resposta.perguntaId
            );

            if (!pergunta) return;

            switch (pergunta.tipo) {
              case "TEXTO":
                if (resposta.valorTexto) {
                  setTextAnswers((prev) => ({
                    ...prev,
                    [pergunta.id]: resposta.valorTexto,
                  }));
                }
                break;
              case "BOOLEANO":
                if (
                  resposta.valorBoolean !== null &&
                  resposta.valorBoolean !== undefined
                ) {
                  const valor = resposta.valorBoolean
                    ? "CONFORME"
                    : "NAO_CONFORME";
                  setBooleanAnswers((prev) => ({
                    ...prev,
                    [pergunta.id]: valor,
                  }));
                }
                if (resposta.observacao) {
                  try {
                    const partes = resposta.observacao.split("\n\n");
                    if (partes.length >= 2) {
                      const motivo = partes[0].replace("Motivo: ", "");
                      const resolucao = partes[1].replace(
                        "O que foi feito para resolver: ",
                        ""
                      );
                      setNaoConformeDetails((prev) => ({
                        ...prev,
                        [pergunta.id]: { motivo, resolucao },
                      }));
                    }
                  } catch (e) {
                    console.error("Erro ao parsear observação:", e);
                  }
                }
                // Carregar fotos anexadas se houver
                if (resposta.fotoUrl) {
                  try {
                    const fotos =
                      typeof resposta.fotoUrl === "string"
                        ? resposta.fotoUrl.startsWith("[")
                          ? JSON.parse(resposta.fotoUrl)
                          : [resposta.fotoUrl]
                        : [];
                    setPhotoAnswers((prev) => ({
                      ...prev,
                      [`${pergunta.id}_anexo`]: fotos,
                    }));
                  } catch {
                    setPhotoAnswers((prev) => ({
                      ...prev,
                      [`${pergunta.id}_anexo`]: [resposta.fotoUrl],
                    }));
                  }
                }
                break;
              case "NUMERICO":
                if (
                  resposta.valorNumero !== null &&
                  resposta.valorNumero !== undefined
                ) {
                  setNumericAnswers((prev) => ({
                    ...prev,
                    [pergunta.id]: resposta.valorNumero.toString(),
                  }));
                }
                break;
              case "SELECAO":
                if (resposta.valorOpcao) {
                  setSelectAnswers((prev) => ({
                    ...prev,
                    [pergunta.id]: resposta.valorOpcao,
                  }));
                }
                break;
              case "FOTO":
                if (resposta.fotoUrl) {
                  try {
                    const fotos =
                      typeof resposta.fotoUrl === "string"
                        ? resposta.fotoUrl.startsWith("[")
                          ? JSON.parse(resposta.fotoUrl)
                          : [resposta.fotoUrl]
                        : [];
                    setPhotoAnswers((prev) => ({
                      ...prev,
                      [pergunta.id]: fotos,
                    }));
                  } catch {
                    setPhotoAnswers((prev) => ({
                      ...prev,
                      [pergunta.id]: [resposta.fotoUrl],
                    }));
                  }
                }
                break;
            }

            // Carregar nota se houver
            if (resposta.nota !== null && resposta.nota !== undefined) {
              setNotaAnswers((prev) => ({
                ...prev,
                [pergunta.id]: resposta.nota,
              }));
            }
          });

          // Obter localização
          if (r.lat && r.lng) {
            setLocalizacao({
              coords: {
                latitude: r.lat,
                longitude: r.lng,
                accuracy: r.accuracy || null,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            } as Location.LocationObject);
          }
        } else {
          // Criar rascunho inicial se não existir
          await criarRascunhoInicial(escopoIdParam);
        }
      } catch (error: any) {
        console.error("Erro ao carregar rascunho:", error);
      }
    },
    [escopo, criarRascunhoInicial]
  );

  const carregarEscopo = useCallback(async () => {
    if (!escopoId) {
      setLoading(false);
      Alert.alert("Erro", "Checklist inválido. Volte e tente novamente.", [
        {
          text: "OK",
          onPress: () => {
            setTimeout(() => {
              try {
                navigation.goBack();
              } catch (navError) {
                console.error("Erro ao navegar:", navError);
                try {
                  navigation.navigate("Checklists" as never);
                } catch (fallbackError) {
                  console.error("Erro no fallback:", fallbackError);
                }
              }
            }, 100);
          },
        },
      ]);
      return;
    }
    try {
      setLoading(true);
      initialLoadDoneRef.current = false;

      let data: ChecklistEscopoDetalhes | null = null;
      let isOffline = false;

      try {
        data = await obterChecklistEscopo(escopoId);
      } catch (apiError: any) {
        const isNetworkError =
          apiError?.code === "NETWORK_ERROR" ||
          apiError?.message?.includes("Network") ||
          apiError?.code === "ERR_NETWORK";
        if (isNetworkError) {
          const cached = await getEscopoCache(escopoId);
          if (cached) {
            data = cached;
            isOffline = true;
            console.log("📴 Offline: usando escopo em cache");
          }
        }
        if (!data) throw apiError;
      }

      // Normalizar valores boolean que podem vir como strings da API
      if (data.escopo?.template?.grupos) {
        data.escopo.template.grupos = data.escopo.template.grupos.map(
          (grupo: any) => ({
            ...grupo,
            perguntas: grupo.perguntas.map((pergunta: any) => ({
              ...pergunta,
              obrigatoria: normalizeBoolean(pergunta.obrigatoria),
              peso:
                pergunta.peso !== undefined && pergunta.peso !== null
                  ? Number(pergunta.peso)
                  : null,
              permiteMultiplasFotos:
                pergunta.permiteMultiplasFotos !== undefined
                  ? normalizeBoolean(pergunta.permiteMultiplasFotos)
                  : undefined,
              permiteAnexarFoto:
                pergunta.permiteAnexarFoto !== undefined
                  ? normalizeBoolean(pergunta.permiteAnexarFoto)
                  : undefined,
            })),
          })
        );
      }

      if (data.escopo?.ativo !== undefined) {
        data.escopo.ativo = normalizeBoolean(data.escopo.ativo);
      }

      setEscopo(data);

      // Salvar escopo em cache para uso offline (só quando online)
      if (!isOffline) {
        saveEscopoCache(escopoId, data).catch((e) =>
          console.warn("Erro ao salvar escopo em cache:", e)
        );
      }

      // Buscar rascunho existente (API ou local quando offline)
      try {
        if (isOffline) {
          // Modo offline: usar rascunho salvo localmente
          const localDrafts = await getLocalDraftsForEscopo(data.escopo.id);
          if (localDrafts.length > 0) {
            const draft = localDrafts[0];
            setRascunhoId(draft.respostaId);
            const fd = draft.formData;
            if (fd?.observacoes) setObservacoes(fd.observacoes);
            const todasPerguntas: { id: string; tipo: string }[] = [];
            if (data.escopo?.template?.grupos) {
              data.escopo.template.grupos.forEach((g: any) => {
                if (g.perguntas?.length) todasPerguntas.push(...g.perguntas);
              });
            }
            const byId = new Map(todasPerguntas.map((p) => [p.id, p]));
            (fd?.answers || []).forEach((a: any) => {
              const pergunta = byId.get(a.perguntaId);
              if (!pergunta) return;
              switch (pergunta.tipo) {
                case "TEXTO":
                  if (a.valorTexto)
                    setTextAnswers((prev) => ({
                      ...prev,
                      [pergunta.id]: a.valorTexto,
                    }));
                  break;
                case "BOOLEANO":
                  if (a.valorBoolean !== undefined && a.valorBoolean !== null) {
                    setBooleanAnswers((prev) => ({
                      ...prev,
                      [pergunta.id]: a.valorBoolean
                        ? "CONFORME"
                        : "NAO_CONFORME",
                    }));
                    if (!a.valorBoolean && a.valorTexto) {
                      try {
                        const partes = a.valorTexto.split("\n\n");
                        if (partes.length >= 2) {
                          const motivo = partes[0].replace("Motivo: ", "");
                          const resolucao = partes[1].replace(
                            "O que foi feito para resolver: ",
                            ""
                          );
                          setNaoConformeDetails((prev) => ({
                            ...prev,
                            [pergunta.id]: { motivo, resolucao },
                          }));
                        }
                      } catch (_) {}
                    }
                  }
                  break;
                case "NUMERICO":
                  if (a.valorNumero != null)
                    setNumericAnswers((prev) => ({
                      ...prev,
                      [pergunta.id]: String(a.valorNumero),
                    }));
                  break;
                case "SELECAO":
                  if (a.valorOpcao)
                    setSelectAnswers((prev) => ({
                      ...prev,
                      [pergunta.id]: a.valorOpcao,
                    }));
                  break;
                case "FOTO":
                  if (a.fotoUrl) {
                    try {
                      const uris =
                        typeof a.fotoUrl === "string" &&
                        a.fotoUrl.startsWith("[")
                          ? JSON.parse(a.fotoUrl)
                          : [a.fotoUrl];
                      setPhotoAnswers((prev) => ({
                        ...prev,
                        [pergunta.id]: uris,
                      }));
                    } catch (_) {
                      setPhotoAnswers((prev) => ({
                        ...prev,
                        [pergunta.id]: [a.fotoUrl],
                      }));
                    }
                  }
                  break;
              }
              if (a.nota != null)
                setNotaAnswers((prev) => ({ ...prev, [pergunta.id]: a.nota }));
            });
            if (fd?.fotos && typeof fd.fotos === "object") {
              const next: Record<string, string[]> = {};
              for (const [key, arr] of Object.entries(fd.fotos)) {
                if (!Array.isArray(arr)) continue;
                const uris = arr.map((x: any) => x?.uri).filter(Boolean);
                const validUris = (
                  await Promise.all(
                    uris.map(async (u) =>
                      (await photoUriExists(u)) ? u : null
                    )
                  )
                ).filter(Boolean) as string[];
                if (!validUris.length) continue;
                if (key.startsWith("foto_anexada_")) {
                  const pid = key.replace("foto_anexada_", "");
                  next[`${pid}_anexo`] = validUris;
                } else if (key.startsWith("foto_")) {
                  const pid = key.replace("foto_", "");
                  next[pid] = validUris;
                }
              }
              if (Object.keys(next).length > 0) {
                setPhotoAnswers((prev) => ({ ...prev, ...next }));
              }
            }
            if (fd?.lat != null && fd?.lng != null) {
              setLocalizacao({
                coords: {
                  latitude: fd.lat,
                  longitude: fd.lng,
                  accuracy: fd.accuracy ?? null,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                },
                timestamp: Date.now(),
              } as Location.LocationObject);
            }
          } else {
            setRascunhoId(null);
          }
        } else {
          // Modo online: buscar rascunho da API
          const token = await SecureStore.getItemAsync("authToken");
          const headers: Record<string, string> = {
            Accept: "application/json",
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const response = await fetch(
            `${API_URL}${API_ENDPOINTS.CHECKLISTS_RESPONDER}?escopoId=${data.escopo.id}`,
            {
              method: "GET",
              headers,
            }
          );

          if (!response.ok) {
            console.error("❌ Erro ao buscar rascunho:", {
              status: response.status,
              statusText: response.statusText,
            });
            // Se der 401, pode ser problema de autenticação
            if (response.status === 401) {
              console.error("❌ Token inválido ou expirado!");
            }
          }

          const rascunhoData = await response.json();

          if (rascunhoData.rascunho) {
            const r = rascunhoData.rascunho;
            setRascunhoId(r.id);

            const local = await getLocalDraft(data.escopo.id, r.id);
            const apiCount = r.respostas?.length ?? 0;
            const useLocal =
              local?.formData?.answers &&
              Array.isArray(local.formData.answers) &&
              local.formData.answers.length >= apiCount;

            if (useLocal && local) {
              const fd = local.formData;
              if (fd.observacoes) setObservacoes(fd.observacoes);
              const todasPerguntas: { id: string; tipo: string }[] = [];
              if (data.escopo?.template?.grupos) {
                data.escopo.template.grupos.forEach((g: any) => {
                  if (g.perguntas?.length) todasPerguntas.push(...g.perguntas);
                });
              }
              const byId = new Map(todasPerguntas.map((p) => [p.id, p]));
              (fd.answers || []).forEach((a: any) => {
                const pergunta = byId.get(a.perguntaId);
                if (!pergunta) return;
                switch (pergunta.tipo) {
                  case "TEXTO":
                    if (a.valorTexto)
                      setTextAnswers((prev) => ({
                        ...prev,
                        [pergunta.id]: a.valorTexto,
                      }));
                    break;
                  case "BOOLEANO":
                    if (
                      a.valorBoolean !== undefined &&
                      a.valorBoolean !== null
                    ) {
                      setBooleanAnswers((prev) => ({
                        ...prev,
                        [pergunta.id]: a.valorBoolean
                          ? "CONFORME"
                          : "NAO_CONFORME",
                      }));
                      if (!a.valorBoolean && a.valorTexto) {
                        try {
                          const partes = a.valorTexto.split("\n\n");
                          if (partes.length >= 2) {
                            const motivo = partes[0].replace("Motivo: ", "");
                            const resolucao = partes[1].replace(
                              "O que foi feito para resolver: ",
                              ""
                            );
                            setNaoConformeDetails((prev) => ({
                              ...prev,
                              [pergunta.id]: { motivo, resolucao },
                            }));
                          }
                        } catch (_) {}
                      }
                    }
                    break;
                  case "NUMERICO":
                    if (a.valorNumero != null)
                      setNumericAnswers((prev) => ({
                        ...prev,
                        [pergunta.id]: String(a.valorNumero),
                      }));
                    break;
                  case "SELECAO":
                    if (a.valorOpcao)
                      setSelectAnswers((prev) => ({
                        ...prev,
                        [pergunta.id]: a.valorOpcao,
                      }));
                    break;
                  case "FOTO":
                    if (a.fotoUrl) {
                      try {
                        const uris =
                          typeof a.fotoUrl === "string" &&
                          a.fotoUrl.startsWith("[")
                            ? JSON.parse(a.fotoUrl)
                            : [a.fotoUrl];
                        setPhotoAnswers((prev) => ({
                          ...prev,
                          [pergunta.id]: uris,
                        }));
                      } catch (_) {
                        setPhotoAnswers((prev) => ({
                          ...prev,
                          [pergunta.id]: [a.fotoUrl],
                        }));
                      }
                    }
                    break;
                }
                if (a.nota != null)
                  setNotaAnswers((prev) => ({
                    ...prev,
                    [pergunta.id]: a.nota,
                  }));
              });
              if (fd.fotos && typeof fd.fotos === "object") {
                const next: Record<string, string[]> = {};
                for (const [key, arr] of Object.entries(fd.fotos)) {
                  if (!Array.isArray(arr)) continue;
                  const uris = arr.map((x: any) => x?.uri).filter(Boolean);
                  const validUris = (
                    await Promise.all(
                      uris.map(async (u) =>
                        (await photoUriExists(u)) ? u : null
                      )
                    )
                  ).filter(Boolean) as string[];
                  if (!validUris.length) continue;
                  if (key.startsWith("foto_anexada_")) {
                    const pid = key.replace("foto_anexada_", "");
                    next[`${pid}_anexo`] = validUris;
                  } else if (key.startsWith("foto_")) {
                    const pid = key.replace("foto_", "");
                    next[pid] = validUris;
                  }
                }
                if (Object.keys(next).length > 0) {
                  setPhotoAnswers((prev) => ({ ...prev, ...next }));
                }
              }
              // Priorizar fotoUrl da API quando disponível (URLs HTTP são sempre válidas)
              if (r.respostas && r.respostas.length > 0) {
                const apiFotos: Record<string, string[]> = {};
                r.respostas.forEach((resposta: any) => {
                  if (!resposta.fotoUrl) return;
                  const pergunta = byId.get(resposta.perguntaId);
                  if (!pergunta) return;
                  try {
                    const fotos =
                      typeof resposta.fotoUrl === "string" &&
                      resposta.fotoUrl.startsWith("[")
                        ? JSON.parse(resposta.fotoUrl)
                        : [resposta.fotoUrl];
                    if (pergunta.tipo === "FOTO") {
                      apiFotos[pergunta.id] = fotos;
                    } else {
                      apiFotos[`${pergunta.id}_anexo`] = fotos;
                    }
                  } catch (_) {
                    if (pergunta.tipo === "FOTO") {
                      apiFotos[pergunta.id] = [resposta.fotoUrl];
                    } else {
                      apiFotos[`${pergunta.id}_anexo`] = [resposta.fotoUrl];
                    }
                  }
                });
                if (Object.keys(apiFotos).length > 0) {
                  setPhotoAnswers((prev) => ({ ...prev, ...apiFotos }));
                }
              }
              if (fd.lat != null && fd.lng != null) {
                setLocalizacao({
                  coords: {
                    latitude: fd.lat,
                    longitude: fd.lng,
                    accuracy: fd.accuracy ?? null,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null,
                  },
                  timestamp: Date.now(),
                } as Location.LocationObject);
              }
            } else {
              if (r.observacoes) {
                setObservacoes(r.observacoes);
              }

              // Carregar respostas do rascunho (API)
              if (r.respostas && r.respostas.length > 0) {
                r.respostas.forEach((resposta: any) => {
                  const todasPerguntas: any[] = [];
                  if (
                    data.escopo?.template?.grupos &&
                    Array.isArray(data.escopo.template.grupos)
                  ) {
                    data.escopo.template.grupos.forEach((g: any) => {
                      if (g.perguntas && Array.isArray(g.perguntas)) {
                        todasPerguntas.push(...g.perguntas);
                      }
                    });
                  }
                  const pergunta = todasPerguntas.find(
                    (p) => p.id === resposta.perguntaId
                  );

                  if (!pergunta) {
                    return;
                  }

                  switch (pergunta.tipo) {
                    case "TEXTO":
                      if (resposta.valorTexto) {
                        setTextAnswers((prev) => ({
                          ...prev,
                          [pergunta.id]: resposta.valorTexto,
                        }));
                      }
                      break;
                    case "BOOLEANO":
                      if (
                        resposta.valorBoolean !== null &&
                        resposta.valorBoolean !== undefined
                      ) {
                        const valor = resposta.valorBoolean
                          ? "CONFORME"
                          : "NAO_CONFORME";
                        setBooleanAnswers((prev) => ({
                          ...prev,
                          [pergunta.id]: valor,
                        }));
                      }
                      if (resposta.observacao) {
                        try {
                          const partes = resposta.observacao.split("\n\n");
                          if (partes.length >= 2) {
                            const motivo = partes[0].replace("Motivo: ", "");
                            const resolucao = partes[1].replace(
                              "O que foi feito para resolver: ",
                              ""
                            );
                            setNaoConformeDetails((prev) => ({
                              ...prev,
                              [pergunta.id]: { motivo, resolucao },
                            }));
                          }
                        } catch (e) {
                          console.error("Erro ao parsear observação:", e);
                        }
                      }
                      if (resposta.fotoUrl) {
                        try {
                          const fotos =
                            typeof resposta.fotoUrl === "string"
                              ? resposta.fotoUrl.startsWith("[")
                                ? JSON.parse(resposta.fotoUrl)
                                : [resposta.fotoUrl]
                              : [];
                          setPhotoAnswers((prev) => ({
                            ...prev,
                            [`${pergunta.id}_anexo`]: fotos,
                          }));
                        } catch {
                          setPhotoAnswers((prev) => ({
                            ...prev,
                            [`${pergunta.id}_anexo`]: [resposta.fotoUrl],
                          }));
                        }
                      }
                      break;
                    case "NUMERICO":
                      if (
                        resposta.valorNumero !== null &&
                        resposta.valorNumero !== undefined
                      ) {
                        setNumericAnswers((prev) => ({
                          ...prev,
                          [pergunta.id]: resposta.valorNumero.toString(),
                        }));
                      }
                      break;
                    case "SELECAO":
                      if (resposta.valorOpcao) {
                        setSelectAnswers((prev) => ({
                          ...prev,
                          [pergunta.id]: resposta.valorOpcao,
                        }));
                      }
                      break;
                    case "FOTO":
                      if (resposta.fotoUrl) {
                        try {
                          const fotos =
                            typeof resposta.fotoUrl === "string"
                              ? resposta.fotoUrl.startsWith("[")
                                ? JSON.parse(resposta.fotoUrl)
                                : [resposta.fotoUrl]
                              : [];
                          setPhotoAnswers((prev) => ({
                            ...prev,
                            [pergunta.id]: fotos,
                          }));
                        } catch {
                          setPhotoAnswers((prev) => ({
                            ...prev,
                            [pergunta.id]: [resposta.fotoUrl],
                          }));
                        }
                      }
                      break;
                  }

                  if (resposta.nota !== null && resposta.nota !== undefined) {
                    setNotaAnswers((prev) => ({
                      ...prev,
                      [pergunta.id]: resposta.nota,
                    }));
                  }
                });
              }

              // Obter localização (só ao restaurar da API)
              if (r.lat && r.lng) {
                setLocalizacao({
                  coords: {
                    latitude: r.lat,
                    longitude: r.lng,
                    accuracy: r.accuracy || null,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null,
                  },
                  timestamp: Date.now(),
                } as Location.LocationObject);
              }
            }
          } else {
            // Criar rascunho inicial se não existir
            const formData = new FormData();
            formData.append("escopoId", data.escopo.id);
            formData.append("isDraft", "true");
            formData.append("answers", JSON.stringify([]));

            const criarResponse = await api.post(
              API_ENDPOINTS.CHECKLISTS_RESPONDER,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            if (criarResponse.data?.resposta?.id) {
              setRascunhoId(criarResponse.data.resposta.id);
            }
          }
        }
      } catch (rascunhoError) {
        console.error("Erro ao carregar rascunho:", rascunhoError);
        // Não bloquear o carregamento do escopo se o rascunho falhar
      }
    } catch (error: any) {
      console.error("Erro ao carregar escopo:", error);

      let errorMessage = "Não foi possível carregar o checklist.";
      if (error?.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error?.response?.status === 404) {
        errorMessage = "Checklist não encontrado. Ele pode ter sido removido.";
      } else if (
        error?.code === "NETWORK_ERROR" ||
        error?.message?.includes("Network")
      ) {
        errorMessage =
          "Erro de conexão. Verifique sua internet e tente novamente.";
      }

      Alert.alert("Erro", errorMessage, [
        {
          text: "OK",
          onPress: () => {
            // Aguardar um pouco antes de navegar para evitar crash
            setTimeout(() => {
              try {
                navigation.goBack();
              } catch (navError) {
                console.error("Erro ao navegar:", navError);
              }
            }, 100);
          },
        },
      ]);
    } finally {
      setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [escopoId, navigation]);

  useEffect(() => {
    carregarEscopo();
    solicitarPermissoes();
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [carregarEscopo, solicitarPermissoes]);

  // Configurar sincronização offline
  useEffect(() => {
    // Carregar status inicial de sincronização
    getSyncStatus().then(setSyncStatus);

    // Configurar auto-sincronização
    const unsubscribe = setupAutoSync((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // O rascunho já é carregado dentro de carregarEscopo, então não precisamos de um useEffect separado
  // Isso evita loops infinitos e re-renderizações desnecessárias

  const selecionarFoto = useCallback(
    async (perguntaId: string, permiteMultiplas: boolean) => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.6,
          allowsMultipleSelection: permiteMultiplas,
        });

        if (!result.canceled && result.assets) {
          const fotos = result.assets.map((asset) => asset.uri);
          if (permiteMultiplas) {
            setPhotoAnswers((prev) => ({
              ...prev,
              [perguntaId]: [...(prev[perguntaId] || []), ...fotos],
            }));
          } else {
            setPhotoAnswers((prev) => ({ ...prev, [perguntaId]: fotos }));
          }
        }
      } catch (error) {
        console.error("Erro ao selecionar foto:", error);
        Alert.alert("Erro", "Não foi possível selecionar a foto.");
      }
    },
    []
  );

  const tirarFoto = useCallback(
    async (perguntaId: string, permiteMultiplas: boolean) => {
      try {
        // Verificar se está no simulador
        const isSimulator = !Device.isDevice;

        if (isSimulator) {
          Alert.alert(
            "Simulador",
            "A câmera não está disponível no simulador. Por favor, teste em um dispositivo físico."
          );
          return;
        }

        // Verificar e solicitar permissão de câmera
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permissão Necessária",
            "É necessário permitir acesso à câmera para tirar fotos dos checklists. Vá em Configurações > KL Administração > Câmera e permita o acesso."
          );
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.6,
          allowsMultipleSelection: false,
        });

        if (!result.canceled && result.assets[0]) {
          const foto = result.assets[0].uri;
          // Sempre adicionar foto (nunca substituir), permitindo múltiplas fotos
          setPhotoAnswers((prev) => ({
            ...prev,
            [perguntaId]: [...(prev[perguntaId] || []), foto],
          }));
        }
      } catch (error: any) {
        console.error("Erro ao tirar foto:", error);
        Alert.alert(
          "Erro",
          error?.message ||
            "Não foi possível tirar a foto. Verifique se a câmera está disponível."
        );
      }
    },
    []
  );

  const prepararRespostas = useCallback((): Resposta[] => {
    if (!escopo) return [];

    const respostas: Resposta[] = [];
    const grupos = escopo.escopo.template.grupos;

    grupos.forEach((grupo) => {
      grupo.perguntas.forEach((pergunta) => {
        const resposta: Resposta = {
          perguntaId: pergunta.id,
          tipo: pergunta.tipo as PerguntaTipo,
        };

        switch (pergunta.tipo) {
          case "TEXTO":
            if (textAnswers[pergunta.id]) {
              resposta.valorTexto = textAnswers[pergunta.id];
            }
            break;
          case "BOOLEANO":
            const boolVal = booleanAnswers[pergunta.id];
            if (boolVal !== null && boolVal !== undefined) {
              resposta.valorBoolean = boolVal === "CONFORME";
              resposta.valorOpcao = boolVal; // Incluir também como valorOpcao para compatibilidade

              // Adicionar observação se não conforme
              if (
                boolVal === "NAO_CONFORME" &&
                naoConformeDetails[pergunta.id]
              ) {
                resposta.valorTexto = `Motivo: ${
                  naoConformeDetails[pergunta.id].motivo
                }\n\nO que foi feito para resolver: ${
                  naoConformeDetails[pergunta.id].resolucao
                }`;
              }

              console.log(
                `[prepararRespostas] ✅ BOOLEANO - perguntaId: ${pergunta.id}, valorBoolean: ${resposta.valorBoolean}, valorOpcao: ${resposta.valorOpcao}`
              );
            }
            break;
          case "NUMERICO":
            if (numericAnswers[pergunta.id]) {
              resposta.valorNumero = parseFloat(numericAnswers[pergunta.id]);
            }
            break;
          case "SELECAO":
            if (selectAnswers[pergunta.id]) {
              resposta.valorOpcao = selectAnswers[pergunta.id];
            }
            break;
          case "FOTO":
            // Para fotos principais: incluir URLs HTTP no JSON (fotos já salvas no rascunho).
            // Fotos locais são enviadas via FormData. O backend aceita ambos e faz o merge.
            if (
              photoAnswers[pergunta.id] &&
              photoAnswers[pergunta.id].length > 0
            ) {
              const urlsHttp = photoAnswers[pergunta.id].filter(
                (uri) => uri.startsWith("http://") || uri.startsWith("https://")
              );
              if (urlsHttp.length > 0) {
                resposta.fotoUrl =
                  urlsHttp.length === 1
                    ? urlsHttp[0]
                    : JSON.stringify(urlsHttp);
              }
              // Fotos locais (file://, content://) são enviadas via FormData
            }
            break;
        }

        // Adicionar nota se existir (para qualquer tipo de pergunta)
        if (
          notaAnswers[pergunta.id] !== null &&
          notaAnswers[pergunta.id] !== undefined
        ) {
          resposta.nota = notaAnswers[pergunta.id]!;
        }

        // Processar fotos anexadas (para todas as perguntas que permitem anexar foto)
        // IMPORTANTE: Sempre processar fotos anexadas, mesmo quando a resposta é CONFORME
        const fotosAnexadas = photoAnswers[`${pergunta.id}_anexo`] || [];
        if (fotosAnexadas.length > 0) {
          // Verificar se são URLs já salvas ou fotos locais
          const todasSalvas = fotosAnexadas.every(
            (uri) => uri.startsWith("http://") || uri.startsWith("https://")
          );
          if (todasSalvas) {
            // Se todas são URLs, incluir no JSON
            // Se já tem fotoUrl (de tipo FOTO), combinar com anexadas
            if (resposta.fotoUrl) {
              try {
                const fotosExistentes = JSON.parse(resposta.fotoUrl);
                resposta.fotoUrl = JSON.stringify([
                  ...fotosExistentes,
                  ...fotosAnexadas,
                ]);
              } catch {
                resposta.fotoUrl = JSON.stringify([
                  resposta.fotoUrl,
                  ...fotosAnexadas,
                ]);
              }
            } else {
              resposta.fotoUrl = JSON.stringify(fotosAnexadas);
            }
          }
          // Se são locais, serão enviadas via FormData e não precisam estar no JSON
          // Mas ainda precisamos incluir a resposta para que a API processe as fotos
        }

        // Só adicionar se tiver algum valor (incluindo fotos locais que serão enviadas via FormData)
        const temFotosLocaisAnexadas = fotosAnexadas.some(
          (uri) =>
            uri.startsWith("file://") ||
            uri.startsWith("content://") ||
            uri.startsWith("/")
        );
        const temFotosLocaisPrincipais =
          pergunta.tipo === "FOTO" &&
          photoAnswers[pergunta.id]?.some(
            (uri) =>
              uri.startsWith("file://") ||
              uri.startsWith("content://") ||
              uri.startsWith("/")
          );

        // IMPORTANTE: Para rascunhos, sempre incluir a resposta se houver qualquer dado
        // Isso garante que as respostas sejam salvas mesmo que não estejam "completas"
        // CRÍTICO: Incluir resposta mesmo se só tiver fotos anexadas (para garantir que fotos sejam salvas)
        const temQualquerDado =
          resposta.valorTexto ||
          resposta.valorBoolean !== undefined ||
          resposta.valorNumero !== undefined ||
          resposta.valorOpcao ||
          resposta.fotoUrl !== undefined ||
          resposta.nota !== undefined ||
          temFotosLocaisAnexadas ||
          temFotosLocaisPrincipais;

        // CRÍTICO: Para respostas BOOLEANO, SEMPRE incluir se tiver valorBoolean definido
        // Isso garante que respostas CONFORME sejam salvas mesmo sem fotos
        const isBooleanComValor =
          pergunta.tipo === "BOOLEANO" && resposta.valorBoolean !== undefined;

        // CRÍTICO: Se tem fotos anexadas locais, SEMPRE incluir a resposta para garantir que sejam enviadas
        // CRÍTICO: Se é BOOLEANO com valor, SEMPRE incluir mesmo sem fotos
        if (
          temQualquerDado ||
          temFotosLocaisAnexadas ||
          temFotosLocaisPrincipais ||
          isBooleanComValor
        ) {
          respostas.push(resposta);
          console.log(
            `[prepararRespostas] ✅ Resposta adicionada - perguntaId: ${
              pergunta.id
            }, tipo: ${pergunta.tipo}, temValorBoolean: ${
              resposta.valorBoolean !== undefined
            }, valorBoolean: ${resposta.valorBoolean}, temNota: ${
              resposta.nota !== undefined
            }, temFotosAnexadas: ${
              fotosAnexadas.length > 0
            }, temFotosLocaisAnexadas: ${temFotosLocaisAnexadas}, temFotosLocaisPrincipais: ${temFotosLocaisPrincipais}, isBooleanComValor: ${isBooleanComValor}`
          );
        } else {
          // Se não tem dados mas tem nota, incluir apenas a nota
          if (resposta.nota !== undefined && resposta.nota !== null) {
            respostas.push({
              perguntaId: pergunta.id,
              tipo: pergunta.tipo as PerguntaTipo,
              nota: resposta.nota,
            });
            console.log(
              `[prepararRespostas] ✅ Resposta adicionada apenas com nota - perguntaId: ${pergunta.id}, nota: ${resposta.nota}`
            );
          } else {
            console.log(
              `[prepararRespostas] ⚠️ Resposta NÃO adicionada - perguntaId: ${pergunta.id}, tipo: ${pergunta.tipo}, sem dados`
            );
          }
        }
      });
    });

    console.log(
      `[prepararRespostas] 📊 Total de respostas preparadas: ${respostas.length}`,
      {
        respostas: respostas.map((r) => ({
          perguntaId: r.perguntaId,
          tipo: r.tipo,
          temValorBoolean: r.valorBoolean !== undefined,
          valorBoolean: r.valorBoolean,
          temNota: r.nota !== undefined && r.nota !== null,
          nota: r.nota,
        })),
      }
    );

    return respostas;
  }, [
    escopo,
    textAnswers,
    booleanAnswers,
    numericAnswers,
    selectAnswers,
    photoAnswers,
    notaAnswers,
    naoConformeDetails,
  ]);

  const obterLocalizacao = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocalizacao(loc);
      return loc;
    } catch (error) {
      console.error("Erro ao obter localização:", error);
      return null;
    }
  }, []);

  const salvarRascunho = useCallback(
    async (showToast = false) => {
      if (!escopo) return;
      // Offline: pode salvar localmente mesmo sem rascunhoId.
      // Online sem rascunhoId: API cria novo rascunho e retorna o id (não bloquear).
      const netStatus = await NetInfo.fetch();
      const isOffline = !netStatus.isConnected;

      try {
        setSalvandoRascunho(true);

        // Obter localização se não tiver
        let loc = localizacao;
        if (!loc) {
          loc = await obterLocalizacao();
        }

        const respostas = prepararRespostas();

        // Preparar dados para salvar (local ou remoto)
        const draftData = {
          observacoes: observacoes || "",
          answers: respostas,
          lat: loc?.coords.latitude,
          lng: loc?.coords.longitude,
          accuracy: loc?.coords.accuracy || 0,
          fotos: {} as Record<string, any[]>,
        };

        // Preparar fotos para salvar (formato compatível com sincronização)
        // CRÍTICO: Sempre incluir fotos anexadas, mesmo quando resposta é CONFORME
        const grupos = escopo.escopo.template.grupos;
        for (const grupo of grupos) {
          for (const pergunta of grupo.perguntas) {
            // Fotos principais (tipo FOTO)
            if (pergunta.tipo === "FOTO" && photoAnswers[pergunta.id]) {
              const fotos = photoAnswers[pergunta.id];
              draftData.fotos[`foto_${pergunta.id}`] = fotos.map((fotoUri) => ({
                uri: fotoUri,
                type: "image/jpeg",
                name: `foto_${pergunta.id}.jpg`,
              }));
            }
            // Fotos anexadas - SEMPRE incluir se existirem, independente do tipo de pergunta ou resposta
            // Isso garante que fotos sejam salvas mesmo quando marca como CONFORME
            if (
              photoAnswers[`${pergunta.id}_anexo`] &&
              photoAnswers[`${pergunta.id}_anexo`].length > 0
            ) {
              const fotosAnexadas = photoAnswers[`${pergunta.id}_anexo`];
              draftData.fotos[`foto_anexada_${pergunta.id}`] =
                fotosAnexadas.map((fotoUri, index) => ({
                  uri: fotoUri,
                  type: "image/jpeg",
                  name: `foto_anexada_${pergunta.id}_${index}.jpg`,
                }));
            }
          }
        }

        // CRÍTICO: Copiar fotos para armazenamento permanente antes de salvar.
        // URIs temporários (cache/ImagePicker) são invalidados quando o app fecha.
        // Processar sequencialmente para evitar OOM em dispositivos com pouca memória.
        for (const [key, arr] of Object.entries(draftData.fotos)) {
          const copied: any[] = [];
          for (let index = 0; index < arr.length; index++) {
            const foto = arr[index];
            const uri = foto?.uri;
            if (
              !uri ||
              (!uri.startsWith("file://") &&
                !uri.startsWith("content://") &&
                !uri.startsWith("/"))
            ) {
              copied.push(foto);
              continue;
            }
            const perguntaId = key
              .replace("foto_anexada_", "")
              .replace("foto_", "");
            const newUri = await copyPhotoToPermanentStorage(
              uri,
              escopo.escopo.id,
              perguntaId,
              index
            );
            copied.push({ ...foto, uri: newUri });
          }
          draftData.fotos[key] = copied;
        }

        // Verificar conectividade
        const netInfo = await NetInfo.fetch();
        const isOnline = netInfo.isConnected ?? false;

        if (!isOnline) {
          // Salvar localmente quando offline
          await saveDraftLocally(escopo.escopo.id, rascunhoId, draftData);

          // Atualizar status
          const status = await getSyncStatus();
          setSyncStatus(status);

          if (showToast) {
            Alert.alert(
              "Rascunho Salvo Localmente",
              "Você está offline. O rascunho será sincronizado automaticamente quando a conexão for restabelecida."
            );
          }
          return;
        }

        // Tentar salvar no servidor quando online
        const formData = new FormData();
        formData.append("escopoId", escopo.escopo.id);
        if (rascunhoId) formData.append("respostaId", rascunhoId);
        formData.append("isDraft", "true");

        // Garantir que observacoes seja uma string válida
        const observacoesValue =
          observacoes && observacoes.trim() ? observacoes.trim() : "";
        formData.append("observacoes", observacoesValue);

        if (loc) {
          formData.append("lat", String(loc.coords.latitude));
          formData.append("lng", String(loc.coords.longitude));
          formData.append("accuracy", String(loc.coords.accuracy || 0));
        }

        const answersJson = JSON.stringify(respostas);
        formData.append("answers", answersJson);

        // Coletar fotos, comprimir em paralelo e adicionar ao FormData (evita 413)
        // CRÍTICO: Garantir que TODAS as fotos sejam coletadas, incluindo anexadas
        const photoEntries: {
          formKey: string;
          uri: string;
          type: string;
          name: string;
        }[] = [];
        for (const [key, fotos] of Object.entries(draftData.fotos)) {
          if (Array.isArray(fotos) && fotos.length > 0) {
            fotos.forEach((foto: any, index: number) => {
              if (
                foto &&
                foto.uri &&
                (foto.uri.startsWith("file://") ||
                  foto.uri.startsWith("content://") ||
                  foto.uri.startsWith("/"))
              ) {
                let formKey: string;
                if (key.startsWith("foto_anexada_")) {
                  const perguntaId = key.replace("foto_anexada_", "");
                  formKey = `foto_anexada_${perguntaId}_${index}`;
                } else {
                  const perguntaId = key.replace("foto_", "");
                  formKey = `foto_${perguntaId}_${index}`;
                }
                photoEntries.push({
                  formKey,
                  uri: foto.uri,
                  type: foto.type || "image/jpeg",
                  name: foto.name || `${formKey}.jpg`,
                });
              }
            });
          }
        }

        console.log(
          `[salvarRascunho] 📸 Fotos coletadas para upload: ${photoEntries.length}`,
          {
            photoEntries: photoEntries.map((e) => ({
              formKey: e.formKey,
              name: e.name,
            })),
          }
        );
        // Comprimir sequencialmente para evitar OOM com muitas fotos em dispositivos Android
        const compressed: typeof photoEntries = [];
        for (const e of photoEntries) {
          try {
            const result = await compressImageForUpload(e.uri);
            compressed.push({ ...e, uri: result.uri });
          } catch (err) {
            console.warn(
              `[salvarRascunho] Erro ao comprimir ${e.formKey}, usando original:`,
              err
            );
            compressed.push(e);
          }
        }
        for (const e of compressed) {
          formData.append(e.formKey, {
            uri: e.uri,
            type: e.type,
            name: e.name,
          } as any);
        }

        // Obter token de autenticação
        const token = await SecureStore.getItemAsync("authToken");

        const headers: Record<string, string> = {
          Accept: "application/json",
        };

        // Adicionar token de autenticação se existir
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${API_URL}${API_ENDPOINTS.CHECKLISTS_RESPONDER}`,
          {
            method: "POST",
            body: formData,
            headers,
          }
        );

        if (!response.ok) {
          // Se falhar, salvar localmente como backup
          const errorData = await response.json().catch(() => ({}));
          console.error("Erro ao salvar rascunho no servidor:", errorData);

          await saveDraftLocally(escopo.escopo.id, rascunhoId, draftData);
          const status = await getSyncStatus();
          setSyncStatus(status);

          if (showToast) {
            Alert.alert(
              "Rascunho Salvo Localmente",
              "Não foi possível salvar no servidor. O rascunho foi salvo localmente e será sincronizado automaticamente."
            );
          }
          return;
        }

        const result = await response.json().catch(() => ({}));

        // Atualizar rascunhoId se o backend retornar um novo ID
        if (result.resposta?.id && result.resposta.id !== rascunhoId) {
          setRascunhoId(result.resposta.id);
        }

        // Atualizar status de sincronização
        const status = await getSyncStatus();
        setSyncStatus(status);

        if (showToast) {
          Alert.alert("Sucesso", "Rascunho salvo com sucesso!");
        }
      } catch (error: any) {
        console.error("Erro ao salvar rascunho:", error);

        // Em caso de erro, tentar salvar localmente (incluindo fotos)
        try {
          const respostas = prepararRespostas();
          const draftData = {
            observacoes,
            answers: respostas,
            lat: localizacao?.coords.latitude,
            lng: localizacao?.coords.longitude,
            accuracy: localizacao?.coords.accuracy || 0,
            fotos: {} as Record<string, any[]>,
          };
          for (const grupo of escopo!.escopo.template.grupos) {
            for (const pergunta of grupo.perguntas) {
              if (pergunta.tipo === "FOTO" && photoAnswers[pergunta.id]) {
                draftData.fotos[`foto_${pergunta.id}`] = photoAnswers[
                  pergunta.id
                ].map((fotoUri) => ({
                  uri: fotoUri,
                  type: "image/jpeg",
                  name: `foto_${pergunta.id}.jpg`,
                }));
              }
              if (photoAnswers[`${pergunta.id}_anexo`]?.length > 0) {
                draftData.fotos[`foto_anexada_${pergunta.id}`] = photoAnswers[
                  `${pergunta.id}_anexo`
                ].map((fotoUri, index) => ({
                  uri: fotoUri,
                  type: "image/jpeg",
                  name: `foto_anexada_${pergunta.id}_${index}.jpg`,
                }));
              }
            }
          }
          for (const [key, arr] of Object.entries(draftData.fotos)) {
            const copied: any[] = [];
            for (let index = 0; index < arr.length; index++) {
              const foto = arr[index];
              const uri = foto?.uri;
              if (
                !uri ||
                (!uri.startsWith("file://") &&
                  !uri.startsWith("content://") &&
                  !uri.startsWith("/"))
              ) {
                copied.push(foto);
                continue;
              }
              const perguntaId = key
                .replace("foto_anexada_", "")
                .replace("foto_", "");
              const newUri = await copyPhotoToPermanentStorage(
                uri,
                escopo!.escopo.id,
                perguntaId,
                index
              );
              copied.push({ ...foto, uri: newUri });
            }
            draftData.fotos[key] = copied;
          }

          await saveDraftLocally(escopo!.escopo.id, rascunhoId, draftData);
          const status = await getSyncStatus();
          setSyncStatus(status);
        } catch (localError) {
          console.error("Erro ao salvar localmente:", localError);
        }

        if (showToast) {
          Alert.alert(
            "Aviso",
            "Não foi possível salvar no servidor. O rascunho foi salvo localmente e será sincronizado quando a conexão for restabelecida."
          );
        }
      } finally {
        setSalvandoRascunho(false);
      }
    },
    [
      escopo,
      rascunhoId,
      textAnswers,
      booleanAnswers,
      numericAnswers,
      selectAnswers,
      photoAnswers,
      notaAnswers,
      observacoes,
      localizacao,
      naoConformeDetails,
      obterLocalizacao,
      prepararRespostas,
    ]
  );

  // Auto-salvar rascunho após mudanças (só depois do carregamento inicial)
  useEffect(() => {
    if (!initialLoadDoneRef.current || !escopo || salvandoRascunho) return;

    // Verificar se há qualquer resposta ou foto
    // CRÍTICO: Incluir booleanAnswers mesmo que seja apenas CONFORME
    const hasAnyAnswer =
      Object.keys(textAnswers).length > 0 ||
      Object.keys(booleanAnswers).length > 0 ||
      Object.keys(numericAnswers).length > 0 ||
      Object.keys(selectAnswers).length > 0 ||
      Object.keys(photoAnswers).length > 0 ||
      Object.keys(notaAnswers).length > 0 ||
      observacoes.trim().length > 0;

    // Log para debug
    if (__DEV__ && hasAnyAnswer) {
      console.log(`[auto-save] 📝 Tem respostas para salvar:`, {
        textAnswers: Object.keys(textAnswers).length,
        booleanAnswers: Object.keys(booleanAnswers).length,
        numericAnswers: Object.keys(numericAnswers).length,
        selectAnswers: Object.keys(selectAnswers).length,
        photoAnswers: Object.keys(photoAnswers).length,
        notaAnswers: Object.keys(notaAnswers).length,
        observacoes: observacoes.trim().length,
      });
    }

    if (!hasAnyAnswer) return;

    // Limpar timeout anterior
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Auto-salvar: 1s no Android (mais responsivo), 2s no iOS
    const delay = Platform.OS === "android" ? 1000 : 2000;
    autoSaveTimeoutRef.current = setTimeout(() => {
      salvarRascunho(false).catch((error) => {
        console.error("Erro no auto-save:", error);
      });
    }, delay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    textAnswers,
    booleanAnswers,
    numericAnswers,
    selectAnswers,
    photoAnswers,
    notaAnswers,
    observacoes,
    escopo,
    rascunhoId,
    salvandoRascunho,
    salvarRascunho,
  ]);

  const validarPerguntasObrigatorias = useCallback((): boolean => {
    if (!escopo) return false;

    const grupos = escopo.escopo.template.grupos;
    for (const grupo of grupos) {
      for (const pergunta of grupo.perguntas) {
        if (pergunta.obrigatoria) {
          let temResposta = false;

          switch (pergunta.tipo) {
            case "TEXTO":
              temResposta = !!textAnswers[pergunta.id]?.trim();
              break;
            case "BOOLEANO":
              temResposta =
                booleanAnswers[pergunta.id] !== null &&
                booleanAnswers[pergunta.id] !== undefined;
              break;
            case "NUMERICO":
              temResposta = !!numericAnswers[pergunta.id]?.trim();
              break;
            case "SELECAO":
              temResposta = !!selectAnswers[pergunta.id];
              break;
            case "FOTO":
              temResposta = !!(
                photoAnswers[pergunta.id] &&
                photoAnswers[pergunta.id].length > 0
              );
              break;
          }

          if (!temResposta) {
            Alert.alert(
              "Campo Obrigatório",
              `A pergunta "${pergunta.titulo}" é obrigatória.`
            );
            return false;
          }
        }
      }
    }

    return true;
  }, [
    escopo,
    textAnswers,
    booleanAnswers,
    numericAnswers,
    selectAnswers,
    photoAnswers,
  ]);

  const finalizarChecklist = useCallback(() => {
    if (!escopo || !rascunhoId) return;

    if (!validarPerguntasObrigatorias()) {
      return;
    }

    // Confirmar envio e abrir modal de assinaturas
    Alert.alert(
      "Finalizar Checklist",
      "Tem certeza que deseja finalizar este checklist? Você precisará capturar a assinatura do gerente e sua selfie.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          onPress: () => {
            // Resetar estados de assinatura
            setAssinaturaGerenteDataUrl(null);
            setSelfieSupervisorUri(null);
            setAssinaturaStep("gerente");
            setShowAssinaturaModal(true);
          },
        },
      ]
    );
  }, [escopo, rascunhoId, validarPerguntasObrigatorias]);

  const handleAssinaturaGerenteOK = useCallback((signature: string) => {
    setAssinaturaGerenteDataUrl(signature);
    setAssinaturaStep("supervisor");
  }, []);

  const capturarSelfieSupervisor = useCallback(async () => {
    try {
      const isSimulator = !Device.isDevice;

      if (isSimulator) {
        Alert.alert(
          "Simulador",
          "A câmera não está disponível no simulador. Por favor, teste em um dispositivo físico."
        );
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Necessária",
          "É necessário permitir acesso à câmera para tirar sua selfie."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelfieSupervisorUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("Erro ao capturar selfie:", error);
      Alert.alert("Erro", "Não foi possível capturar sua selfie.");
    }
  }, []);

  const finalizarChecklistComAssinaturas = useCallback(async () => {
    if (!escopo || !rascunhoId) return;
    if (!assinaturaGerenteDataUrl || !selfieSupervisorUri) {
      Alert.alert(
        "Atenção",
        "Por favor, capture a assinatura do gerente e sua selfie antes de finalizar."
      );
      return;
    }

    try {
      setEnviando(true);

      // Obter localização se não tiver
      let loc = localizacao;
      if (!loc) {
        loc = await obterLocalizacao();
      }

      const formData = new FormData();
      formData.append("escopoId", escopo.escopo.id);
      // IMPORTANTE: Enviar respostaId apenas se for atualizar rascunho existente
      // Se não tiver respostaId, a API criará uma nova resposta
      if (rascunhoId) {
        formData.append("respostaId", rascunhoId);
      }
      formData.append("isDraft", "false");

      // Observações (só enviar se não estiver vazio)
      if (observacoes && observacoes.trim()) {
        formData.append("observacoes", observacoes.trim());
      }

      // Localização
      if (loc) {
        formData.append("lat", String(loc.coords.latitude));
        formData.append("lng", String(loc.coords.longitude));
        formData.append("accuracy", String(loc.coords.accuracy || 0));
      }

      // Preparar respostas ANTES de coletar fotos para garantir que todas sejam incluídas
      const respostas = prepararRespostas();

      console.log("📋 Finalizando checklist - Respostas preparadas:", {
        totalRespostas: respostas.length,
        respostas: respostas.map((r) => ({
          perguntaId: r.perguntaId,
          tipo: r.tipo,
          temValorTexto: !!r.valorTexto,
          temValorBoolean: r.valorBoolean !== undefined,
          valorBoolean: r.valorBoolean,
          temValorNumero: r.valorNumero !== undefined,
          temValorOpcao: !!r.valorOpcao,
          temNota: r.nota !== undefined && r.nota !== null,
          nota: r.nota,
        })),
      });

      formData.append("answers", JSON.stringify(respostas));

      // Comprimir assinatura e selfie para reduzir payload (evita 413)
      const [compressedAssinatura, compressedSelfieUri] = await Promise.all([
        assinaturaGerenteDataUrl
          ? compressDataUrlToDataUrl(assinaturaGerenteDataUrl)
          : Promise.resolve(null),
        selfieSupervisorUri
          ? compressImageForUpload(selfieSupervisorUri).then((r) => r.uri)
          : Promise.resolve(null),
      ]);
      if (compressedAssinatura) {
        formData.append("assinaturaGerenteDataUrl", compressedAssinatura);
      }
      if (compressedSelfieUri) {
        formData.append("assinaturaFoto", {
          uri: compressedSelfieUri,
          type: "image/jpeg",
          name: "selfie-supervisor.jpg",
        } as any);
      }

      // Coletar TODAS as fotos (principais e anexadas) de TODAS as perguntas
      // CRÍTICO: Processar igual ao web - coletar todas antes de comprimir
      const photoEntries: {
        formKey: string;
        uri: string;
        name: string;
        perguntaId: string;
        tipo: "principal" | "anexada";
      }[] = [];

      const grupos = escopo.escopo.template.grupos;
      for (const grupo of grupos) {
        for (const pergunta of grupo.perguntas) {
          // 1. Fotos principais (tipo FOTO)
          if (
            pergunta.tipo === "FOTO" &&
            photoAnswers[pergunta.id] &&
            photoAnswers[pergunta.id].length > 0
          ) {
            const fotos = photoAnswers[pergunta.id];
            const permiteMultiplas = pergunta.permiteMultiplasFotos ?? false;

            fotos.forEach((fotoUri: string, index: number) => {
              // Só coletar fotos locais (não URLs já salvas)
              if (
                fotoUri &&
                (fotoUri.startsWith("file://") ||
                  fotoUri.startsWith("content://") ||
                  fotoUri.startsWith("/"))
              ) {
                const formKey = permiteMultiplas
                  ? `foto_${pergunta.id}_${index}`
                  : `foto_${pergunta.id}`;
                photoEntries.push({
                  formKey,
                  uri: fotoUri,
                  name: permiteMultiplas
                    ? `foto_${pergunta.id}_${index}.jpg`
                    : `foto_${pergunta.id}.jpg`,
                  perguntaId: pergunta.id,
                  tipo: "principal",
                });
                if (__DEV__) {
                  console.log(
                    `[finalizarChecklist] 📸 Foto principal coletada: perguntaId=${pergunta.id}, index=${index}, formKey=${formKey}`
                  );
                }
              }
            });
          }

          // 2. Fotos anexadas (para TODAS as perguntas, independente do tipo)
          // CRÍTICO: Sempre coletar fotos anexadas, mesmo quando resposta é CONFORME
          if (
            photoAnswers[`${pergunta.id}_anexo`] &&
            photoAnswers[`${pergunta.id}_anexo`].length > 0
          ) {
            const fotosAnexadas = photoAnswers[`${pergunta.id}_anexo`];
            fotosAnexadas.forEach((fotoUri: string, index: number) => {
              // Só coletar fotos locais (não URLs já salvas)
              if (
                fotoUri &&
                (fotoUri.startsWith("file://") ||
                  fotoUri.startsWith("content://") ||
                  fotoUri.startsWith("/"))
              ) {
                photoEntries.push({
                  formKey: `foto_anexada_${pergunta.id}_${index}`,
                  uri: fotoUri,
                  name: `foto_anexada_${pergunta.id}_${index}.jpg`,
                  perguntaId: pergunta.id,
                  tipo: "anexada",
                });
                if (__DEV__) {
                  console.log(
                    `[finalizarChecklist] 📸 Foto anexada coletada: perguntaId=${pergunta.id}, index=${index}`
                  );
                }
              }
            });
          }
        }
      }

      if (__DEV__) {
        console.log(
          `[finalizarChecklist] 📊 Total de fotos coletadas: ${photoEntries.length}`,
          {
            principais: photoEntries.filter((e) => e.tipo === "principal")
              .length,
            anexadas: photoEntries.filter((e) => e.tipo === "anexada").length,
          }
        );
      }
      // Comprimir fotos sequencialmente para evitar OOM em dispositivos Android
      // CRÍTICO: Comprimir todas antes de adicionar ao FormData para evitar 413
      if (photoEntries.length > 0) {
        if (__DEV__) {
          console.log(
            `[finalizarChecklist] 🔄 Comprimindo ${photoEntries.length} fotos...`
          );
        }

        const compressedPhotos: typeof photoEntries = [];
        for (const e of photoEntries) {
          try {
            const compressed = await compressImageForUpload(e.uri);
            compressedPhotos.push({ ...e, uri: compressed.uri });
          } catch (error) {
            console.error(
              `[finalizarChecklist] ❌ Erro ao comprimir foto ${e.formKey}:`,
              error
            );
            // Em caso de erro, usar foto original (pode causar 413, mas melhor que perder a foto)
            compressedPhotos.push(e);
          }
        }

        // Adicionar fotos comprimidas ao FormData
        for (const e of compressedPhotos) {
          if (e.uri) {
            formData.append(e.formKey, {
              uri: e.uri,
              type: "image/jpeg",
              name: e.name,
            } as any);
            if (__DEV__) {
              console.log(
                `[finalizarChecklist] ✅ Foto adicionada ao FormData: ${e.formKey} (${e.name})`
              );
            }
          }
        }

        if (__DEV__) {
          console.log(
            `[finalizarChecklist] 📸 Total de fotos no FormData: ${compressedPhotos.length}`,
            {
              principais: compressedPhotos.filter((e) => e.tipo === "principal")
                .length,
              anexadas: compressedPhotos.filter((e) => e.tipo === "anexada")
                .length,
            }
          );
        }
      } else {
        if (__DEV__) {
          console.log(
            `[finalizarChecklist] ℹ️ Nenhuma foto local para enviar (todas já estão salvas como URLs)`
          );
        }
      }

      // Obter token de autenticação
      const token = await SecureStore.getItemAsync("authToken");

      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      // Adicionar token de autenticação se existir
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Log final antes de enviar
      if (__DEV__) {
        console.log(`[finalizarChecklist] 🚀 Enviando checklist:`, {
          escopoId: escopo.escopo.id,
          respostaId: rascunhoId || "nova",
          totalRespostas: respostas.length,
          totalFotos: photoEntries.length,
          temAssinaturaGerente: !!assinaturaGerenteDataUrl,
          temSelfieSupervisor: !!selfieSupervisorUri,
          temLocalizacao: !!loc,
        });
      }

      const response = await fetch(
        `${API_URL}${API_ENDPOINTS.CHECKLISTS_RESPONDER}`,
        {
          method: "POST",
          body: formData,
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Erro ao finalizar checklist:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          escopoId: escopo.escopo.id,
          respostaId: rascunhoId,
          totalRespostas: respostas.length,
          totalFotos: photoEntries.length,
        });

        // Mensagem de erro mais detalhada
        let errorMessage = "Erro ao finalizar checklist";
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (response.status === 413) {
          errorMessage =
            "O checklist é muito grande. Tente reduzir o número de fotos.";
        } else if (response.status === 422) {
          errorMessage =
            "Dados inválidos. Verifique se todas as perguntas obrigatórias foram respondidas.";
        } else if (response.status === 401) {
          errorMessage = "Sessão expirada. Faça login novamente.";
        }

        throw new Error(errorMessage);
      }

      const result = await response.json().catch(() => ({}));

      if (__DEV__) {
        console.log(
          `[finalizarChecklist] ✅ Checklist finalizado com sucesso!`,
          {
            respostaId: result?.resposta?.id || result?.id,
            protocolo: result?.protocolo,
          }
        );
      }

      Alert.alert("Sucesso", "Checklist finalizado com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            // Evitar crash: deferir fechamento do modal e navegação
            // até o Alert ter sido totalmente dispensado.
            setTimeout(() => {
              try {
                setShowAssinaturaModal(false);
                // Aguardar um pouco mais para garantir que o modal foi fechado
                setTimeout(() => {
                  try {
                    navigation.goBack();
                  } catch (navError) {
                    console.error("Erro ao navegar:", navError);
                    // Fallback: tentar navegar para a tela de checklists
                    try {
                      navigation.navigate("Checklists" as never);
                    } catch (fallbackError) {
                      console.error(
                        "Erro no fallback de navegação:",
                        fallbackError
                      );
                    }
                  }
                }, 100);
              } catch (e) {
                console.error("Erro ao fechar modal:", e);
              }
            }, 200);
          },
        },
      ]);
    } catch (error: any) {
      console.error("Erro ao finalizar checklist:", error);

      // Não fechar o modal em caso de erro - deixar o usuário tentar novamente
      let errorMessage = "Não foi possível finalizar o checklist.";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 413) {
        errorMessage =
          "O checklist é muito grande. Tente reduzir o número de fotos.";
      } else if (error?.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (
        error?.code === "NETWORK_ERROR" ||
        error?.message?.includes("Network")
      ) {
        errorMessage =
          "Erro de conexão. Verifique sua internet e tente novamente.";
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setEnviando(false);
    }
  }, [
    escopo,
    rascunhoId,
    observacoes,
    localizacao,
    photoAnswers,
    notaAnswers,
    naoConformeDetails,
    assinaturaGerenteDataUrl,
    selfieSupervisorUri,
    obterLocalizacao,
    prepararRespostas,
    navigation,
  ]);

  // IMPORTANTE: Hooks devem ser chamados antes de qualquer early return (Rules of Hooks)
  const gruposOrdenados = escopo?.escopo?.template?.grupos
    ? [...escopo.escopo.template.grupos].sort((a, b) => a.ordem - b.ordem)
    : [];

  const todasPerguntas = useMemo(() => {
    const lista: { pergunta: Pergunta; grupo: Grupo }[] = [];
    gruposOrdenados.forEach((grupo) => {
      grupo.perguntas
        .sort((a, b) => a.ordem - b.ordem)
        .forEach((pergunta) => {
          lista.push({ pergunta: pergunta as Pergunta, grupo: grupo as Grupo });
        });
    });
    return lista;
  }, [gruposOrdenados]);

  const perguntaAtual = todasPerguntas[currentQuestionIndex];
  const totalPerguntas = todasPerguntas.length;
  const isUltimaPergunta =
    totalPerguntas > 0 && currentQuestionIndex >= totalPerguntas - 1;

  const avancarPergunta = useCallback(async () => {
    if (currentQuestionIndex < totalPerguntas - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      InteractionManager.runAfterInteractions(() => {
        salvarRascunho(false).catch((e) => console.error("Erro ao salvar:", e));
      });
    }
  }, [currentQuestionIndex, totalPerguntas, salvarRascunho]);

  const voltarPergunta = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Early return DEPOIS de todos os hooks
  if (loading || !escopo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009ee2" />
        <Text style={styles.loadingText}>Carregando checklist...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Boolean(Platform.OS === "ios")}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {escopo.escopo.template.titulo}
          </Text>
          <Text style={styles.headerSubtitle}>
            {escopo.escopo.unidade?.nome || ""}
            {escopo.escopo.unidade ? " • " : ""}Pergunta{" "}
            {currentQuestionIndex + 1} de {totalPerguntas}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Indicador de status de sincronização */}
          {!syncStatus.isOnline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
          {syncStatus.isOnline && syncStatus.pendingSyncs > 0 && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={async () => {
                setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
                const result = await syncAllPendingDrafts();
                const newStatus = await getSyncStatus();
                setSyncStatus(newStatus);
                if (result.success > 0) {
                  Alert.alert(
                    "Sucesso",
                    `${result.success} rascunho(s) sincronizado(s) com sucesso!`
                  );
                }
              }}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.syncText}>{syncStatus.pendingSyncs}</Text>
            </TouchableOpacity>
          )}
          {salvandoRascunho && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {totalPerguntas === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              Nenhuma pergunta neste checklist
            </Text>
            <Text style={styles.emptyText}>
              Este checklist não possui perguntas configuradas.
            </Text>
          </View>
        ) : (
          perguntaAtual && (
            <View key={perguntaAtual.pergunta.id} style={styles.grupoContainer}>
              <Text style={styles.grupoTitulo}>
                {perguntaAtual.grupo.titulo}
              </Text>
              {perguntaAtual.grupo.descricao && (
                <Text style={styles.grupoDescricao}>
                  {perguntaAtual.grupo.descricao}
                </Text>
              )}

              <View style={styles.perguntaContainer}>
                <View style={styles.perguntaHeader}>
                  <Text style={styles.perguntaTitulo}>
                    {perguntaAtual.pergunta.titulo}
                    {perguntaAtual.pergunta.obrigatoria && (
                      <Text style={styles.obrigatorio}> *</Text>
                    )}
                  </Text>
                  {perguntaAtual.pergunta.descricao && (
                    <Text style={styles.perguntaDescricao}>
                      {perguntaAtual.pergunta.descricao}
                    </Text>
                  )}
                </View>

                {/* Renderizar input baseado no tipo */}
                {perguntaAtual.pergunta.tipo === "TEXTO" && (
                  <>
                    <TextInput
                      style={styles.textInput}
                      value={textAnswers[perguntaAtual.pergunta.id] || ""}
                      onChangeText={(text) =>
                        setTextAnswers((prev) => ({
                          ...prev,
                          [perguntaAtual.pergunta.id]: text,
                        }))
                      }
                      placeholder="Digite sua resposta..."
                      multiline={true}
                      numberOfLines={4}
                    />
                  </>
                )}

                {perguntaAtual.pergunta.tipo === "BOOLEANO" && (
                  <View style={styles.booleanContainer}>
                    {(["CONFORME", "NAO_CONFORME", "NAO_APLICA"] as const).map(
                      (opcao) => (
                        <TouchableOpacity
                          key={opcao}
                          style={[
                            styles.booleanButton,
                            booleanAnswers[perguntaAtual.pergunta.id] === opcao
                              ? styles.booleanButtonSelected
                              : null,
                            { marginRight: 8, marginBottom: 8 },
                          ]}
                          onPress={() => {
                            setBooleanAnswers((prev) => ({
                              ...prev,
                              [perguntaAtual.pergunta.id]: opcao,
                            }));
                          }}
                        >
                          <Text
                            style={[
                              styles.booleanButtonText,
                              booleanAnswers[perguntaAtual.pergunta.id] ===
                              opcao
                                ? styles.booleanButtonTextSelected
                                : null,
                            ]}
                          >
                            {opcao === "CONFORME"
                              ? "Conforme"
                              : opcao === "NAO_CONFORME"
                              ? "Não Conforme"
                              : "Não Aplica"}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}

                {perguntaAtual.pergunta.tipo === "NUMERICO" && (
                  <TextInput
                    style={styles.textInput}
                    value={numericAnswers[perguntaAtual.pergunta.id] || ""}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.,]/g, "");
                      setNumericAnswers((prev) => ({
                        ...prev,
                        [perguntaAtual.pergunta.id]: numericValue,
                      }));
                    }}
                    placeholder="Digite um número..."
                    keyboardType="numeric"
                  />
                )}

                {perguntaAtual.pergunta.tipo === "SELECAO" && (
                  <View style={styles.selectContainer}>
                    {perguntaAtual.pergunta.opcoes.map((opcao) => (
                      <TouchableOpacity
                        key={opcao}
                        style={[
                          styles.selectButton,
                          selectAnswers[perguntaAtual.pergunta.id] === opcao
                            ? styles.selectButtonSelected
                            : null,
                          { marginBottom: 8 },
                        ]}
                        onPress={() =>
                          setSelectAnswers((prev) => ({
                            ...prev,
                            [perguntaAtual.pergunta.id]: opcao,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            selectAnswers[perguntaAtual.pergunta.id] === opcao
                              ? styles.selectButtonTextSelected
                              : null,
                          ]}
                        >
                          {opcao}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Sistema de Avaliação 1-5 - Mostrar em TODAS as perguntas */}
                <View style={styles.avaliacaoContainer}>
                  <Text style={styles.avaliacaoLabel}>
                    Avaliação{" "}
                    {perguntaAtual.pergunta.peso
                      ? `(Peso ${perguntaAtual.pergunta.peso})`
                      : ""}
                  </Text>
                  <Text style={styles.avaliacaoSubtitle}>
                    Selecione a nota que melhor representa a situação
                  </Text>
                  <View style={styles.avaliacaoButtons}>
                    {[1, 2, 3, 4, 5].map((nota) => {
                      const cores = {
                        1: "#f44336", // Vermelho - Péssimo
                        2: "#FF9800", // Laranja - Ruim
                        3: "#FFC107", // Amarelo - Regular
                        4: "#4CAF50", // Verde - Bom
                        5: "#8BC34A", // Verde claro - Ótimo
                      };
                      const labels = {
                        1: "Péssimo",
                        2: "Ruim",
                        3: "Regular",
                        4: "Bom",
                        5: "Ótimo",
                      };
                      const isSelected =
                        notaAnswers[perguntaAtual.pergunta.id] === nota;
                      return (
                        <TouchableOpacity
                          key={nota}
                          style={[
                            styles.avaliacaoButton,
                            isSelected && styles.avaliacaoButtonSelected,
                            {
                              borderColor: cores[nota as keyof typeof cores],
                            },
                            isSelected && {
                              backgroundColor:
                                cores[nota as keyof typeof cores] + "20",
                            },
                          ]}
                          onPress={() =>
                            setNotaAnswers((prev) => ({
                              ...prev,
                              [perguntaAtual.pergunta.id]: isSelected
                                ? null
                                : nota,
                            }))
                          }
                        >
                          <View
                            style={[
                              styles.avaliacaoDot,
                              {
                                backgroundColor:
                                  cores[nota as keyof typeof cores],
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.avaliacaoButtonText,
                              isSelected && styles.avaliacaoButtonTextSelected,
                            ]}
                          >
                            {nota} - {labels[nota as keyof typeof labels]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {notaAnswers[perguntaAtual.pergunta.id] && (
                    <Text style={styles.avaliacaoSelected}>
                      Nota selecionada: {notaAnswers[perguntaAtual.pergunta.id]}
                    </Text>
                  )}
                </View>

                {/* Anexe uma foto - em TODAS as perguntas (melhor para Android) */}
                {perguntaAtual.pergunta.tipo !== "FOTO" && (
                  <View style={styles.anexoFotoContainer}>
                    <Text style={styles.anexoFotoLabel}>
                      Anexe uma foto (opcional)
                    </Text>
                    <Text style={styles.anexoFotoSubtitle}>
                      Tire ou selecione uma foto como evidência para esta
                      pergunta
                    </Text>
                    {photoAnswers[`${perguntaAtual.pergunta.id}_anexo`]?.map(
                      (uri, index) => (
                        <View key={index} style={styles.photoPreview}>
                          <Image source={{ uri }} style={styles.photoImage} />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => {
                              const novasFotos = [
                                ...(photoAnswers[
                                  `${perguntaAtual.pergunta.id}_anexo`
                                ] || []),
                              ];
                              novasFotos.splice(index, 1);
                              setPhotoAnswers((prev) => {
                                const newState = { ...prev };
                                if (novasFotos.length > 0) {
                                  newState[
                                    `${perguntaAtual.pergunta.id}_anexo`
                                  ] = novasFotos;
                                } else {
                                  delete newState[
                                    `${perguntaAtual.pergunta.id}_anexo`
                                  ];
                                }
                                return newState;
                              });
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color="#f44336"
                            />
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                    <View style={styles.photoButtons}>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={() =>
                          tirarFoto(`${perguntaAtual.pergunta.id}_anexo`, true)
                        }
                      >
                        <Ionicons
                          name="camera-outline"
                          size={20}
                          color="#009ee2"
                        />
                        <Text style={styles.photoButtonText}>Tirar Foto</Text>
                      </TouchableOpacity>
                    </View>
                    {photoAnswers[`${perguntaAtual.pergunta.id}_anexo`]
                      ?.length > 0 && (
                      <Text style={styles.photoCount}>
                        {
                          photoAnswers[`${perguntaAtual.pergunta.id}_anexo`]
                            .length
                        }{" "}
                        foto(s) adicionada(s)
                      </Text>
                    )}
                  </View>
                )}

                {perguntaAtual.pergunta.tipo === "FOTO" && (
                  <View style={styles.photoContainer}>
                    {photoAnswers[perguntaAtual.pergunta.id]?.map(
                      (uri, index) => (
                        <View key={index} style={styles.photoPreview}>
                          <Image source={{ uri }} style={styles.photoImage} />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => {
                              const novasFotos = [
                                ...(photoAnswers[perguntaAtual.pergunta.id] ||
                                  []),
                              ];
                              novasFotos.splice(index, 1);
                              setPhotoAnswers((prev) => ({
                                ...prev,
                                [perguntaAtual.pergunta.id]: novasFotos,
                              }));
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color="#f44336"
                            />
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                    <View style={styles.photoButtons}>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={() =>
                          tirarFoto(perguntaAtual.pergunta.id, true)
                        }
                      >
                        <Ionicons
                          name="camera-outline"
                          size={20}
                          color="#009ee2"
                        />
                        <Text style={styles.photoButtonText}>Tirar Foto</Text>
                      </TouchableOpacity>
                    </View>
                    {photoAnswers[perguntaAtual.pergunta.id]?.length > 0 && (
                      <Text style={styles.photoCount}>
                        {photoAnswers[perguntaAtual.pergunta.id].length} foto(s)
                        adicionada(s)
                      </Text>
                    )}
                  </View>
                )}

                {/* Detalhes de não conformidade */}
                {perguntaAtual.pergunta.tipo === "BOOLEANO" &&
                  booleanAnswers[perguntaAtual.pergunta.id] ===
                    "NAO_CONFORME" && (
                    <View style={styles.naoConformeContainer}>
                      <Text style={styles.naoConformeLabel}>
                        Motivo da não conformidade:
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={
                          naoConformeDetails[perguntaAtual.pergunta.id]
                            ?.motivo || ""
                        }
                        onChangeText={(text) =>
                          setNaoConformeDetails((prev) => ({
                            ...prev,
                            [perguntaAtual.pergunta.id]: {
                              motivo: text,
                              resolucao:
                                prev[perguntaAtual.pergunta.id]?.resolucao ||
                                "",
                            },
                          }))
                        }
                        placeholder="Descreva o motivo..."
                        multiline={true}
                      />
                      <Text style={styles.naoConformeLabel}>
                        O que foi feito para resolver:
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={
                          naoConformeDetails[perguntaAtual.pergunta.id]
                            ?.resolucao || ""
                        }
                        onChangeText={(text) =>
                          setNaoConformeDetails((prev) => ({
                            ...prev,
                            [perguntaAtual.pergunta.id]: {
                              motivo:
                                prev[perguntaAtual.pergunta.id]?.motivo || "",
                              resolucao: text,
                            },
                          }))
                        }
                        placeholder="Descreva a resolução..."
                        multiline={true}
                      />
                    </View>
                  )}
              </View>
            </View>
          )
        )}

        {/* Observações Gerais - só na última pergunta */}
        {isUltimaPergunta && (
          <View style={styles.observacoesContainer}>
            <Text style={styles.observacoesLabel}>
              Observações Gerais (opcional)
            </Text>
            <TextInput
              style={[styles.textInput, styles.observacoesInput]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Adicione observações gerais sobre este checklist..."
              multiline={true}
              numberOfLines={6}
            />
          </View>
        )}
      </ScrollView>

      {/* Footer com navegação pergunta por pergunta */}
      {totalPerguntas > 0 && (
        <View
          style={[
            styles.footer,
            styles.footerStepByStep,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[styles.footerButton, styles.navButton]}
            onPress={voltarPergunta}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentQuestionIndex === 0 ? "#999" : "#009ee2"}
            />
            <Text
              style={[
                styles.footerButtonText,
                { color: currentQuestionIndex === 0 ? "#999" : "#009ee2" },
              ]}
            >
              Anterior
            </Text>
          </TouchableOpacity>

          {isUltimaPergunta ? (
            <TouchableOpacity
              style={[styles.footerButton, styles.submitButton]}
              onPress={finalizarChecklist}
              disabled={enviando}
            >
              {enviando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text
                    style={[styles.footerButtonText, styles.submitButtonText]}
                  >
                    Finalizar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.footerButton, styles.navButton]}
              onPress={avancarPergunta}
            >
              <Text style={[styles.footerButtonText, { color: "#009ee2" }]}>
                Próxima
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#009ee2" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modal de Assinaturas */}
      <Modal
        visible={showAssinaturaModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAssinaturaModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {assinaturaStep === "gerente"
                ? "Assinatura do Gerente"
                : "Selfie do Supervisor"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowAssinaturaModal(false);
                setAssinaturaGerenteDataUrl(null);
                setSelfieSupervisorUri(null);
                setAssinaturaStep("gerente");
                if (signatureRef.current) {
                  signatureRef.current.clearSignature();
                }
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {assinaturaStep === "gerente" ? (
            <View style={styles.modalContentFixed}>
              <View style={styles.assinaturaStepContainer}>
                <Text style={styles.assinaturaStepTitle}>
                  Assinatura do Gerente
                </Text>
                <Text style={styles.assinaturaStepDescription}>
                  Entregue o celular para o gerente assinar na tela abaixo com o
                  dedo para confirmar a visualização deste relatório.
                </Text>

                <View style={styles.signatureContainer}>
                  <SignatureCanvas
                    ref={signatureRef}
                    onOK={handleAssinaturaGerenteOK}
                    descriptionText="Assine na área abaixo"
                    clearText="Limpar"
                    confirmText="Confirmar"
                    webStyle={`
                      .m-signature-pad {
                        box-shadow: none;
                        border: none;
                        border-radius: 8px;
                        width: 100%;
                        height: 100%;
                      }
                      .m-signature-pad--body {
                        border: none;
                        height: calc(100% - 60px);
                      }
                      .m-signature-pad--body canvas {
                        border-radius: 8px;
                        width: 100%;
                        height: 100%;
                      }
                      .m-signature-pad--footer {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px;
                        gap: 10px;
                      }
                      .button {
                        background-color: #007AFF;
                        color: white;
                        border-radius: 6px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 600;
                        border: none;
                        cursor: pointer;
                        flex: 1;
                      }
                      .button.clear {
                        background-color: #FF3B30;
                      }
                      .button.save {
                        background-color: #4CAF50;
                      }
                    `}
                    autoClear={false}
                    imageType="image/png"
                  />
                </View>
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
            >
              <View style={styles.assinaturaStepContainer}>
                <Text style={styles.assinaturaStepTitle}>
                  Capture sua selfie
                </Text>
                <Text style={styles.assinaturaStepDescription}>
                  Tire uma selfie para comprovar que você é o responsável pela
                  finalização deste checklist.
                </Text>

                {selfieSupervisorUri ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image
                      source={{ uri: selfieSupervisorUri }}
                      style={styles.assinaturaPreview}
                    />
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => setSelfieSupervisorUri(null)}
                    >
                      <Ionicons name="refresh" size={20} color="#fff" />
                      <Text style={styles.retakeButtonText}>Refazer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.continueButton, styles.finalizeButton]}
                      onPress={finalizarChecklistComAssinaturas}
                      disabled={enviando}
                    >
                      {enviando ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.continueButtonText}>
                            Finalizar Checklist
                          </Text>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#fff"
                          />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={capturarSelfieSupervisor}
                  >
                    <Ionicons name="camera" size={32} color="#fff" />
                    <Text style={styles.captureButtonText}>Tirar Selfie</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 152, 0, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  syncText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  savingIndicator: {
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  grupoContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  grupoTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  grupoDescricao: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  perguntaContainer: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  perguntaHeader: {
    marginBottom: 12,
  },
  perguntaTitulo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  obrigatorio: {
    color: "#f44336",
  },
  perguntaDescricao: {
    fontSize: 14,
    color: "#666",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fff",
    minHeight: 44,
  },
  booleanContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  booleanButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  booleanButtonSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e8f5ff",
  },
  booleanButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  booleanButtonTextSelected: {
    color: "#009ee2",
    fontWeight: "600",
  },
  selectContainer: {
    // gap substituído por marginBottom nos filhos
  },
  selectButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  selectButtonSelected: {
    borderColor: "#009ee2",
    backgroundColor: "#e8f5ff",
  },
  selectButtonText: {
    fontSize: 14,
    color: "#666",
  },
  selectButtonTextSelected: {
    color: "#009ee2",
    fontWeight: "600",
  },
  photoContainer: {
    // gap substituído por marginBottom nos filhos
  },
  photoPreview: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removePhotoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  photoButtons: {
    flexDirection: "row",
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#009ee2",
    backgroundColor: "#fff",
  },
  photoButtonText: {
    fontSize: 14,
    color: "#009ee2",
    fontWeight: "600",
    marginLeft: 8,
  },
  photoCount: {
    fontSize: 12,
    color: "#666",
    marginLeft: 12,
    alignSelf: "center",
    fontStyle: "italic",
  },
  naoConformeContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 8,
  },
  naoConformeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 8,
    marginTop: 8,
  },
  observacoesContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  observacoesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  observacoesInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  avaliacaoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  avaliacaoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  avaliacaoSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  avaliacaoButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  avaliacaoButton: {
    flex: 1,
    minWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "#fff",
  },
  avaliacaoButtonSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avaliacaoDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  avaliacaoButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  avaliacaoButtonTextSelected: {
    color: "#333",
    fontWeight: "600",
  },
  avaliacaoSelected: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  anexoFotoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  anexoFotoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  anexoFotoSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: "#009ee2",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  footerStepByStep: {
    gap: 8,
  },
  navButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#009ee2",
    backgroundColor: "#fff",
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#009ee2",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalContentFixed: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  modalContentContainer: {
    padding: 20,
  },
  assinaturaStepContainer: {
    alignItems: "center",
  },
  assinaturaStepTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  assinaturaStepDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  captureButton: {
    backgroundColor: "#009ee2",
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  captureButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  photoPreviewContainer: {
    width: "100%",
    alignItems: "center",
  },
  assinaturaPreview: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: "contain",
    backgroundColor: "#f5f5f5",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#666",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 150,
    justifyContent: "center",
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#009ee2",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 200,
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  finalizeButton: {
    backgroundColor: "#4CAF50",
  },
  signatureContainer: {
    width: "100%",
    height: 300,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  assinaturaActionsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
    marginTop: 20,
  },
});
