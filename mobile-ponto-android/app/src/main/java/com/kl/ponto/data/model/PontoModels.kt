package com.kl.ponto.data.model

import com.google.gson.annotations.SerializedName

data class Unidade(
    val id: String,
    val nome: String,
    val cidade: String? = null,
    val estado: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val radiusM: Double? = null
)

data class Grupo(
    val id: String,
    val nome: String
)

data class Funcionario(
    val id: String,
    val nome: String,
    val cpf: String,
    val unidade: Unidade,
    val grupo: Grupo
)

data class AuthResponse(
    val success: Boolean,
    val funcionario: Funcionario
)

data class AuthRequest(
    val cpf: String
)

data class PontoRegistro(
    val id: String,
    val tipo: String,
    val timestamp: String,
    val unidade: UnidadeResumo
)

data class UnidadeResumo(
    val nome: String
)

data class PontoResponse(
    val success: Boolean,
    val registro: PontoRegistro
)

data class PontosHojeResponse(
    val success: Boolean,
    val pontos: List<String>
)

data class HistoricoDia(
    @SerializedName("dia") val dia: Int,
    @SerializedName("semana") val semana: String,
    @SerializedName("entrada") val entrada: String? = null,
    @SerializedName("saida") val saida: String? = null,
    @SerializedName("intervaloInicio") val intervaloInicio: String? = null,
    @SerializedName("intervaloFim") val intervaloFim: String? = null,
    @SerializedName("totalHoras") val totalHoras: String? = null,
    @SerializedName("totalMinutos") val totalMinutos: Int
)

data class HistoricoResponse(
    val success: Boolean,
    val funcionario: HistoricoFuncionario,
    val month: String,
    val table: List<HistoricoDia>
)

data class HistoricoFuncionario(
    val nome: String,
    val cpf: String?
)
