package com.kl.adm.data.api

import com.kl.adm.data.repository.AuthRepository
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiModule {

    private var _api: ApiService? = null
    private var _client: OkHttpClient? = null
    private var _authRepository: AuthRepository? = null

    fun init(authRepository: AuthRepository) {
        if (_authRepository != null) return
        _authRepository = authRepository
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(authRepository))
            .addInterceptor(logging)
            .connectTimeout(45, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .build()
        _client = client
        val retrofit = Retrofit.Builder()
            .baseUrl(ApiConfig.BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        _api = retrofit.create(ApiService::class.java)
    }

    fun api(): ApiService = _api ?: error("ApiModule not initialized. Call init(authRepository) first.")
    fun httpClient(): OkHttpClient = _client ?: error("ApiModule not initialized.")
    fun authRepository(): AuthRepository = _authRepository ?: error("ApiModule not initialized.")
}
