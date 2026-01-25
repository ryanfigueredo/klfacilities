export type UnidadeRow = {
  id: string; // id do mapeamento, se houver; ou `${unidadeId}-unlinked`
  unidadeId: string;
  unidadeNome: string;
  cidade: string | null; // Cidade onde a unidade está localizada
  estado: string | null; // Sigla do estado (ex: SP, RJ, MG)
  grupoId: string | null;
  grupoNome: string | null; // "Não vinculado" quando null
  responsavelId: string | null;
  responsavelNome: string | null; // "Não vinculado" quando null
  ativa: boolean;
  lat?: number | null; // latitude da unidade
  lng?: number | null; // longitude da unidade
  radiusM?: number | null; // raio em metros para geofence
  createdAt?: string;
  updatedAt?: string;
  // metadados de UI
  dupIndex: number; // posição do nome dentro do conjunto
  dupTotal: number; // total com o mesmo nome
};

export type ListUnidadesParams = {
  q?: string; // busca por nome (unidade/grupo/responsável/cidade/estado)
  grupoId?: string; // filtra por grupo
  responsavelId?: string; // filtra por responsável
  cidade?: string; // filtra por cidade
  estado?: string; // filtra por estado (sigla)
  includeUnlinked?: boolean; // incluir "Não vinculado" (default true)
  coordenadas?: 'todas' | 'com' | 'sem'; // filtra por presença de coordenadas
  status?: 'ativas' | 'inativas' | 'todas'; // da unidade
  sort?: 'unidade' | 'grupo' | 'responsavel' | 'cidade' | 'estado' | 'createdAt';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};
