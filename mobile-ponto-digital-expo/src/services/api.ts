import axios from "axios";
import { API_ENDPOINTS, API_URL } from "../config/api";

const api = axios.create({
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
      // Corrigir URL se estiver duplicada
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

export interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  unidade: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
    lat: number | null;
    lng: number | null;
    radiusM: number | null;
  };
  grupo: {
    id: string;
    nome: string;
  };
}

export interface AuthResponse {
  success: boolean;
  funcionario: Funcionario;
}

export interface PontoResponse {
  success: boolean;
  registro: {
    id: string;
    tipo: string;
    timestamp: string;
    unidade: {
      nome: string;
    };
  };
}

export interface PontosHojeResponse {
  success: boolean;
  pontos: string[]; // Array de tipos de ponto já registrados hoje (ex: ['ENTRADA', 'SAIDA'])
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

/**
 * Autenticar funcionário por CPF
 */
export async function authByCPF(cpf: string): Promise<AuthResponse> {
  const cpfClean = cpf.replace(/\D/g, "");

  const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH, {
    cpf: cpfClean,
  });

  // Converter coordenadas de string para número (se vierem como string da API)
  if (response.data.funcionario?.unidade) {
    const unidade = response.data.funcionario.unidade;
    if (typeof unidade.lat === "string") {
      unidade.lat = parseFloat(unidade.lat);
    }
    if (typeof unidade.lng === "string") {
      unidade.lng = parseFloat(unidade.lng);
    }
    if (typeof unidade.radiusM === "string") {
      unidade.radiusM = parseFloat(unidade.radiusM);
    }
    // Garantir que null seja null, não NaN
    if (isNaN(unidade.lat!)) unidade.lat = null;
    if (isNaN(unidade.lng!)) unidade.lng = null;
    if (isNaN(unidade.radiusM!)) unidade.radiusM = null;

    // Log detalhado das coordenadas recebidas (apenas em desenvolvimento)
    if (__DEV__) {
      console.log("📍 Dados da Unidade recebidos da API:", {
        nome: unidade.nome,
        lat: unidade.lat,
        lng: unidade.lng,
        radiusM: unidade.radiusM,
        tipoLat: typeof unidade.lat,
        tipoLng: typeof unidade.lng,
        tipoRadius: typeof unidade.radiusM,
      });
    }
  }

  return response.data;
}

/**
 * Registrar ponto
 */
export async function registrarPonto(
  cpf: string,
  tipo: string,
  lat: number,
  lng: number,
  accuracy: number | null,
  selfieUri: string,
  deviceId: string
): Promise<PontoResponse> {
  const cpfClean = cpf.replace(/\D/g, "");

  // FormData para React Native
  const formData = new FormData();
  formData.append("cpf", cpfClean);
  formData.append("tipo", tipo);
  formData.append("lat", lat.toString());
  formData.append("lng", lng.toString());
  if (accuracy) {
    formData.append("accuracy", accuracy.toString());
  }
  formData.append("deviceId", deviceId);

  // Adicionar selfie como arquivo (React Native FormData)
  const filename = selfieUri.split("/").pop() || "selfie.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append("selfie", {
    uri: selfieUri,
    type: type,
    name: filename,
  } as any);

  const response = await api.post<PontoResponse>(
    API_ENDPOINTS.PONTO,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      transformRequest: (data) => {
        return data; // Axios já faz o transform correto para FormData
      },
    }
  );

  return response.data;
}

/**
 * Buscar pontos já registrados hoje para um CPF
 */
export async function obterPontosRegistradosHoje(
  cpf: string
): Promise<string[]> {
  const cpfClean = cpf.replace(/\D/g, "");

  try {
    const response = await api.post<PontosHojeResponse>(
      API_ENDPOINTS.PONTOS_HOJE,
      {
        cpf: cpfClean,
      }
    );

    if (response.data.success && response.data.pontos) {
      return response.data.pontos;
    }

    return [];
  } catch (error: any) {
    console.error("Erro ao buscar pontos registrados hoje:", error);
    // Se der erro, retorna array vazio (não bloqueia o uso do app)
    return [];
  }
}

/**
 * Buscar histórico mensal de pontos para um CPF
 */
export async function obterHistoricoMensal(
  cpf: string,
  month?: string // formato "YYYY-MM", se não fornecido usa mês atual
): Promise<HistoricoResponse> {
  const cpfClean = cpf.replace(/\D/g, "");

  const response = await api.post<HistoricoResponse>(API_ENDPOINTS.HISTORICO, {
    cpf: cpfClean,
    month,
  });

  return response.data;
}

export interface ManifestacaoRequest {
  tipo: "ELOGIO" | "SUGESTAO" | "DENUNCIA";
  mensagem: string;
  funcionarioNome?: string;
  funcionarioCpf?: string;
  grupoId?: string;
  unidadeId?: string;
}

export interface ManifestacaoResponse {
  ok: boolean;
  manifestacao: {
    id: string;
  };
}

/**
 * Criar manifestação (elogio, sugestão ou denúncia)
 */
export async function criarManifestacao(
  data: ManifestacaoRequest
): Promise<ManifestacaoResponse> {
  const payload: ManifestacaoRequest = {
    ...data,
    funcionarioCpf: data.funcionarioCpf
      ? data.funcionarioCpf.replace(/\D/g, "")
      : undefined,
  };

  const response = await api.post<ManifestacaoResponse>(
    API_ENDPOINTS.MANIFESTACOES,
    payload
  );

  return response.data;
}
