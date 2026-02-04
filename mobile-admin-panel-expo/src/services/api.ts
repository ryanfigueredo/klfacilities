import axios from "axios";
import { Platform } from "react-native";
import { API_ENDPOINTS, API_URL } from "../config/api";
import * as SecureStore from "expo-secure-store";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Interceptor para debug (apenas em desenvolvimento)
if (__DEV__) {
  api.interceptors.request.use(
    (config) => {
      if (config.url?.startsWith("http")) {
        config.url = config.url.replace(config.baseURL || "", "");
      }
      console.log("📤 Request:", {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        data: config.data,
      });
      return config;
    },
    (error) => {
      console.error("❌ Request Error:", error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log("✅ Response:", {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
      return response;
    },
    (error) => {
      console.error("❌ Response Error:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      return Promise.reject(error);
    }
  );
}

export type UserRole =
  | "MASTER"
  | "ADMIN"
  | "SUPERVISOR"
  | "RH"
  | "OPERACIONAL"
  | "GESTOR"
  | "JURIDICO"
  | "FINANCEIRO"
  | "USER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string; // Token JWT para autenticação
}

export interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  unidade: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
  };
  grupo: {
    id: string;
    nome: string;
  };
}

export interface HistoricoResponse {
  success: boolean;
  funcionario: {
    nome: string;
    cpf: string | null;
  };
  month: string; // "YYYY-MM"
  table: Array<{
    dia: number;
    semana: string;
    entrada?: string;
    saida?: string;
    intervaloInicio?: string;
    intervaloFim?: string;
    totalHoras?: string;
    totalMinutos: number;
  }>;
}

export interface FuncionariosResponse {
  success: boolean;
  funcionarios: Funcionario[];
}

// Tipos para Folhas de Ponto
export interface FolhaPontoFuncionario {
  id: string;
  nome: string;
  cpf: string | null;
  unidadeId: string | null;
  unidadeNome: string | null;
  grupoId: string | null;
  grupoNome: string | null;
  batidas?: {
    total: number;
    entrada: number;
    saida: number;
    intervaloInicio: number;
    intervaloFim: number;
  };
}

export interface FolhasPontoResponse {
  funcionarios: FolhaPontoFuncionario[];
  unidades: Array<{ id: string; nome: string }>;
  grupos: Array<{ id: string; nome: string }>;
  month: string;
}

// Tipos para Checklists
export interface ChecklistEscopo {
  id: string;
  ativo: boolean;
  ultimoEnvioEm: string | null;
  template: {
    id: string;
    titulo: string;
    descricao: string | null;
  };
  unidade: {
    id: string;
    nome: string;
  } | null;
  grupo: {
    id: string;
    nome: string;
  } | null;
  respostasRecentes: Array<{
    id: string;
    status: string;
    createdAt: string;
    supervisorId: string;
  }>;
}

export interface ChecklistsPendentesResponse {
  escopos: ChecklistEscopo[];
}

export interface ChecklistEscopoDetalhes {
  escopo: {
    id: string;
    ativo: boolean;
    template: {
      id: string;
      titulo: string;
      descricao: string | null;
      grupos: Array<{
        id: string;
        titulo: string;
        descricao: string | null;
        ordem: number;
        perguntas: Array<{
          id: string;
          titulo: string;
          descricao: string | null;
          tipo: string;
          obrigatoria: boolean;
          ordem: number;
          opcoes: string[];
          peso?: number | null;
          permiteMultiplasFotos?: boolean;
          permiteAnexarFoto?: boolean;
        }>;
      }>;
    };
    unidade: {
      id: string;
      nome: string;
    } | null;
    grupo: {
      id: string;
      nome: string;
    } | null;
  };
}

/**
 * Autenticar usuário por email e senha
 */
export async function authByEmailPassword(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH_ADMIN, {
    email: email.toLowerCase().trim(),
    password,
  });

  return response.data;
}

/**
 * Solicitar reset de senha
 */
export async function forgotPassword(
  email: string
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    API_ENDPOINTS.FORGOT_PASSWORD,
    {
      email: email.toLowerCase().trim(),
    }
  );

  return response.data;
}

/**
 * Buscar lista de funcionários (para administradores/supervisores)
 */
export async function obterFuncionarios(): Promise<FuncionariosResponse> {
  const response = await api.get<FuncionariosResponse>(
    API_ENDPOINTS.PONTOS_FUNCIONARIOS
  );
  return response.data;
}

/**
 * Buscar histórico mensal de pontos de um funcionário
 */
