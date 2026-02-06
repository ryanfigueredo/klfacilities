package com.kl.adm.data.model

import com.google.gson.annotations.SerializedName

// Checklists pendentes
data class ChecklistsPendentesResponse(
    val escopos: List<ChecklistEscopo>
)

data class ChecklistEscopo(
    val id: String,
    val ativo: Boolean,
    @SerializedName("ultimoEnvioEm") val ultimoEnvioEm: String?,
    val template: TemplateResumo,
    val unidade: UnidadeResumo?,
    val grupo: GrupoResumo?
)

data class TemplateResumo(
    val id: String,
    val titulo: String,
    val descricao: String?
)

data class UnidadeResumo(
    val id: String,
    val nome: String
)

data class GrupoResumo(
    val id: String,
    val nome: String
)

// Escopo detalhado (para responder)
data class ChecklistEscopoDetalhesResponse(
    val escopo: EscopoDetalhe,
    val unidade: UnidadeResumo?,
    val grupo: GrupoResumo?
)

data class EscopoDetalhe(
    val id: String,
    val ativo: Boolean,
    val template: TemplateDetalhe
)

data class TemplateDetalhe(
    val id: String,
    val titulo: String,
    val descricao: String?,
    val grupos: List<GrupoPerguntas>
)

data class GrupoPerguntas(
    val id: String,
    val titulo: String,
    val descricao: String?,
    val ordem: Int,
    val perguntas: List<PerguntaDetalhe>
)

data class PerguntaDetalhe(
    val id: String,
    val titulo: String,
    val descricao: String?,
    val tipo: String,
    val obrigatoria: Boolean,
    val ordem: Int,
    val opcoes: List<String>? = null
)

// Em aberto / respondidos
data class ChecklistsEmAbertoResponse(
    val respostas: List<RespostaRascunho>
)

data class RespostaRascunho(
    val id: String,
    val status: String,
    val template: TemplateResumo,
    val unidade: UnidadeResumo,
    val grupo: GrupoResumo?,
    @SerializedName("escopoId") val escopoId: String? = null,
    @SerializedName("startedAt") val startedAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class ChecklistsRespondidosResponse(
    val respostas: List<RespostaConcluida>
)

data class RespostaConcluida(
    val id: String,
    val status: String,
    val template: TemplateResumo,
    val unidade: UnidadeResumo,
    val grupo: GrupoResumo?,
    val protocolo: String?,
    val submittedAt: String,
    val createdAt: String,
    val updatedAt: String
)

// Rascunho (GET respostas?escopoId=)
data class ChecklistRascunhoResponse(
    val rascunho: RascunhoData?
)

data class RascunhoData(
    val id: String,
    val escopoId: String,
    val observacoes: String?,
    val startedAt: String?,
    val updatedAt: String?,
    val lat: Double?,
    val lng: Double?,
    val accuracy: Double?,
    val respostas: List<RespostaRascunhoItem>
)

data class RespostaRascunhoItem(
    val perguntaId: String,
    val valorTexto: String?,
    val valorBoolean: Boolean?,
    val valorNumero: Double?,
    val valorOpcao: String?,
    val fotoUrl: String?,
    val observacao: String?,
    val nota: Double?,
    val pergunta: RespostaPerguntaRef?
)

data class RespostaPerguntaRef(
    val id: String,
    val tipo: String
)

// Opções para novo checklist (grupos, unidades, templates) - filtrado por supervisor
data class ChecklistOptionsResponse(
    val grupos: List<GrupoOption>,
    val unidades: List<UnidadeOption>,
    val templates: List<TemplateOption>,
    val allowedUnidadeIds: List<String>? = null
)

data class GrupoOption(
    val id: String,
    val nome: String,
    val ativo: Boolean? = true
)

data class UnidadeOption(
    val id: String,
    val nome: String,
    val cidade: String? = null,
    val estado: String? = null,
    val grupos: List<GrupoRef>? = null
)

data class GrupoRef(
    val id: String?,
    val nome: String?
)

data class TemplateOption(
    val id: String,
    val titulo: String,
    val descricao: String? = null,
    val escopos: List<EscopoRef>? = null
)

data class EscopoRef(
    val id: String,
    val unidadeId: String,
    val ativo: Boolean? = true
)

// Checklist digital (Banheiros) - unidades
data class ChecklistUnidadesResponse(
    val data: List<ChecklistUnidadeItem>?
)

data class ChecklistUnidadeItem(
    val id: String,
    val nome: String,
    val grupoNome: String?
)
