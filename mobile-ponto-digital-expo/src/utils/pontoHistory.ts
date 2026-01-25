import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@ponto_history';

export interface PontoRegistrado {
  tipo: string;
  timestamp: string;
  data: string; // YYYY-MM-DD para agrupar por dia
}

/**
 * Salvar ponto registrado no histórico local
 */
export async function salvarPontoRegistrado(tipo: string): Promise<void> {
  try {
    const historico = await obterHistorico();
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const novoPonto: PontoRegistrado = {
      tipo,
      timestamp: new Date().toISOString(),
      data: hoje,
    };
    
    historico.push(novoPonto);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(historico));
  } catch (error) {
    console.error('Erro ao salvar histórico de ponto:', error);
  }
}

/**
 * Obter histórico de pontos registrados
 */
export async function obterHistorico(): Promise<PontoRegistrado[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    
    const historico: PontoRegistrado[] = JSON.parse(data);
    return historico;
  } catch (error) {
    console.error('Erro ao obter histórico:', error);
    return [];
  }
}

/**
 * Obter pontos registrados hoje
 */
export async function obterPontosHoje(): Promise<PontoRegistrado[]> {
  const historico = await obterHistorico();
  const hoje = new Date().toISOString().split('T')[0];
  
  return historico.filter(p => p.data === hoje);
}

/**
 * Verificar se um tipo de ponto já foi registrado hoje
 */
export async function jaRegistradoHoje(tipo: string): Promise<boolean> {
  const pontosHoje = await obterPontosHoje();
  return pontosHoje.some(p => p.tipo === tipo);
}

/**
 * Obter último tipo de ponto registrado hoje
 */
export async function obterUltimoPontoHoje(): Promise<string | null> {
  const pontosHoje = await obterPontosHoje();
  if (pontosHoje.length === 0) return null;
  
  // Ordenar por timestamp (mais recente primeiro)
  pontosHoje.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return pontosHoje[0].tipo;
}

/**
 * Limpar histórico local (útil quando trocar de CPF)
 */
export async function limparHistoricoLocal(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Erro ao limpar histórico local:', error);
  }
}