export async function obterHistoricoMensal(
  cpf: string,
  month?: string // formato "YYYY-MM", se não fornecido usa mês atual
): Promise<HistoricoResponse> {
  const cpfClean = cpf.replace(/\D/g, "");

  const response = await api.post<HistoricoResponse>(
    API_ENDPOINTS.PONTOS_HISTORICO,
    {
      cpf: cpfClean,
      month,
    }
  );

  return response.data;
}

/**
 * Buscar folhas de ponto (para supervisor)
 */
export async function obterFolhasPonto(
  unidadeId?: string,
  month?: string
): Promise<FolhasPontoResponse> {
  const params = new URLSearchParams();
  if (unidadeId) params.append("unidadeId", unidadeId);
  if (month) params.append("month", month);

  const response = await api.get<FolhasPontoResponse>(
    `${API_ENDPOINTS.PONTO_SUPERVISOR_FOLHAS}?${params.toString()}`
  );
  return response.data;
}

/**
 * Buscar checklists pendentes (para supervisor)
 */
export async function obterChecklistsPendentes(): Promise<ChecklistsPendentesResponse> {
  const response = await api.get<ChecklistsPendentesResponse>(
    API_ENDPOINTS.CHECKLISTS_PENDENTES
  );
  return response.data;
}

/**
 * Buscar detalhes de um escopo de checklist
 */
export async function obterChecklistEscopo(
  escopoId: string
): Promise<ChecklistEscopoDetalhes> {
  const response = await api.get<ChecklistEscopoDetalhes>(
    `${API_ENDPOINTS.CHECKLISTS_ESCOPO}/${escopoId}`
  );
  return response.data;
}

/**
 * Buscar checklists em aberto (rascunhos)
 */
export async function obterChecklistsEmAberto(): Promise<{
  respostas: Array<{
    id: string;
    status: string;
    template: { id: string; titulo: string };
    unidade: { id: string; nome: string };
    grupo: { id: string; nome: string } | null;
    createdAt: string;
    updatedAt: string;
  }>;
}> {
  const response = await api.get(API_ENDPOINTS.CHECKLISTS_EM_ABERTO);
  return response.data;
}

/**
 * Buscar checklists respondidos (concluídos)
 */
export async function obterChecklistsRespondidos(): Promise<{
  respostas: Array<{
    id: string;
    status: string;
    template: {
      id: string;
      titulo: string;
      descricao: string | null;
    };
    unidade: {
      id: string;
      nome: string;
    };
    grupo: {
      id: string;
      nome: string;
    } | null;
    supervisor: {
      id: string;
      name: string;
      email: string;
    };
    protocolo: string | null;
    submittedAt: string;
    createdAt: string;
    updatedAt: string;
    escopoId: string;
    confirmacoes: Array<{
      id: string;
      confirmado: boolean;
      confirmadoEm: string | null;
      clienteFinal: {
        id: string;
        nome: string;
        email: string;
      } | null;
    }>;
  }>;
}> {
  const response = await api.get(API_ENDPOINTS.CHECKLISTS_RESPONDIDOS);
  return response.data;
}

export type ChecklistRespostaItem = {
  id: string;
  perguntaId: string;
  valorTexto: string | null;
  valorBoolean: boolean | null;
  valorNumero: number | null;
  valorOpcao: string | null;
  fotoUrl: string | null;
  observacao: string | null;
  nota: number | null;
  pergunta: { id: string; titulo: string; tipo: string };
};

export interface ChecklistRespondidoDetalhes {
  resposta: {
    id: string;
    status: string;
    observacoes: string | null;
    protocolo: string | null;
    assinaturaFotoUrl: string | null;
    submittedAt: string | null;
    template: { id: string; titulo: string; descricao: string | null };
    unidade: { id: string; nome: string };
    grupo: { id: string; nome: string } | null;
    supervisor: { id: string; name: string; email: string };
  };
  template: {
    id: string;
    titulo: string;
    grupos: Array<{
      id: string;
      titulo: string;
      descricao: string | null;
      ordem: number;
      perguntas: Array<{
        id: string;
        titulo: string;
        descricao: string | null;
        tipo: string;
        ordem: number;
      }>;
    }>;
  };
  respostas: ChecklistRespostaItem[];
}

/**
 * Buscar detalhes de um checklist respondido (para visualização)
 */
export async function obterChecklistRespondidoDetalhes(
  respostaId: string
): Promise<ChecklistRespondidoDetalhes> {
  const response = await api.get<ChecklistRespondidoDetalhes>(
    `${API_ENDPOINTS.CHECKLISTS_RESPOSTA_DETALHE}/${respostaId}`
  );
  return response.data;
}

