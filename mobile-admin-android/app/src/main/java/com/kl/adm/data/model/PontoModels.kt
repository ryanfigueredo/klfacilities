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
    val grupoNome: String?
)
