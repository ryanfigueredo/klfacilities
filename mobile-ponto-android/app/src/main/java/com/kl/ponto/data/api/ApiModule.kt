package com.kl.ponto.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiModule {

    private var _api: ApiService? = null

    fun init() {
        if (_api != null) return
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
        val retrofit = Retrofit.Builder()
            .baseUrl(ApiConfig.BASE_URL.ensureTrailingSlash())
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        _api = retrofit.create(ApiService::class.java)
    }

    fun api(): ApiService = _api ?: error("ApiModule not initialized. Call init() first.")

    private fun String.ensureTrailingSlash(): String = if (endsWith("/")) this else "$this/"
}
