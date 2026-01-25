import type { Prisma } from '@prisma/client';

export const templateFullInclude = {
  grupos: {
    orderBy: { ordem: 'asc' },
    include: {
      perguntas: {
        orderBy: { ordem: 'asc' },
      },
    },
  },
  escopos: {
    orderBy: { createdAt: 'asc' },
    include: {
      unidade: {
        select: {
          id: true,
          nome: true,
        },
      },
      grupo: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  },
  _count: {
    select: {
      escopos: true,
      respostas: true,
    },
  },
} satisfies Prisma.ChecklistTemplateInclude;

export type ChecklistTemplateWithRelations = Prisma.ChecklistTemplateGetPayload<{
  include: typeof templateFullInclude;
}>;

export function serializeTemplate(template: ChecklistTemplateWithRelations) {
  return {
    id: template.id,
    titulo: template.titulo,
    descricao: template.descricao,
    ativo: template.ativo,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    grupos: template.grupos.map(grupo => ({
      id: grupo.id,
      titulo: grupo.titulo,
      descricao: grupo.descricao,
      ordem: grupo.ordem,
      perguntas: grupo.perguntas.map(pergunta => ({
        id: pergunta.id,
        titulo: pergunta.titulo,
        descricao: pergunta.descricao,
        tipo: pergunta.tipo,
        obrigatoria: pergunta.obrigatoria,
        ordem: pergunta.ordem,
        instrucoes: pergunta.instrucoes,
        opcoes: pergunta.opcoes,
        peso: pergunta.peso,
        permiteMultiplasFotos: pergunta.permiteMultiplasFotos,
        permiteAnexarFoto: pergunta.permiteAnexarFoto,
      })),
    })),
    escopos: template.escopos.map(escopo => ({
      id: escopo.id,
      unidade: escopo.unidade
        ? {
            id: escopo.unidade.id,
            nome: escopo.unidade.nome,
          }
        : null,
      grupo: escopo.grupo
        ? {
            id: escopo.grupo.id,
            nome: escopo.grupo.nome,
          }
        : null,
      ativo: escopo.ativo,
      ultimoEnvioEm: escopo.ultimoEnvioEm,
      ultimoSupervisorId: escopo.ultimoSupervisorId,
      createdAt: escopo.createdAt,
      updatedAt: escopo.updatedAt,
    })),
    stats: {
      escopos: template._count.escopos,
      respostas: template._count.respostas,
    },
  };
}

export const escopoListSelect = {
  id: true,
  templateId: true,
  unidadeId: true,
  grupoId: true,
  ativo: true,
  ultimoEnvioEm: true,
  ultimoSupervisorId: true,
  createdAt: true,
  updatedAt: true,
  template: {
    select: {
      id: true,
      titulo: true,
      descricao: true,
    },
  },
  unidade: {
    select: {
      id: true,
      nome: true,
    },
  },
  grupo: {
    select: {
      id: true,
      nome: true,
    },
  },
} satisfies Prisma.ChecklistEscopoSelect;

export type ChecklistEscopoWithTemplate = Prisma.ChecklistEscopoGetPayload<{
  select: typeof escopoListSelect;
}>;

export function serializeEscopo(escopo: ChecklistEscopoWithTemplate) {
  return {
    id: escopo.id,
    ativo: escopo.ativo,
    ultimoEnvioEm: escopo.ultimoEnvioEm,
    ultimoSupervisorId: escopo.ultimoSupervisorId,
    createdAt: escopo.createdAt,
    updatedAt: escopo.updatedAt,
    template: escopo.template,
    unidade: escopo.unidade,
    grupo: escopo.grupo,
  };
}

export const respostaListSelect = {
  id: true,
  templateId: true,
  escopoId: true,
  unidadeId: true,
  grupoId: true,
  supervisorId: true,
  status: true,
  observacoes: true,
  startedAt: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  protocolo: true,
  assinaturaFotoUrl: true,
  lat: true,
  lng: true,
  accuracy: true,
  endereco: true,
  ip: true,
  userAgent: true,
  deviceId: true,
  hash: true,
  template: {
    select: {
      id: true,
      titulo: true,
    },
  },
  unidade: {
    select: {
      id: true,
      nome: true,
    },
  },
  grupo: {
    select: {
      id: true,
      nome: true,
    },
  },
} satisfies Prisma.ChecklistRespostaSelect;

export type ChecklistRespostaWithInfo = Prisma.ChecklistRespostaGetPayload<{
  select: typeof respostaListSelect;
}>;

export function serializeResposta(resposta: ChecklistRespostaWithInfo) {
  return {
    id: resposta.id,
    status: resposta.status,
    observacoes: resposta.observacoes,
    startedAt: resposta.startedAt,
    submittedAt: resposta.submittedAt,
    createdAt: resposta.createdAt,
    updatedAt: resposta.updatedAt,
    protocolo: resposta.protocolo,
    assinaturaFotoUrl: resposta.assinaturaFotoUrl,
    lat: resposta.lat,
    lng: resposta.lng,
    accuracy: resposta.accuracy,
    endereco: resposta.endereco,
    ip: resposta.ip,
    userAgent: resposta.userAgent,
    deviceId: resposta.deviceId,
    hash: resposta.hash,
    template: resposta.template,
    unidade: resposta.unidade,
    grupo: resposta.grupo,
  };
}

