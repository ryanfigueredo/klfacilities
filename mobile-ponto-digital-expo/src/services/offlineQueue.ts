import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { registrarPonto } from './api';

const QUEUE_KEY = '@ponto_queue';
const SYNC_INTERVAL = 5000; // 5 segundos

export interface PontoOffline {
  id: string;
  cpf: string;
  tipo: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  selfieUri: string;
  deviceId: string;
  timestamp: string;
  tentativas: number;
}

/**
 * Adicionar ponto à fila offline
 */
export async function adicionarPontoOffline(
  cpf: string,
  tipo: string,
  lat: number,
  lng: number,
  accuracy: number | null,
  selfieUri: string,
  deviceId: string
): Promise<string> {
  const ponto: PontoOffline = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cpf,
    tipo,
    lat,
    lng,
    accuracy,
    selfieUri,
    deviceId,
    timestamp: new Date().toISOString(),
    tentativas: 0,
  };

  const fila = await obterFila();
  fila.push(ponto);
  await salvarFila(fila);

  console.log(`[offlineQueue] ✅ Ponto salvo offline: ${ponto.id} (${ponto.tipo})`);

  // Tentar sincronizar imediatamente (sem await para não bloquear)
  sincronizarFila().catch(error => {
    console.error('[offlineQueue] Erro ao tentar sincronizar imediatamente:', error);
  });

  return ponto.id;
}

/**
 * Obter fila de pontos offline
 */
export async function obterFila(): Promise<PontoOffline[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao obter fila:', error);
    return [];
  }
}

/**
 * Salvar fila de pontos offline
 */
async function salvarFila(fila: PontoOffline[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(fila));
  } catch (error) {
    console.error('Erro ao salvar fila:', error);
  }
}

/**
 * Remover ponto da fila após sincronização bem-sucedida
 */
async function removerPontoDaFila(id: string): Promise<void> {
  const fila = await obterFila();
  const novaFila = fila.filter(p => p.id !== id);
  await salvarFila(novaFila);
}

/**
 * Verificar se há internet
 */
export async function temInternet(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

/**
 * Sincronizar fila de pontos offline
 */
export async function sincronizarFila(): Promise<{
  sincronizados: number;
  falhas: number;
}> {
  const temNet = await temInternet();
  if (!temNet) {
    console.log('[offlineQueue] ⚠️ Sem internet, não sincronizando');
    return { sincronizados: 0, falhas: 0 };
  }

  const fila = await obterFila();
  if (fila.length === 0) {
    return { sincronizados: 0, falhas: 0 };
  }

  console.log(`[offlineQueue] 🔄 Iniciando sincronização de ${fila.length} ponto(s) pendente(s)`);

  let sincronizados = 0;
  let falhas = 0;

  for (const ponto of fila) {
    // Limitar tentativas (máximo 5)
    if (ponto.tentativas >= 5) {
      console.warn(`[offlineQueue] ⚠️ Ponto ${ponto.id} excedeu tentativas (${ponto.tentativas}), removendo da fila`);
      await removerPontoDaFila(ponto.id);
      falhas++;
      continue;
    }

    try {
      // Verificar se o arquivo da selfie ainda existe
      const fileInfo = await FileSystem.getInfoAsync(ponto.selfieUri);
      if (!fileInfo.exists) {
        console.error(`[offlineQueue] ❌ Arquivo da selfie não existe mais: ${ponto.selfieUri}`);
        // Incrementar tentativas para que seja removido após 5 tentativas
        const filaAtual = await obterFila();
        const pontoIndex = filaAtual.findIndex(p => p.id === ponto.id);
        if (pontoIndex !== -1) {
          filaAtual[pontoIndex].tentativas = 5; // Marcar para remoção
          await salvarFila(filaAtual);
        }
        falhas++;
        continue;
      }

      console.log(`[offlineQueue] 📤 Enviando ponto ${ponto.id} (${ponto.tipo}) - Tentativa ${ponto.tentativas + 1}/5`);

      await registrarPonto(
        ponto.cpf,
        ponto.tipo,
        ponto.lat,
        ponto.lng,
        ponto.accuracy,
        ponto.selfieUri,
        ponto.deviceId
      );

      // Sucesso - remover da fila
      await removerPontoDaFila(ponto.id);
      sincronizados++;
      console.log(`[offlineQueue] ✅ Ponto ${ponto.id} sincronizado com sucesso`);
    } catch (error: any) {
      console.error(`[offlineQueue] ❌ Erro ao sincronizar ponto ${ponto.id}:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        tipo: ponto.tipo,
        tentativas: ponto.tentativas + 1,
      });
      
      // Incrementar tentativas
      const filaAtual = await obterFila();
      const pontoIndex = filaAtual.findIndex(p => p.id === ponto.id);
      if (pontoIndex !== -1) {
        filaAtual[pontoIndex].tentativas++;
        await salvarFila(filaAtual);
        console.log(`[offlineQueue] 📝 Tentativas do ponto ${ponto.id} atualizadas para ${filaAtual[pontoIndex].tentativas}`);
      }
      
      falhas++;
    }
  }

  if (sincronizados > 0 || falhas > 0) {
    console.log(`[offlineQueue] 📊 Sincronização concluída: ${sincronizados} sincronizado(s), ${falhas} falha(s)`);
  }

  return { sincronizados, falhas };
}

/**
 * Iniciar monitoramento de sincronização automática
 */
export function iniciarSincronizacaoAutomatica(
  onSync?: (resultado: { sincronizados: number; falhas: number }) => void
): () => void {
  let intervalo: NodeJS.Timeout | null = null;

  // Sincronizar imediatamente
  sincronizarFila().then(onSync);

  // Sincronizar a cada X segundos
  intervalo = setInterval(async () => {
    const resultado = await sincronizarFila();
    if (onSync) {
      onSync(resultado);
    }
  }, SYNC_INTERVAL);

  // Monitorar mudanças de conexão
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      console.log('[offlineQueue] 🌐 Internet detectada, iniciando sincronização...');
      // Internet voltou - sincronizar imediatamente
      sincronizarFila()
        .then(onSync)
        .catch(error => {
          console.error('[offlineQueue] Erro ao sincronizar após conexão restaurada:', error);
        });
    }
  });

  // Retornar função para parar o monitoramento
  return () => {
    if (intervalo) {
      clearInterval(intervalo);
    }
    unsubscribe();
  };
}

/**
 * Obter quantidade de pontos pendentes
 */
export async function obterQuantidadePendentes(): Promise<number> {
  const fila = await obterFila();
  return fila.length;
}

