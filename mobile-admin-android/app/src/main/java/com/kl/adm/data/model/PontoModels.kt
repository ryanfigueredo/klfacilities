package com.kl.adm.data.model

import com.google.gson.annotations.SerializedName

data class FolhasPontoResponse(
    val funcionarios: List<FolhaPontoFuncionario>,
    val unidades: List<UnidadeResumo>,
    val grupos: List<GrupoResumo>,
    val month: String
)

data class FolhaPontoFuncionario(
    val id: String,
    val nome: String,
    val cpf: String?,
    val unidadeId: String?,
    val unidadeNome: String?,
    val grupoId: String?,
    val grupoNome: String?,
    val batidas: BatidasInfo? = null
)

data class BatidasInfo(
    val total: Int,
    val entrada: Int,
    val saida: Int,
    val intervaloInicio: Int,
    val intervaloFim: Int
)

// UnidadeResumo e GrupoResumo definidos em ChecklistModels.kt (mesmo package)

// Modelos para histórico de pontos
data class HistoricoPontoRequest(
    val cpf: String,
    val month: String? // formato "YYYY-MM"
)

data class HistoricoPontoResponse(
    val table: List<DiaRow>,
    val month: String
)

data class DiaRow(
    val dia: Int,
    val semana: String,
    val entrada: String?,
    val saida: String?,
    val intervaloInicio: String?,
    val intervaloFim: String?,
    val totalHoras: String?,
    val totalMinutos: Int
)

// Modelos para adicionar ponto
data class AdicionarPontoRequest(
    val funcionarioId: String,
    val tipo: String, // "ENTRADA", "SAIDA", "INTERVALO_INICIO", "INTERVALO_FIM"
    val timestamp: String, // ISO 8601 com timezone
    val observacao: String
)

data class AdicionarPontoResponse(
    val sucesso: Boolean,
    val registro: RegistroPontoInfo?
)

data class RegistroPontoInfo(
    val id: String,
    val tipo: String,
    val timestamp: String
)
