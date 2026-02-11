package com.kl.ponto.data.api

import com.kl.ponto.data.model.AuthRequest
import com.kl.ponto.data.model.AuthResponse
import com.kl.ponto.data.model.HistoricoResponse
import com.kl.ponto.data.model.PontoResponse
import com.kl.ponto.data.model.PontosHojeResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface ApiService {

    @POST("/api/mobile/auth")
    suspend fun auth(@Body body: AuthRequest): Response<AuthResponse>

    @Multipart
    @POST("/api/mobile/ponto")
    suspend fun registrarPonto(
        @Part("cpf") cpf: RequestBody,
        @Part("tipo") tipo: RequestBody,
        @Part("lat") lat: RequestBody,
        @Part("lng") lng: RequestBody,
        @Part("accuracy") accuracy: RequestBody,
        @Part("deviceId") deviceId: RequestBody,
        @Part selfie: MultipartBody.Part
    ): Response<PontoResponse>

    @POST("/api/mobile/pontos-hoje")
    suspend fun pontosHoje(@Body body: Map<String, String>): Response<PontosHojeResponse>

    @POST("/api/mobile/historico")
    suspend fun historico(@Body body: Map<String, String>): Response<HistoricoResponse>
}
