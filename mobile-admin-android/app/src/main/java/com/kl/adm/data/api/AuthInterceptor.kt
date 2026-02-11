package com.kl.adm.data.api

import com.kl.adm.data.repository.AuthRepository
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

class AuthInterceptor(
    private val authRepository: AuthRepository
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { authRepository.getToken() }
        val request = chain.request().newBuilder()
        if (!token.isNullOrBlank()) {
            request.addHeader("Authorization", "Bearer $token")
        }
        request.addHeader("Accept", "application/json")
        request.addHeader("Content-Type", "application/json")
        return chain.proceed(request.build())
    }
}
