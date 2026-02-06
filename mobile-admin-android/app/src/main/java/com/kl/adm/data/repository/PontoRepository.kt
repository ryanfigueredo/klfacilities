package com.kl.adm.data.repository

import com.kl.adm.data.api.ApiModule
import com.kl.adm.data.model.AdicionarPontoRequest
import com.kl.adm.data.model.AdicionarPontoResponse
import com.kl.adm.data.model.FolhasPontoResponse
import com.kl.adm.data.model.HistoricoPontoRequest
import com.kl.adm.data.model.HistoricoPontoResponse

class PontoRepository {

    private val api = ApiModule.api()

    suspend fun folhas(unidadeId: String? = null, month: String? = null): Result<FolhasPontoResponse> = runCatching {
        api.folhasPonto(unidadeId, month).let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar folhas")
        }
    }

    suspend fun historico(cpf: String, month: String? = null): Result<HistoricoPontoResponse> = runCatching {
        api.historicoPonto(HistoricoPontoRequest(cpf, month)).let { r ->
            if (r.isSuccessful) r.body()!! else throw Exception(r.message() ?: "Erro ao carregar histórico")
        }
    }

    suspend fun adicionarPonto(
        funcionarioId: String,
        tipo: String,
        timestamp: String,
        observacao: String
    ): Result<AdicionarPontoResponse> = runCatching {
        api.adicionarPonto(AdicionarPontoRequest(funcionarioId, tipo, timestamp, observacao)).let { r ->
            if (r.isSuccessful) r.body()!! else {
                val errorBody = r.errorBody()?.string() ?: r.message()
                throw Exception(errorBody ?: "Erro ao adicionar ponto")
            }
        }
    }
}
