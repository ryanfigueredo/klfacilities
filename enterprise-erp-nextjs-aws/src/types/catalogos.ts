export type Grupo = { id: string; nome: string; ativo?: boolean };
export type Unidade = {
  id: string;
  nome: string;
  grupoId?: string;
  ativa?: boolean;
};
export type Responsavel = { id: string; nome: string; ativo?: boolean };
export type CategoriaSimples = { id: string; nome: string };

export type CatalogosResponse = {
  grupos: Grupo[];
  unidades: Unidade[];
  responsaveis: Responsavel[];
  categorias: CategoriaSimples[];
};