/**
 * Buscar opções para criar novo checklist (grupos, unidades, templates).
 * Quando o backend envia allowedUnidadeIds (supervisor), o app usa só essas unidades.
 */
export async function obterChecklistsOptions(): Promise<{
  grupos: Array<{
    id: string;
    nome: string;
    ativo: boolean;
  }>;
  unidades: Array<{
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
    grupos: Array<{
      id: string | null;
      nome: string | null;
    }>;
  }>;
  templates: Array<{
    id: string;
    titulo: string;
    descricao: string | null;
    escopos: Array<{
      id: string;
      unidadeId: string;
      ativo: boolean;
    }>;
  }>;
  allowedUnidadeIds?: string[];
}> {
  await initializeAuth();
  const response = await api.get(API_ENDPOINTS.CHECKLISTS_OPTIONS);
  return response.data;
}

/**
 * Buscar registros de ponto detalhados com IDs (para edição)
 */
export async function obterRegistrosDetalhados(
  funcionarioId: string,
  month: string
): Promise<{
  ok: boolean;
  data: Array<{
    id: string;
    funcionarioId: string;
    unidadeId: string;
    tipo: string;
    timestamp: string;
    observacao?: string | null;
    criadoPorId?: string | null;
  }>;
}> {
  const response = await api.get(API_ENDPOINTS.PONTO_REGISTROS, {
    params: { funcionarioId, month },
  });
  return response.data;
}

/**
 * Editar ponto manualmente
 */
export async function editarPonto(
  registroPontoId: string,
  timestamp: string
): Promise<{ sucesso: boolean; registro: any }> {
  const response = await api.patch(API_ENDPOINTS.PONTO_SUPERVISOR_EDITAR, {
    registroPontoId,
    timestamp,
  });
  return response.data;
}

/**
 * Adicionar ponto manualmente
 */
export async function adicionarPonto(
  funcionarioId: string,
  tipo: string,
  timestamp: string,
  observacao: string
): Promise<{ sucesso: boolean; registro: any }> {
  const response = await api.post(API_ENDPOINTS.PONTO_SUPERVISOR_ADICIONAR, {
    funcionarioId,
    tipo,
    timestamp,
    observacao,
  });
  return response.data;
}

/**
 * Exportar folha de ponto de um funcionário (PDF)
 */
export async function exportarFolhaFuncionarioPDF(
  funcionarioId: string,
  month?: string
): Promise<ArrayBuffer> {
  const params = new URLSearchParams();
  params.append("funcionarioId", funcionarioId);
  if (month) params.append("month", month);
  params.append("formato", "pdf");

  const response = await api.get<ArrayBuffer>(
    `${API_ENDPOINTS.PONTO_FOLHA}?${params.toString()}`,
    {
      responseType: "arraybuffer",
    }
  );
  return response.data;
}

/**
 * Exportar folhas de ponto de uma unidade (PDF) filtrada por grupo
 */
export async function exportarFolhasUnidadePDF(
  grupoId: string,
  unidadeId: string,
  month?: string
): Promise<ArrayBuffer> {
  const params = new URLSearchParams();
  params.append("grupoId", grupoId);
  params.append("unidadeId", unidadeId);
  if (month) params.append("month", month);

  const response = await api.get<ArrayBuffer>(
    `${API_ENDPOINTS.PONTO_FOLHAS_GRUPO_PDF}?${params.toString()}`,
    {
      responseType: "arraybuffer",
    }
  );
  return response.data;
}

/**
 * Excluir ponto
 */
export async function excluirPonto(
  registroPontoId: string
): Promise<{ sucesso: boolean }> {
  const response = await api.delete(
    `${API_ENDPOINTS.PONTO_SUPERVISOR_EDITAR}?id=${registroPontoId}`
  );
  return response.data;
}

/**
 * Função auxiliar para adicionar token de autenticação
 */
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

/**
 * Carregar token salvo do SecureStore e configurar automaticamente
 */
export async function initializeAuth() {
  try {
    const token = await SecureStore.getItemAsync("authToken");
    if (token) {
      setAuthToken(token);
      if (__DEV__) {
        console.log("✅ Token carregado do SecureStore");
      }
      return token;
    }
  } catch (error: any) {
    // No iOS, Keychain pode falhar no primeiro acesso ou se não tiver permissões
    // Não quebrar o app, apenas retornar null e deixar usuário fazer login
    if (__DEV__) {
      console.error("Erro ao carregar token:", error);
      console.error("Platform:", Platform.OS);
    }

    // Em iOS, ignorar erro do Keychain e continuar (usuário fará login)
    // Em Android, também ignorar para não quebrar o app
    // O erro mais comum é Keychain não disponível no primeiro launch
    return null;
  }
  return null;
}

