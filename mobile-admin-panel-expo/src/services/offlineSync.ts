import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { API_URL, API_ENDPOINTS } from "../config/api";
import * as SecureStore from "expo-secure-store";
import { compressImageForUpload } from "../utils/compressImage";

const SYNC_QUEUE_KEY = "@kl_admin:sync_queue";
const DRAFT_PREFIX = "@kl_admin:draft:";
const ESCOPO_CACHE_PREFIX = "@kl_admin:escopo:";

export interface DraftData {
  escopoId: string;
  respostaId: string | null;
  formData: any; // Dados serializados do FormData
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingSyncs: number;
  isSyncing: boolean;
}

/**
 * Salvar rascunho localmente para sincronização offline
 */
export async function saveDraftLocally(
  escopoId: string,
  respostaId: string | null,
  draftData: any
): Promise<void> {
  try {
    const draftKey = `${DRAFT_PREFIX}${escopoId}_${respostaId || "new"}`;
    const draft: DraftData = {
      escopoId,
      respostaId,
      formData: draftData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await AsyncStorage.setItem(draftKey, JSON.stringify(draft));
    console.log("✅ Rascunho salvo localmente:", draftKey);

    // Adicionar à fila de sincronização
    await addToSyncQueue(escopoId, respostaId);
  } catch (error) {
    console.error("❌ Erro ao salvar rascunho localmente:", error);
    throw error;
  }
}

/**
 * Adicionar à fila de sincronização
 */
async function addToSyncQueue(
  escopoId: string,
  respostaId: string | null
): Promise<void> {
  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: string[] = queueJson ? JSON.parse(queueJson) : [];
    const itemKey = `${escopoId}_${respostaId || "new"}`;

    if (!queue.includes(itemKey)) {
      queue.push(itemKey);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      console.log("📋 Adicionado à fila de sincronização:", itemKey);
    }
  } catch (error) {
    console.error("❌ Erro ao adicionar à fila de sincronização:", error);
  }
}

/**
 * Salvar escopo em cache para uso offline
 */
