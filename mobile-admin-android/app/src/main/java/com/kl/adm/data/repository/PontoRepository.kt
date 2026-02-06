package com.kl.adm.data.repository

import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.model.FolhasPontoResponse

class PontoRepository {

    private val api = ApiModule.api()

    suspend fun folhas(unidadeId: String? = null, month: String? = null): Result<FolhasPontoResponse> = runCatching {
        api.folhasPonto(unidadeId, month).let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar folhas")
        }
    }
}
