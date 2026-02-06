package com.kl.adm.data.api

import com.kl.adm.data.model.AuthRequest
import com.kl.adm.data.model.AuthResponse
import com.kl.adm.data.model.ChecklistEscopoDetalhesResponse
import com.kl.adm.data.model.ChecklistOptionsResponse
import com.kl.adm.data.model.ChecklistRascunhoResponse
import com.kl.adm.data.model.ChecklistUnidadesResponse
import com.kl.adm.data.model.ChecklistsEmAbertoResponse
import com.kl.adm.data.model.ChecklistsPendentesResponse
import com.kl.adm.data.model.ChecklistsRespondidosResponse
import com.kl.adm.data.model.FolhasPontoResponse
import com.kl.adm.data.model.MeResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    @POST("/api/mobile/auth-admin")
    suspend fun login(@Body body: AuthRequest): Response<AuthResponse>

    @GET("/api/me")
    suspend fun me(): Response<MeResponse>

    // Checklists
    @GET("/api/checklists-operacionais/options")
    suspend fun checklistsOptions(): Response<ChecklistOptionsResponse>

    @GET("/api/checklists-operacionais/pendentes")
    suspend fun checklistsPendentes(): Response<ChecklistsPendentesResponse>

    @GET("/api/checklists-operacionais/em-aberto")
    suspend fun checklistsEmAberto(): Response<ChecklistsEmAbertoResponse>

    @GET("/api/checklists-operacionais/respondidos")
    suspend fun checklistsRespondidos(): Response<ChecklistsRespondidosResponse>

    @GET("/api/checklists-operacionais/escopos/{escopoId}")
    suspend fun checklistEscopo(@retrofit2.http.Path("escopoId") escopoId: String): Response<ChecklistEscopoDetalhesResponse>

    @GET("/api/checklists-operacionais/respostas")
    suspend fun checklistRascunho(@Query("escopoId") escopoId: String): Response<ChecklistRascunhoResponse>

    @DELETE("/api/checklists-operacionais/{respostaId}")
    suspend fun deleteChecklistResposta(@Path("respostaId") respostaId: String): Response<Unit>

    // Checklist digital (Banheiros)
    @GET("/api/checklist/unidades")
    suspend fun checklistUnidades(): Response<ChecklistUnidadesResponse>

    // Pontos
    @GET("/api/ponto/supervisor/folhas")
    suspend fun folhasPonto(
        @Query("unidadeId") unidadeId: String? = null,
        @Query("month") month: String? = null
    ): Response<FolhasPontoResponse>

    @POST("/api/mobile/admin/historico")
    suspend fun historicoPonto(@Body body: com.kl.adm.data.model.HistoricoPontoRequest): Response<com.kl.adm.data.model.HistoricoPontoResponse>

    @POST("/api/ponto/supervisor/adicionar")
    suspend fun adicionarPonto(@Body body: com.kl.adm.data.model.AdicionarPontoRequest): Response<com.kl.adm.data.model.AdicionarPontoResponse>
}