/**
 * Obter usuário atual com token salvo
 */
export async function obterUsuarioAtual(): Promise<User | null> {
  try {
    // No iOS, SecureStore pode falhar silenciosamente
    // Adicionar tratamento específico
    let token: string | null = null;
    try {
      token = await SecureStore.getItemAsync("authToken");
    } catch (secureStoreError: any) {
      // No iOS, Keychain pode não estar disponível
      if (__DEV__) {
        console.warn("SecureStore não disponível:", secureStoreError);
      }
      return null;
    }

    if (!token) {
      return null;
    }

    setAuthToken(token);
    const response = await api.get<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>(API_ENDPOINTS.ME);

    return {
      id: response.data.id,
      name: response.data.name,
      email: response.data.email,
      role: response.data.role as UserRole,
    };
  } catch (error: any) {
    // Log apenas em desenvolvimento
    if (__DEV__) {
      console.error("Erro ao obter usuário atual:", error);
      console.error("Platform:", Platform.OS);
    }
    // Se o token for inválido, remover (silenciosamente)
    try {
      await SecureStore.deleteItemAsync("authToken");
    } catch (deleteError) {
      // Ignorar erro ao deletar (comum no iOS se Keychain não estiver disponível)
    }
    setAuthToken(null);
    return null;
  }
}

// Tipos para Incidentes
export interface Incidente {
  id: string;
  titulo: string;
  descricao: string;
  status: "ABERTO" | "CONCLUIDO";
  grupoId: string;
  unidadeId: string;
  imagemUrl: string | null;
  conclusaoNotas: string | null;
  concluidoEm: string | null;
  createdAt: string;
  grupo: {
    id: string;
    nome: string;
  };
  unidade: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
  };
  criadoPor: {
    id: string;
    name: string;
    email: string;
  } | null;
  concluidoPor: {
    id: string;
    name: string;
  } | null;
  categoriaUrgencia: {
    id: string;
    urgenciaNivel: string;
    nome: string;
    prazoHoras: number | null;
    descricao: string | null;
  } | null;
}

export interface IncidentesResponse {
  incidentes: Incidente[];
}

// Tipos para Avaliações
export interface Avaliacao {
  id: string;
  tipo: "LIMPEZA" | "INSUMOS" | "SATISFACAO";
  servicosLimpeza: string[] | null;
  insumosSolicitados: string[] | null;
  avaliacaoLimpeza: string | null;
  fatoresInfluencia: string[] | null;
  comentarios: string | null;
  timestamp: string;
  unidade: {
    id: string;
    nome: string;
  };
  ticket: {
    id: string;
    status: "PENDENTE" | "CONCLUIDO" | "CANCELADO";
    concluidoEm: string | null;
    concluidoPor: string | null;
  } | null;
}

export interface AvaliacoesResponse {
  success: boolean;
  data: {
    checklists: Avaliacao[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Buscar incidentes
 */
export async function obterIncidentes(params?: {
  status?: string;
  grupoId?: string;
  unidadeId?: string;
  q?: string;
}): Promise<IncidentesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.grupoId) queryParams.append("grupoId", params.grupoId);
  if (params?.unidadeId) queryParams.append("unidadeId", params.unidadeId);
  if (params?.q) queryParams.append("q", params.q);

  const url =
    queryParams.toString().length > 0
      ? `${API_ENDPOINTS.INCIDENTES}?${queryParams.toString()}`
      : API_ENDPOINTS.INCIDENTES;

  const response = await api.get<IncidentesResponse>(url);
  return response.data;
}

/**
 * Buscar avaliações (checklists digitais)
 */
export async function obterAvaliacoes(params?: {
  tipo?: string;
  status?: string;
  unidadeId?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<AvaliacoesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.tipo) queryParams.append("tipo", params.tipo);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.unidadeId) queryParams.append("unidadeId", params.unidadeId);
  if (params?.dataInicio) queryParams.append("dataInicio", params.dataInicio);
  if (params?.dataFim) queryParams.append("dataFim", params.dataFim);

  const url =
    queryParams.toString().length > 0
      ? `${API_ENDPOINTS.AVALIACOES}?${queryParams.toString()}`
      : API_ENDPOINTS.AVALIACOES;

  const response = await api.get<AvaliacoesResponse>(url);
  return response.data;
}

// Inicializar token automaticamente quando o módulo é carregado
// Removido: pode causar problemas em produção. Inicialização deve ser feita explicitamente no App.tsx
// initializeAuth().catch(console.error);