export async function saveEscopoCache(
  escopoId: string,
  escopoData: any
): Promise<void> {
  try {
    const key = `${ESCOPO_CACHE_PREFIX}${escopoId}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      ...escopoData,
      _cachedAt: Date.now(),
    }));
    console.log("✅ Escopo em cache para offline:", escopoId);
  } catch (error) {
    console.error("❌ Erro ao salvar escopo em cache:", error);
  }
}

/**
 * Obter escopo do cache (para uso offline)
 */
export async function getEscopoCache(
  escopoId: string
): Promise<any | null> {
  try {
    const key = `${ESCOPO_CACHE_PREFIX}${escopoId}`;
    const json = await AsyncStorage.getItem(key);
    if (json) {
      const data = JSON.parse(json);
      delete data._cachedAt;
      return data;
    }
    return null;
  } catch (error) {
    console.error("❌ Erro ao obter escopo do cache:", error);
    return null;
  }
}

/**
 * Obter rascunhos locais para um escopo (para continuar offline)
 */
export async function getLocalDraftsForEscopo(
  escopoId: string
): Promise<DraftData[]> {
  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueJson) return [];
    const queue: string[] = JSON.parse(queueJson);
    const drafts: DraftData[] = [];
    for (const itemKey of queue) {
      if (itemKey.startsWith(`${escopoId}_`)) {
        const respostaId = itemKey === `${escopoId}_new` ? null : itemKey.replace(`${escopoId}_`, "");
        const draft = await getLocalDraft(escopoId, respostaId);
        if (draft) drafts.push(draft);
      }
    }
    return drafts;
  } catch (error) {
    console.error("❌ Erro ao obter rascunhos locais:", error);
    return [];
  }
}

/**
 * Obter rascunho salvo localmente
 */
export async function getLocalDraft(
  escopoId: string,
  respostaId: string | null
): Promise<DraftData | null> {
  try {
    const draftKey = `${DRAFT_PREFIX}${escopoId}_${respostaId || "new"}`;
    const draftJson = await AsyncStorage.getItem(draftKey);
    if (draftJson) {
      return JSON.parse(draftJson);
    }
    return null;
  } catch (error) {
    console.error("❌ Erro ao obter rascunho local:", error);
    return null;
  }
}

/**
 * Remover rascunho local após sincronização bem-sucedida
 */
async function removeLocalDraft(
  escopoId: string,
  respostaId: string | null
): Promise<void> {
  try {
    const draftKey = `${DRAFT_PREFIX}${escopoId}_${respostaId || "new"}`;
    await AsyncStorage.removeItem(draftKey);

    // Remover da fila de sincronização
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (queueJson) {
      const queue: string[] = JSON.parse(queueJson);
      const itemKey = `${escopoId}_${respostaId || "new"}`;
      const filteredQueue = queue.filter((key) => key !== itemKey);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredQueue));
    }
  } catch (error) {
    console.error("❌ Erro ao remover rascunho local:", error);
  }
}

/**
 * Sincronizar um rascunho específico com o servidor
 */
async function syncDraft(draft: DraftData): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync("authToken");
    if (!token) {
      console.warn("⚠️ Token não encontrado, não é possível sincronizar");
      return false;
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Reconstruir FormData a partir dos dados salvos
    const formData = new FormData();
    formData.append("escopoId", draft.escopoId);
    if (draft.respostaId) {
      formData.append("respostaId", draft.respostaId);
    }
    formData.append("isDraft", "true");
    formData.append("observacoes", draft.formData.observacoes || "");
    formData.append("answers", JSON.stringify(draft.formData.answers || []));

    if (draft.formData.lat && draft.formData.lng) {
      formData.append("lat", String(draft.formData.lat));
      formData.append("lng", String(draft.formData.lng));
      formData.append("accuracy", String(draft.formData.accuracy || 0));
    }

    // Adicionar fotos se houver (comprimidas para evitar 413)
    if (draft.formData.fotos) {
      const photoEntries: { formKey: string; uri: string; type: string; name: string }[] = [];
      for (const [key, value] of Object.entries(draft.formData.fotos)) {
        if (Array.isArray(value)) {
          value.forEach((foto: any, index: number) => {
            if (foto.uri && (foto.uri.startsWith("file://") || foto.uri.startsWith("content://") || foto.uri.startsWith("/"))) {
              const parts = key.split("_");
              let formKey: string;
              if (key.startsWith("foto_anexada_")) {
                const perguntaId = parts.slice(2).join("_");
                formKey = `foto_anexada_${perguntaId}_${index}`;
              } else {
                const perguntaId = parts.slice(1).join("_");
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
      const compressed = await Promise.all(
        photoEntries.map(async (e) => ({
          ...e,
          uri: (await compressImageForUpload(e.uri)).uri,
        }))
      );
      for (const e of compressed) {
        formData.append(e.formKey, { uri: e.uri, type: e.type, name: e.name } as any);
      }
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Rascunho sincronizado com sucesso:", draft.escopoId);

    // Remover rascunho local após sincronização bem-sucedida
    await removeLocalDraft(draft.escopoId, draft.respostaId);

    return true;
  } catch (error: any) {
    console.error("❌ Erro ao sincronizar rascunho:", error);
    
    // Incrementar contador de tentativas
    draft.retryCount += 1;
    const draftKey = `${DRAFT_PREFIX}${draft.escopoId}_${draft.respostaId || "new"}`;
    
    // Se exceder 5 tentativas, manter local mas não tentar mais automaticamente
    if (draft.retryCount < 5) {
      await AsyncStorage.setItem(draftKey, JSON.stringify(draft));
    } else {
      console.warn("⚠️ Rascunho excedeu limite de tentativas:", draftKey);
    }
    
    return false;
  }
}

/**
 * Sincronizar todos os rascunhos pendentes
 */
export async function syncAllPendingDrafts(): Promise<{
  success: number;
  failed: number;
}> {
  const status = await NetInfo.fetch();
  if (!status.isConnected) {
    console.log("📴 Sem conexão, não é possível sincronizar");
    return { success: 0, failed: 0 };
  }

  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueJson) {
      return { success: 0, failed: 0 };
    }

    const queue: string[] = JSON.parse(queueJson);
    if (queue.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 Iniciando sincronização de ${queue.length} rascunho(s)...`);

    let success = 0;
    let failed = 0;

    for (const itemKey of queue) {
      const [escopoId, respostaIdRaw] = itemKey.split("_");
      const respostaId = respostaIdRaw === "new" ? null : respostaIdRaw;

      const draft = await getLocalDraft(escopoId, respostaId);
      if (draft) {
        const synced = await syncDraft(draft);
        if (synced) {
          success++;
        } else {
          failed++;
        }
      }
    }

    console.log(`✅ Sincronização concluída: ${success} sucesso(s), ${failed} falha(s)`);
    return { success, failed };
  } catch (error) {
    console.error("❌ Erro ao sincronizar rascunhos pendentes:", error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Listar escopoIds com rascunhos locais (para exibir "Continuar rascunho" offline)
 */
export async function getLocalDraftEscopoIds(): Promise<string[]> {
  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueJson) return [];
    const queue: string[] = JSON.parse(queueJson);
    const escopoIds = new Set<string>();
    for (const itemKey of queue) {
      const idx = itemKey.indexOf("_");
      if (idx > 0) {
        escopoIds.add(itemKey.substring(0, idx));
      }
    }
    return Array.from(escopoIds);
  } catch (error) {
    console.error("❌ Erro ao listar rascunhos locais:", error);
    return [];
  }
}

/**
 * Obter status de sincronização
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const status = await NetInfo.fetch();
  const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  const queue: string[] = queueJson ? JSON.parse(queueJson) : [];

  return {
    isOnline: status.isConnected ?? false,
    pendingSyncs: queue.length,
    isSyncing: false, // Pode ser usado para indicar sincronização em andamento
  };
}

/**
 * Inicializar listener de conectividade para sincronização automática
 */
export function setupAutoSync(
  onStatusChange?: (status: SyncStatus) => void
): () => void {
  let isSyncing = false;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected ?? false;

    if (isOnline && !isSyncing) {
      isSyncing = true;
      syncAllPendingDrafts()
        .then((result) => {
          console.log("🔄 Auto-sincronização concluída:", result);
          if (onStatusChange) {
            getSyncStatus().then(onStatusChange);
          }
        })
        .catch((error) => {
          console.error("❌ Erro na auto-sincronização:", error);
        })
        .finally(() => {
          isSyncing = false;
        });
    }

    if (onStatusChange) {
      getSyncStatus().then(onStatusChange);
    }
  });

  return unsubscribe;
}
